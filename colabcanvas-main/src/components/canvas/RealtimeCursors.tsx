import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface CursorData {
  user_id: string;
  position_x: number;
  position_y: number;
  color: string;
  name: string;
  timestamp: number;
}

interface RealtimeCursorsProps {
  projectId: string;
  currentUserId: string;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  viewportTransform?: number[];
}

const CURSOR_THROTTLE_MS = 30; // 33 updates/second for smooth movement
const CURSOR_STALE_MS = 5000; // Hide cursor after 5 seconds of inactivity

// Generate a unique color based on user ID
const generateUserColor = (userId: string): string => {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
  ];
  
  // Hash the user ID to get a consistent color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
};

export function RealtimeCursors({ 
  projectId, 
  currentUserId, 
  canvasRef, 
  viewportTransform = [1, 0, 0, 1, 0, 0] 
}: RealtimeCursorsProps) {
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());
  const [myProfile, setMyProfile] = useState<{ full_name: string | null }>({ full_name: null });
  const lastBroadcastRef = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myColorRef = useRef<string>(generateUserColor(currentUserId));
  
  const isCanvasReady = canvasRef.current !== null;

  // Load current user's profile
  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUserId)
        .single();
      
      if (data) {
        setMyProfile({ full_name: data.full_name });
      }
    };
    loadProfile();
  }, [currentUserId]);

  // Subscribe to cursor broadcasts using Supabase Broadcast (not database)
  useEffect(() => {
    if (!projectId || !currentUserId) return;

    const channel = supabase
      .channel(`cursors:${projectId}`, {
        config: {
          presence: { key: currentUserId },
        },
      })
      // Listen for cursor position broadcasts
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        if (payload && payload.user_id !== currentUserId) {
          setCursors(prev => {
            const next = new Map(prev);
            next.set(payload.user_id, {
              ...payload,
              timestamp: Date.now(),
            });
            return next;
          });
        }
      })
      // Track presence for online users
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        // Remove cursors for users who left
        setCursors(prev => {
          const activeUsers = new Set(Object.keys(presenceState));
          const next = new Map(prev);
          for (const userId of prev.keys()) {
            if (!activeUsers.has(userId)) {
              next.delete(userId);
            }
          }
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setCursors(prev => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence when we join
          await channel.track({
            user_id: currentUserId,
            name: myProfile.full_name || 'Anonymous',
            color: myColorRef.current,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [projectId, currentUserId, myProfile.full_name]);

  // Broadcast cursor position (throttled) using Supabase Broadcast
  const broadcastCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastBroadcastRef.current < CURSOR_THROTTLE_MS) return;
    if (!channelRef.current) return;
    
    lastBroadcastRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: {
        user_id: currentUserId,
        position_x: x,
        position_y: y,
        color: myColorRef.current,
        name: myProfile.full_name || 'Anonymous',
        timestamp: now,
      },
    });
  }, [currentUserId, myProfile.full_name]);

  // Track mouse movement on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isCanvasReady) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // Calculate position relative to canvas, accounting for viewport transform
      const x = (e.clientX - rect.left - viewportTransform[4]) / viewportTransform[0];
      const y = (e.clientY - rect.top - viewportTransform[5]) / viewportTransform[3];
      broadcastCursor(x, y);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, [canvasRef, broadcastCursor, viewportTransform, isCanvasReady]);

  // Clean up stale cursors periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        const next = new Map(prev);
        let changed = false;
        for (const [userId, cursor] of prev.entries()) {
          if (now - cursor.timestamp > CURSOR_STALE_MS) {
            next.delete(userId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Filter out stale cursors
  const activeCursors = Array.from(cursors.entries()).filter(([_, cursor]) => {
    return Date.now() - cursor.timestamp < CURSOR_STALE_MS;
  });

  // Convert canvas coordinates to screen coordinates
  const toScreenCoords = (x: number, y: number) => {
    return {
      x: x * viewportTransform[0] + viewportTransform[4],
      y: y * viewportTransform[3] + viewportTransform[5],
    };
  };

  if (!isCanvasReady) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence>
        {activeCursors.map(([userId, cursor]) => {
          const screenPos = toScreenCoords(cursor.position_x, cursor.position_y);

          return (
            <motion.div
              key={userId}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x: screenPos.x,
                y: screenPos.y,
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ 
                type: 'spring',
                stiffness: 500,
                damping: 35,
                mass: 0.5,
              }}
              className="absolute top-0 left-0"
              style={{ 
                willChange: 'transform',
              }}
            >
              {/* Cursor arrow SVG */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
              >
                <path
                  d="M5.65 2.65L20.35 12L12 15.35L9.18 22.35L5.65 2.65Z"
                  fill={cursor.color}
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              
              {/* Name label */}
              <div 
                className="absolute left-5 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
                style={{ 
                  backgroundColor: cursor.color,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                {cursor.name}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

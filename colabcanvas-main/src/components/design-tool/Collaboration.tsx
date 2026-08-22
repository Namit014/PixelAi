import { useEffect, useState } from "react";
import { Canvas as FabricCanvas } from "fabric";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Cursor {
  id: string;
  user_id: string;
  position_x: number;
  position_y: number;
  color: string;
}

interface CollaborationProps {
  projectId: string;
  canvas: FabricCanvas | null;
}

export function Collaboration({ projectId, canvas }: CollaborationProps) {
  const { user } = useAuth();
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [myColor] = useState(() => `#${Math.floor(Math.random()*16777215).toString(16)}`);

  useEffect(() => {
    if (!user || !canvas) return;

    // Subscribe to cursor updates
    const channel = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_tool_cursors',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (payload.new.user_id !== user.id) {
              setCursors(prev => {
                const existing = prev.findIndex(c => c.user_id === payload.new.user_id);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = payload.new as Cursor;
                  return updated;
                }
                return [...prev, payload.new as Cursor];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setCursors(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Update my cursor position
    const handleMouseMove = (e: any) => {
      const pointer = canvas.getPointer(e.e);
      
      supabase
        .from('design_tool_cursors')
        .upsert({
          project_id: projectId,
          user_id: user.id,
          position_x: pointer.x,
          position_y: pointer.y,
          color: myColor,
        }, {
          onConflict: 'project_id,user_id'
        });
    };

    canvas.on('mouse:move', handleMouseMove);

    return () => {
      channel.unsubscribe();
      canvas.off('mouse:move', handleMouseMove);
    };
  }, [projectId, canvas, user, myColor]);

  return (
    <>
      {cursors.map(cursor => (
        <div
          key={cursor.id}
          className="absolute pointer-events-none"
          style={{
            left: cursor.position_x,
            top: cursor.position_y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: cursor.color }}
          />
        </div>
      ))}
    </>
  );
}

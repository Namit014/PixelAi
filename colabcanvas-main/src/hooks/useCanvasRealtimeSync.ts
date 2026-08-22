import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Canvas as FabricCanvas } from 'fabric';

interface ObjectChangeEvent {
  type: 'object:move' | 'object:modify' | 'object:add' | 'object:delete';
  object_id: string;
  user_id: string;
  data: any;
  timestamp: number;
}

interface UseCanvasRealtimeSyncProps {
  projectId: string;
  currentUserId: string;
  canvas: FabricCanvas | null;
  isEnabled?: boolean;
}

/**
 * Hook for real-time canvas object synchronization between collaborators.
 * Uses Supabase Broadcast for instant updates (sub-100ms latency).
 */
export function useCanvasRealtimeSync({
  projectId,
  currentUserId,
  canvas,
  isEnabled = true,
}: UseCanvasRealtimeSyncProps) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastBroadcastRef = useRef<Map<string, number>>(new Map());
  const isProcessingRemoteRef = useRef(false);
  const THROTTLE_MS = 50; // Throttle broadcasts to 20 updates/second max

  // Broadcast local object changes to all collaborators
  const broadcastObjectChange = useCallback((event: ObjectChangeEvent) => {
    if (!channelRef.current || !isEnabled) return;
    
    // Throttle broadcasts per object to prevent flooding
    const now = Date.now();
    const lastBroadcast = lastBroadcastRef.current.get(event.object_id) || 0;
    if (now - lastBroadcast < THROTTLE_MS && event.type === 'object:move') {
      return; // Skip throttled move events
    }
    lastBroadcastRef.current.set(event.object_id, now);

    channelRef.current.send({
      type: 'broadcast',
      event: 'object_change',
      payload: event,
    });
  }, [isEnabled]);

  // Apply remote changes to local canvas
  const applyRemoteChange = useCallback((event: ObjectChangeEvent) => {
    if (!canvas || event.user_id === currentUserId) return;
    
    isProcessingRemoteRef.current = true;
    
    try {
      const objects = canvas.getObjects();
      const targetObj = objects.find((obj: any) => {
        const objId = obj.canvasObjectId || obj.object_id || obj.id;
        return objId === event.object_id;
      });

      switch (event.type) {
        case 'object:move':
        case 'object:modify':
          if (targetObj) {
            // Apply position/transform updates
            targetObj.set({
              left: event.data.left,
              top: event.data.top,
              scaleX: event.data.scaleX ?? targetObj.scaleX,
              scaleY: event.data.scaleY ?? targetObj.scaleY,
              angle: event.data.angle ?? targetObj.angle,
            });
            targetObj.setCoords();
            canvas.requestRenderAll();
          }
          break;

        case 'object:delete':
          if (targetObj) {
            canvas.remove(targetObj);
            canvas.requestRenderAll();
          }
          break;

        case 'object:add':
          // For new objects, we rely on postgres_changes to load them properly
          // This is just a notification that something was added
          console.log('Remote object added:', event.object_id);
          break;
      }
    } finally {
      // Reset flag after a short delay to allow canvas events to settle
      setTimeout(() => {
        isProcessingRemoteRef.current = false;
      }, 100);
    }
  }, [canvas, currentUserId]);

  // Set up canvas event listeners to broadcast changes
  useEffect(() => {
    if (!canvas || !isEnabled || !projectId || !currentUserId) return;

    const handleObjectMoving = (e: any) => {
      if (isProcessingRemoteRef.current) return;
      const obj = e.target;
      if (!obj || obj.isArtboard || obj.isTitle) return;

      const objectId = obj.canvasObjectId || obj.object_id || obj.id;
      if (!objectId) return;

      broadcastObjectChange({
        type: 'object:move',
        object_id: objectId,
        user_id: currentUserId,
        data: {
          left: obj.left,
          top: obj.top,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          angle: obj.angle,
        },
        timestamp: Date.now(),
      });
    };

    const handleObjectModified = (e: any) => {
      if (isProcessingRemoteRef.current) return;
      const obj = e.target;
      if (!obj || obj.isArtboard || obj.isTitle) return;

      const objectId = obj.canvasObjectId || obj.object_id || obj.id;
      if (!objectId) return;

      broadcastObjectChange({
        type: 'object:modify',
        object_id: objectId,
        user_id: currentUserId,
        data: {
          left: obj.left,
          top: obj.top,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          angle: obj.angle,
          width: obj.width,
          height: obj.height,
        },
        timestamp: Date.now(),
      });
    };

    const handleObjectRemoved = (e: any) => {
      if (isProcessingRemoteRef.current) return;
      const obj = e.target;
      if (!obj || obj.isArtboard || obj.isTitle) return;

      const objectId = obj.canvasObjectId || obj.object_id || obj.id;
      if (!objectId) return;

      broadcastObjectChange({
        type: 'object:delete',
        object_id: objectId,
        user_id: currentUserId,
        data: {},
        timestamp: Date.now(),
      });
    };

    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:scaling', handleObjectMoving);
    canvas.on('object:rotating', handleObjectMoving);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:removed', handleObjectRemoved);

    return () => {
      canvas.off('object:moving', handleObjectMoving);
      canvas.off('object:scaling', handleObjectMoving);
      canvas.off('object:rotating', handleObjectMoving);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:removed', handleObjectRemoved);
    };
  }, [canvas, isEnabled, projectId, currentUserId, broadcastObjectChange]);

  // Set up Supabase Broadcast channel subscription
  useEffect(() => {
    if (!projectId || !currentUserId || !isEnabled) return;

    const channel = supabase
      .channel(`canvas-sync:${projectId}`)
      .on('broadcast', { event: 'object_change' }, ({ payload }) => {
        if (payload && payload.user_id !== currentUserId) {
          applyRemoteChange(payload as ObjectChangeEvent);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [projectId, currentUserId, isEnabled, applyRemoteChange]);

  // Also subscribe to postgres_changes for persistent updates (object add/delete)
  useEffect(() => {
    if (!projectId || !currentUserId || !isEnabled || !canvas) return;

    const channel = supabase
      .channel(`canvas-objects:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvas_objects',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          // Only process changes from other users
          const record = payload.new as any || payload.old as any;
          if (record?.user_id === currentUserId) return;

          if (payload.eventType === 'DELETE') {
            const objectId = (payload.old as any)?.object_id;
            if (objectId) {
              const objects = canvas.getObjects();
              const targetObj = objects.find((obj: any) => {
                const objId = obj.canvasObjectId || obj.object_id || obj.id;
                return objId === objectId;
              });
              if (targetObj) {
                isProcessingRemoteRef.current = true;
                canvas.remove(targetObj);
                canvas.requestRenderAll();
                setTimeout(() => {
                  isProcessingRemoteRef.current = false;
                }, 100);
              }
            }
          }
          // INSERT and UPDATE events are handled by the broadcast channel for lower latency
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [projectId, currentUserId, isEnabled, canvas]);

  return {
    broadcastObjectChange,
  };
}

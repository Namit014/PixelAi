import { useEffect, useState, useCallback, useRef } from 'react';
import { Canvas as FabricCanvas } from 'fabric';

interface VideoHoverOverlayProps {
  canvas: FabricCanvas | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

interface VideoOverlayState {
  visible: boolean;
  videoUrl: string;
  position: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

const VideoHoverOverlay = ({ canvas, containerRef }: VideoHoverOverlayProps) => {
  const [overlay, setOverlay] = useState<VideoOverlayState | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoveredObjectRef = useRef<any>(null);

  const updateOverlayPosition = useCallback(() => {
    if (!canvas || !hoveredObjectRef.current) {
      return;
    }

    const obj = hoveredObjectRef.current;
    
    try {
      const bounds = obj.getBoundingRect();
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = vpt[0];

      setOverlay(prev => prev ? {
        ...prev,
        position: {
          left: bounds.left * zoom + vpt[4],
          top: bounds.top * zoom + vpt[5],
          width: bounds.width * zoom,
          height: bounds.height * zoom
        }
      } : null);
    } catch (e) {
      console.error('Error updating video overlay position:', e);
    }
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;

    let isDragging = false;

    const handleMouseOver = (e: any) => {
      // Don't show overlay while dragging
      if (isDragging) return;
      
      const target = e.target;
      
      // Check if this is a video object
      if (target && target.isVideo === true && target.videoUrl) {
        hoveredObjectRef.current = target;
        
        const bounds = target.getBoundingRect();
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vpt[0];

        setOverlay({
          visible: true,
          videoUrl: target.videoUrl,
          position: {
            left: bounds.left * zoom + vpt[4],
            top: bounds.top * zoom + vpt[5],
            width: bounds.width * zoom,
            height: bounds.height * zoom
          }
        });
      }
    };

    const handleMouseOut = (e: any) => {
      const target = e.target;
      
      if (target && target.isVideo === true) {
        hoveredObjectRef.current = null;
        setOverlay(null);
        
        // Pause video when mouse leaves
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }
    };

    // Hide overlay when dragging starts
    const handleObjectMoving = () => {
      isDragging = true;
      hoveredObjectRef.current = null;
      setOverlay(null);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    };

    // Allow overlay again after drag ends
    const handleObjectModified = () => {
      isDragging = false;
    };

    const handleViewportChange = () => {
      updateOverlayPosition();
    };

    canvas.on('mouse:over', handleMouseOver);
    canvas.on('mouse:out', handleMouseOut);
    canvas.on('mouse:wheel', handleViewportChange);
    canvas.on('mouse:up', handleViewportChange);
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:modified', handleObjectModified);

    return () => {
      canvas.off('mouse:over', handleMouseOver);
      canvas.off('mouse:out', handleMouseOut);
      canvas.off('mouse:wheel', handleViewportChange);
      canvas.off('mouse:up', handleViewportChange);
      canvas.off('object:moving', handleObjectMoving);
      canvas.off('object:modified', handleObjectModified);
    };
  }, [canvas, updateOverlayPosition]);

  // Auto-play when video element appears
  useEffect(() => {
    if (overlay?.visible && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.warn('Video autoplay failed:', err);
      });
    }
  }, [overlay?.visible]);

  if (!overlay || !overlay.visible) return null;

  return (
    <div
      className="absolute pointer-events-none z-30 overflow-hidden"
      style={{
        left: `${overlay.position.left}px`,
        top: `${overlay.position.top}px`,
        width: `${overlay.position.width}px`,
        height: `${overlay.position.height}px`,
      }}
    >
      <video
        ref={videoRef}
        src={overlay.videoUrl}
        className="w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />
    </div>
  );
};

export default VideoHoverOverlay;

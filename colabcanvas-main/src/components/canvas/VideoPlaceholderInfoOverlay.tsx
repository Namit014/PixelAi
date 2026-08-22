import { useEffect, useState, useCallback } from 'react';
import { Canvas as FabricCanvas } from 'fabric';

interface VideoPlaceholderInfoOverlayProps {
  canvas: FabricCanvas | null;
  placeholder: {
    id: string;
    rect: any;
    format: string;
    dimensions: { width: number; height: number };
    duration: number;
  } | null;
}

const VideoPlaceholderInfoOverlay = ({ canvas, placeholder }: VideoPlaceholderInfoOverlayProps) => {
  const [overlayData, setOverlayData] = useState<{
    x: number;
    y: number;
    title: string;
    dimensions: string;
  } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);

  const updatePosition = useCallback(() => {
    if (!canvas || !placeholder?.rect) {
      setOverlayData(null);
      return;
    }

    try {
      const bounds = placeholder.rect.getBoundingRect();
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = vpt[0];
      setCurrentZoom(zoom);

      setOverlayData({
        x: bounds.left * zoom + vpt[4],
        y: bounds.top * zoom + vpt[5] - 28,
        title: 'Video Generator',
        dimensions: `${placeholder.dimensions.width} × ${placeholder.dimensions.height} · ${placeholder.duration}s`
      });
    } catch (e) {
      console.error('Error updating video placeholder overlay position:', e);
    }
  }, [canvas, placeholder]);

  useEffect(() => {
    if (!canvas || !placeholder?.rect) {
      setOverlayData(null);
      return;
    }

    updatePosition();

    const handleUpdate = () => updatePosition();
    
    canvas.on('object:moving', handleUpdate);
    canvas.on('object:scaling', handleUpdate);
    canvas.on('object:modified', handleUpdate);
    canvas.on('mouse:wheel', handleUpdate);
    canvas.on('after:render', handleUpdate);

    return () => {
      canvas.off('object:moving', handleUpdate);
      canvas.off('object:scaling', handleUpdate);
      canvas.off('object:modified', handleUpdate);
      canvas.off('mouse:wheel', handleUpdate);
      canvas.off('after:render', handleUpdate);
    };
  }, [canvas, placeholder, updatePosition]);

  if (!overlayData || currentZoom < 0.25) return null;

  return (
    <div
      className="absolute pointer-events-none z-40 flex items-center gap-2 px-1 text-xs text-muted-foreground font-medium whitespace-nowrap"
      style={{
        left: `${overlayData.x}px`,
        top: `${overlayData.y}px`,
      }}
    >
      <span className="truncate max-w-[120px]">{overlayData.title}</span>
      <span className="opacity-60">{overlayData.dimensions}</span>
    </div>
  );
};

export default VideoPlaceholderInfoOverlay;

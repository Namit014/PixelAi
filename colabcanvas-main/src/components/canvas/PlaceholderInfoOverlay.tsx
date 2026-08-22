import { useEffect, useState, useCallback } from 'react';
import { Canvas as FabricCanvas } from 'fabric';

interface PlaceholderInfoOverlayProps {
  canvas: FabricCanvas | null;
  placeholder: {
    id: string;
    rect: any;
    format: string;
    dimensions: { width: number; height: number };
  } | null;
}

const PlaceholderInfoOverlay = ({ canvas, placeholder }: PlaceholderInfoOverlayProps) => {
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
      // getBoundingRect() returns screen coordinates (already transformed)
      const bounds = placeholder.rect.getBoundingRect();
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = vpt[0];
      setCurrentZoom(zoom);

      // Position above the placeholder - bounds are already in screen space
      setOverlayData({
        x: bounds.left * zoom + vpt[4],
        y: bounds.top * zoom + vpt[5] - 28,
        title: 'Image Generator',
        dimensions: `${placeholder.dimensions.width} × ${placeholder.dimensions.height}`
      });
    } catch (e) {
      console.error('Error updating placeholder overlay position:', e);
    }
  }, [canvas, placeholder]);

  useEffect(() => {
    if (!canvas || !placeholder?.rect) {
      setOverlayData(null);
      return;
    }

    updatePosition();

    // Listen for canvas events to update position
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

  // Hide labels when zoom is below 25%
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

export default PlaceholderInfoOverlay;

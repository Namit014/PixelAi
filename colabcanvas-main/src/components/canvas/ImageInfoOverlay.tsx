import { useEffect, useState } from 'react';
import { Canvas as FabricCanvas } from 'fabric';

interface ImageInfoOverlayProps {
  canvas: FabricCanvas | null;
  selectedObject: any;
}

interface OverlayPosition {
  x: number;
  y: number;
  title: string;
  dimensions: string;
}

const ImageInfoOverlay = ({ canvas, selectedObject }: ImageInfoOverlayProps) => {
  const [overlayData, setOverlayData] = useState<OverlayPosition | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);

  useEffect(() => {
    if (!canvas || !selectedObject) {
      setOverlayData(null);
      return;
    }

    // Only show for standalone images (not inside artboards)
    const isStandaloneImage = 
      (selectedObject.type === 'image' || selectedObject.type === 'Image') &&
      selectedObject.isStandaloneObject !== false;

    if (!isStandaloneImage) {
      setOverlayData(null);
      return;
    }

    const updatePosition = () => {
      if (!canvas || !selectedObject) return;

      const bounds = selectedObject.getBoundingRect();
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = vpt[0];
      setCurrentZoom(zoom);

      // Calculate actual image dimensions
      const width = Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1));
      const height = Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1));

      // Get title from object metadata or generate from type
      let title = selectedObject.title || 
                  selectedObject.name || 
                  (selectedObject.canvasObjectId ? `Image` : 'Image');
      
      // Truncate title if too long
      if (title.length > 12) {
        title = title.substring(0, 10) + '...';
      }

      setOverlayData({
        x: bounds.left * zoom + vpt[4],
        y: bounds.top * zoom + vpt[5] - 28,
        title,
        dimensions: `${width} x ${height}`
      });
    };

    updatePosition();

    // Listen for canvas events to update position
    canvas.on('object:moving', updatePosition);
    canvas.on('object:scaling', updatePosition);
    canvas.on('object:modified', updatePosition);
    canvas.on('mouse:wheel', updatePosition);

    return () => {
      canvas.off('object:moving', updatePosition);
      canvas.off('object:scaling', updatePosition);
      canvas.off('object:modified', updatePosition);
      canvas.off('mouse:wheel', updatePosition);
    };
  }, [canvas, selectedObject]);

  // Hide labels when zoom is below 25%
  if (!overlayData || currentZoom < 0.25) return null;

  return (
    <div
      className="absolute pointer-events-none z-40 flex items-center gap-2 px-1 text-xs text-muted-foreground font-medium"
      style={{
        left: `${overlayData.x}px`,
        top: `${overlayData.y}px`,
      }}
    >
      <span className="truncate max-w-[100px]">{overlayData.title}</span>
      <span className="opacity-60">{overlayData.dimensions}</span>
    </div>
  );
};

export default ImageInfoOverlay;

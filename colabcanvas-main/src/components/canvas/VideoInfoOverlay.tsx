import { useEffect, useState, useCallback } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import { Video } from 'lucide-react';
import { formatDuration } from '@/lib/videoDownloader';

interface VideoInfoOverlayProps {
  canvas: FabricCanvas | null;
  selectedObject: any;
}

interface OverlayPosition {
  x: number;
  y: number;
  title: string;
  dimensions: string;
  duration: string;
  durationBadgePos: { x: number; y: number; width: number; height: number };
}

const VideoInfoOverlay = ({ canvas, selectedObject }: VideoInfoOverlayProps) => {
  const [overlayData, setOverlayData] = useState<OverlayPosition | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);

  const updatePosition = useCallback(() => {
    if (!canvas || !selectedObject) {
      setOverlayData(null);
      return;
    }

    // Only show for video objects
    if (!selectedObject.isVideo) {
      setOverlayData(null);
      return;
    }

    try {
      const bounds = selectedObject.getBoundingRect();
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = vpt[0];
      setCurrentZoom(zoom);

      // Calculate dimensions
      const width = Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1));
      const height = Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1));

      // Get title
      let title = selectedObject.title || selectedObject.name || 'Video';
      if (title.length > 12) {
        title = title.substring(0, 10) + '...';
      }

      // Duration from metadata
      const duration = selectedObject.videoDuration || 4;

      // Duration badge position (bottom-right of video)
      const durationBadgePos = {
        x: bounds.left * zoom + vpt[4] + bounds.width * zoom - 60,
        y: bounds.top * zoom + vpt[5] + bounds.height * zoom - 32,
        width: bounds.width * zoom,
        height: bounds.height * zoom
      };

      setOverlayData({
        x: bounds.left * zoom + vpt[4],
        y: bounds.top * zoom + vpt[5] - 28,
        title,
        dimensions: `${width} × ${height}`,
        duration: formatDuration(duration),
        durationBadgePos
      });
    } catch (e) {
      console.error('Error updating video info overlay:', e);
    }
  }, [canvas, selectedObject]);

  useEffect(() => {
    if (!canvas || !selectedObject) {
      setOverlayData(null);
      return;
    }

    updatePosition();

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
  }, [canvas, selectedObject, updatePosition]);

  // Hide labels when zoom is below 25%
  if (!overlayData || currentZoom < 0.25) return null;

  return (
    <>
      {/* Title and dimensions label above video */}
      <div
        className="absolute pointer-events-none z-40 flex items-center gap-2 px-1 text-xs text-muted-foreground font-medium"
        style={{
          left: `${overlayData.x}px`,
          top: `${overlayData.y}px`,
        }}
      >
        <Video className="w-3 h-3" />
        <span className="truncate max-w-[100px]">{overlayData.title}</span>
        <span className="opacity-60">{overlayData.dimensions}</span>
      </div>

      {/* Duration badge on video */}
      <div
        className="absolute pointer-events-none z-40 flex items-center gap-1 px-2 py-1 bg-black/70 rounded text-xs text-white font-medium"
        style={{
          left: `${overlayData.durationBadgePos.x}px`,
          top: `${overlayData.durationBadgePos.y}px`,
        }}
      >
        {overlayData.duration}
      </div>
    </>
  );
};

export default VideoInfoOverlay;

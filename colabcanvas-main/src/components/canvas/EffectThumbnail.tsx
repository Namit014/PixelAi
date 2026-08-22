import { useEffect, useRef, memo } from 'react';
import type { CanvasFilter } from '@/lib/filters/types';
import { FilterEngine } from '@/lib/filters/FilterEngine';

interface EffectThumbnailProps {
  filter: CanvasFilter;
  sourceImage: ImageBitmap | null;
  size?: number;
  onClick: () => void;
  isActive?: boolean;
}

const EffectThumbnail = memo(({ filter, sourceImage, size = 64, onClick, isActive }: EffectThumbnailProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FilterEngine | null>(null);
  const renderedRef = useRef(false);

  // Reset rendered flag when sourceImage changes
  useEffect(() => {
    renderedRef.current = false;
  }, [sourceImage]);

  useEffect(() => {
    if (!sourceImage || !canvasRef.current || renderedRef.current) return;

    const renderThumbnail = async () => {
      const engine = new FilterEngine();
      engineRef.current = engine;
      if (!engine.init(size, size)) return;

      // Create a scaled-down version of the source
      const offscreen = new OffscreenCanvas(size, size);
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(sourceImage, 0, 0, size, size);
      const scaled = await createImageBitmap(offscreen);

      engine.setSourceImage(scaled);
      scaled.close();

      // Build default params
      const defaultParams: Record<string, any> = {};
      for (const [key, param] of Object.entries(filter.params)) {
        defaultParams[key] = param.value;
      }

      const result = await engine.render(
        [{ instanceId: 'thumb', filterId: filter.id, params: defaultParams }],
        0
      );

      if (result && canvasRef.current) {
        const drawCtx = canvasRef.current.getContext('2d');
        if (drawCtx) {
          drawCtx.clearRect(0, 0, size, size);
          drawCtx.drawImage(result, 0, 0);
          result.close();
        }
      }

      renderedRef.current = true;
      engine.dispose();
      engineRef.current = null;
    };

    renderThumbnail();

    return () => {
      engineRef.current?.dispose();
    };
  }, [sourceImage, filter, size]);

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all hover:bg-accent/50 ${
        isActive ? 'ring-2 ring-primary bg-accent/30' : ''
      }`}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-md bg-muted"
        style={{ width: size, height: size }}
      />
      <span className="text-[10px] text-muted-foreground truncate w-full text-center">
        {filter.name}
      </span>
    </button>
  );
});

EffectThumbnail.displayName = 'EffectThumbnail';
export default EffectThumbnail;

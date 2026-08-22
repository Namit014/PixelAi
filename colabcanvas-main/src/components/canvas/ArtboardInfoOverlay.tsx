import { useEffect, useState, useCallback, useRef } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import { FrameContainer } from '@/lib/canvas/FrameContainer';

interface ArtboardInfoOverlayProps {
  canvas: FabricCanvas | null;
}

interface ArtboardInfo {
  id: string;
  x: number;
  y: number;
  title: string;
  dimensions: string;
}

/**
 * Lightweight overlay that shows artboard labels.
 * Uses event-driven updates instead of continuous polling.
 */
const ArtboardInfoOverlay = ({ canvas }: ArtboardInfoOverlayProps) => {
  const [artboards, setArtboards] = useState<ArtboardInfo[]>([]);
  const [currentZoom, setCurrentZoom] = useState(1);
  const prevHashRef = useRef('');
  const rafIdRef = useRef(0);

  const computeArtboards = useCallback(() => {
    if (!canvas) return;

    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = vpt[0];

    const allObjects = canvas.getObjects();
    const infos: ArtboardInfo[] = [];

    for (const obj of allObjects) {
      if (obj instanceof FrameContainer) {
        const bounds = obj.getFrameBounds();
        const title = obj.artboardTitle || obj.fullTitle || 'Frame';

        const left = (obj.left || 0) * zoom + vpt[4];
        const top = (obj.top || 0) * zoom + vpt[5] - 24;

        infos.push({
          id: obj.artboardId || `artboard-${infos.length}`,
          x: Math.round(left),
          y: Math.round(top),
          title: title.length > 25 ? title.substring(0, 22) + '...' : title,
          dimensions: `${Math.round(bounds.width)} × ${Math.round(bounds.height)}`,
        });
      }
    }

    const hash = infos
      .map((a) => `${a.id}:${a.x}:${a.y}:${a.title}:${a.dimensions}`)
      .join('|');

    if (hash !== prevHashRef.current || zoom !== currentZoom) {
      prevHashRef.current = hash;
      setArtboards(infos);
      setCurrentZoom(zoom);
    }
  }, [canvas, currentZoom]);

  // Debounced compute via rAF
  const scheduleUpdate = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      computeArtboards();
    });
  }, [computeArtboards]);

  useEffect(() => {
    if (!canvas) {
      setArtboards([]);
      return;
    }

    // Compute once on mount
    computeArtboards();

    // Event-driven: only recompute when something actually changes
    const events = [
      'after:render', // catches zoom, pan, object moves — fires once per render
    ];

    // Throttle after:render to max ~15fps to avoid over-updating
    let lastUpdate = 0;
    const throttledUpdate = () => {
      const now = performance.now();
      if (now - lastUpdate > 66) { // ~15fps
        lastUpdate = now;
        scheduleUpdate();
      }
    };

    events.forEach(evt => canvas.on(evt as any, throttledUpdate));

    return () => {
      events.forEach(evt => canvas.off(evt as any, throttledUpdate));
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [canvas, computeArtboards, scheduleUpdate]);

  if (artboards.length === 0 || currentZoom < 0.25) return null;

  return (
    <>
      {artboards.map((artboard) => (
        <div
          key={artboard.id}
          className="absolute pointer-events-none z-40 flex items-center gap-2 px-1 text-xs text-muted-foreground font-medium whitespace-nowrap"
          style={{
            left: `${artboard.x}px`,
            top: `${artboard.y}px`,
            textShadow: '0 1px 3px rgba(255,255,255,0.8), 0 0px 1px rgba(255,255,255,0.9)',
          }}
        >
          <span className="truncate max-w-[150px]">{artboard.title}</span>
          <span className="opacity-60">{artboard.dimensions}</span>
        </div>
      ))}
    </>
  );
};

export default ArtboardInfoOverlay;

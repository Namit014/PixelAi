import { useEffect, useState, useCallback, useRef } from 'react';
import { Canvas as FabricCanvas, Gradient, Point } from 'fabric';
import { util as fabricUtil } from 'fabric';

interface GradientOverlayProps {
  canvas: FabricCanvas | null;
  selectedObject: any;
}

interface ScreenPoint {
  x: number;
  y: number;
}

interface StopMarker {
  index: number;
  screen: ScreenPoint;
  color: string;
  offset: number;
}

const HANDLE_RADIUS = 7;
const STOP_RADIUS = 5;
const DRAG_AWAY_THRESHOLD = 40;

const GradientOverlay = ({ canvas, selectedObject }: GradientOverlayProps) => {
  const [startPt, setStartPt] = useState<ScreenPoint | null>(null);
  const [endPt, setEndPt] = useState<ScreenPoint | null>(null);
  const [stopMarkers, setStopMarkers] = useState<StopMarker[]>([]);
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    type: 'start' | 'end' | 'stop';
    stopIndex?: number;
  } | null>(null);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const localToScreen = useCallback((lx: number, ly: number, obj: any, cvs: FabricCanvas): ScreenPoint => {
    const matrix = obj.calcTransformMatrix();
    const worldPt = fabricUtil.transformPoint(new Point(lx, ly), matrix);
    const vpt = cvs.viewportTransform || [1, 0, 0, 1, 0, 0];
    return {
      x: worldPt.x * vpt[0] + vpt[4],
      y: worldPt.y * vpt[3] + vpt[5],
    };
  }, []);

  const screenToLocal = useCallback((sx: number, sy: number, obj: any, cvs: FabricCanvas): { x: number; y: number } => {
    const vpt = cvs.viewportTransform || [1, 0, 0, 1, 0, 0];
    const worldX = (sx - vpt[4]) / vpt[0];
    const worldY = (sy - vpt[5]) / vpt[3];
    const invMatrix = fabricUtil.invertTransform(obj.calcTransformMatrix());
    const localPt = fabricUtil.transformPoint(new Point(worldX, worldY), invMatrix);
    return { x: localPt.x, y: localPt.y };
  }, []);

  const syncFromObject = useCallback(() => {
    if (!canvas || !selectedObject) return;
    const fill = selectedObject.fill;
    if (!fill || typeof fill !== 'object' || !(fill instanceof Gradient)) return;

    const coords = fill.coords as any;
    const type = fill.type as 'linear' | 'radial';
    setGradientType(type);

    if (type === 'linear') {
      setStartPt(localToScreen(coords.x1, coords.y1, selectedObject, canvas));
      setEndPt(localToScreen(coords.x2, coords.y2, selectedObject, canvas));
    } else {
      const c = localToScreen(coords.x1, coords.y1, selectedObject, canvas);
      const r = coords.r2 || 50;
      const e = localToScreen(coords.x1 + r, coords.y1, selectedObject, canvas);
      setStartPt(c);
      setEndPt(e);
    }

    const stops: StopMarker[] = (fill.colorStops || []).map((cs: any, i: number) => {
      let lx: number, ly: number;
      if (type === 'linear') {
        lx = coords.x1 + (coords.x2 - coords.x1) * cs.offset;
        ly = coords.y1 + (coords.y2 - coords.y1) * cs.offset;
      } else {
        const r = coords.r2 || 50;
        lx = coords.x1 + r * cs.offset;
        ly = coords.y1;
      }
      const sp = localToScreen(lx, ly, selectedObject, canvas);
      return { index: i, screen: sp, color: cs.color, offset: cs.offset };
    });
    setStopMarkers(stops);
  }, [canvas, selectedObject, localToScreen]);

  useEffect(() => {
    if (!canvas || !selectedObject) return;
    syncFromObject();
    const onRender = () => syncFromObject();
    canvas.on('after:render', onRender);
    return () => { canvas.off('after:render', onRender); };
  }, [canvas, selectedObject, syncFromObject]);

  // Use window listeners for drag (robust, matches pen tool pattern)
  const handlePointerDown = useCallback((e: React.PointerEvent, type: 'start' | 'end' | 'stop', stopIndex?: number) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { type, stopIndex };
    setIsDragging(true);
    if (canvas) canvas.selection = false;
  }, [canvas]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      if (!dragRef.current || !canvas || !selectedObject) return;
      e.preventDefault();
      e.stopPropagation();

      const fill = selectedObject.fill;
      if (!fill || !(fill instanceof Gradient)) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!dragRef.current) return;
        const local = screenToLocal(sx, sy, selectedObject, canvas);
        const coords = { ...(fill.coords as any) };
        const { type, stopIndex } = dragRef.current;

        if (type === 'start') {
          if (gradientType === 'linear') {
            coords.x1 = local.x; coords.y1 = local.y;
          } else {
            coords.x1 = local.x; coords.y1 = local.y;
            coords.x2 = local.x; coords.y2 = local.y;
          }
        } else if (type === 'end') {
          if (gradientType === 'linear') {
            coords.x2 = local.x; coords.y2 = local.y;
          } else {
            const dx = local.x - coords.x1;
            const dy = local.y - coords.y1;
            coords.r2 = Math.sqrt(dx * dx + dy * dy);
          }
        } else if (type === 'stop' && stopIndex !== undefined) {
          const colorStops = [...(fill.colorStops || [])];
          if (gradientType === 'linear') {
            const dx = coords.x2 - coords.x1;
            const dy = coords.y2 - coords.y1;
            const len2 = dx * dx + dy * dy;
            if (len2 > 0) {
              const t = Math.max(0, Math.min(1, ((local.x - coords.x1) * dx + (local.y - coords.y1) * dy) / len2));
              colorStops[stopIndex] = { ...colorStops[stopIndex], offset: t };
            }
          } else {
            const r = coords.r2 || 50;
            const dx = local.x - coords.x1;
            const dy = local.y - coords.y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            colorStops[stopIndex] = { ...colorStops[stopIndex], offset: Math.max(0, Math.min(1, dist / r)) };
          }
          const lineDist = startPt && endPt ? distToLine(sx, sy, startPt, endPt) : 0;
          if (lineDist > DRAG_AWAY_THRESHOLD && colorStops.length > 2) {
            colorStops.splice(stopIndex, 1);
          }
          const newGrad = new Gradient({
            type: fill.type,
            coords,
            colorStops: colorStops.sort((a: any, b: any) => a.offset - b.offset),
          });
          selectedObject.set('fill', newGrad);
          canvas.requestRenderAll();
          return;
        }

        const newGrad = new Gradient({
          type: fill.type,
          coords,
          colorStops: fill.colorStops,
        });
        selectedObject.set('fill', newGrad);
        canvas.requestRenderAll();
      });
    };

    const handleUp = () => {
      dragRef.current = null;
      setIsDragging(false);
      if (canvas) {
        canvas.selection = true;
        if (selectedObject) {
          canvas.setActiveObject(selectedObject);
          canvas.requestRenderAll();
        }
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDragging, canvas, selectedObject, gradientType, screenToLocal, startPt, endPt]);

  const handleLineClick = useCallback((e: React.MouseEvent) => {
    if (!canvas || !selectedObject || !startPt || !endPt) return;
    const fill = selectedObject.fill;
    if (!fill || !(fill instanceof Gradient)) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return;
    const t = Math.max(0, Math.min(1, ((sx - startPt.x) * dx + (sy - startPt.y) * dy) / len2));

    const stops = [...(fill.colorStops || [])].sort((a: any, b: any) => a.offset - b.offset);
    const newStop = { color: stops[0]?.color || '#888888', offset: t };
    stops.push(newStop);
    stops.sort((a: any, b: any) => a.offset - b.offset);

    const newGrad = new Gradient({
      type: fill.type,
      coords: fill.coords,
      colorStops: stops,
    });
    selectedObject.set('fill', newGrad);
    canvas.requestRenderAll();
  }, [canvas, selectedObject, startPt, endPt]);

  if (!canvas || !selectedObject || !startPt || !endPt) return null;
  const fill = selectedObject.fill;
  if (!fill || typeof fill !== 'object' || !(fill instanceof Gradient)) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ zIndex: 50, pointerEvents: isDragging ? 'auto' : 'none' }}
    >
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <line
          x1={startPt.x} y1={startPt.y}
          x2={endPt.x} y2={endPt.y}
          stroke="white"
          strokeWidth={2}
          strokeDasharray="4 3"
          style={{ pointerEvents: 'auto', cursor: 'crosshair', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
          onClick={handleLineClick}
        />

        {stopMarkers.map((stop) => (
          <circle
            key={stop.index}
            cx={stop.screen.x}
            cy={stop.screen.y}
            r={STOP_RADIUS}
            fill={stop.color}
            stroke="white"
            strokeWidth={2}
            style={{ pointerEvents: 'auto', cursor: 'grab', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
            onPointerDown={(e) => handlePointerDown(e, 'stop', stop.index)}
          />
        ))}

        <circle
          cx={startPt.x} cy={startPt.y} r={HANDLE_RADIUS}
          fill="white" stroke="#3b82f6" strokeWidth={2}
          style={{ pointerEvents: 'auto', cursor: 'grab', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}
          onPointerDown={(e) => handlePointerDown(e, 'start')}
        />

        <circle
          cx={endPt.x} cy={endPt.y} r={HANDLE_RADIUS}
          fill="white" stroke="#3b82f6" strokeWidth={2}
          style={{ pointerEvents: 'auto', cursor: 'grab', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}
          onPointerDown={(e) => handlePointerDown(e, 'end')}
        />

        {gradientType === 'radial' && (
          <circle
            cx={startPt.x} cy={startPt.y}
            r={Math.sqrt((endPt.x - startPt.x) ** 2 + (endPt.y - startPt.y) ** 2)}
            fill="none" stroke="white" strokeWidth={1} strokeDasharray="4 3" opacity={0.5}
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
          />
        )}
      </svg>
    </div>
  );
};

function distToLine(px: number, py: number, a: ScreenPoint, b: ScreenPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt((px - a.x) ** 2 + (py - a.y) ** 2);
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

export default GradientOverlay;

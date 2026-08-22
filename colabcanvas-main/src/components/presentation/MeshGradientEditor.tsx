import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { MeshGradientPoint } from '@/types/presentation';
import { ColorPickerInline, SliderControl } from './panel-primitives';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const makeId = () => Math.random().toString(36).slice(2, 8);

const DEFAULT_POINTS: MeshGradientPoint[] = [
  { id: makeId(), x: 0.15, y: 0.2, color: '#667eea', intensity: 0.6 },
  { id: makeId(), x: 0.85, y: 0.3, color: '#764ba2', intensity: 0.5 },
  { id: makeId(), x: 0.5, y: 0.8, color: '#f093fb', intensity: 0.55 },
  { id: makeId(), x: 0.3, y: 0.5, color: '#43e97b', intensity: 0.45 },
];

function meshToCss(points: MeshGradientPoint[]): string {
  if (points.length === 0) return '#1a1a2e';
  // Layer radial gradients for each mesh point
  const layers = points.map((p) => {
    const radius = Math.round(p.intensity * 80 + 20);
    return `radial-gradient(circle at ${Math.round(p.x * 100)}% ${Math.round(p.y * 100)}%, ${p.color} 0%, transparent ${radius}%)`;
  });
  return layers.join(', ');
}

interface Props {
  points: MeshGradientPoint[] | undefined;
  onChange: (points: MeshGradientPoint[], cssValue: string) => void;
}

export function MeshGradientEditor({ points, onChange }: Props) {
  const pts = points && points.length > 0 ? points : DEFAULT_POINTS;
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const emit = useCallback(
    (next: MeshGradientPoint[]) => {
      onChange(next, meshToCss(next));
    },
    [onChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(id);
      setSelected(id);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      const next = pts.map((p) => (p.id === dragging ? { ...p, x, y } : p));
      emit(next);
    },
    [dragging, pts, emit]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const addPoint = useCallback(() => {
    const newPt: MeshGradientPoint = {
      id: makeId(),
      x: 0.5 + (Math.random() - 0.5) * 0.4,
      y: 0.5 + (Math.random() - 0.5) * 0.4,
      color: `hsl(${Math.round(Math.random() * 360)}, 70%, 60%)`,
      intensity: 0.5,
    };
    const next = [...pts, newPt];
    setSelected(newPt.id);
    emit(next);
  }, [pts, emit]);

  const removePoint = useCallback(
    (id: string) => {
      if (pts.length <= 2) return;
      const next = pts.filter((p) => p.id !== id);
      if (selected === id) setSelected(null);
      emit(next);
    },
    [pts, selected, emit]
  );

  const updatePoint = useCallback(
    (id: string, patch: Partial<MeshGradientPoint>) => {
      const next = pts.map((p) => (p.id === id ? { ...p, ...patch } : p));
      emit(next);
    },
    [pts, emit]
  );

  const cssValue = useMemo(() => meshToCss(pts), [pts]);
  const selectedPoint = pts.find((p) => p.id === selected);

  // Initialize on first render
  useEffect(() => {
    if (!points || points.length === 0) {
      emit(DEFAULT_POINTS);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      {/* Interactive canvas preview */}
      <div
        ref={canvasRef}
        className="relative w-full rounded-lg border border-border overflow-hidden cursor-crosshair select-none"
        style={{ aspectRatio: '16/9', background: cssValue, backgroundColor: '#1a1a2e' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => {
          if (e.target === canvasRef.current) setSelected(null);
        }}
      >
        {pts.map((p) => (
          <div
            key={p.id}
            className={cn(
              'absolute w-4 h-4 rounded-full border-2 shadow-lg cursor-grab transition-shadow',
              selected === p.id ? 'ring-2 ring-foreground shadow-xl scale-125' : 'border-background'
            )}
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: p.color,
            }}
            onPointerDown={(e) => handlePointerDown(e, p.id)}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground font-medium">{pts.length} points</span>
        <button
          onClick={addPoint}
          className="h-5 px-2 rounded bg-muted/50 flex items-center gap-1 hover:bg-muted text-[9px] text-muted-foreground"
        >
          <Plus className="h-3 w-3" /> Add Point
        </button>
      </div>

      {/* Selected point editor */}
      {selectedPoint && (
        <div className="space-y-1 p-2 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium text-foreground">Point Color</span>
            {pts.length > 2 && (
              <button
                onClick={() => removePoint(selectedPoint.id)}
                className="h-4 w-4 rounded hover:bg-destructive/20 flex items-center justify-center"
              >
                <Trash2 className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <ColorPickerInline
            label=""
            value={selectedPoint.color}
            onChange={(v) => updatePoint(selectedPoint.id, { color: v })}
            placeholder="#000"
          />
          <div className="space-y-0.5">
            <span className="text-[9px] text-muted-foreground">Intensity</span>
            <SliderControl
              value={Math.round(selectedPoint.intensity * 100)}
              onChange={(v) => updatePoint(selectedPoint.id, { intensity: v / 100 })}
              min={10}
              max={100}
              step={5}
              suffix="%"
            />
          </div>
        </div>
      )}
    </div>
  );
}

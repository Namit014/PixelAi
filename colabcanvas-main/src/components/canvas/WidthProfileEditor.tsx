import { useState, useRef, useCallback, useEffect } from 'react';
import type { WidthProfile, WidthProfileStop } from '@/lib/strokeEngine/types';

interface WidthProfileEditorProps {
  profile: WidthProfile;
  onChange: (profile: WidthProfile) => void;
  onDragStart?: () => void;
  onClose: () => void;
}

const EDITOR_W = 220;
const EDITOR_H = 80;
const PADDING = 10;
const HANDLE_R = 5;

export function WidthProfileEditor({ profile, onChange, onDragStart, onClose }: WidthProfileEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [stops, setStops] = useState<WidthProfileStop[]>(() => [...profile.stops]);

  useEffect(() => {
    setStops([...profile.stops]);
  }, [profile]);

  const toScreenX = (t: number) => PADDING + t * (EDITOR_W - 2 * PADDING);
  const toScreenY = (w: number) => EDITOR_H - PADDING - w * (EDITOR_H - 2 * PADDING);
  const fromScreenX = (sx: number) => Math.max(0, Math.min(1, (sx - PADDING) / (EDITOR_W - 2 * PADDING)));
  const fromScreenY = (sy: number) => Math.max(0, Math.min(1, (EDITOR_H - PADDING - sy) / (EDITOR_H - 2 * PADDING)));

  const commitStops = useCallback((newStops: WidthProfileStop[]) => {
    const sorted = [...newStops].sort((a, b) => a.t - b.t);
    setStops(sorted);
    onChange({
      ...profile,
      id: 'custom',
      name: 'Custom',
      stops: sorted,
    });
  }, [onChange, profile]);

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStart?.();
    setDragging(idx);
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  }, [onDragStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const newStops = [...stops];
    // Don't allow moving endpoints' t values
    if (dragging === 0) {
      newStops[0] = { t: 0, width: fromScreenY(sy) };
    } else if (dragging === stops.length - 1) {
      newStops[dragging] = { t: 1, width: fromScreenY(sy) };
    } else {
      newStops[dragging] = { t: fromScreenX(sx), width: fromScreenY(sy) };
    }
    setStops(newStops);
  }, [dragging, stops]);

  const handlePointerUp = useCallback(() => {
    if (dragging !== null) {
      commitStops(stops);
      setDragging(null);
    }
  }, [dragging, stops, commitStops]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const t = fromScreenX(e.clientX - rect.left);
    const width = fromScreenY(e.clientY - rect.top);

    // Don't add near existing stops
    const tooClose = stops.some(s => Math.abs(s.t - t) < 0.05);
    if (tooClose) return;

    onDragStart?.();
    commitStops([...stops, { t, width }]);
  }, [stops, commitStops, onDragStart]);

  const handleRightClick = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    // Don't remove endpoints
    if (idx === 0 || idx === stops.length - 1) return;
    if (stops.length <= 2) return;
    onDragStart?.();
    commitStops(stops.filter((_, i) => i !== idx));
  }, [stops, commitStops, onDragStart]);

  // Build the profile shape path
  const topPoints = stops.map(s => `${toScreenX(s.t)},${toScreenY(s.width)}`).join(' ');
  const bottomPoints = [...stops].reverse().map(s => `${toScreenX(s.t)},${toScreenY(-s.width + 1) + (EDITOR_H - 2 * PADDING) * s.width}`).join(' ');

  // Build symmetric profile visualization
  const centerY = EDITOR_H / 2;
  const maxHalfH = (EDITOR_H - 2 * PADDING) / 2;
  const profileTop = stops.map(s => `${toScreenX(s.t)},${centerY - s.width * maxHalfH}`).join(' ');
  const profileBottom = [...stops].reverse().map(s => `${toScreenX(s.t)},${centerY + s.width * maxHalfH}`).join(' ');

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-700">Width Profile</span>
        <button
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          Done
        </button>
      </div>
      <div className="text-[10px] text-zinc-400">
        Double-click to add point · Right-click to remove
      </div>
      <svg
        ref={svgRef}
        width={EDITOR_W}
        height={EDITOR_H}
        className="bg-zinc-50 rounded border border-zinc-100 cursor-crosshair"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Center line */}
        <line
          x1={PADDING} y1={centerY}
          x2={EDITOR_W - PADDING} y2={centerY}
          stroke="#d4d4d8" strokeWidth={1} strokeDasharray="2,2"
        />

        {/* Profile shape */}
        <polygon
          points={`${profileTop} ${profileBottom}`}
          fill="#3b82f6"
          fillOpacity={0.15}
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Handles */}
        {stops.map((s, i) => (
          <circle
            key={i}
            cx={toScreenX(s.t)}
            cy={centerY - s.width * maxHalfH}
            r={HANDLE_R}
            fill={dragging === i ? '#2563eb' : 'white'}
            stroke="#3b82f6"
            strokeWidth={2}
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => handlePointerDown(e, i)}
            onContextMenu={(e) => handleRightClick(e, i)}
          />
        ))}
      </svg>
    </div>
  );
}

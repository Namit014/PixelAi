import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Point } from 'fabric';
import {
  buildArcLengthLUT,
  layoutGlyphsOnPath,
  computeGlyphAdvances,
  type TextOnPathData,
  type GlyphPlacement,
  type ArcLengthLUT,
} from '@/lib/canvas/textOnPath';
import type { Segment } from '@/lib/penTool/geometry';

interface TextOnPathOverlayProps {
  selectedObject: any;
  canvas: any;
  containerWidth: number;
  containerHeight: number;
  onTextChange?: (text: string) => void;
}

interface TextOnPathEntry {
  obj: any;
  glyphs: GlyphPlacement[];
  lut: ArcLengthLUT;
  textOnPath: TextOnPathData;
}

export default function TextOnPathOverlay({
  selectedObject,
  canvas,
  containerWidth,
  containerHeight,
  onTextChange,
}: TextOnPathOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<TextOnPathEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const draggingOffset = useRef<{ startX: number; startY: number; startOffset: number } | null>(null);
  const rafRef = useRef<number>(0);

  // Viewport
  const zoom = canvas?.getZoom() ?? 1;
  const vptX = canvas?.viewportTransform?.[4] ?? 0;
  const vptY = canvas?.viewportTransform?.[5] ?? 0;
  const invS = 1 / zoom;

  // Collect all objects with textOnPath and compute their glyphs
  useEffect(() => {
    if (!canvas) { setEntries([]); return; }

    let cancelled = false;

    const computeAll = async () => {
      const objects = canvas.getObjects?.() ?? [];
      const results: TextOnPathEntry[] = [];

      for (const obj of objects) {
        const textOnPath: TextOnPathData | null = obj.textOnPath ?? null;
        const penData = obj.penToolData;
        const segments: Segment[] | null = penData?.segments?.length >= 2 ? penData.segments : null;
        const closed = penData?.closed ?? false;

        if (!textOnPath || !segments) continue;

        const lut = buildArcLengthLUT(segments, closed);
        const advances = await computeGlyphAdvances(
          textOnPath.text,
          textOnPath.fontSize,
          textOnPath.fontFamily,
          textOnPath.letterSpacing,
        );
        if (cancelled) return;

        const glyphs = layoutGlyphsOnPath(lut, {
          text: textOnPath.text,
          fontSize: textOnPath.fontSize,
          fontFamily: textOnPath.fontFamily,
          alignment: textOnPath.alignment,
          startOffset: textOnPath.startOffset,
          verticalOffset: textOnPath.verticalOffset,
          letterSpacing: textOnPath.letterSpacing,
          flip: textOnPath.flip,
          reverseDirection: textOnPath.reverseDirection,
        }, advances);

        results.push({ obj, glyphs, lut, textOnPath });
      }

      if (!cancelled) setEntries(results);
    };

    computeAll();

    // Re-compute when objects change
    const handler = () => { if (!cancelled) computeAll(); };
    canvas.on('object:modified', handler);
    canvas.on('object:added', handler);
    canvas.on('object:removed', handler);

    return () => {
      cancelled = true;
      canvas.off('object:modified', handler);
      canvas.off('object:added', handler);
      canvas.off('object:removed', handler);
    };
  }, [canvas]);

  // Transform path-local point to world coords
  const toWorld = useCallback((obj: any, pt: { x: number; y: number }) => {
    if (!obj) return pt;
    const transformMatrix = obj.calcTransformMatrix();
    const penData = obj.penToolData;
    const originalLeft = penData?.originalLeft ?? 0;
    const originalTop = penData?.originalTop ?? 0;
    const objW = obj.width || 1;
    const objH = obj.height || 1;
    const localX = pt.x - originalLeft;
    const localY = pt.y - originalTop;
    const centeredX = localX - objW / 2;
    const centeredY = localY - objH / 2;
    const localPt = new Point(centeredX, centeredY);
    const worldPt = localPt.transform(transformMatrix);
    return { x: worldPt.x, y: worldPt.y };
  }, []);

  // Double-click to enter edit mode (only for selected)
  const handleDoubleClick = useCallback(() => {
    const textOnPath = selectedObject?.textOnPath;
    if (!textOnPath) return;
    setIsEditing(true);
    setEditText(textOnPath.text);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [selectedObject]);

  // Commit text edit
  const commitEdit = useCallback(() => {
    const textOnPath = selectedObject?.textOnPath;
    if (!selectedObject || !textOnPath) return;
    selectedObject.textOnPath = { ...textOnPath, text: editText || textOnPath.text };
    setIsEditing(false);
    canvas?.fire('object:modified', { target: selectedObject });
    canvas?.requestRenderAll();
    onTextChange?.(editText);
  }, [selectedObject, editText, canvas, onTextChange]);

  // Offset drag handle (only for selected)
  const handleOffsetDragStart = useCallback((e: React.PointerEvent, entry: TextOnPathEntry) => {
    e.stopPropagation();
    e.preventDefault();

    draggingOffset.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffset: entry.textOnPath.startOffset,
    };

    const onMove = (ev: PointerEvent) => {
      if (!draggingOffset.current || rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const drag = draggingOffset.current;
        if (!drag || !entry.lut || !entry.obj) return;

        const dx = ev.clientX - drag.startX;
        const pixelDist = dx / zoom;
        const offsetDelta = pixelDist / entry.lut.totalLength;
        const newOffset = Math.max(0, Math.min(1, drag.startOffset + offsetDelta));

        entry.obj.textOnPath = { ...entry.obj.textOnPath, startOffset: newOffset };
        canvas?.fire('object:modified', { target: entry.obj });
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      draggingOffset.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [zoom, canvas]);

  if (entries.length === 0) return null;

  // Find the selected entry for editing UI
  const selectedEntry = entries.find(e => e.obj === selectedObject) ?? null;
  const selectedStartHandle = selectedEntry ? (() => {
    const sample = selectedEntry.lut.sampleAt(selectedEntry.textOnPath.startOffset * selectedEntry.lut.totalLength);
    return toWorld(selectedEntry.obj, sample.point);
  })() : null;

  return (
    <>
      <svg
        width={containerWidth}
        height={containerHeight}
        className="absolute inset-0"
        style={{ zIndex: 27, pointerEvents: 'none' }}
      >
        <g transform={`matrix(${zoom},0,0,${zoom},${vptX},${vptY})`}>
          {entries.map((entry, ei) => {
            const isSelected = entry.obj === selectedObject;
            const sx = entry.obj?.scaleX ?? 1;

            return entry.glyphs.map((g, i) => {
              if (!g.visible) return null;
              const worldPt = toWorld(entry.obj, g);
              const angleDeg = (g.angle * 180 / Math.PI) + (entry.obj?.angle ?? 0);
              return (
                <text
                  key={`${ei}-${i}`}
                  x={worldPt.x}
                  y={worldPt.y}
                  transform={`rotate(${angleDeg}, ${worldPt.x}, ${worldPt.y})`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={entry.textOnPath.fill}
                  fontSize={entry.textOnPath.fontSize * sx}
                  fontFamily={entry.textOnPath.fontFamily}
                  style={{
                    pointerEvents: isSelected ? 'all' : 'none',
                    cursor: isSelected ? 'text' : 'default',
                    userSelect: 'none',
                  }}
                  onDoubleClick={isSelected ? handleDoubleClick : undefined}
                >
                  {g.char}
                </text>
              );
            });
          })}

          {/* Start offset drag handle — only for selected */}
          {selectedStartHandle && selectedEntry && (
            <rect
              x={selectedStartHandle.x - 4 * invS}
              y={selectedStartHandle.y - 4 * invS}
              width={8 * invS}
              height={8 * invS}
              fill="white"
              stroke="#3B82F6"
              strokeWidth={1.5 * invS}
              transform={`rotate(45, ${selectedStartHandle.x}, ${selectedStartHandle.y})`}
              style={{ pointerEvents: 'all', cursor: 'ew-resize' }}
              onPointerDown={(e) => handleOffsetDragStart(e, selectedEntry)}
            />
          )}
        </g>
      </svg>

      {/* Hidden text input for editing */}
      {isEditing && selectedStartHandle && (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') setIsEditing(false);
            e.stopPropagation();
          }}
          className="fixed z-[9999] bg-background border border-input rounded px-2 py-1 text-sm"
          style={{
            left: `${selectedStartHandle.x * zoom + vptX}px`,
            top: `${selectedStartHandle.y * zoom + vptY - 30}px`,
          }}
          autoFocus
        />
      )}
    </>
  );
}

import { useRef, useCallback, useMemo } from 'react';
import { Point, Path } from 'fabric';
import {
  detectSharpCorners,
  computeWidgetPosition,
  applyCornerRadius,
  type CornerInfo,
} from '@/lib/canvas/cornerRadiusEngine';
import { generatePathD } from '@/lib/penTool/geometry';
import type { Segment } from '@/lib/penTool/geometry';

interface CornerRadiusOverlayProps {
  selectedObject: any;
  canvas: any;
  containerWidth: number;
  containerHeight: number;
  selectedCornerIndex?: number | null;
}

export default function CornerRadiusOverlay({
  selectedObject,
  canvas,
  containerWidth,
  containerHeight,
  selectedCornerIndex,
}: CornerRadiusOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<{
    cornerIdx: number;
    cornerInfo: CornerInfo;
    startX: number;
    startY: number;
    startRadius: number;
    allCorners: CornerInfo[];
  } | null>(null);
  const rafRef = useRef<number>(0);
  const tooltipRef = useRef<SVGTextElement>(null);
  const radiiRef = useRef<number[]>([]);

  // Extract penToolData
  const penData = selectedObject?.penToolData;
  const segments: Segment[] | null = penData?.segments?.length >= 3
    ? (penData.originalSegments ?? penData.segments)
    : null;
  const closed = penData?.closed ?? false;

  const corners = useMemo(() => {
    if (!segments) return [];
    return detectSharpCorners(segments, closed);
  }, [segments, closed]);

  // Initialize radii ref from penToolData
  if (segments && (!radiiRef.current.length || radiiRef.current.length !== segments.length)) {
    radiiRef.current = penData?.cornerRadii
      ? [...penData.cornerRadii]
      : new Array(segments.length).fill(0);
  }

  // Get viewport transform
  const zoom = canvas?.getZoom() ?? 1;
  const vptX = canvas?.viewportTransform?.[4] ?? 0;
  const vptY = canvas?.viewportTransform?.[5] ?? 0;
  const invS = 1 / zoom;

  const updatePath = useCallback((newRadii: number[]) => {
    if (!selectedObject || !penData || !segments) return;
    const roundedSegs = applyCornerRadius(segments, closed, newRadii);
    const d = generatePathD({ id: '_r', closed, segments: roundedSegs });
    try {
      // Capture visual center before ANY geometry change
      const oldCenter = selectedObject.getCenterPoint();

      // Use Fabric's internal _setPath for atomic update of path/width/height/pathOffset
      if (typeof (selectedObject as any)._setPath === 'function') {
        (selectedObject as any)._setPath(d);
      } else {
        // Fallback: initialize a new path and copy parsed path array only
        const tempPath = new Path(d);
        (selectedObject as any).path = (tempPath as any).path;
        (selectedObject as any).width = tempPath.width;
        (selectedObject as any).height = tempPath.height;
        (selectedObject as any).pathOffset = (tempPath as any).pathOffset;
      }

      // Restore visual center AFTER all geometry is settled
      selectedObject.setPositionByOrigin(oldCenter, 'center', 'center');
      selectedObject.setCoords();

      // Sync penData pathOffset so other systems stay consistent
      if (penData) {
        penData.pathOffsetX = (selectedObject as any).pathOffset?.x ?? 0;
        penData.pathOffsetY = (selectedObject as any).pathOffset?.y ?? 0;
      }

      canvas?.requestRenderAll();
    } catch {
      // Silently handle invalid path
    }
  }, [selectedObject, penData, segments, closed, canvas]);

  const handlePointerDown = useCallback((
    e: React.PointerEvent,
    cornerIdx: number,
    cornerInfo: CornerInfo,
    widgets: any[],
  ) => {
    e.stopPropagation();
    e.preventDefault();

    // Store original segments if not already stored
    if (penData && !penData.originalSegments) {
      penData.originalSegments = JSON.parse(JSON.stringify(penData.segments));
    }

    draggingRef.current = {
      cornerIdx,
      cornerInfo,
      startX: e.clientX,
      startY: e.clientY,
      startRadius: radiiRef.current[cornerInfo.index] ?? 0,
      allCorners: corners,
    };

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current || rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const drag = draggingRef.current;
        if (!drag) return;

        const dx = ev.clientX - drag.startX;
        const dy = ev.clientY - drag.startY;

        const w = widgets[drag.cornerIdx];
        if (!w) return;
        const projLen = (dx * w.bisector.x + dy * w.bisector.y) / zoom;
        const newR = Math.max(0, Math.min(drag.startRadius + projLen, drag.cornerInfo.maxRadius));

        // If a specific corner is selected (via pen tool), default to individual
        const isIndividual = ev.altKey || (selectedCornerIndex != null && drag.cornerInfo.index === selectedCornerIndex);
        if (isIndividual) {
          // Only change THIS corner individually
          radiiRef.current[drag.cornerInfo.index] = newR;
        } else {
          // Default: change ALL corners uniformly
          for (const c of drag.allCorners) {
            radiiRef.current[c.index] = Math.min(newR, c.maxRadius);
          }
        }

        updatePath(radiiRef.current);

        if (tooltipRef.current) {
          tooltipRef.current.textContent = `${Math.round(newR * 10) / 10}`;
          tooltipRef.current.setAttribute('x', String((ev.clientX - vptX) / zoom + 12 * invS));
          tooltipRef.current.setAttribute('y', String((ev.clientY - vptY) / zoom - 8 * invS));
          tooltipRef.current.style.display = 'block';
        }
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      draggingRef.current = null;

      if (penData) {
        penData.cornerRadii = [...radiiRef.current];
        if (segments) {
          penData.segments = applyCornerRadius(segments, closed, radiiRef.current);
        }
      }

      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }

      canvas?.fire('object:modified', { target: selectedObject });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [penData, segments, corners, zoom, vptX, vptY, invS, closed, canvas, selectedObject, updatePath]);

  // Early return AFTER all hooks
  if (!segments || corners.length === 0) return null;

  // Transform point from path-local to world coords using LIVE pathOffset (not stale penData)
  const transformMatrix = selectedObject.calcTransformMatrix();
  const pathOffsetX = (selectedObject as any).pathOffset?.x ?? 0;
  const pathOffsetY = (selectedObject as any).pathOffset?.y ?? 0;

  const toWorld = (pt: { x: number; y: number }) => {
    // Segments are in path-local coords (starting from {0,0})
    // Subtract pathOffset to center them in the object, then apply transform matrix
    const centeredX = pt.x - pathOffsetX;
    const centeredY = pt.y - pathOffsetY;
    const localPt = new Point(centeredX, centeredY);
    const worldPt = localPt.transform(transformMatrix);
    return { x: worldPt.x, y: worldPt.y };
  };

  // Compute widget positions in world coords
  const angle = selectedObject.angle ?? 0;
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = selectedObject.scaleX ?? 1;
  const sy = selectedObject.scaleY ?? 1;

  const widgets = corners.map((corner) => {
    const worldAnchor = toWorld(corner.anchor);
    const r = radiiRef.current[corner.index] ?? 0;

    const worldBisector = {
      x: corner.bisector.x * sx * cos - corner.bisector.y * sy * sin,
      y: corner.bisector.x * sx * sin + corner.bisector.y * sy * cos,
    };
    const bLen = Math.sqrt(worldBisector.x ** 2 + worldBisector.y ** 2) || 1;
    const normalizedBisector = { x: worldBisector.x / bLen, y: worldBisector.y / bLen };

    const pos = computeWidgetPosition(worldAnchor, normalizedBisector, r, corner.maxRadius);
    return { corner, pos, worldAnchor, bisector: normalizedBisector };
  });

  return (
    <svg
      ref={svgRef}
      width={containerWidth}
      height={containerHeight}
      className="absolute inset-0"
      style={{ zIndex: 26, pointerEvents: 'none' }}
    >
      <g transform={`matrix(${zoom},0,0,${zoom},${vptX},${vptY})`}>
        {widgets.map((w, i) => {
          const r = radiiRef.current[w.corner.index] ?? 0;
          return (
            <circle
              key={w.corner.index}
              cx={w.pos.x}
              cy={w.pos.y}
              r={3.5 * invS}
              fill={r > 0.1 ? '#3B82F6' : 'white'}
              stroke="#3B82F6"
              strokeWidth={1.5 * invS}
              style={{ pointerEvents: 'all', cursor: 'pointer' }}
              onPointerDown={(e) => handlePointerDown(e, i, w.corner, widgets)}
            />
          );
        })}
        <text
          ref={tooltipRef}
          x={0}
          y={0}
          fill="#3B82F6"
          fontSize={11 * invS}
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
          style={{ display: 'none', pointerEvents: 'none' }}
        />
      </g>
    </svg>
  );
}

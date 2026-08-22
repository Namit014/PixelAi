// Pure geometry engine for corner radius — no DOM, no React
import type { Point, Segment, PathModel } from '@/lib/penTool/geometry';
import { distance, sub, add, scale as scaleVec, lerp, generatePathD } from '@/lib/penTool/geometry';

// ── Corner detection ────────────────────────────────────────

export interface CornerInfo {
  index: number;
  angle: number;           // interior angle in radians
  bisector: Point;         // unit vector pointing inward along bisector
  maxRadius: number;       // half of shorter adjacent edge
  anchor: Point;
  prevAnchor: Point;
  nextAnchor: Point;
}

/**
 * Detect sharp corners eligible for rounding.
 * For closed paths all anchors are candidates; for open paths, first/last are excluded.
 */
export function detectSharpCorners(segments: Segment[], closed: boolean): CornerInfo[] {
  const n = segments.length;
  if (n < 3 && closed) return [];
  if (n < 3) return [];

  const corners: CornerInfo[] = [];
  const startIdx = closed ? 0 : 1;
  const endIdx = closed ? n : n - 1;

  for (let i = startIdx; i < endIdx; i++) {
    const prevIdx = closed ? (i - 1 + n) % n : i - 1;
    const nextIdx = closed ? (i + 1) % n : i + 1;

    const prev = segments[prevIdx].anchor;
    const curr = segments[i].anchor;
    const next = segments[nextIdx].anchor;

    // Compute tangent directions using handles if present, else anchor-to-anchor
    // Incoming tangent: handleIn points toward the anchor, so use it directly as direction FROM prev
    // If no handleIn, use the straight-line direction from prev anchor
    // Incoming tangent: handleIn is an absolute position, convert to direction from anchor
    const inTangent = segments[i].handleIn
      ? sub(segments[i].handleIn!, curr)
      : sub(prev, curr);
    // Outgoing tangent: handleOut is an absolute position, convert to direction from anchor
    const outTangent = segments[i].handleOut
      ? sub(segments[i].handleOut!, curr)
      : sub(next, curr);

    const len1 = Math.sqrt(inTangent.x * inTangent.x + inTangent.y * inTangent.y);
    const len2 = Math.sqrt(outTangent.x * outTangent.x + outTangent.y * outTangent.y);

    if (len1 < 0.01 || len2 < 0.01) continue;

    const n1 = { x: inTangent.x / len1, y: inTangent.y / len1 };
    const n2 = { x: outTangent.x / len2, y: outTangent.y / len2 };

    const dot = n1.x * n2.x + n1.y * n2.y;
    const clampedDot = Math.max(-1, Math.min(1, dot));
    const angle = Math.acos(clampedDot);

    // Skip nearly-straight angles (> 175°)
    if (angle > (175 * Math.PI) / 180) continue;

    // Bisector direction (points inward)
    const bx = n1.x + n2.x;
    const by = n1.y + n2.y;
    const bLen = Math.sqrt(bx * bx + by * by) || 1;
    const bisector = { x: bx / bLen, y: by / bLen };

    // Max radius = half of shorter edge distance (anchor-to-anchor)
    const edgeLen1 = distance(prev, curr);
    const edgeLen2 = distance(curr, next);
    const maxRadius = Math.min(edgeLen1, edgeLen2) / 2;

    corners.push({
      index: i,
      angle,
      bisector,
      maxRadius,
      anchor: curr,
      prevAnchor: prev,
      nextAnchor: next,
    });
  }

  return corners;
}

// ── Apply corner radius ─────────────────────────────────────

const KAPPA = 0.5522847498; // Bézier approximation of quarter-circle

/**
 * Apply per-corner radius to original sharp segments.
 * Returns new segment array with arc replacements.
 */
export function applyCornerRadius(
  originalSegments: Segment[],
  closed: boolean,
  radii: number[],
): Segment[] {
  const corners = detectSharpCorners(originalSegments, closed);
  if (corners.length === 0) return originalSegments.map(s => ({ ...s }));

  // Build a map: original index → clamped radius
  const radiusMap = new Map<number, number>();
  for (const corner of corners) {
    const r = radii[corner.index] ?? 0;
    if (r > 0.1) {
      radiusMap.set(corner.index, Math.min(r, corner.maxRadius));
    }
  }

  if (radiusMap.size === 0) return originalSegments.map(s => ({ ...s }));

  const result: Segment[] = [];
  const n = originalSegments.length;

  for (let i = 0; i < n; i++) {
    const seg = originalSegments[i];
    const r = radiusMap.get(i);

    if (r === undefined || r < 0.1) {
      result.push({ ...seg });
      continue;
    }

    // Find prev/next anchors
    const prevIdx = closed ? (i - 1 + n) % n : i - 1;
    const nextIdx = closed ? (i + 1) % n : i + 1;
    const prevAnchor = originalSegments[prevIdx].anchor;
    const nextAnchor = originalSegments[nextIdx].anchor;

    // Direction vectors from corner to adjacent anchors
    const toPrev = sub(prevAnchor, seg.anchor);
    const toNext = sub(nextAnchor, seg.anchor);
    const lenPrev = Math.sqrt(toPrev.x * toPrev.x + toPrev.y * toPrev.y) || 1;
    const lenNext = Math.sqrt(toNext.x * toNext.x + toNext.y * toNext.y) || 1;
    const dirPrev = { x: toPrev.x / lenPrev, y: toPrev.y / lenPrev };
    const dirNext = { x: toNext.x / lenNext, y: toNext.y / lenNext };

    // Tangent points at distance r from corner along edges
    const tangentPrev: Point = {
      x: seg.anchor.x + dirPrev.x * r,
      y: seg.anchor.y + dirPrev.y * r,
    };
    const tangentNext: Point = {
      x: seg.anchor.x + dirNext.x * r,
      y: seg.anchor.y + dirNext.y * r,
    };

    // Calculate half-angle for kappa scaling
    const dot = dirPrev.x * dirNext.x + dirPrev.y * dirNext.y;
    const cornerAngle = Math.acos(Math.max(-1, Math.min(1, dot)));
    const sweepAngle = Math.PI - cornerAngle;
    const k = (4 / 3) * Math.tan(sweepAngle / 4);
    const handleLen = r * k;

    // Handles for the arc (pointing from tangent toward the corner, but controlled)
    const handleOutPrev: Point = {
      x: tangentPrev.x - dirPrev.x * handleLen,
      y: tangentPrev.y - dirPrev.y * handleLen,
    };
    const handleInNext: Point = {
      x: tangentNext.x - dirNext.x * handleLen,
      y: tangentNext.y - dirNext.y * handleLen,
    };

    // Replace single anchor with two anchors (arc start, arc end)
    result.push({
      anchor: tangentPrev,
      handleIn: seg.handleIn, // preserve incoming handle from prev segment
      handleOut: handleOutPrev,
    });
    result.push({
      anchor: tangentNext,
      handleIn: handleInNext,
      handleOut: seg.handleOut, // preserve outgoing handle to next segment
    });
  }

  return result;
}

// ── Widget position for drag handle ─────────────────────────

/**
 * Compute the screen position of a corner radius drag widget.
 * Positioned along the angle bisector, inset proportionally.
 */
export function computeWidgetPosition(
  anchor: Point,
  bisector: Point,
  currentRadius: number,
  maxRadius: number,
): Point {
  // Widget sits along bisector, distance proportional to radius
  // Min offset = 12px (when r=0), max offset matches the tangent distance
  const offset = 12 + (currentRadius / Math.max(maxRadius, 1)) * Math.max(maxRadius * 0.3, 8);
  return {
    x: anchor.x + bisector.x * offset,
    y: anchor.y + bisector.y * offset,
  };
}

// ── Map drag distance to radius ─────────────────────────────

/**
 * Convert drag pixel distance to a radius value.
 * Dragging inward (toward bisector) increases radius.
 */
export function radiusFromDragDistance(
  dragDelta: number,
  maxRadius: number,
): number {
  return Math.max(0, Math.min(dragDelta, maxRadius));
}

// ── Generate rounded path D string ──────────────────────────

export function generateRoundedPathD(
  originalSegments: Segment[],
  closed: boolean,
  radii: number[],
): string {
  const roundedSegments = applyCornerRadius(originalSegments, closed, radii);
  return generatePathD({ id: '_rounded', closed, segments: roundedSegments });
}

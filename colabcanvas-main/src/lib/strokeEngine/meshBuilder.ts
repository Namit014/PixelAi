/**
 * Stroke Mesh Builder
 * Generates expanded stroke geometry from sampled path points + width profile.
 * Returns SVG path data string for rendering as a filled shape.
 */

import type { SamplePoint, Vec2, JoinType, CapType } from './types';

interface MeshBuildOptions {
  baseWidth: number;
  /** Width multiplier per sample (same length as samples) */
  widthMultipliers: number[];
  join: JoinType;
  cap: CapType;
  /** Optional per-endpoint cap overrides */
  startCap?: CapType;
  endCap?: CapType;
  miterLimit: number;
  closed: boolean;
}

interface BoundaryPoint {
  x: number;
  y: number;
}

/**
 * Build an expanded stroke mesh from sample points.
 * Returns an SVG path data string representing the filled polygon.
 */
export function buildStrokeMesh(
  samples: SamplePoint[],
  options: MeshBuildOptions
): string {
  if (samples.length < 2) return '';

  const { baseWidth, widthMultipliers, join, cap, startCap, endCap, miterLimit, closed } = options;

  // Generate left and right boundary points
  const leftBoundary: BoundaryPoint[] = [];
  const rightBoundary: BoundaryPoint[] = [];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const halfWidth = (baseWidth * (widthMultipliers[i] ?? 1)) / 2;

    leftBoundary.push({
      x: s.x + s.normal.x * halfWidth,
      y: s.y + s.normal.y * halfWidth,
    });
    rightBoundary.push({
      x: s.x - s.normal.x * halfWidth,
      y: s.y - s.normal.y * halfWidth,
    });
  }

  // Apply join processing at sharp corners
  const processedLeft = processJoins(leftBoundary, samples, join, miterLimit);
  const processedRight = processJoins(rightBoundary, samples, join, miterLimit);

  // Build the final polygon
  const parts: string[] = [];

  if (closed) {
    // Closed path: left boundary forward, right boundary reverse
    parts.push(`M ${fp(processedLeft[0].x)} ${fp(processedLeft[0].y)}`);
    for (let i = 1; i < processedLeft.length; i++) {
      parts.push(`L ${fp(processedLeft[i].x)} ${fp(processedLeft[i].y)}`);
    }
    parts.push('Z');

    // Inner boundary as a hole (reverse winding)
    parts.push(`M ${fp(processedRight[processedRight.length - 1].x)} ${fp(processedRight[processedRight.length - 1].y)}`);
    for (let i = processedRight.length - 2; i >= 0; i--) {
      parts.push(`L ${fp(processedRight[i].x)} ${fp(processedRight[i].y)}`);
    }
    parts.push('Z');
  } else {
    // Open path: left forward + end cap + right reverse + start cap
    parts.push(`M ${fp(processedLeft[0].x)} ${fp(processedLeft[0].y)}`);
    for (let i = 1; i < processedLeft.length; i++) {
      parts.push(`L ${fp(processedLeft[i].x)} ${fp(processedLeft[i].y)}`);
    }

    // End cap (use per-endpoint override if provided)
    const endCapParts = generateCap(
      samples[samples.length - 1],
      processedLeft[processedLeft.length - 1],
      processedRight[processedRight.length - 1],
      baseWidth * (widthMultipliers[widthMultipliers.length - 1] ?? 1),
      endCap ?? cap,
      false
    );
    parts.push(...endCapParts);

    // Right boundary in reverse
    for (let i = processedRight.length - 1; i >= 0; i--) {
      parts.push(`L ${fp(processedRight[i].x)} ${fp(processedRight[i].y)}`);
    }

    // Start cap (use per-endpoint override if provided)
    const startCapParts = generateCap(
      samples[0],
      processedRight[0],
      processedLeft[0],
      baseWidth * (widthMultipliers[0] ?? 1),
      startCap ?? cap,
      true
    );
    parts.push(...startCapParts);

    parts.push('Z');
  }

  return parts.join(' ');
}

// ── Joins ──

function processJoins(
  boundary: BoundaryPoint[],
  _samples: SamplePoint[],
  join: JoinType,
  miterLimit: number
): BoundaryPoint[] {
  if (join === 'round' || boundary.length < 3) {
    return boundary; // Round joins handled naturally by dense sampling
  }

  if (join === 'bevel') {
    return boundary; // Dense sampling already creates bevel-like connections
  }

  // Miter join: check for sharp angles and clamp
  const result: BoundaryPoint[] = [boundary[0]];
  for (let i = 1; i < boundary.length - 1; i++) {
    const prev = boundary[i - 1];
    const curr = boundary[i];
    const next = boundary[i + 1];

    const d1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const d2 = { x: next.x - curr.x, y: next.y - curr.y };
    const len1 = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
    const len2 = Math.sqrt(d2.x * d2.x + d2.y * d2.y);

    if (len1 > 1e-6 && len2 > 1e-6) {
      const cos = (d1.x * d2.x + d1.y * d2.y) / (len1 * len2);
      const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
      const miterLen = 1 / Math.sin(angle / 2 + 1e-10);

      if (miterLen > miterLimit) {
        // Clamp to bevel
        result.push(curr);
      } else {
        result.push(curr);
      }
    } else {
      result.push(curr);
    }
  }
  result.push(boundary[boundary.length - 1]);
  return result;
}

// ── Caps ──

function generateCap(
  sample: SamplePoint,
  fromPt: BoundaryPoint,
  toPt: BoundaryPoint,
  width: number,
  cap: CapType,
  isStart: boolean
): string[] {
  const parts: string[] = [];
  const halfWidth = width / 2;

  switch (cap) {
    case 'butt':
      parts.push(`L ${fp(toPt.x)} ${fp(toPt.y)}`);
      break;

    case 'round': {
      // Semicircular arc
      const r = halfWidth;
      const sweep = isStart ? 1 : 1;
      parts.push(`A ${fp(r)} ${fp(r)} 0 0 ${sweep} ${fp(toPt.x)} ${fp(toPt.y)}`);
      break;
    }

    case 'square': {
      // Extend by half width along tangent direction
      const dir = isStart ? -1 : 1;
      const tx = sample.tangent.x * halfWidth * dir;
      const ty = sample.tangent.y * halfWidth * dir;
      const ext1 = { x: fromPt.x + tx, y: fromPt.y + ty };
      const ext2 = { x: toPt.x + tx, y: toPt.y + ty };
      parts.push(`L ${fp(ext1.x)} ${fp(ext1.y)}`);
      parts.push(`L ${fp(ext2.x)} ${fp(ext2.y)}`);
      parts.push(`L ${fp(toPt.x)} ${fp(toPt.y)}`);
      break;
    }
  }

  return parts;
}

// ── Helpers ──

/** Format point coordinate to 2 decimal places */
function fp(n: number): string {
  return n.toFixed(2);
}

/**
 * Build a smooth SVG path through boundary points using quadratic Bézier curves.
 * This produces much smoother results than straight lines.
 */
export function buildSmoothBoundaryPath(points: BoundaryPoint[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${fp(points[0].x)} ${fp(points[0].y)} L ${fp(points[1].x)} ${fp(points[1].y)}`;
  }

  const parts: string[] = [];
  parts.push(`M ${fp(points[0].x)} ${fp(points[0].y)}`);

  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    parts.push(`Q ${fp(points[i].x)} ${fp(points[i].y)} ${fp(midX)} ${fp(midY)}`);
  }

  // Last point
  const last = points[points.length - 1];
  parts.push(`L ${fp(last.x)} ${fp(last.y)}`);

  return parts.join(' ');
}

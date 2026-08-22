/**
 * Path Sampling Engine
 * Converts cubic Bézier paths into dense polylines with arc-length parameterization.
 */

import type { SamplePoint, Vec2 } from './types';
import type { Segment, Point } from '@/lib/penTool/geometry';

// ── Vector Utils ──

function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

function vecSub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function vecLen(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vecNormalize(v: Vec2): Vec2 {
  const len = vecLen(v);
  if (len < 1e-10) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function vecPerp(v: Vec2): Vec2 {
  // Left-hand perpendicular (rotate 90° CCW)
  return { x: -v.y, y: v.x };
}

// ── Cubic Bézier Evaluation ──

function cubicBezierPoint(
  p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number
): Vec2 {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

function cubicBezierTangent(
  p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number
): Vec2 {
  const mt = 1 - t;
  return {
    x: 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

// ── Flatness Test ──

function cubicFlatness(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2): number {
  // Max deviation of control points from the line p0→p3
  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-10) {
    return Math.max(vecLen(vecSub(p1, p0)), vecLen(vecSub(p2, p0)));
  }
  const d1 = Math.abs((p1.x - p0.x) * dy - (p1.y - p0.y) * dx) / Math.sqrt(len2);
  const d2 = Math.abs((p2.x - p0.x) * dy - (p2.y - p0.y) * dx) / Math.sqrt(len2);
  return Math.max(d1, d2);
}

// ── Adaptive Subdivision ──

interface RawSample {
  x: number;
  y: number;
  tangent: Vec2;
}

function subdivideCubic(
  p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2,
  tStart: number, tEnd: number,
  epsilon: number,
  maxDepth: number,
  result: RawSample[],
  depth: number = 0
): void {
  if (depth > maxDepth) {
    const tMid = (tStart + tEnd) / 2;
    const pt = cubicBezierPoint(p0, p1, p2, p3, tMid);
    const tan = cubicBezierTangent(p0, p1, p2, p3, tMid);
    result.push({ x: pt.x, y: pt.y, tangent: vecNormalize(tan) });
    return;
  }

  // De Casteljau split at tMid of the sub-interval
  const flat = cubicFlatness(p0, p1, p2, p3);
  if (flat <= epsilon) {
    // Flat enough — just sample endpoints
    const tMid = (tStart + tEnd) / 2;
    const pt = cubicBezierPoint(p0, p1, p2, p3, tMid);
    const tan = cubicBezierTangent(p0, p1, p2, p3, tMid);
    result.push({ x: pt.x, y: pt.y, tangent: vecNormalize(tan) });
    return;
  }

  // De Casteljau split at t=0.5
  const m01 = vec2((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
  const m12 = vec2((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  const m23 = vec2((p2.x + p3.x) / 2, (p2.y + p3.y) / 2);
  const m012 = vec2((m01.x + m12.x) / 2, (m01.y + m12.y) / 2);
  const m123 = vec2((m12.x + m23.x) / 2, (m12.y + m23.y) / 2);
  const mid = vec2((m012.x + m123.x) / 2, (m012.y + m123.y) / 2);

  const tMid = (tStart + tEnd) / 2;
  subdivideCubic(p0, m01, m012, mid, tStart, tMid, epsilon, maxDepth, result, depth + 1);
  subdivideCubic(mid, m123, m23, p3, tMid, tEnd, epsilon, maxDepth, result, depth + 1);
}

// ── Main Sampling Function ──

/**
 * Sample a path defined by Segments into a dense polyline with normals.
 * @param segments Array of path segments
 * @param closed Whether the path is closed
 * @param epsilon Flatness threshold (default 0.5px)
 * @returns Array of SamplePoints with normalized t, tangent, and normal
 */
export function samplePath(
  segments: Segment[],
  closed: boolean,
  epsilon: number = 0.5
): SamplePoint[] {
  if (segments.length < 2) return [];

  const rawSamples: RawSample[] = [];
  const segCount = closed ? segments.length : segments.length - 1;
  const maxDepth = 8;

  for (let i = 0; i < segCount; i++) {
    const seg = segments[i];
    const nextSeg = segments[(i + 1) % segments.length];

    const p0: Vec2 = seg.anchor;
    const p3: Vec2 = nextSeg.anchor;

    const ho = seg.handleOut || seg.anchor;
    const hi = nextSeg.handleIn || nextSeg.anchor;

    const p1: Vec2 = ho;
    const p2: Vec2 = hi;

    // Add start point of segment
    if (i === 0) {
      const tan = cubicBezierTangent(p0, p1, p2, p3, 0);
      rawSamples.push({ x: p0.x, y: p0.y, tangent: vecNormalize(tan) });
    }

    // Adaptive subdivision
    subdivideCubic(p0, p1, p2, p3, 0, 1, epsilon, maxDepth, rawSamples);

    // Add end point
    const tanEnd = cubicBezierTangent(p0, p1, p2, p3, 1);
    rawSamples.push({ x: p3.x, y: p3.y, tangent: vecNormalize(tanEnd) });
  }

  // Remove near-duplicate consecutive points
  const filtered: RawSample[] = [rawSamples[0]];
  for (let i = 1; i < rawSamples.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = rawSamples[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    if (dx * dx + dy * dy > 0.01) {
      filtered.push(curr);
    }
  }

  // Compute arc lengths
  const arcLengths: number[] = [0];
  for (let i = 1; i < filtered.length; i++) {
    const dx = filtered[i].x - filtered[i - 1].x;
    const dy = filtered[i].y - filtered[i - 1].y;
    arcLengths.push(arcLengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const totalLength = arcLengths[arcLengths.length - 1] || 1;

  // Build SamplePoints with normalized t and normals
  const result: SamplePoint[] = filtered.map((s, i) => {
    const tangent = vecNormalize(s.tangent);
    const normal = vecPerp(tangent);
    return {
      x: s.x,
      y: s.y,
      t: arcLengths[i] / totalLength,
      tangent,
      normal,
    };
  });

  return result;
}

/**
 * Resample a set of SamplePoints to a fixed number of evenly-spaced points.
 */
export function resampleUniform(samples: SamplePoint[], count: number): SamplePoint[] {
  if (samples.length < 2 || count < 2) return samples;

  // Build cumulative arc lengths
  const arcLengths: number[] = [0];
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x;
    const dy = samples[i].y - samples[i - 1].y;
    arcLengths.push(arcLengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const totalLength = arcLengths[arcLengths.length - 1];
  if (totalLength < 1e-6) return samples;

  const result: SamplePoint[] = [];
  for (let i = 0; i < count; i++) {
    const targetLen = (i / (count - 1)) * totalLength;
    // Find the segment containing this arc length
    let segIdx = 0;
    for (let j = 1; j < arcLengths.length; j++) {
      if (arcLengths[j] >= targetLen) {
        segIdx = j - 1;
        break;
      }
      segIdx = j - 1;
    }
    const segLen = arcLengths[segIdx + 1] - arcLengths[segIdx];
    const localT = segLen > 1e-10 ? (targetLen - arcLengths[segIdx]) / segLen : 0;

    const a = samples[segIdx];
    const b = samples[Math.min(segIdx + 1, samples.length - 1)];
    const x = a.x + (b.x - a.x) * localT;
    const y = a.y + (b.y - a.y) * localT;
    const tx = a.tangent.x + (b.tangent.x - a.tangent.x) * localT;
    const ty = a.tangent.y + (b.tangent.y - a.tangent.y) * localT;
    const tangent = vecNormalize({ x: tx, y: ty });
    const normal = vecPerp(tangent);

    result.push({
      x, y,
      t: i / (count - 1),
      tangent,
      normal,
    });
  }

  return result;
}

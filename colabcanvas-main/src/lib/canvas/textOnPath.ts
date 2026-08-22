/**
 * TextOnPath Engine — Pure geometry for placing glyphs along Bézier paths.
 * Arc-length LUT, glyph advance computation, tangent-aligned placement.
 */

import { type Point, type Segment, cubicAt, distance } from '@/lib/penTool/geometry';

// ── Arc-length lookup table ─────────────────────────────────

export interface ArcLengthLUT {
  totalLength: number;
  sampleAt(dist: number): { point: Point; angle: number };
}

interface LUTEntry {
  t: number;        // global parameter
  segIdx: number;    // which segment pair
  localT: number;    // t within that segment
  length: number;    // cumulative arc length to this sample
  point: Point;
  angle: number;
}

/**
 * Build arc-length LUT by densely sampling the path.
 */
export function buildArcLengthLUT(
  segments: Segment[],
  closed: boolean,
  stepsPerSegment = 50,
): ArcLengthLUT {
  const entries: LUTEntry[] = [];
  const pairCount = closed ? segments.length : segments.length - 1;
  if (pairCount <= 0) {
    return { totalLength: 0, sampleAt: () => ({ point: { x: 0, y: 0 }, angle: 0 }) };
  }

  let cumLength = 0;

  for (let i = 0; i < pairCount; i++) {
    const next = (i + 1) % segments.length;
    const seg = segments[i];
    const nextSeg = segments[next];
    const p0 = seg.anchor;
    const p1 = seg.handleOut ?? seg.anchor;
    const p2 = nextSeg.handleIn ?? nextSeg.anchor;
    const p3 = nextSeg.anchor;

    let prevPt = p0;

    for (let s = 0; s <= stepsPerSegment; s++) {
      const localT = s / stepsPerSegment;
      const pt = cubicAt(p0, p1, p2, p3, localT);

      if (s > 0 || i === 0) {
        if (s > 0) {
          cumLength += distance(prevPt, pt);
        }

        // Compute tangent angle
        const angle = tangentAngle(p0, p1, p2, p3, localT);

        entries.push({
          t: (i + localT) / pairCount,
          segIdx: i,
          localT,
          length: cumLength,
          point: pt,
          angle,
        });
      }
      prevPt = pt;
    }
  }

  const totalLength = cumLength;

  function sampleAt(dist: number): { point: Point; angle: number } {
    if (entries.length === 0) return { point: { x: 0, y: 0 }, angle: 0 };
    if (dist <= 0) return { point: entries[0].point, angle: entries[0].angle };
    if (dist >= totalLength) {
      const last = entries[entries.length - 1];
      return { point: last.point, angle: last.angle };
    }

    // Binary search
    let lo = 0, hi = entries.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (entries[mid].length < dist) lo = mid;
      else hi = mid;
    }

    const a = entries[lo];
    const b = entries[hi];
    const range = b.length - a.length;
    if (range < 0.001) return { point: a.point, angle: a.angle };

    const frac = (dist - a.length) / range;
    return {
      point: {
        x: a.point.x + (b.point.x - a.point.x) * frac,
        y: a.point.y + (b.point.y - a.point.y) * frac,
      },
      angle: a.angle + (b.angle - a.angle) * frac,
    };
  }

  return { totalLength, sampleAt };
}

function tangentAngle(p0: Point, p1: Point, p2: Point, p3: Point, t: number): number {
  const mt = 1 - t;
  const dx = 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
  const dy = 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
  return Math.atan2(dy, dx);
}

// ── Glyph layout ────────────────────────────────────────────

export interface TextOnPathConfig {
  text: string;
  fontSize: number;
  fontFamily: string;
  alignment: 'start' | 'center' | 'end';
  startOffset: number;      // 0–1 normalized
  verticalOffset: number;   // baseline shift px
  letterSpacing: number;
  flip: boolean;
  reverseDirection: boolean;
}

export interface GlyphPlacement {
  char: string;
  x: number;
  y: number;
  angle: number; // radians
  glyphWidth: number;
  visible: boolean;
}

/**
 * Compute per-glyph advance widths using opentype.js.
 */
export async function computeGlyphAdvances(
  text: string,
  fontSize: number,
  fontFamily: string,
  letterSpacing: number,
): Promise<number[]> {
  // Dynamically import to reuse loadFont from textToOutlines
  const { loadFont } = await import('./textToOutlines');
  const font = await loadFont(fontFamily);
  if (!font) {
    // Fallback: estimate each glyph as 0.6 * fontSize
    return Array.from(text).map(() => fontSize * 0.6 + letterSpacing);
  }

  const glyphs = font.stringToGlyphs(text);
  const scale = fontSize / font.unitsPerEm;
  const advances: number[] = [];

  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    const advance = (glyph.advanceWidth || 0) * scale;
    let kerning = 0;
    if (i < glyphs.length - 1) {
      kerning = font.getKerningValue(glyph, glyphs[i + 1]) * scale;
    }
    advances.push(advance + kerning + letterSpacing);
  }
  return advances;
}

/**
 * Layout glyphs along a path using the arc-length LUT.
 */
export function layoutGlyphsOnPath(
  lut: ArcLengthLUT,
  config: TextOnPathConfig,
  advances: number[],
): GlyphPlacement[] {
  const { text, alignment, startOffset, verticalOffset, flip, reverseDirection } = config;
  const chars = Array.from(text);

  if (chars.length === 0 || advances.length === 0) return [];

  const totalTextWidth = advances.reduce((a, b) => a + b, 0);
  const pathLen = lut.totalLength;

  // Calculate start position based on alignment + offset
  let startDist = startOffset * pathLen;
  if (alignment === 'center') {
    startDist += (pathLen - totalTextWidth) / 2;
  } else if (alignment === 'end') {
    startDist += pathLen - totalTextWidth;
  }

  const placements: GlyphPlacement[] = [];
  let currentDist = startDist;

  for (let i = 0; i < chars.length; i++) {
    const glyphWidth = advances[i] ?? 0;
    // Position glyph at center of its advance
    const glyphCenter = currentDist + glyphWidth / 2;

    // For closed paths, wrap around
    const effectiveDist = pathLen > 0
      ? ((glyphCenter % pathLen) + pathLen) % pathLen
      : glyphCenter;

    const visible = reverseDirection
      ? glyphCenter >= 0 && glyphCenter <= pathLen
      : glyphCenter >= 0 && glyphCenter <= pathLen;

    const sample = lut.sampleAt(reverseDirection ? pathLen - effectiveDist : effectiveDist);

    let angle = sample.angle;
    let offsetX = 0;
    let offsetY = -verticalOffset;

    if (flip) {
      angle += Math.PI;
      offsetY = verticalOffset;
    }

    // Apply perpendicular offset for vertical position
    const perpX = -Math.sin(angle) * offsetY;
    const perpY = Math.cos(angle) * offsetY;

    placements.push({
      char: chars[i],
      x: sample.point.x + perpX,
      y: sample.point.y + perpY,
      angle: reverseDirection ? angle + Math.PI : angle,
      glyphWidth,
      visible,
    });

    currentDist += glyphWidth;
  }

  return placements;
}

// ── Data model ──────────────────────────────────────────────

export interface TextOnPathData {
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  alignment: 'start' | 'center' | 'end';
  startOffset: number;
  verticalOffset: number;
  letterSpacing: number;
  flip: boolean;
  reverseDirection: boolean;
}

export const DEFAULT_TEXT_ON_PATH: TextOnPathData = {
  text: 'Type on path',
  fontSize: 24,
  fontFamily: 'Inter',
  fill: '#000000',
  alignment: 'start',
  startOffset: 0,
  verticalOffset: 0,
  letterSpacing: 0,
  flip: false,
  reverseDirection: false,
};

/**
 * Brush Stroke Engine
 * Generates brush-textured stroke geometry by mapping brush profiles
 * along the path centerline as a variable-width ribbon with edge roughness.
 */

import type { SamplePoint, BrushMeta, BrushPreset, WidthProfileStop } from './types';
import { BRUSH_PRESETS } from './types';
import { createNoise2D } from 'simplex-noise';

// ── Seeded PRNG ──

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ── Width curve evaluation ──

function evaluateBrushWidth(t: number, curve: WidthProfileStop[]): number {
  if (!curve || curve.length === 0) return 1;
  if (t <= curve[0].t) return curve[0].width;
  if (t >= curve[curve.length - 1].t) return curve[curve.length - 1].width;

  for (let i = 0; i < curve.length - 1; i++) {
    if (t >= curve[i].t && t <= curve[i + 1].t) {
      const localT = (t - curve[i].t) / (curve[i + 1].t - curve[i].t);
      const smooth = localT * localT * (3 - 2 * localT);
      return curve[i].width + (curve[i + 1].width - curve[i].width) * smooth;
    }
  }
  return 1;
}

/**
 * Apply brush texture to sample points by generating width multipliers
 * that incorporate both the brush's width curve and edge roughness.
 * 
 * @param samples Path sample points
 * @param meta Brush metadata (brushId, direction)
 * @param objectId Object ID for deterministic roughness
 * @returns Width multiplier array (same length as samples)
 */
export function applyBrushProfile(
  samples: SamplePoint[],
  meta: BrushMeta,
  objectId: string
): number[] {
  const preset = BRUSH_PRESETS.find(b => b.id === meta.brushId) || BRUSH_PRESETS[0];
  const isReverse = meta.direction === 'reverse';

  const seed = stringToSeed(objectId);
  const rng = mulberry32(seed);
  const noise2D = createNoise2D(rng);

  return samples.map((s, i) => {
    // Map t based on direction
    const t = isReverse ? 1 - s.t : s.t;

    // Base width from brush curve
    let width = evaluateBrushWidth(t, preset.widthCurve);

    // Apply edge roughness via noise
    if (preset.edgeRoughness > 0) {
      const roughness = noise2D(s.t * 15, seed * 0.001) * preset.edgeRoughness;
      width *= (1 + roughness * 0.5);
    }

    return Math.max(0, width);
  });
}

/**
 * Get a brush preset by ID.
 */
export function getBrushPreset(brushId: string): BrushPreset | undefined {
  return BRUSH_PRESETS.find(b => b.id === brushId);
}

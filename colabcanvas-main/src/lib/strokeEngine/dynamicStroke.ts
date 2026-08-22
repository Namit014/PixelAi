/**
 * Dynamic Stroke Engine
 * Applies deterministic noise-based offsets to path centerline
 * before mesh expansion, creating irregular/organic stroke effects.
 */

import type { SamplePoint, DynamicMeta } from './types';
import { createNoise2D } from 'simplex-noise';

// ── Seeded PRNG (Mulberry32) ──

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convert a string ID to a numeric seed */
function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash);
}

// ── Smoothing ──

function smoothSamples(samples: SamplePoint[], passes: number): SamplePoint[] {
  let result = samples;
  for (let p = 0; p < passes; p++) {
    const smoothed: SamplePoint[] = [result[0]];
    for (let i = 1; i < result.length - 1; i++) {
      smoothed.push({
        ...result[i],
        x: result[i - 1].x * 0.25 + result[i].x * 0.5 + result[i + 1].x * 0.25,
        y: result[i - 1].y * 0.25 + result[i].y * 0.5 + result[i + 1].y * 0.25,
      });
    }
    smoothed.push(result[result.length - 1]);
    result = smoothed;
  }
  return result;
}

/**
 * Apply dynamic stroke noise to sample points.
 * Offsets each point perpendicular to the path based on simplex noise.
 * 
 * @param samples Original path sample points
 * @param meta Dynamic stroke parameters
 * @param objectId Deterministic seed source (object ID)
 * @returns Modified sample points with noise-offset positions
 */
export function applyDynamicStroke(
  samples: SamplePoint[],
  meta: DynamicMeta,
  objectId: string
): SamplePoint[] {
  if (!meta || samples.length < 2) return samples;
  if (meta.wiggle === 0) return samples;

  const seed = stringToSeed(objectId);
  const rng = mulberry32(seed);
  const noise2D = createNoise2D(rng);

  const { frequency, wiggle, smoothen } = meta;

  // Apply noise offset perpendicular to path
  const modified: SamplePoint[] = samples.map((s, i) => {
    // Use t * frequency for noise coordinate, with a second dimension for variation
    const noiseVal = noise2D(s.t * frequency, seed * 0.001);
    const offset = noiseVal * wiggle;

    return {
      ...s,
      x: s.x + s.normal.x * offset,
      y: s.y + s.normal.y * offset,
    };
  });

  // Apply smoothing
  const smoothPasses = Math.round(smoothen);
  if (smoothPasses > 0) {
    return smoothSamples(modified, smoothPasses);
  }

  return modified;
}

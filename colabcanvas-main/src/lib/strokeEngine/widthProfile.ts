/**
 * Width Profile System
 * Evaluates variable stroke width along a path using interpolated stops.
 */

import type { WidthProfile, WidthProfileStop } from './types';
import {
  WIDTH_PROFILE_FLAT,
  WIDTH_PROFILE_TAPER,
  WIDTH_PROFILE_REVERSE_TAPER,
  WIDTH_PROFILE_BULGE,
} from './types';

/**
 * Evaluate width at a given parameter t (0→1) along the path.
 * Returns the width multiplier (multiply by base stroke width).
 */
export function evaluateProfile(t: number, profile?: WidthProfile): number {
  if (!profile || !profile.stops || profile.stops.length === 0) {
    return 1; // No profile = flat/uniform
  }

  const stops = profile.stops;

  // Clamp t
  if (t <= stops[0].t) return stops[0].width;
  if (t >= stops[stops.length - 1].t) return stops[stops.length - 1].width;

  // Find bounding stops
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      const localT = (t - stops[i].t) / (stops[i + 1].t - stops[i].t);
      // Smooth interpolation using smoothstep
      const smooth = localT * localT * (3 - 2 * localT);
      return stops[i].width + (stops[i + 1].width - stops[i].width) * smooth;
    }
  }

  return 1;
}

/**
 * Create a custom width profile from user-defined stops.
 */
export function createCustomProfile(stops: WidthProfileStop[]): WidthProfile {
  const sorted = [...stops].sort((a, b) => a.t - b.t);
  // Ensure we have endpoints
  if (sorted.length === 0 || sorted[0].t > 0) {
    sorted.unshift({ t: 0, width: sorted.length > 0 ? sorted[0].width : 1 });
  }
  if (sorted[sorted.length - 1].t < 1) {
    sorted.push({ t: 1, width: sorted[sorted.length - 1].width });
  }
  return {
    id: 'custom',
    name: 'Custom',
    stops: sorted,
  };
}

/**
 * Get a named preset profile.
 */
export function getPresetProfile(id: string): WidthProfile {
  switch (id) {
    case 'flat': return WIDTH_PROFILE_FLAT;
    case 'taper': return WIDTH_PROFILE_TAPER;
    case 'reverse-taper': return WIDTH_PROFILE_REVERSE_TAPER;
    case 'bulge': return WIDTH_PROFILE_BULGE;
    default: return WIDTH_PROFILE_FLAT;
  }
}

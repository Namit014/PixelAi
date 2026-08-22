/**
 * Stroke Renderer — Main Orchestrator
 * Takes a StrokeConfig + path segments → generates expanded stroke mesh.
 * Implements caching to avoid unnecessary recomputation.
 */

import type { StrokeConfig, StrokeMesh, SamplePoint } from './types';
import { hashStrokeConfig } from './types';
import { samplePath, resampleUniform } from './pathSampler';
import { evaluateProfile } from './widthProfile';
import { buildStrokeMesh } from './meshBuilder';
import { applyDynamicStroke } from './dynamicStroke';
import { applyBrushProfile } from './brushEngine';
import type { Segment } from '@/lib/penTool/geometry';

// ── Mesh Cache ──

const meshCache = new Map<string, StrokeMesh>();

/**
 * Clear the mesh cache for a specific object, or the entire cache.
 */
export function clearMeshCache(objectId?: string): void {
  if (objectId) {
    meshCache.delete(objectId);
  } else {
    meshCache.clear();
  }
}

/**
 * Generate the expanded stroke mesh for a path.
 * 
 * @param segments Path segments (from penToolData)
 * @param closed Whether the path is closed
 * @param config The stroke configuration
 * @param objectId Unique object identifier (for caching + deterministic noise)
 * @param pathVersion Incremented when path geometry changes
 * @returns StrokeMesh with SVG path data, or null for basic strokes
 */
export function generateStrokeMesh(
  segments: Segment[],
  closed: boolean,
  config: StrokeConfig,
  objectId: string,
  pathVersion: number = 0
): StrokeMesh | null {
  // Basic strokes with no width profile use native rendering
  if (config.type === 'basic' && !config.widthProfile) {
    return null;
  }

  // Check cache
  const configHash = hashStrokeConfig(config, pathVersion);
  const cached = meshCache.get(objectId);
  if (cached && cached.configHash === configHash) {
    return cached;
  }

  // Step 1: Sample the path
  let samples = samplePath(segments, closed, 0.5);
  if (samples.length < 2) return null;

  // For dynamic/brush, resample to uniform spacing for better noise distribution
  if (config.type === 'dynamic' || config.type === 'brush') {
    const targetCount = Math.max(60, Math.min(samples.length * 2, 300));
    samples = resampleUniform(samples, targetCount);
  }

  // Step 2: Apply dynamic noise (if dynamic type)
  if (config.type === 'dynamic' && config.dynamicMeta) {
    samples = applyDynamicStroke(samples, config.dynamicMeta, objectId);
  }

  // Step 3: Compute width multipliers
  let widthMultipliers: number[];

  if (config.type === 'brush' && config.brushMeta) {
    // Brush: use brush profile for width
    widthMultipliers = applyBrushProfile(samples, config.brushMeta, objectId);

    // Also apply width profile on top if present
    if (config.widthProfile) {
      widthMultipliers = widthMultipliers.map((w, i) => {
        return w * evaluateProfile(samples[i].t, config.widthProfile);
      });
    }
  } else if (config.widthProfile) {
    // Width profile only
    widthMultipliers = samples.map(s => evaluateProfile(s.t, config.widthProfile));
  } else {
    // Uniform width
    widthMultipliers = samples.map(() => 1);
  }

  // Step 4: Build the mesh
  const miterLimit = config.miterAngle > 0
    ? 1 / Math.sin((config.miterAngle * Math.PI / 180) / 2 + 1e-10)
    : 4;

  // For brush/dynamic strokes, use 'butt' cap per-endpoint when width is near-zero
  // so the natural taper shows through instead of being masked by round cap arcs
  let startCap: typeof config.cap | undefined;
  let endCap: typeof config.cap | undefined;
  if ((config.type === 'brush' || config.type === 'dynamic') && widthMultipliers.length >= 2) {
    const startW = widthMultipliers[0];
    const endW = widthMultipliers[widthMultipliers.length - 1];
    if (startW < 0.1) startCap = 'butt';
    if (endW < 0.1) endCap = 'butt';
  }

  const pathData = buildStrokeMesh(samples, {
    baseWidth: config.width,
    widthMultipliers,
    join: config.join,
    cap: config.cap,
    startCap,
    endCap,
    miterLimit,
    closed,
  });

  if (!pathData) return null;

  const mesh: StrokeMesh = {
    pathData,
    version: (cached?.version ?? 0) + 1,
    configHash,
  };

  // Cache result
  meshCache.set(objectId, mesh);

  return mesh;
}

/**
 * Check if a stroke config requires expanded mesh rendering
 * (vs. native SVG/Canvas stroke).
 */
export function needsExpansion(config: StrokeConfig): boolean {
  if (config.type === 'dynamic' || config.type === 'brush') return true;
  if (config.widthProfile && config.widthProfile.id !== 'flat') return true;
  return false;
}

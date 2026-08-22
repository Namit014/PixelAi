import type { CanvasFilter, FilterCategory } from './types';
import { grainFilter } from './filters/grain';
import { bloomFilter } from './filters/bloom';
import { pixelateFilter } from './filters/pixelate';
import { duotoneFilter } from './filters/duotone';
import { glitchFilter } from './filters/glitch';
import { noiseFilter } from './filters/noise';
import { motionBlurFilter } from './filters/motionBlur';
import { radialBlurFilter } from './filters/radialBlur';
import { bokehFilter } from './filters/bokeh';
import { lensDistortionFilter } from './filters/lensDistortion';
import { ditherFilter } from './filters/dither';
import { halftoneFilter } from './filters/halftone';
import { mosaicFilter } from './filters/mosaic';
import { photocopyFilter } from './filters/photocopy';
import { twirlFilter } from './filters/twirl';
import { tritoneFilter } from './filters/tritone';

const registry = new Map<string, CanvasFilter>();

function register(filter: CanvasFilter): void {
  registry.set(filter.id, filter);
}

// Register all built-in filters
register(grainFilter);
register(noiseFilter);
register(bloomFilter);
register(motionBlurFilter);
register(radialBlurFilter);
register(bokehFilter);
register(lensDistortionFilter);
register(pixelateFilter);
register(duotoneFilter);
register(tritoneFilter);
register(glitchFilter);
register(ditherFilter);
register(halftoneFilter);
register(mosaicFilter);
register(photocopyFilter);
register(twirlFilter);

export function getFilter(id: string): CanvasFilter | undefined {
  return registry.get(id);
}

export function getAllFilters(): CanvasFilter[] {
  return Array.from(registry.values());
}

export function getFiltersByCategory(category: FilterCategory): CanvasFilter[] {
  return Array.from(registry.values()).filter(f => f.category === category);
}

export function registerFilter(filter: CanvasFilter): void {
  register(filter);
}

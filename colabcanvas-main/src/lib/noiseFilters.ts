/**
 * Noise and Grain Filters for Fabric.js
 * Implements various noise effects using canvas filters
 */

import { createNoise2D } from 'simplex-noise';

export type NoiseType = 'gaussian' | 'perlin' | 'film-grain' | 'stipple' | 'none';
export type BlendMode = 'multiply' | 'overlay' | 'screen' | 'add' | 'normal';

export interface NoiseOptions {
  type: NoiseType;
  intensity: number; // 0-100
  scale: number; // 1-10
  blendMode: BlendMode;
  monochrome: boolean;
  seed?: number;
}

/**
 * Generate Gaussian (random) noise
 */
function generateGaussianNoise(
  width: number,
  height: number,
  intensity: number,
  monochrome: boolean
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const amount = intensity / 100;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * amount;
    if (monochrome) {
      data[i] = data[i + 1] = data[i + 2] = 128 + noise;
    } else {
      data[i] = 128 + (Math.random() - 0.5) * 255 * amount;
      data[i + 1] = 128 + (Math.random() - 0.5) * 255 * amount;
      data[i + 2] = 128 + (Math.random() - 0.5) * 255 * amount;
    }
    data[i + 3] = 255; // Alpha
  }

  return imageData;
}

/**
 * Generate Perlin (organic) noise
 */
function generatePerlinNoise(
  width: number,
  height: number,
  intensity: number,
  scale: number,
  monochrome: boolean,
  seed?: number
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const amount = intensity / 100;
  const frequency = 0.01 * scale;

  // Create noise function with optional seed
  const noise2D = createNoise2D();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const value = noise2D(x * frequency, y * frequency);
      const normalized = ((value + 1) / 2) * 255 * amount;

      if (monochrome) {
        data[i] = data[i + 1] = data[i + 2] = 128 + normalized - 128 * amount;
      } else {
        data[i] = 128 + normalized - 128 * amount;
        data[i + 1] = 128 + noise2D(x * frequency + 1000, y * frequency) * 127 * amount;
        data[i + 2] = 128 + noise2D(x * frequency + 2000, y * frequency) * 127 * amount;
      }
      data[i + 3] = 255;
    }
  }

  return imageData;
}

/**
 * Generate Film Grain noise
 */
function generateFilmGrain(
  width: number,
  height: number,
  intensity: number,
  scale: number
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const amount = intensity / 100;
  const grainSize = scale;

  for (let y = 0; y < height; y += grainSize) {
    for (let x = 0; x < width; x += grainSize) {
      const noise = (Math.random() - 0.5) * 255 * amount;
      
      for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
        for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          const value = 128 + noise + (Math.random() - 0.5) * 50 * amount;
          data[i] = data[i + 1] = data[i + 2] = value;
          data[i + 3] = 255;
        }
      }
    }
  }

  return imageData;
}

/**
 * Generate Stipple (dot pattern) noise
 */
function generateStipple(
  width: number,
  height: number,
  intensity: number,
  scale: number
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  // Fill with white
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = 255;
  }

  // Add black dots
  const dotCount = (width * height * intensity) / 1000;
  const dotSize = Math.max(1, Math.floor(scale / 2));

  for (let i = 0; i < dotCount; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    
    for (let dy = -dotSize; dy <= dotSize; dy++) {
      for (let dx = -dotSize; dx <= dotSize; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4;
          data[idx] = data[idx + 1] = data[idx + 2] = 0;
        }
      }
    }
  }

  return imageData;
}

/**
 * Apply blend mode to combine noise with original image
 */
function applyBlendMode(
  original: ImageData,
  noise: ImageData,
  blendMode: BlendMode,
  intensity: number
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(original.data),
    original.width,
    original.height
  );
  const blend = intensity / 100;

  for (let i = 0; i < result.data.length; i += 4) {
    const r1 = original.data[i];
    const g1 = original.data[i + 1];
    const b1 = original.data[i + 2];
    const r2 = noise.data[i];
    const g2 = noise.data[i + 1];
    const b2 = noise.data[i + 2];

    let r, g, b;

    switch (blendMode) {
      case 'multiply':
        r = (r1 * r2) / 255;
        g = (g1 * g2) / 255;
        b = (b1 * b2) / 255;
        break;
      case 'overlay':
        r = r1 < 128 ? (2 * r1 * r2) / 255 : 255 - (2 * (255 - r1) * (255 - r2)) / 255;
        g = g1 < 128 ? (2 * g1 * g2) / 255 : 255 - (2 * (255 - g1) * (255 - g2)) / 255;
        b = b1 < 128 ? (2 * b1 * b2) / 255 : 255 - (2 * (255 - b1) * (255 - b2)) / 255;
        break;
      case 'screen':
        r = 255 - ((255 - r1) * (255 - r2)) / 255;
        g = 255 - ((255 - g1) * (255 - g2)) / 255;
        b = 255 - ((255 - b1) * (255 - b2)) / 255;
        break;
      case 'add':
        r = Math.min(255, r1 + r2);
        g = Math.min(255, g1 + g2);
        b = Math.min(255, b1 + b2);
        break;
      case 'normal':
      default:
        r = r2;
        g = g2;
        b = b2;
        break;
    }

    result.data[i] = r1 + (r - r1) * blend;
    result.data[i + 1] = g1 + (g - g1) * blend;
    result.data[i + 2] = b1 + (b - b1) * blend;
  }

  return result;
}

/**
 * Main function to apply noise to a canvas element
 */
export function applyNoiseFilter(
  canvas: HTMLCanvasElement,
  options: NoiseOptions
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;
  const original = ctx.getImageData(0, 0, width, height);

  let noise: ImageData;

  switch (options.type) {
    case 'gaussian':
      noise = generateGaussianNoise(width, height, options.intensity, options.monochrome);
      break;
    case 'perlin':
      noise = generatePerlinNoise(
        width,
        height,
        options.intensity,
        options.scale,
        options.monochrome,
        options.seed
      );
      break;
    case 'film-grain':
      noise = generateFilmGrain(width, height, options.intensity, options.scale);
      break;
    case 'stipple':
      noise = generateStipple(width, height, options.intensity, options.scale);
      break;
    case 'none':
    default:
      return canvas;
  }

  const result = applyBlendMode(original, noise, options.blendMode, options.intensity);
  ctx.putImageData(result, 0, 0);

  return canvas;
}

/**
 * Create a noise texture that can be applied to Fabric.js objects
 */
export function createNoiseTexture(
  width: number,
  height: number,
  options: NoiseOptions
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Create white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
  
  return applyNoiseFilter(canvas, options);
}

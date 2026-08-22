import type { CanvasFilter } from '../types';

export const noiseFilter: CanvasFilter = {
  id: 'noise',
  name: 'Noise',
  type: 'shader',
  category: 'basic',
  params: {
    intensity: { name: 'intensity', label: 'Intensity', type: 'float', value: 0.2, min: 0, max: 1, step: 0.01 },
    seed: { name: 'seed', label: 'Seed', type: 'float', value: 42.0, min: 0, max: 1000, step: 1 },
  },
  fragmentShader: `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_seed;
out vec4 outColor;

float rand(vec2 co, float seed) {
  return fract(sin(dot(co + seed, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  float n = rand(v_texCoord * u_resolution, u_seed) * 2.0 - 1.0;
  color.rgb += n * u_intensity;
  outColor = clamp(color, 0.0, 1.0);
}`,
};

import type { CanvasFilter } from '../types';

export const glitchFilter: CanvasFilter = {
  id: 'glitch',
  name: 'Glitch',
  type: 'shader',
  category: 'stylize',
  params: {
    rgbShift: { name: 'rgbShift', label: 'RGB Shift', type: 'float', value: 0.01, min: 0, max: 0.05, step: 0.001 },
    scanlineIntensity: { name: 'scanlineIntensity', label: 'Scanlines', type: 'float', value: 0.2, min: 0, max: 1, step: 0.01 },
    noiseIntensity: { name: 'noiseIntensity', label: 'Noise', type: 'float', value: 0.1, min: 0, max: 0.5, step: 0.01 },
  },
  fragmentShader: `#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_rgbShift;
uniform float u_scanlineIntensity;
uniform float u_noiseIntensity;

out vec4 outColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = v_texCoord;

  // Displacement noise for horizontal shift
  float displacement = (hash(vec2(floor(uv.y * 40.0), floor(u_time * 3.0))) - 0.5) * u_noiseIntensity;
  uv.x += displacement;

  // RGB channel separation
  float r = texture(u_texture, uv + vec2(u_rgbShift, 0.0)).r;
  float g = texture(u_texture, uv).g;
  float b = texture(u_texture, uv - vec2(u_rgbShift, 0.0)).b;
  float a = texture(u_texture, uv).a;

  vec3 color = vec3(r, g, b);

  // Scanlines
  float scanline = sin(uv.y * u_resolution.y * 1.5) * 0.5 + 0.5;
  color -= scanline * u_scanlineIntensity;

  outColor = vec4(clamp(color, 0.0, 1.0), a);
}`,
};

import type { CanvasFilter } from '../types';

export const radialBlurFilter: CanvasFilter = {
  id: 'radialBlur',
  name: 'Radial Blur',
  type: 'shader',
  category: 'distortion',
  params: {
    centerX: { name: 'centerX', label: 'Center X', type: 'float', value: 0.5, min: 0, max: 1, step: 0.01 },
    centerY: { name: 'centerY', label: 'Center Y', type: 'float', value: 0.5, min: 0, max: 1, step: 0.01 },
    intensity: { name: 'intensity', label: 'Intensity', type: 'float', value: 0.02, min: 0, max: 0.1, step: 0.002 },
    samples: { name: 'samples', label: 'Samples', type: 'int', value: 16, min: 4, max: 32, step: 1 },
  },
  fragmentShader: `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_centerX;
uniform float u_centerY;
uniform float u_intensity;
uniform int u_samples;
out vec4 outColor;

void main() {
  vec2 center = vec2(u_centerX, u_centerY);
  vec2 dir = v_texCoord - center;
  vec4 color = vec4(0.0);
  float total = 0.0;
  for (int i = 0; i < 32; i++) {
    if (i >= u_samples) break;
    float scale = 1.0 - u_intensity * (float(i) / float(u_samples));
    vec2 uv = center + dir * scale;
    color += texture(u_texture, uv);
    total += 1.0;
  }
  outColor = color / total;
}`,
};

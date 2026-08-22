import type { CanvasFilter } from '../types';

export const motionBlurFilter: CanvasFilter = {
  id: 'motionBlur',
  name: 'Motion Blur',
  type: 'shader',
  category: 'basic',
  params: {
    angle: { name: 'angle', label: 'Angle', type: 'float', value: 0.0, min: 0, max: 6.28, step: 0.05 },
    intensity: { name: 'intensity', label: 'Intensity', type: 'float', value: 0.01, min: 0, max: 0.05, step: 0.001 },
    samples: { name: 'samples', label: 'Samples', type: 'int', value: 12, min: 4, max: 32, step: 1 },
  },
  fragmentShader: `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_angle;
uniform float u_intensity;
uniform int u_samples;
out vec4 outColor;

void main() {
  vec2 dir = vec2(cos(u_angle), sin(u_angle)) * u_intensity;
  vec4 color = vec4(0.0);
  float total = 0.0;
  for (int i = 0; i < 32; i++) {
    if (i >= u_samples) break;
    float t = float(i) / float(u_samples) - 0.5;
    color += texture(u_texture, v_texCoord + dir * t);
    total += 1.0;
  }
  outColor = color / total;
}`,
};

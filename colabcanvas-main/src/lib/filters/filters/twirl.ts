import type { CanvasFilter } from '../types';

export const twirlFilter: CanvasFilter = {
  id: 'twirl',
  name: 'Twirl',
  type: 'shader',
  category: 'distortion',
  params: {
    angle: { name: 'angle', label: 'Angle', type: 'float', value: 2.0, min: -10, max: 10, step: 0.1 },
    radius: { name: 'radius', label: 'Radius', type: 'float', value: 0.5, min: 0.1, max: 1.0, step: 0.01 },
  },
  fragmentShader: `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_angle;
uniform float u_radius;
out vec4 outColor;

void main() {
  vec2 center = vec2(0.5);
  vec2 delta = v_texCoord - center;
  float dist = length(delta);
  float factor = smoothstep(u_radius, 0.0, dist);
  float a = u_angle * factor;
  float c = cos(a), s = sin(a);
  vec2 rotated = vec2(delta.x * c - delta.y * s, delta.x * s + delta.y * c);
  outColor = texture(u_texture, center + rotated);
}`,
};

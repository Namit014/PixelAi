import type { CanvasFilter } from '../types';

export const tritoneFilter: CanvasFilter = {
  id: 'tritone',
  name: 'Tritone',
  type: 'shader',
  category: 'color',
  params: {
    lowColor: { name: 'lowColor', label: 'Shadow Color', type: 'color', value: [0.0, 0.0, 0.2] },
    midColor: { name: 'midColor', label: 'Mid Color', type: 'color', value: [0.8, 0.2, 0.4] },
    highColor: { name: 'highColor', label: 'Highlight Color', type: 'color', value: [1.0, 1.0, 0.8] },
    midPoint: { name: 'midPoint', label: 'Mid Threshold', type: 'float', value: 0.5, min: 0.1, max: 0.9, step: 0.01 },
  },
  fragmentShader: `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec3 u_lowColor;
uniform vec3 u_midColor;
uniform vec3 u_highColor;
uniform float u_midPoint;
out vec4 outColor;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  float lum = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 result;
  if (lum < u_midPoint) {
    result = mix(u_lowColor, u_midColor, lum / u_midPoint);
  } else {
    result = mix(u_midColor, u_highColor, (lum - u_midPoint) / (1.0 - u_midPoint));
  }
  outColor = vec4(result, color.a);
}`,
};

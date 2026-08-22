import type { CanvasFilter } from '../types';

export const duotoneFilter: CanvasFilter = {
  id: 'duotone',
  name: 'Duotone',
  type: 'shader',
  category: 'color',
  params: {
    shadowColor: { name: 'shadowColor', label: 'Shadow Color', type: 'color', value: [0.1, 0.0, 0.3] },
    highlightColor: { name: 'highlightColor', label: 'Highlight Color', type: 'color', value: [1.0, 0.8, 0.2] },
  },
  fragmentShader: `#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec3 u_shadowColor;
uniform vec3 u_highlightColor;

out vec4 outColor;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 duotone = mix(u_shadowColor, u_highlightColor, luminance);
  outColor = vec4(duotone, color.a);
}`,
};

import type { CanvasFilter } from '../types';

export const bokehFilter: CanvasFilter = {
  id: 'bokeh',
  name: 'Bokeh Blur',
  type: 'shader',
  category: 'basic',
  params: {
    radius: { name: 'radius', label: 'Radius', type: 'float', value: 4.0, min: 1, max: 16, step: 0.5 },
    softness: { name: 'softness', label: 'Softness', type: 'float', value: 0.5, min: 0, max: 1, step: 0.01 },
  },
  fragmentShader: `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float u_softness;
out vec4 outColor;

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec4 color = vec4(0.0);
  float total = 0.0;
  int r = int(u_radius);
  float r2 = u_radius * u_radius;

  for (int x = -16; x <= 16; x++) {
    if (x < -r || x > r) continue;
    for (int y = -16; y <= 16; y++) {
      if (y < -r || y > r) continue;
      float d2 = float(x*x + y*y);
      if (d2 > r2) continue;
      // Circle-of-confusion kernel with soft falloff
      float w = 1.0 - smoothstep(r2 * u_softness, r2, d2);
      vec2 offset = vec2(float(x), float(y)) * texel;
      color += texture(u_texture, v_texCoord + offset) * w;
      total += w;
    }
  }
  outColor = color / max(total, 1.0);
}`,
};

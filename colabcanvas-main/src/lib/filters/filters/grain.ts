import type { CanvasFilter } from '../types';

export const grainFilter: CanvasFilter = {
  id: 'grain',
  name: 'Grain',
  type: 'shader',
  category: 'basic',
  params: {
    intensity: { name: 'intensity', label: 'Intensity', type: 'float', value: 0.3, min: 0, max: 1, step: 0.01 },
    size: { name: 'size', label: 'Size', type: 'float', value: 1.0, min: 0.5, max: 4.0, step: 0.1 },
    colorMode: { name: 'colorMode', label: 'Color Mode', type: 'int', value: 0, min: 0, max: 1, step: 1 },
  },
  fragmentShader: `#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform float u_size;
uniform int u_colorMode;

out vec4 outColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  vec2 uv = v_texCoord * u_resolution / u_size;
  float t = u_time * 0.5;

  if (u_colorMode == 0) {
    // Monochrome grain
    float n = hash(uv + t) * 2.0 - 1.0;
    color.rgb += n * u_intensity;
  } else {
    // RGB grain
    float nr = hash(uv + t) * 2.0 - 1.0;
    float ng = hash(uv + t + 1.0) * 2.0 - 1.0;
    float nb = hash(uv + t + 2.0) * 2.0 - 1.0;
    color.rgb += vec3(nr, ng, nb) * u_intensity;
  }

  outColor = clamp(color, 0.0, 1.0);
}`,
};

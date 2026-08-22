import type { CanvasFilter } from '../types';

// Single-pass bloom approximation using multi-sample blur on bright areas
export const bloomFilter: CanvasFilter = {
  id: 'bloom',
  name: 'Bloom',
  type: 'shader',
  category: 'basic',
  params: {
    threshold: { name: 'threshold', label: 'Threshold', type: 'float', value: 0.6, min: 0, max: 1, step: 0.01 },
    intensity: { name: 'intensity', label: 'Intensity', type: 'float', value: 1.0, min: 0, max: 3, step: 0.05 },
    radius: { name: 'radius', label: 'Radius', type: 'float', value: 4.0, min: 1, max: 16, step: 0.5 },
  },
  fragmentShader: `#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_threshold;
uniform float u_intensity;
uniform float u_radius;

out vec4 outColor;

void main() {
  vec4 original = texture(u_texture, v_texCoord);
  vec2 texel = 1.0 / u_resolution;

  // Multi-sample blur of bright areas only
  vec3 bloom = vec3(0.0);
  float total = 0.0;
  int samples = int(u_radius);

  for (int x = -samples; x <= samples; x++) {
    for (int y = -samples; y <= samples; y++) {
      vec2 offset = vec2(float(x), float(y)) * texel * (u_radius / float(samples));
      vec4 s = texture(u_texture, v_texCoord + offset);
      float brightness = dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
      float w = max(brightness - u_threshold, 0.0);
      float gaussian = exp(-float(x*x + y*y) / (2.0 * u_radius * u_radius));
      bloom += s.rgb * w * gaussian;
      total += gaussian;
    }
  }

  if (total > 0.0) bloom /= total;

  outColor = vec4(original.rgb + bloom * u_intensity, original.a);
}`,
};

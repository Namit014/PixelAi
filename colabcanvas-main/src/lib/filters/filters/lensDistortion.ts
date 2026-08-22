import type { CanvasFilter } from '../types';

export const lensDistortionFilter: CanvasFilter = {
  id: 'lensDistortion',
  name: 'Lens Distortion',
  type: 'shader',
  category: 'distortion',
  params: {
    distortion: { name: 'distortion', label: 'Distortion', type: 'float', value: 0.3, min: -1, max: 1, step: 0.01 },
    rgbShift: { name: 'rgbShift', label: 'Chromatic Aberration', type: 'float', value: 0.0, min: 0, max: 0.02, step: 0.001 },
  },
  fragmentShader: `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_distortion;
uniform float u_rgbShift;
out vec4 outColor;

vec2 distort(vec2 uv, float k) {
  vec2 centered = uv - 0.5;
  float r2 = dot(centered, centered);
  vec2 distorted = centered * (1.0 + k * r2);
  return distorted + 0.5;
}

void main() {
  if (u_rgbShift > 0.0) {
    float r = texture(u_texture, distort(v_texCoord, u_distortion + u_rgbShift)).r;
    float g = texture(u_texture, distort(v_texCoord, u_distortion)).g;
    float b = texture(u_texture, distort(v_texCoord, u_distortion - u_rgbShift)).b;
    float a = texture(u_texture, distort(v_texCoord, u_distortion)).a;
    outColor = vec4(r, g, b, a);
  } else {
    outColor = texture(u_texture, distort(v_texCoord, u_distortion));
  }
}`,
};

import type { CanvasFilter } from '../types';

export const photocopyFilter: CanvasFilter = {
  id: 'photocopy',
  name: 'Photocopy',
  type: 'shader',
  category: 'stylize',
  params: {
    threshold: { name: 'threshold', label: 'Threshold', type: 'float', value: 0.5, min: 0, max: 1, step: 0.01 },
    edgeStrength: { name: 'edgeStrength', label: 'Edge Strength', type: 'float', value: 1.0, min: 0, max: 3, step: 0.1 },
    grainAmount: { name: 'grainAmount', label: 'Grain', type: 'float', value: 0.05, min: 0, max: 0.3, step: 0.01 },
  },
  fragmentShader: `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_threshold;
uniform float u_edgeStrength;
uniform float u_grainAmount;
out vec4 outColor;

float lum(vec4 c) { return dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec4 color = texture(u_texture, v_texCoord);

  // Sobel edge detection
  float tl = lum(texture(u_texture, v_texCoord + vec2(-texel.x, texel.y)));
  float t  = lum(texture(u_texture, v_texCoord + vec2(0.0, texel.y)));
  float tr = lum(texture(u_texture, v_texCoord + vec2(texel.x, texel.y)));
  float l  = lum(texture(u_texture, v_texCoord + vec2(-texel.x, 0.0)));
  float r  = lum(texture(u_texture, v_texCoord + vec2(texel.x, 0.0)));
  float bl = lum(texture(u_texture, v_texCoord + vec2(-texel.x, -texel.y)));
  float b  = lum(texture(u_texture, v_texCoord + vec2(0.0, -texel.y)));
  float br = lum(texture(u_texture, v_texCoord + vec2(texel.x, -texel.y)));

  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  float edge = sqrt(gx*gx + gy*gy) * u_edgeStrength;

  // High contrast threshold
  float brightness = lum(color);
  float bw = step(u_threshold, brightness);

  // Combine: edges darken, threshold creates b/w
  float result = bw * (1.0 - edge);

  // Add grain
  float grain = (hash(v_texCoord * u_resolution + u_time) - 0.5) * u_grainAmount;
  result += grain;

  outColor = vec4(vec3(clamp(result, 0.0, 1.0)), color.a);
}`,
};

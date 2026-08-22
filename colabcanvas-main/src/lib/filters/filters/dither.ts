import type { CanvasFilter } from '../types';

export const ditherFilter: CanvasFilter = {
  id: 'dither',
  name: 'Dither',
  type: 'shader',
  category: 'stylize',
  params: {
    mode: { name: 'mode', label: 'Mode', type: 'int', value: 0, min: 0, max: 1, step: 1 },
    colorLevels: { name: 'colorLevels', label: 'Color Levels', type: 'float', value: 4.0, min: 2, max: 16, step: 1 },
    gridSize: { name: 'gridSize', label: 'Grid Size', type: 'float', value: 1.0, min: 1, max: 4, step: 1 },
  },
  fragmentShader: `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform int u_mode;
uniform float u_colorLevels;
uniform float u_gridSize;
out vec4 outColor;

// 4x4 Bayer matrix
float bayer4(vec2 pos) {
  ivec2 p = ivec2(mod(pos, 4.0));
  int idx = p.x + p.y * 4;
  float m[16] = float[16](
    0.0/16.0, 8.0/16.0, 2.0/16.0, 10.0/16.0,
    12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0,
    3.0/16.0, 11.0/16.0, 1.0/16.0, 9.0/16.0,
    15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0
  );
  return m[idx];
}

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  vec2 pixelPos = v_texCoord * u_resolution / u_gridSize;
  float levels = u_colorLevels - 1.0;

  if (u_mode == 0) {
    // Ordered Bayer dithering
    float threshold = bayer4(pixelPos) - 0.5;
    vec3 quantized = floor(color.rgb * levels + 0.5 + threshold) / levels;
    outColor = vec4(clamp(quantized, 0.0, 1.0), color.a);
  } else {
    // Simple threshold quantization (pixel grid style)
    vec3 quantized = floor(color.rgb * levels + 0.5) / levels;
    outColor = vec4(quantized, color.a);
  }
}`,
};

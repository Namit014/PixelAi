import type { CanvasFilter } from '../types';

export const halftoneFilter: CanvasFilter = {
  id: 'halftone',
  name: 'Halftone',
  type: 'shader',
  category: 'stylize',
  params: {
    dotSize: { name: 'dotSize', label: 'Dot Size', type: 'float', value: 4.0, min: 1, max: 16, step: 0.5 },
    angle: { name: 'angle', label: 'Angle', type: 'float', value: 0.4, min: 0, max: 1.57, step: 0.05 },
    colorMode: { name: 'colorMode', label: 'Color', type: 'int', value: 0, min: 0, max: 1, step: 1 },
  },
  fragmentShader: `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_dotSize;
uniform float u_angle;
uniform int u_colorMode;
out vec4 outColor;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  vec2 pixelCoord = v_texCoord * u_resolution;

  // Rotate coordinate space
  float c = cos(u_angle), s = sin(u_angle);
  vec2 rotated = vec2(
    pixelCoord.x * c - pixelCoord.y * s,
    pixelCoord.x * s + pixelCoord.y * c
  );

  vec2 cell = mod(rotated, u_dotSize * 2.0) - u_dotSize;
  float dist = length(cell) / u_dotSize;

  if (u_colorMode == 0) {
    // Monochrome
    float lum = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    float dot = step(dist, lum);
    outColor = vec4(vec3(dot), color.a);
  } else {
    // Color halftone
    vec3 dots = step(vec3(dist), color.rgb);
    outColor = vec4(dots, color.a);
  }
}`,
};

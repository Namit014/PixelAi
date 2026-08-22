import type { CanvasFilter } from '../types';

export const mosaicFilter: CanvasFilter = {
  id: 'mosaic',
  name: 'Mosaic',
  type: 'shader',
  category: 'stylize',
  params: {
    tileSize: { name: 'tileSize', label: 'Tile Size', type: 'float', value: 12.0, min: 4, max: 64, step: 1 },
    mode: { name: 'mode', label: 'Grid Mode', type: 'int', value: 0, min: 0, max: 1, step: 1 },
  },
  fragmentShader: `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_tileSize;
uniform int u_mode;
out vec4 outColor;

void main() {
  vec2 pixelCoord = v_texCoord * u_resolution;

  if (u_mode == 0) {
    // Square grid mosaic
    vec2 cell = floor(pixelCoord / u_tileSize) * u_tileSize + u_tileSize * 0.5;
    outColor = texture(u_texture, cell / u_resolution);
  } else {
    // Hex grid approximation
    float hexH = u_tileSize;
    float hexW = hexH * 1.732;
    vec2 grid = pixelCoord / vec2(hexW, hexH * 0.75);
    vec2 gridId = floor(grid);
    // Offset every other row
    float rowOffset = mod(gridId.y, 2.0) * 0.5;
    vec2 cell = vec2((gridId.x + rowOffset) * hexW, gridId.y * hexH * 0.75);
    cell += vec2(hexW * 0.5, hexH * 0.375);
    outColor = texture(u_texture, cell / u_resolution);
  }
}`,
};

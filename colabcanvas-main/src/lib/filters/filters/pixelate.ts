import type { CanvasFilter } from '../types';

export const pixelateFilter: CanvasFilter = {
  id: 'pixelate',
  name: 'Pixelate',
  type: 'shader',
  category: 'stylize',
  params: {
    blockSize: { name: 'blockSize', label: 'Block Size', type: 'float', value: 8.0, min: 2, max: 64, step: 1 },
    smoothEdges: { name: 'smoothEdges', label: 'Smooth Edges', type: 'int', value: 0, min: 0, max: 1, step: 1 },
  },
  fragmentShader: `#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_blockSize;
uniform int u_smoothEdges;

out vec4 outColor;

void main() {
  vec2 blocks = u_resolution / u_blockSize;
  vec2 blockCoord = floor(v_texCoord * blocks) / blocks;
  vec2 blockCenter = blockCoord + 0.5 / blocks;

  if (u_smoothEdges == 1) {
    // Average 4 samples within block for smoother result
    vec2 halfBlock = 0.25 / blocks;
    vec4 c1 = texture(u_texture, blockCenter + vec2(-halfBlock.x, -halfBlock.y));
    vec4 c2 = texture(u_texture, blockCenter + vec2(halfBlock.x, -halfBlock.y));
    vec4 c3 = texture(u_texture, blockCenter + vec2(-halfBlock.x, halfBlock.y));
    vec4 c4 = texture(u_texture, blockCenter + vec2(halfBlock.x, halfBlock.y));
    outColor = (c1 + c2 + c3 + c4) * 0.25;
  } else {
    outColor = texture(u_texture, blockCenter);
  }
}`,
};

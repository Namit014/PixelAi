/**
 * FilterEngine — WebGL2 FBO ping-pong pipeline for non-destructive filter stacking.
 * 
 * Render pipeline:
 *   Original Bitmap → Filter 1 (FBO A→B) → Filter 2 (FBO B→A) → ... → Final Texture → Canvas
 * 
 * originalBitmap is NEVER mutated. Only filterStack params trigger re-renders.
 */

import type { AppliedFilter, CanvasFilter } from './types';
import { getFilter } from './FilterRegistry';

interface FBO {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
}

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`;

export class FilterEngine {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private fboA: FBO | null = null;
  private fboB: FBO | null = null;
  private programCache = new Map<string, WebGLProgram>();
  private quadVAO: WebGLVertexArrayObject | null = null;
  private sourceTexture: WebGLTexture | null = null;
  private width = 0;
  private height = 0;
  private disposed = false;
  private allFBOs = new Set<WebGLFramebuffer>();
  private allTextures = new Set<WebGLTexture>();

  constructor() {
    this.canvas = document.createElement('canvas');
  }

  init(width: number, height: number): boolean {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    this.gl = this.canvas.getContext('webgl2', {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      antialias: false,
    });

    if (!this.gl) {
      console.error('WebGL2 not supported');
      return false;
    }

    this.setupQuad();
    this.fboA = this.createFBO(width, height);
    this.fboB = this.createFBO(width, height);

    return true;
  }

  private setupQuad(): void {
    const gl = this.gl!;
    this.quadVAO = gl.createVertexArray();
    gl.bindVertexArray(this.quadVAO);

    const posBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const texBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1, 1, 1, 0, 0,
      0, 0, 1, 1, 1, 0,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  private createFBO(w: number, h: number): FBO {
    const gl = this.gl!;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.allFBOs.add(fb);
    this.allTextures.add(texture);

    return { framebuffer: fb, texture };
  }

  setSourceImage(source: ImageBitmap | HTMLCanvasElement | HTMLImageElement): void {
    const gl = this.gl;
    if (!gl) return;

    if (this.sourceTexture) {
      gl.deleteTexture(this.sourceTexture);
      this.allTextures.delete(this.sourceTexture);
    }

    this.sourceTexture = gl.createTexture()!;
    this.allTextures.add(this.sourceTexture);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private getProgram(filter: CanvasFilter): WebGLProgram | null {
    if (this.programCache.has(filter.id)) return this.programCache.get(filter.id)!;
    if (!filter.fragmentShader || !this.gl) return null;

    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERTEX_SHADER);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
      return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, filter.fragmentShader);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error(`Fragment shader error (${filter.id}):`, gl.getShaderInfoLog(fs));
      return null;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'a_position');
    gl.bindAttribLocation(program, 1, 'a_texCoord');
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(`Program link error (${filter.id}):`, gl.getProgramInfoLog(program));
      return null;
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);
    this.programCache.set(filter.id, program);
    return program;
  }

  /**
   * Render the full filter stack and return the result as an ImageBitmap.
   */
  async render(filterStack: AppliedFilter[], time: number = 0): Promise<ImageBitmap | null> {
    const gl = this.gl;
    if (!gl || !this.sourceTexture || this.disposed) return null;

    if (filterStack.length === 0) {
      // No filters — just return source as-is via passthrough
      this.renderPassthrough(this.sourceTexture);
      return createImageBitmap(this.canvas);
    }

    let readTex = this.sourceTexture;
    const fbos = [this.fboA!, this.fboB!];

    for (let i = 0; i < filterStack.length; i++) {
      const applied = filterStack[i];
      const filterDef = getFilter(applied.filterId);
      if (!filterDef || !filterDef.fragmentShader) continue;

      const program = this.getProgram(filterDef);
      if (!program) continue;

      const isLast = i === filterStack.length - 1;
      const targetFBO = isLast ? null : fbos[i % 2];

      gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO?.framebuffer ?? null);
      gl.viewport(0, 0, this.width, this.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // Bind input texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readTex);
      gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);
      gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time);

      // Set filter-specific uniforms
      this.setFilterUniforms(gl, program, filterDef, applied.params);

      gl.bindVertexArray(this.quadVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);

      if (targetFBO) {
        readTex = targetFBO.texture;
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return createImageBitmap(this.canvas);
  }

  private renderPassthrough(texture: WebGLTexture): void {
    const gl = this.gl!;
    const passthroughFS = `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
out vec4 outColor;
void main() { outColor = texture(u_texture, v_texCoord); }`;

    let program = this.programCache.get('__passthrough');
    if (!program) {
      const filter: CanvasFilter = {
        id: '__passthrough', name: 'Passthrough', type: 'shader',
        category: 'basic', params: {}, fragmentShader: passthroughFS
      };
      program = this.getProgram(filter);
      if (!program) return;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
    gl.bindVertexArray(this.quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  private setFilterUniforms(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    filterDef: CanvasFilter,
    params: Record<string, any>
  ): void {
    for (const [key, paramDef] of Object.entries(filterDef.params)) {
      const val = params[key] ?? paramDef.value;
      const loc = gl.getUniformLocation(program, `u_${key}`);
      if (!loc) continue;

      if (Array.isArray(val)) {
        if (val.length === 2) gl.uniform2f(loc, val[0], val[1]);
        else if (val.length === 3) gl.uniform3f(loc, val[0], val[1], val[2]);
        else if (val.length === 4) gl.uniform4f(loc, val[0], val[1], val[2], val[3]);
      } else if (typeof val === 'boolean') {
        gl.uniform1i(loc, val ? 1 : 0);
      } else if (typeof val === 'number') {
        if (paramDef.type === 'int') gl.uniform1i(loc, val);
        else gl.uniform1f(loc, val);
      }
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  resize(w: number, h: number): void {
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;

    // Recreate FBOs
    if (this.fboA) this.destroyFBO(this.fboA);
    if (this.fboB) this.destroyFBO(this.fboB);
    this.fboA = this.createFBO(w, h);
    this.fboB = this.createFBO(w, h);
  }

  private destroyFBO(fbo: FBO): void {
    const gl = this.gl;
    if (!gl) return;
    gl.deleteFramebuffer(fbo.framebuffer);
    gl.deleteTexture(fbo.texture);
    this.allFBOs.delete(fbo.framebuffer);
    this.allTextures.delete(fbo.texture);
  }

  dispose(): void {
    this.disposed = true;
    const gl = this.gl;
    if (!gl) return;

    this.programCache.forEach(p => gl.deleteProgram(p));
    this.programCache.clear();

    this.allTextures.forEach(t => gl.deleteTexture(t));
    this.allTextures.clear();

    this.allFBOs.forEach(f => gl.deleteFramebuffer(f));
    this.allFBOs.clear();

    if (this.quadVAO) gl.deleteVertexArray(this.quadVAO);
    this.gl = null;
  }
}

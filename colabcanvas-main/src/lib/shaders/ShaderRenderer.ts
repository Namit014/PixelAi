import type { ShaderConfig } from './shaderDefinitions';

const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export class ShaderRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private shaderConfig: ShaderConfig;
  private animationId: number | null = null;
  private startTime: number = Date.now();
  private isRunning: boolean = false;
  private uniformLocations: Map<string, WebGLUniformLocation | null> = new Map();
  private texture: WebGLTexture | null = null;

  constructor(canvas: HTMLCanvasElement, shaderConfig: ShaderConfig) {
    this.canvas = canvas;
    this.shaderConfig = shaderConfig;
    this.initialize();
  }

  private initialize(): boolean {
    const gl = this.canvas.getContext('webgl', {
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false
    });

    if (!gl) {
      console.error('WebGL not available');
      return false;
    }

    this.gl = gl;

    // Compile vertex shader
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    if (!vertexShader) return false;

    // Compile fragment shader
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, this.shaderConfig.fragmentShader);
    if (!fragmentShader) return false;

    // Create and link program
    const program = gl.createProgram();
    if (!program) {
      console.error('Failed to create WebGL program');
      return false;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return false;
    }

    this.program = program;
    gl.useProgram(program);

    // Create quad geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    this.cacheUniformLocations();

    // Initialize default texture for texture-requiring shaders
    if (this.shaderConfig.requiresTexture) {
      this.initializeDefaultTexture();
    }

    return true;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    if (!gl) return null;

    const shader = gl.createShader(type);
    if (!shader) {
      console.error('Failed to create shader');
      return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      console.error(`Shader compile error (${this.shaderConfig.name}):`, info);
      
      // Log problematic line if possible
      const lines = source.split('\n');
      const errorMatch = info?.match(/ERROR: \d+:(\d+):/);
      if (errorMatch) {
        const lineNum = parseInt(errorMatch[1]) - 1;
        if (lines[lineNum]) {
          console.error(`Problem near line ${lineNum + 1}:`, lines[lineNum]);
        }
      }
      
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private cacheUniformLocations(): void {
    const gl = this.gl;
    const program = this.program;
    if (!gl || !program) return;

    // Standard uniforms
    this.uniformLocations.set('u_time', gl.getUniformLocation(program, 'u_time'));
    this.uniformLocations.set('u_resolution', gl.getUniformLocation(program, 'u_resolution'));
    this.uniformLocations.set('u_texture', gl.getUniformLocation(program, 'u_texture'));

    // Shader-specific uniforms
    Object.keys(this.shaderConfig.uniforms).forEach(name => {
      this.uniformLocations.set(name, gl.getUniformLocation(program, name));
    });
  }

  private initializeDefaultTexture(): void {
    const gl = this.gl;
    if (!gl) return;

    // Create a professional sample texture
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Dark gradient background
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size * 0.7);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#0a0a0f');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      // Premium logo design
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size * 0.3;
      
      // Outer ring with gradient
      const ringGradient = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
      ringGradient.addColorStop(0, '#ffffff');
      ringGradient.addColorStop(0.5, '#c0c0c0');
      ringGradient.addColorStop(1, '#808080');
      
      ctx.strokeStyle = ringGradient;
      ctx.lineWidth = radius * 0.12;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner circle
      ctx.fillStyle = ringGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      
      // Vertical accent bar
      ctx.fillStyle = '#ffffff';
      const barWidth = radius * 0.18;
      const barHeight = radius * 0.7;
      ctx.fillRect(centerX - barWidth/2, centerY - barHeight/2 - radius * 0.2, barWidth, barHeight);
    }

    this.setTextureFromCanvas(canvas);
  }

  private setTextureFromCanvas(canvas: HTMLCanvasElement): void {
    const gl = this.gl;
    if (!gl) return;

    if (this.texture) {
      gl.deleteTexture(this.texture);
    }

    this.texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const textureLocation = this.uniformLocations.get('u_texture');
    if (textureLocation) {
      gl.uniform1i(textureLocation, 0);
    }
  }

  public setTexture(source: HTMLImageElement | HTMLCanvasElement): void {
    const gl = this.gl;
    if (!gl) return;

    if (this.texture) {
      gl.deleteTexture(this.texture);
    }

    this.texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const textureLocation = this.uniformLocations.get('u_texture');
    if (textureLocation) {
      gl.uniform1i(textureLocation, 0);
    }
  }

  private render = (): void => {
    if (!this.isRunning) return;
    
    const gl = this.gl;
    const program = this.program;
    if (!gl || !program) return;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Set time uniform
    const timeLocation = this.uniformLocations.get('u_time');
    if (timeLocation) {
      gl.uniform1f(timeLocation, (Date.now() - this.startTime) / 1000);
    }

    // Set resolution uniform
    const resolutionLocation = this.uniformLocations.get('u_resolution');
    if (resolutionLocation) {
      gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
    }

    // Set shader-specific uniforms
    Object.entries(this.shaderConfig.uniforms).forEach(([name, uniform]) => {
      const location = this.uniformLocations.get(name);
      if (!location) return;

      if (uniform.type === 'float' || uniform.type === 'int') {
        gl.uniform1f(location, uniform.value as number);
      } else if (uniform.type === 'color' || uniform.type === 'vec3') {
        const v = uniform.value as number[];
        gl.uniform3f(location, v[0], v[1], v[2]);
      } else if (uniform.type === 'vec2') {
        const v = uniform.value as number[];
        gl.uniform2f(location, v[0], v[1]);
      }
    });

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (this.shaderConfig.isAnimated && this.isRunning) {
      this.animationId = requestAnimationFrame(this.render);
    }
  };

  public start(): boolean {
    if (!this.gl || !this.program) {
      console.warn('Cannot start shader - not initialized');
      return false;
    }
    
    this.isRunning = true;
    this.startTime = Date.now();
    this.render();
    return true;
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public updateUniform(name: string, value: number | number[]): void {
    if (!this.shaderConfig.uniforms[name]) return;
    this.shaderConfig.uniforms[name].value = value;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public dispose(): void {
    this.stop();
    
    const gl = this.gl;
    if (gl) {
      if (this.texture) {
        gl.deleteTexture(this.texture);
      }
      if (this.program) {
        gl.deleteProgram(this.program);
      }
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) {
        ext.loseContext();
      }
    }
    
    this.gl = null;
    this.program = null;
    this.texture = null;
    this.uniformLocations.clear();
  }
}

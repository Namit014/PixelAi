import { useEffect, useRef, useState } from 'react';
import type { ShaderConfig } from '@/lib/shaders/shaderDefinitions';
import { ImageIcon, AlertCircle } from 'lucide-react';

interface ShaderPreviewProps {
  shaderConfig: ShaderConfig;
  width?: number;
  height?: number;
  className?: string;
}

export function ShaderPreview({ shaderConfig, width = 80, height = 80, className = '' }: ShaderPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset state for new shader
    setHasError(false);
    setIsReady(false);

    const initTimer = setTimeout(() => {
      try {
        // High resolution for crisp previews
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Initialize WebGL
        const gl = canvas.getContext('webgl', { 
          antialias: true, 
          alpha: true,
          preserveDrawingBuffer: true,
          premultipliedAlpha: false
        });
        
        if (!gl) {
          setHasError(true);
          return;
        }
        
        glRef.current = gl;

        // Create vertex shader
        const vertexShaderSource = `
          attribute vec2 a_position;
          void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
          }
        `;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        if (!vertexShader) {
          setHasError(true);
          return;
        }
        
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
          console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
          setHasError(true);
          return;
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fragmentShader) {
          setHasError(true);
          return;
        }
        
        gl.shaderSource(fragmentShader, shaderConfig.fragmentShader);
        gl.compileShader(fragmentShader);
        
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
          const errorLog = gl.getShaderInfoLog(fragmentShader);
          console.error(`Fragment shader compile FAILED for ${shaderConfig.name}:`, errorLog);
          setHasError(true);
          return;
        }

        // Create program
        const program = gl.createProgram();
        if (!program) {
          setHasError(true);
          return;
        }
        
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          console.warn(`Program link error for ${shaderConfig.name}:`, gl.getProgramInfoLog(program));
          setHasError(true);
          return;
        }
        
        programRef.current = program;
        gl.useProgram(program);

        // Create quad
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -1, -1, 1, -1, -1, 1,
          -1, 1, 1, -1, 1, 1
        ]), gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Create PREMIUM sample texture for texture-requiring shaders
        if (shaderConfig.requiresTexture) {
          const sampleTexture = createPremiumSampleTexture(canvas.width, canvas.height);
          const texture = gl.createTexture();
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sampleTexture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          
          const textureLocation = gl.getUniformLocation(program, 'u_texture');
          if (textureLocation) {
            gl.uniform1i(textureLocation, 0);
          }
        }

        startTimeRef.current = Date.now();
        setIsReady(true);
        setHasError(false);
        
        // 60fps animation for smooth previews
        const render = () => {
          if (!glRef.current || !programRef.current) return;
          
          const gl = glRef.current;
          const program = programRef.current;
          
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          
          // Set uniforms
          const timeLocation = gl.getUniformLocation(program, 'u_time');
          const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
          
          if (timeLocation) {
            gl.uniform1f(timeLocation, (Date.now() - startTimeRef.current) / 1000);
          }
          if (resolutionLocation) {
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
          }
          
          // Set shader-specific uniforms
          Object.entries(shaderConfig.uniforms).forEach(([name, uniform]) => {
            const location = gl.getUniformLocation(program, name);
            if (location) {
              if (uniform.type === 'float' || uniform.type === 'int') {
                gl.uniform1f(location, uniform.value as number);
              } else if (uniform.type === 'color' || uniform.type === 'vec3') {
                const v = uniform.value as number[];
                gl.uniform3f(location, v[0], v[1], v[2]);
              } else if (uniform.type === 'vec2') {
                const v = uniform.value as number[];
                gl.uniform2f(location, v[0], v[1]);
              }
            }
          });
          
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          
          if (shaderConfig.isAnimated) {
            animationRef.current = requestAnimationFrame(render);
          }
        };
        
        animationRef.current = requestAnimationFrame(render);
        
      } catch (error) {
        console.warn(`Shader preview error for ${shaderConfig.name}:`, error);
        setHasError(true);
      }
    }, 30);

    return () => {
      clearTimeout(initTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (glRef.current) {
        const ext = glRef.current.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
      glRef.current = null;
      programRef.current = null;
    };
  }, [shaderConfig, width, height]);

  // Creates a PREMIUM, high-contrast sample texture
  function createPremiumSampleTexture(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Pure white background for maximum contrast
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      
      const centerX = w / 2;
      const centerY = h / 2;
      const size = Math.min(w, h) * 0.38;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      
      // Vibrant multi-color gradient ring
      const ringGradient = ctx.createLinearGradient(-size, -size, size, size);
      ringGradient.addColorStop(0, '#FF3366');
      ringGradient.addColorStop(0.2, '#FF6B35');
      ringGradient.addColorStop(0.4, '#FFD700');
      ringGradient.addColorStop(0.6, '#00FF88');
      ringGradient.addColorStop(0.8, '#00BFFF');
      ringGradient.addColorStop(1, '#9B59B6');
      
      // Draw thick hexagon ring
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = ringGradient;
      ctx.lineWidth = size * 0.18;
      ctx.stroke();
      
      // Inner filled shape with gradient
      const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.5);
      innerGradient.addColorStop(0, '#FFFFFF');
      innerGradient.addColorStop(0.3, '#00FFFF');
      innerGradient.addColorStop(0.6, '#FF00FF');
      innerGradient.addColorStop(1, '#0066FF');
      
      ctx.beginPath();
      const innerSize = size * 0.5;
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i - Math.PI / 4;
        const x = Math.cos(angle) * innerSize;
        const y = Math.sin(angle) * innerSize;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = innerGradient;
      ctx.fill();
      
      // Bright center dot
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#FF3366';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.restore();
      
      // Corner accents for edge detection
      const cornerSize = w * 0.12;
      
      // Top-left
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(cornerSize * 2, 0);
      ctx.lineTo(0, cornerSize * 2);
      ctx.closePath();
      ctx.fillStyle = '#FF6B35';
      ctx.fill();
      
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(w, h);
      ctx.lineTo(w - cornerSize * 2, h);
      ctx.lineTo(w, h - cornerSize * 2);
      ctx.closePath();
      ctx.fillStyle = '#00BFFF';
      ctx.fill();
      
      // Top-right
      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.lineTo(w - cornerSize * 2, 0);
      ctx.lineTo(w, cornerSize * 2);
      ctx.closePath();
      ctx.fillStyle = '#9B59B6';
      ctx.fill();
      
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(cornerSize * 2, h);
      ctx.lineTo(0, h - cornerSize * 2);
      ctx.closePath();
      ctx.fillStyle = '#00FF88';
      ctx.fill();
    }
    
    return canvas;
  }

  if (hasError) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-zinc-800/50 rounded-lg gap-1 ${className}`}
        style={{ width, height }}
      >
        <AlertCircle className="w-4 h-4 text-amber-500/70" />
        <span className="text-[7px] text-zinc-400 text-center px-1 leading-tight">
          {shaderConfig.name}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg bg-zinc-900 ${className}`} style={{ width, height }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ opacity: isReady ? 1 : 0, transition: 'opacity 0.15s ease-in' }}
      />
      {!isReady && (
        <div className="absolute inset-0 bg-zinc-800/50 rounded-lg animate-pulse flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-zinc-600" />
        </div>
      )}
    </div>
  );
}

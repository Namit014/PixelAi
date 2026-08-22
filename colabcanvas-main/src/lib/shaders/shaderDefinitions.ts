export interface ShaderUniform {
  type: 'float' | 'int' | 'vec2' | 'vec3' | 'color';
  value: number | number[];
  min?: number;
  max?: number;
  step?: number;
  label: string;
}

export interface ShaderConfig {
  id: string;
  name: string;
  category: 'effect' | 'animation' | 'filter';
  isAnimated: boolean;
  requiresTexture?: boolean;
  blendMode?: 'replace' | 'overlay' | 'multiply' | 'screen' | 'add';
  uniforms: Record<string, ShaderUniform>;
  fragmentShader: string;
}

export function hexToVec3(hex: string): number[] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export const SHADER_DEFINITIONS: Record<string, ShaderConfig> = {
  // ===== PREMIUM GENERATIVE EFFECTS =====
  // These now output with ALPHA so they composite properly on objects
  
  meshGradient: {
    id: 'meshGradient',
    name: 'Mesh Gradient',
    category: 'effect',
    isAnimated: true,
    requiresTexture: false,
    blendMode: 'replace',
    uniforms: {
      u_color1: { type: 'color', value: [1.0, 0.2, 0.6], label: 'Color 1' },
      u_color2: { type: 'color', value: [0.2, 0.6, 1.0], label: 'Color 2' },
      u_color3: { type: 'color', value: [0.9, 0.4, 0.1], label: 'Color 3' },
      u_speed: { type: 'float', value: 0.5, min: 0.1, max: 2, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;
      uniform float u_speed;
      
      float blob(vec2 p, vec2 center, float radius) {
        float d = length(p - center);
        return smoothstep(radius, 0.0, d);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;
        
        float t = u_time * u_speed;
        
        // DRAMATIC blob movement - 3x amplitude
        vec2 blob1 = vec2(sin(t * 0.8) * 0.8, cos(t * 0.6) * 0.8);
        vec2 blob2 = vec2(cos(t * 0.5) * 0.9, sin(t * 0.9) * 0.7);
        vec2 blob3 = vec2(sin(t * 1.1) * 0.7, cos(t * 0.7) * 0.9);
        vec2 blob4 = vec2(cos(t * 0.7) * 0.6, sin(t * 1.2) * 0.5);
        
        // INTENSE blob values with sharper falloff
        float b1 = blob(p, blob1, 1.2);
        float b2 = blob(p, blob2, 1.0);
        float b3 = blob(p, blob3, 1.3);
        float b4 = blob(p, blob4, 0.9);
        
        // VIBRANT color mixing - 5x intensity
        vec3 color = u_color1 * pow(b1, 0.6) * 2.5;
        color += u_color2 * pow(b2, 0.7) * 2.2;
        color += u_color3 * pow(b3, 0.5) * 2.0;
        color += mix(u_color1, u_color2, 0.5) * pow(b4, 0.8) * 1.5;
        
        // Bright glow effect
        float glow = (b1 + b2 + b3 + b4) * 0.4;
        color += vec3(1.0, 0.95, 0.9) * pow(glow, 2.0) * 0.5;
        
        // Ensure colors stay vibrant
        color = pow(color, vec3(0.85));
        
        gl_FragColor = vec4(color, 1.0);
      }
    `
  },

  aurora: {
    id: 'aurora',
    name: 'Aurora',
    category: 'effect',
    isAnimated: true,
    requiresTexture: false,
    blendMode: 'replace',
    uniforms: {
      u_color1: { type: 'color', value: [0.1, 1.0, 0.5], label: 'Green' },
      u_color2: { type: 'color', value: [0.7, 0.2, 1.0], label: 'Purple' },
      u_color3: { type: 'color', value: [0.2, 0.8, 1.0], label: 'Blue' },
      u_speed: { type: 'float', value: 0.8, min: 0.1, max: 1.5, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;
      uniform float u_speed;
      
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = noise(i);
        float b = noise(i + vec2(1.0, 0.0));
        float c = noise(i + vec2(0.0, 1.0));
        float d = noise(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.7;
        for(int i = 0; i < 6; i++) {
          value += amplitude * smoothNoise(p);
          p *= 2.2;
          amplitude *= 0.5;
        }
        return value;
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float t = u_time * u_speed;
        
        // RICH dark background with gradient
        vec3 bgTop = vec3(0.08, 0.02, 0.15);
        vec3 bgBottom = vec3(0.02, 0.08, 0.12);
        vec3 background = mix(bgBottom, bgTop, uv.y);
        
        // INTENSE multi-layer aurora waves
        float aurora1 = fbm(vec2(uv.x * 5.0 + t * 0.6, uv.y * 2.5 + t * 0.35));
        float aurora2 = fbm(vec2(uv.x * 4.0 - t * 0.5, uv.y * 3.0 + t * 0.28));
        float aurora3 = fbm(vec2(uv.x * 6.0 + t * 0.7, uv.y * 2.0 - t * 0.22));
        float aurora4 = fbm(vec2(uv.x * 3.0 - t * 0.4, uv.y * 4.0 + t * 0.4));
        
        // Dramatic vertical curtain effect
        float curtain = smoothstep(-0.1, 0.6, uv.y);
        curtain *= smoothstep(1.1, 0.4, uv.y);
        
        // SUPER SATURATED colors - 5x intensity
        vec3 color = background;
        color += u_color1 * pow(aurora1, 0.9) * 3.5 * curtain;
        color += u_color2 * pow(aurora2, 1.0) * 3.0 * curtain;
        color += u_color3 * pow(aurora3, 0.8) * 2.5 * curtain;
        color += mix(u_color1, u_color3, 0.5) * pow(aurora4, 1.1) * 2.0 * curtain;
        
        // DRAMATIC shimmer/sparkle effect - 3x visible
        float shimmer = sin(uv.x * 120.0 + t * 12.0) * sin(uv.y * 80.0 + t * 8.0);
        shimmer = pow(max(shimmer, 0.0), 3.0);
        color += shimmer * 0.8 * curtain;
        
        // Stars in the background
        float stars = pow(noise(floor(uv * 150.0)), 12.0);
        float twinkle = sin(t * 5.0 + noise(floor(uv * 150.0)) * 20.0) * 0.5 + 0.5;
        color += stars * twinkle * vec3(1.0, 0.98, 0.95) * 2.0;
        
        // Boost overall vibrancy
        color = pow(color, vec3(0.8));
        color *= 1.4;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `
  },

  cosmicNebula: {
    id: 'cosmicNebula',
    name: 'Cosmic Nebula',
    category: 'effect',
    isAnimated: true,
    requiresTexture: false,
    blendMode: 'replace',
    uniforms: {
      u_color1: { type: 'color', value: [0.8, 0.1, 0.5], label: 'Nebula 1' },
      u_color2: { type: 'color', value: [0.2, 0.4, 1.0], label: 'Nebula 2' },
      u_starDensity: { type: 'float', value: 0.7, min: 0.1, max: 1.0, step: 0.1, label: 'Stars' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform float u_starDensity;
      
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.6;
        for(int i = 0; i < 7; i++) {
          v += a * noise(p);
          p *= 2.1;
          a *= 0.5;
        }
        return v;
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float t = u_time * 0.15;
        
        // RICH deep space background
        vec3 spaceBlack = vec3(0.01, 0.01, 0.04);
        
        // Multi-layer nebula clouds - MORE INTENSE
        float nebula1 = fbm(uv * 3.5 + t);
        float nebula2 = fbm(uv * 2.5 - t * 0.8 + 50.0);
        float nebula3 = fbm(uv * 4.0 + t * 0.5 + 100.0);
        float nebula4 = fbm(uv * 1.8 - t * 0.3 + 150.0);
        
        vec3 color = spaceBlack;
        
        // SUPER SATURATED nebula colors - 3x intensity
        color += u_color1 * pow(nebula1, 1.5) * 1.8;
        color += u_color2 * pow(nebula2, 1.6) * 1.5;
        color += mix(u_color1, u_color2, 0.5) * pow(nebula3, 1.4) * 1.2;
        color += vec3(0.9, 0.6, 0.3) * pow(nebula4, 2.0) * 0.6;
        
        // Inner glow
        float glow = fbm(uv * 6.0 + t * 2.0);
        color += vec3(1.0, 0.8, 0.9) * pow(glow, 3.0) * 0.4;
        
        // DRAMATIC star field - 3x density
        float stars = step(1.0 - u_starDensity * 0.02, hash(floor(uv * 300.0)));
        float twinkle = sin(u_time * 4.0 + hash(floor(uv * 300.0)) * 15.0) * 0.5 + 0.5;
        color += stars * (twinkle * 0.5 + 0.5) * vec3(1.0, 0.97, 0.92) * 2.5;
        
        // Bright star clusters
        float bigStars = step(0.998, hash(floor(uv * 100.0)));
        color += bigStars * vec3(1.0, 0.95, 0.85) * 4.0;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `
  },

  liquidChrome: {
    id: 'liquidChrome',
    name: 'Liquid Chrome',
    category: 'effect',
    isAnimated: true,
    requiresTexture: false,
    blendMode: 'replace',
    uniforms: {
      u_speed: { type: 'float', value: 0.7, min: 0.1, max: 1.5, step: 0.1, label: 'Speed' },
      u_scale: { type: 'float', value: 4.0, min: 1, max: 8, step: 0.5, label: 'Scale' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_speed;
      uniform float u_scale;
      
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(noise(i), noise(i + vec2(1.0, 0.0)), f.x),
                   mix(noise(i + vec2(0.0, 1.0)), noise(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 p = uv * u_scale;
        float t = u_time * u_speed;
        
        // Multi-octave liquid noise
        float n1 = smoothNoise(p + t);
        float n2 = smoothNoise(p * 2.2 - t * 0.8);
        float n3 = smoothNoise(p * 0.6 + t * 0.4);
        float n4 = smoothNoise(p * 3.5 + t * 1.2);
        
        float chrome = (n1 * 0.4 + n2 * 0.3 + n3 * 0.2 + n4 * 0.1);
        chrome = pow(chrome, 0.45); // MORE contrast
        
        // PREMIUM chrome palette - higher contrast
        vec3 chromeDark = vec3(0.15, 0.17, 0.22);
        vec3 chromeMid = vec3(0.6, 0.65, 0.72);
        vec3 chromeBright = vec3(1.0, 1.0, 1.0);
        
        vec3 color = mix(chromeDark, chromeMid, chrome);
        color = mix(color, chromeBright, pow(chrome, 2.5));
        
        // DRAMATIC rainbow caustics - 5x visible
        float rainbow = sin(chrome * 20.0 + t * 2.0);
        color.r += rainbow * 0.2;
        color.g += rainbow * 0.08;
        color.b -= rainbow * 0.15;
        
        // Environment reflection sweep
        float envSweep = sin(uv.x * 3.0 + uv.y * 2.0 + t * 1.5) * 0.5 + 0.5;
        color += vec3(0.25, 0.27, 0.32) * pow(envSweep, 2.0);
        
        // Specular hotspots
        float spec = pow(smoothNoise(p * 5.0 + t * 2.0), 5.0);
        color += vec3(1.0) * spec * 1.5;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `
  },

  voronoi: {
    id: 'voronoi',
    name: 'Voronoi Cells',
    category: 'effect',
    isAnimated: true,
    requiresTexture: false,
    blendMode: 'replace',
    uniforms: {
      u_color1: { type: 'color', value: [1.0, 0.4, 0.1], label: 'Cell Color' },
      u_color2: { type: 'color', value: [0.2, 0.05, 0.02], label: 'Edge Color' },
      u_scale: { type: 'float', value: 6.0, min: 2, max: 15, step: 1, label: 'Scale' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform float u_scale;
      
      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }
      
      float voronoi(vec2 x, out vec2 cellCenter) {
        vec2 n = floor(x);
        vec2 f = fract(x);
        float minDist = 1.0;
        for(int j = -1; j <= 1; j++) {
          for(int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash2(n + g);
            o = 0.5 + 0.5 * sin(u_time * 0.8 + 6.28318 * o);
            vec2 r = g + o - f;
            float d = dot(r, r);
            if(d < minDist) {
              minDist = d;
              cellCenter = n + g + o;
            }
          }
        }
        return sqrt(minDist);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 p = uv * u_scale;
        
        vec2 cellCenter;
        float v = voronoi(p, cellCenter);
        
        // PREMIUM cell coloring with gradient
        vec3 cellColor = u_color1 * (0.5 + 0.5 * sin(cellCenter.x * 2.0 + cellCenter.y * 3.0));
        cellColor = mix(cellColor, u_color1 * 1.3, pow(1.0 - v, 2.0));
        
        // Sharp edge glow
        float edge = 1.0 - smoothstep(0.0, 0.15, v);
        vec3 edgeGlow = u_color1 * 2.0 * edge;
        
        vec3 color = mix(u_color2, cellColor, v);
        color += edgeGlow;
        
        // Inner cell highlight
        float highlight = pow(1.0 - v, 4.0);
        color += vec3(1.0, 0.9, 0.8) * highlight * 0.3;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `
  },

  // ===== PREMIUM LOGO ANIMATIONS =====
  
  holographic: {
    id: 'holographic',
    name: 'Holographic',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'screen',
    uniforms: {
      u_intensity: { type: 'float', value: 1.0, min: 0.3, max: 1.0, step: 0.1, label: 'Intensity' },
      u_speed: { type: 'float', value: 1.5, min: 0.3, max: 2.5, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_intensity;
      uniform float u_speed;
      
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        float t = u_time * u_speed;
        
        // Position-based rainbow with MEGA INTENSE colors
        vec2 center = uv - 0.5;
        float angle = atan(center.y, center.x);
        float dist = length(center);
        
        // SUPER VISIBLE rainbow bands - 5x intensity
        float rainbowPhase = angle * 4.0 + dist * 20.0 + t * 4.0;
        vec3 rainbow = vec3(
          sin(rainbowPhase) * 0.5 + 0.5,
          sin(rainbowPhase + 2.094) * 0.5 + 0.5,
          sin(rainbowPhase + 4.188) * 0.5 + 0.5
        );
        rainbow = pow(rainbow, vec3(0.6)) * 2.0; // Boost saturation massively
        
        // DRAMATIC light sweep band - very visible
        float sweep = fract(t * 0.5);
        float sweepBand = smoothstep(0.0, 0.2, uv.y - sweep + 0.15) * 
                         smoothstep(0.0, 0.2, sweep + 0.25 - uv.y);
        
        // Second diagonal sweep
        float diagSweep = fract(t * 0.35);
        float diagBand = smoothstep(0.0, 0.15, (uv.x + uv.y) * 0.5 - diagSweep + 0.1) *
                        smoothstep(0.0, 0.15, diagSweep + 0.2 - (uv.x + uv.y) * 0.5);
        
        // MEGA VISIBLE sparkle grid
        float sparkleGrid = hash(floor(uv * 100.0 + floor(t * 8.0)));
        float sparkle = pow(sparkleGrid, 6.0) * 6.0;
        
        // Fresnel edge shimmer
        float fresnel = pow(dist * 1.8, 2.0);
        
        // Prism diffraction bands
        float prism = sin((uv.x + uv.y) * 12.0 - t * 5.0) * 0.5 + 0.5;
        prism = pow(prism, 2.0);
        
        // Combine with MAXIMUM visibility
        vec3 holoEffect = rainbow * 1.5;
        holoEffect += vec3(1.0, 0.98, 0.92) * sweepBand * 2.0;
        holoEffect += vec3(0.9, 0.95, 1.0) * diagBand * 1.5;
        holoEffect += vec3(1.0) * sparkle;
        holoEffect *= (0.5 + prism * 0.6);
        holoEffect *= (0.6 + fresnel * 0.6);
        
        // Apply with strong blend to original
        vec3 finalColor = tex.rgb + holoEffect * u_intensity * tex.a * 2.0;
        
        gl_FragColor = vec4(finalColor, tex.a);
      }
    `
  },

  glitch: {
    id: 'glitch',
    name: 'Glitch',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'replace',
    uniforms: {
      u_intensity: { type: 'float', value: 0.9, min: 0.2, max: 1.0, step: 0.1, label: 'Intensity' },
      u_speed: { type: 'float', value: 5.0, min: 1.0, max: 8.0, step: 0.5, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_intensity;
      uniform float u_speed;
      
      float rand(float x) {
        return fract(sin(x * 12.9898) * 43758.5453);
      }
      
      float rand2(vec2 st) {
        return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float t = u_time * u_speed;
        
        // AGGRESSIVE glitch timing - MORE frequent, MORE intense
        float glitch1 = step(0.65, rand(floor(t * 5.0)));
        float glitch2 = step(0.75, rand(floor(t * 10.0)));
        float glitch3 = step(0.5, rand(floor(t * 2.5)));
        float isGlitching = max(glitch1, max(glitch2, glitch3 * 0.8));
        
        // MASSIVE RGB split - 5x more visible
        float rgbAmount = 0.06 * u_intensity * isGlitching;
        rgbAmount += sin(uv.y * 50.0 + t * 8.0) * 0.025 * u_intensity;
        
        // EXTREME block displacement
        float blockSize = 4.0 + rand(floor(t * 5.0)) * 12.0;
        vec2 block = floor(uv * blockSize);
        float blockRand = rand2(block + floor(t * 6.0));
        float blockActive = step(0.7, blockRand) * isGlitching;
        vec2 blockShift = vec2((rand(blockRand) - 0.5) * 0.35, 0.0) * blockActive * u_intensity;
        
        // DRAMATIC horizontal tear lines - MORE visible
        float tearY = floor(uv.y * 40.0);
        float tearActive = step(0.88, rand(tearY + floor(t * 8.0)));
        float tearShift = (rand(tearY + floor(t * 8.0) + 1.0) - 0.5) * 0.3 * u_intensity * tearActive;
        
        // Frame freeze blocks
        float freezeBlock = floor(uv.y * 8.0);
        float freeze = step(0.85, rand(freezeBlock + floor(t * 3.0))) * isGlitching;
        vec2 freezeShift = freeze * vec2(rand(freezeBlock) - 0.5, 0.0) * 0.2;
        
        // Apply all distortions
        vec2 uvR = uv + vec2(rgbAmount, 0.0) + blockShift + freezeShift;
        vec2 uvG = uv + blockShift * 0.5 + freezeShift * 0.5;
        vec2 uvB = uv - vec2(rgbAmount, 0.0) + blockShift + freezeShift;
        
        uvR.x += tearShift;
        uvG.x += tearShift * 0.5;
        uvB.x += tearShift;
        
        // Sample with separated channels
        float r = texture2D(u_texture, uvR).r;
        float g = texture2D(u_texture, uvG).g;
        float b = texture2D(u_texture, uvB).b;
        float a = max(max(texture2D(u_texture, uvR).a, texture2D(u_texture, uvG).a), texture2D(u_texture, uvB).a);
        
        vec3 color = vec3(r, g, b);
        
        // VISIBLE scanline interference - 3x intensity
        float scanline = sin(gl_FragCoord.y * 3.0) * 0.1 * isGlitching;
        color += scanline;
        
        // EXTREME color corruption blocks
        float corruptBlock = step(0.82, blockRand) * isGlitching;
        vec3 corruptColor = vec3(
          step(0.4, rand(blockRand + 1.0)),
          step(0.6, rand(blockRand + 2.0)) * 0.4,
          step(0.4, rand(blockRand + 3.0))
        );
        color = mix(color, corruptColor, corruptBlock * 0.8 * u_intensity);
        
        // Heavy noise at screen edges
        float edgeNoise = rand(uv.y * 400.0 + t * 100.0) * 0.25 * isGlitching;
        color += edgeNoise * (step(0.92, uv.y) + step(uv.y, 0.08));
        
        // Static noise overlay
        float noise = (rand2(uv * 500.0 + t * 50.0) - 0.5) * 0.15 * isGlitching;
        color += noise;
        
        gl_FragColor = vec4(color, a);
      }
    `
  },

  neonGlow: {
    id: 'neonGlow',
    name: 'Neon Glow',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'add',
    uniforms: {
      u_glowColor: { type: 'color', value: [0.0, 1.0, 0.7], label: 'Glow Color' },
      u_intensity: { type: 'float', value: 4.0, min: 1.0, max: 6.0, step: 0.1, label: 'Intensity' },
      u_pulseSpeed: { type: 'float', value: 2.5, min: 0.5, max: 5.0, step: 0.5, label: 'Pulse' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform vec3 u_glowColor;
      uniform float u_intensity;
      uniform float u_pulseSpeed;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        
        // MASSIVE multi-layer bloom - EXTREMELY VISIBLE
        float glow1 = 0.0, glow2 = 0.0, glow3 = 0.0, glow4 = 0.0, glow5 = 0.0, glow6 = 0.0;
        float innerEdge = 0.0;
        
        // Inner edge detection (16 samples) - WHITE HOT CORE
        for(float i = 0.0; i < 16.0; i++) {
          float angle = i / 16.0 * 6.28318;
          vec2 offset = vec2(cos(angle), sin(angle)) * 0.008;
          innerEdge += abs(tex.a - texture2D(u_texture, uv + offset).a);
        }
        innerEdge = min(innerEdge / 1.5, 1.0);
        
        // HUGE bloom layers (16 samples each) - 6 LAYERS for massive glow
        for(float i = 0.0; i < 16.0; i++) {
          float angle = i / 16.0 * 6.28318;
          vec2 dir = vec2(cos(angle), sin(angle));
          glow1 += texture2D(u_texture, uv + dir * 0.015).a;
          glow2 += texture2D(u_texture, uv + dir * 0.04).a;
          glow3 += texture2D(u_texture, uv + dir * 0.08).a;
          glow4 += texture2D(u_texture, uv + dir * 0.14).a;
          glow5 += texture2D(u_texture, uv + dir * 0.2).a;
          glow6 += texture2D(u_texture, uv + dir * 0.28).a;
        }
        glow1 /= 16.0; glow2 /= 16.0; glow3 /= 16.0; 
        glow4 /= 16.0; glow5 /= 16.0; glow6 /= 16.0;
        
        // Combine with proper falloff - EXTREME GLOW
        float totalGlow = glow1 * 0.3 + glow2 * 0.22 + glow3 * 0.18 + glow4 * 0.14 + glow5 * 0.1 + glow6 * 0.06;
        totalGlow = pow(totalGlow, 0.5);
        
        // STRONG visible pulse
        float pulse = sin(u_time * u_pulseSpeed) * 0.5 + 0.7;
        pulse += sin(u_time * u_pulseSpeed * 2.8) * 0.2;
        
        // Realistic flicker
        float flicker = 0.92 + sin(u_time * 55.0) * 0.04 + sin(u_time * 37.0) * 0.03;
        
        // WHITE-HOT core transitioning to glow color
        float coreIntensity = pow(innerEdge, 0.4);
        vec3 coreColor = mix(u_glowColor, vec3(1.0), coreIntensity * 0.9);
        
        vec3 finalColor = tex.rgb;
        
        // MEGA hot core - 4x multiplier
        finalColor += coreColor * innerEdge * u_intensity * 2.5 * pulse;
        
        // EXTREME bloom - super visible
        finalColor += u_glowColor * totalGlow * u_intensity * 1.5 * pulse;
        
        // Apply flicker
        finalColor *= flicker;
        
        // Extra bloom spillover for HDR effect
        float bloomSpill = max(0.0, (innerEdge - 0.15) * 3.0);
        finalColor += u_glowColor * bloomSpill * u_intensity * 0.6;
        
        // Ambient glow haze
        finalColor += u_glowColor * 0.15 * tex.a * u_intensity;
        
        gl_FragColor = vec4(finalColor, max(tex.a, totalGlow * 0.7));
      }
    `
  },

  chromaticAberration: {
    id: 'chromaticAberration',
    name: 'RGB Split',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'replace',
    uniforms: {
      u_amount: { type: 'float', value: 0.035, min: 0.01, max: 0.08, step: 0.005, label: 'Amount' },
      u_speed: { type: 'float', value: 1.2, min: 0.3, max: 2.5, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_amount;
      uniform float u_speed;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 center = vec2(0.5);
        vec2 dir = uv - center;
        
        float t = u_time * u_speed;
        float wave = sin(t * 2.5) * 0.5 + 0.5;
        float amount = u_amount * (0.6 + wave * 0.6);
        
        // DRAMATIC 3-layer split
        float r = texture2D(u_texture, uv + dir * amount * 1.2).r;
        float g = texture2D(u_texture, uv).g;
        float b = texture2D(u_texture, uv - dir * amount * 1.2).b;
        float a = texture2D(u_texture, uv).a;
        
        // Add secondary split for more intensity
        r += texture2D(u_texture, uv + dir * amount * 0.6).r * 0.3;
        b += texture2D(u_texture, uv - dir * amount * 0.6).b * 0.3;
        r /= 1.3;
        b /= 1.3;
        
        gl_FragColor = vec4(r, g, b, a);
      }
    `
  },

  electricity: {
    id: 'electricity',
    name: 'Electric',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'add',
    uniforms: {
      u_color: { type: 'color', value: [0.3, 0.7, 1.0], label: 'Arc Color' },
      u_intensity: { type: 'float', value: 2.0, min: 0.5, max: 3.0, step: 0.1, label: 'Intensity' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform vec3 u_color;
      uniform float u_intensity;
      
      float random(vec2 st) {
        return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(random(i), random(i + vec2(1.0, 0.0)), f.x),
                   mix(random(i + vec2(0.0, 1.0)), random(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        float t = u_time * 15.0;
        
        // Edge detection - wider for more coverage
        float edge = 0.0;
        for(float i = 0.0; i < 12.0; i++) {
          float angle = i / 12.0 * 6.28318;
          vec2 offset = vec2(cos(angle), sin(angle)) * 0.015;
          edge += abs(tex.a - texture2D(u_texture, uv + offset).a);
        }
        edge = min(edge * 1.8, 1.0);
        
        // Multi-frequency electric arcs - MORE LAYERS
        float arc1 = noise(vec2(uv.x * 40.0 + t, uv.y * 40.0)) * edge;
        float arc2 = noise(vec2(uv.x * 80.0 - t * 1.6, uv.y * 80.0)) * edge * 0.7;
        float arc3 = noise(vec2(uv.x * 160.0 + t * 2.2, uv.y * 160.0)) * edge * 0.4;
        float arc4 = noise(vec2(uv.x * 20.0 - t * 0.8, uv.y * 20.0)) * edge * 0.9;
        
        float arc = pow(arc1 + arc2 + arc3 + arc4, 1.2);
        
        // AGGRESSIVE crackling flicker
        float flicker = step(0.45, random(vec2(floor(t * 5.0), floor(t * 7.0))));
        float flash = step(0.88, random(vec2(floor(t * 12.0), 0.0))) * 3.5;
        arc *= 0.4 + flicker * 0.6 + flash;
        
        // White-hot core with color gradient
        vec3 arcColor = mix(u_color, vec3(1.0), 0.5);
        vec3 finalColor = tex.rgb;
        finalColor += arcColor * arc * u_intensity * 2.5;
        finalColor += u_color * edge * u_intensity * 0.8;
        
        // Ambient electrical haze
        finalColor += u_color * 0.1 * tex.a * u_intensity;
        
        gl_FragColor = vec4(finalColor, tex.a);
      }
    `
  },

  goldFoil: {
    id: 'goldFoil',
    name: 'Gold Foil',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'overlay',
    uniforms: {
      u_intensity: { type: 'float', value: 1.0, min: 0.3, max: 1.0, step: 0.05, label: 'Intensity' },
      u_speed: { type: 'float', value: 0.9, min: 0.2, max: 1.5, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_intensity;
      uniform float u_speed;
      
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(noise(i), noise(i + vec2(1.0, 0.0)), f.x),
                   mix(noise(i + vec2(0.0, 1.0)), noise(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        float t = u_time * u_speed;
        
        // PREMIUM multi-frequency metallic noise
        float n1 = smoothNoise(uv * 20.0 + t);
        float n2 = smoothNoise(uv * 40.0 - t * 0.9);
        float n3 = smoothNoise(uv * 10.0 + t * 0.6);
        float n4 = smoothNoise(uv * 60.0 + t * 1.2);
        float metallic = (n1 * 0.4 + n2 * 0.3 + n3 * 0.2 + n4 * 0.1);
        
        // RICH gold color palette - SUPER saturated
        vec3 goldDark = vec3(0.55, 0.35, 0.02);
        vec3 goldMid = vec3(1.0, 0.8, 0.25);
        vec3 goldBright = vec3(1.0, 1.0, 0.85);
        
        // Sharp metallic reflection with HIGH contrast
        float reflection = pow(metallic, 0.55);
        vec3 goldColor = mix(goldDark, goldMid, reflection);
        goldColor = mix(goldColor, goldBright, pow(reflection, 2.2));
        
        // DRAMATIC diagonal light sweep - SUPER VISIBLE
        float sweep1 = sin(uv.x * 5.0 + uv.y * 4.0 + t * 3.0) * 0.5 + 0.5;
        float sweep2 = sin(-uv.x * 4.0 + uv.y * 5.0 + t * 2.2) * 0.5 + 0.5;
        float sweep3 = sin(uv.x * 8.0 - t * 4.0) * 0.5 + 0.5;
        goldColor += goldBright * pow(sweep1, 2.5) * 0.7;
        goldColor += goldBright * pow(sweep2, 3.0) * 0.5;
        goldColor += goldBright * pow(sweep3, 4.0) * 0.3;
        
        // Micro-sparkle for luxury feel - MORE SPARKLES
        float sparkle = pow(noise(floor(uv * 150.0)), 10.0) * 3.0;
        float sparkle2 = pow(noise(floor(uv * 200.0 + t * 10.0)), 12.0) * 2.0;
        goldColor += goldBright * (sparkle + sparkle2);
        
        // Apply with strong blend
        vec3 finalColor = mix(tex.rgb, goldColor, u_intensity * tex.a * 1.4);
        
        gl_FragColor = vec4(finalColor, tex.a);
      }
    `
  },

  chromeMercury: {
    id: 'chromeMercury',
    name: 'Chrome Mercury',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'replace',
    uniforms: {
      u_intensity: { type: 'float', value: 1.0, min: 0.3, max: 1.0, step: 0.1, label: 'Intensity' },
      u_speed: { type: 'float', value: 1.0, min: 0.2, max: 1.5, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_intensity;
      uniform float u_speed;
      
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(noise(i), noise(i + vec2(1.0, 0.0)), f.x),
                   mix(noise(i + vec2(0.0, 1.0)), noise(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        float t = u_time * u_speed;
        
        // EXTREME liquid mercury distortion - 3x intensity
        vec2 distort = vec2(
          smoothNoise(uv * 12.0 + t * 1.8) - 0.5,
          smoothNoise(uv * 12.0 + vec2(100.0) + t * 1.3) - 0.5
        ) * 0.05 * u_intensity;
        
        vec2 uvDistorted = uv + distort;
        vec4 texDistorted = texture2D(u_texture, uvDistorted);
        
        // INTENSE chrome reflection layers
        float n1 = smoothNoise(uvDistorted * 18.0 + t * 1.2);
        float n2 = smoothNoise(uvDistorted * 35.0 - t * 1.0);
        float n3 = smoothNoise(uvDistorted * 10.0 + t * 0.7);
        float n4 = smoothNoise(uvDistorted * 50.0 + t * 1.5);
        
        float chrome = (n1 * 0.4 + n2 * 0.3 + n3 * 0.2 + n4 * 0.1);
        chrome = pow(chrome, 0.45); // More contrast
        
        // PREMIUM chrome palette - MAXIMUM contrast
        vec3 chromeDark = vec3(0.1, 0.12, 0.18);
        vec3 chromeMid = vec3(0.6, 0.65, 0.72);
        vec3 chromeBright = vec3(1.0, 1.0, 1.0);
        
        vec3 chromeColor = mix(chromeDark, chromeMid, chrome);
        chromeColor = mix(chromeColor, chromeBright, pow(chrome, 1.8));
        
        // DRAMATIC rainbow caustics - 5x intensity
        float caustic = sin(chrome * 30.0 + t * 4.0);
        chromeColor.r += caustic * 0.18;
        chromeColor.g += caustic * 0.06;
        chromeColor.b -= caustic * 0.12;
        
        // EXTREME environment sweep
        float envSweep = sin(uv.x * 4.0 + uv.y * 3.0 + t * 2.5) * 0.5 + 0.5;
        chromeColor += vec3(0.25, 0.28, 0.35) * pow(envSweep, 2.0);
        
        // Specular hotspots - MORE VISIBLE
        float specular = pow(smoothNoise(uvDistorted * 50.0 + t * 2.5), 5.0);
        chromeColor += vec3(1.0) * specular * 1.2;
        
        // Apply with full intensity
        vec3 finalColor = mix(texDistorted.rgb, chromeColor, u_intensity * texDistorted.a);
        
        gl_FragColor = vec4(finalColor, texDistorted.a);
      }
    `
  },

  fireEmber: {
    id: 'fireEmber',
    name: 'Fire Ember',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'add',
    uniforms: {
      u_intensity: { type: 'float', value: 2.5, min: 0.5, max: 4.0, step: 0.1, label: 'Intensity' },
      u_speed: { type: 'float', value: 2.5, min: 0.5, max: 4.0, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_intensity;
      uniform float u_speed;
      
      float rand(vec2 st) {
        return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(rand(i), rand(i + vec2(1.0, 0.0)), f.x),
                   mix(rand(i + vec2(0.0, 1.0)), rand(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.65;
        for(int i = 0; i < 7; i++) {
          v += a * noise(p);
          p *= 2.1;
          a *= 0.5;
        }
        return v;
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        float t = u_time * u_speed;
        
        // Wide edge detection for flame spread
        float edge = 0.0;
        for(float i = 0.0; i < 16.0; i++) {
          float angle = i / 16.0 * 6.28318;
          vec2 offset = vec2(cos(angle), sin(angle)) * 0.025;
          edge += abs(tex.a - texture2D(u_texture, uv + offset).a);
        }
        edge = min(edge * 1.5, 1.0);
        
        // EXTREME rising flames - faster, taller, more visible
        vec2 flameUV = uv;
        flameUV.y -= t * 0.6;
        float flame1 = fbm(flameUV * 6.0);
        float flame2 = fbm(flameUV * 12.0 + 100.0);
        float flame3 = fbm(flameUV * 4.0 - 50.0);
        float flame4 = fbm(flameUV * 8.0 + 200.0);
        float flame = (flame1 * 0.4 + flame2 * 0.3 + flame3 * 0.2 + flame4 * 0.1) * edge;
        
        // Heat shimmer distortion - MORE VISIBLE
        vec2 heatDistort = vec2(
          noise(vec2(uv.x * 30.0 + t * 4.0, uv.y * 15.0)) - 0.5,
          noise(vec2(uv.x * 22.0, uv.y * 30.0 + t * 5.0)) - 0.5
        ) * 0.02 * edge;
        
        // RICH fire color gradient - SUPER saturated
        vec3 fireCore = vec3(1.0, 1.0, 0.95);      // White-hot core
        vec3 fireYellow = vec3(1.0, 0.9, 0.15);    // Bright yellow
        vec3 fireOrange = vec3(1.0, 0.5, 0.0);     // Intense orange
        vec3 fireRed = vec3(0.95, 0.1, 0.0);       // Deep red
        
        float flameIntensity = pow(flame, 0.6);
        vec3 fireColor = mix(fireRed, fireOrange, flameIntensity);
        fireColor = mix(fireColor, fireYellow, pow(flameIntensity, 1.3));
        fireColor = mix(fireColor, fireCore, pow(flameIntensity, 2.2));
        
        // MASSIVE ember particles - 5x more visible
        float emberGrid = rand(floor(uv * 80.0 + floor(t * 10.0)));
        float ember = pow(emberGrid, 8.0) * edge * 8.0;
        
        // Rising ember particles
        float risingEmber = rand(floor(vec2(uv.x * 60.0, uv.y * 60.0 + t * 15.0)));
        risingEmber = pow(risingEmber, 12.0) * 5.0;
        
        // Strong flickering
        float flicker = 0.75 + noise(vec2(t * 30.0, 0.0)) * 0.5;
        
        vec3 finalColor = tex.rgb;
        finalColor += fireColor * flame * u_intensity * 1.8 * flicker;
        finalColor += vec3(1.0, 0.75, 0.35) * (ember + risingEmber);
        
        // Add outer glow - MORE VISIBLE
        finalColor += vec3(1.0, 0.35, 0.05) * edge * 0.6 * u_intensity;
        
        // Heat haze around flames
        finalColor += vec3(1.0, 0.6, 0.2) * edge * flame * 0.4;
        
        gl_FragColor = vec4(finalColor, tex.a);
      }
    `
  },

  liquidWarp: {
    id: 'liquidWarp',
    name: 'Liquid Warp',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'replace',
    uniforms: {
      u_intensity: { type: 'float', value: 0.05, min: 0.02, max: 0.1, step: 0.01, label: 'Intensity' },
      u_speed: { type: 'float', value: 1.0, min: 0.2, max: 2.0, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_intensity;
      uniform float u_speed;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float t = u_time * u_speed;
        
        // DRAMATIC multi-layer liquid distortion
        vec2 distortion = vec2(
          sin(uv.y * 18.0 + t * 3.5) * cos(uv.x * 12.0 + t * 2.5),
          cos(uv.x * 15.0 + t * 3.0) * sin(uv.y * 10.0 + t * 2.0)
        ) * u_intensity;
        
        distortion += vec2(
          sin(uv.y * 35.0 + t * 6.0) * 0.4,
          cos(uv.x * 30.0 + t * 5.0) * 0.4
        ) * u_intensity * 0.6;
        
        distortion += vec2(
          cos(uv.y * 8.0 - t * 1.5) * 0.3,
          sin(uv.x * 6.0 - t * 1.2) * 0.3
        ) * u_intensity * 0.4;
        
        vec4 tex = texture2D(u_texture, uv + distortion);
        gl_FragColor = tex;
      }
    `
  },

  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'add',
    uniforms: {
      u_color1: { type: 'color', value: [1.0, 0.0, 0.6], label: 'Magenta' },
      u_color2: { type: 'color', value: [0.0, 1.0, 1.0], label: 'Cyan' },
      u_intensity: { type: 'float', value: 2.2, min: 0.5, max: 3.5, step: 0.1, label: 'Intensity' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform float u_intensity;
      
      float random(float x) {
        return fract(sin(x * 12.9898) * 43758.5453);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        float t = u_time;
        
        // Edge detection - wider
        float edge = 0.0;
        for(float i = 0.0; i < 12.0; i++) {
          float angle = i / 12.0 * 6.28318;
          vec2 offset = vec2(cos(angle), sin(angle)) * 0.015;
          edge += abs(tex.a - texture2D(u_texture, uv + offset).a);
        }
        edge = min(edge * 1.5, 1.0);
        
        // Dual color phase animation - FASTER, MORE VISIBLE
        float phase = sin(t * 3.5 + uv.x * 15.0 + uv.y * 10.0) * 0.5 + 0.5;
        vec3 neonColor = mix(u_color1, u_color2, phase);
        
        // DRAMATIC fast scan bar
        float scanBar = smoothstep(0.0, 0.1, uv.y - fract(t * 0.45)) * 
                       smoothstep(0.0, 0.1, fract(t * 0.45) + 0.1 - uv.y);
        
        // Data corruption - MORE FREQUENT
        float blockY = floor(uv.y * 30.0);
        float corrupt = step(0.92, random(blockY + floor(t * 8.0))) * 0.8;
        
        // CRT scan lines - MORE VISIBLE
        float lines = sin(uv.y * 350.0 + t * 18.0) * 0.025;
        
        vec3 finalColor = tex.rgb;
        finalColor += neonColor * edge * u_intensity * 1.5;
        finalColor += neonColor * scanBar * 0.6;
        finalColor += u_color2 * corrupt * tex.a;
        finalColor += lines;
        
        // Ambient neon haze
        finalColor += mix(u_color1, u_color2, 0.5) * 0.08 * tex.a * u_intensity;
        
        gl_FragColor = vec4(finalColor, tex.a);
      }
    `
  },

  iceFrost: {
    id: 'iceFrost',
    name: 'Ice Frost',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'overlay',
    uniforms: {
      u_intensity: { type: 'float', value: 1.0, min: 0.3, max: 1.0, step: 0.1, label: 'Intensity' },
      u_speed: { type: 'float', value: 0.8, min: 0.1, max: 1.2, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_intensity;
      uniform float u_speed;
      
      float rand(vec2 st) {
        return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(rand(i), rand(i + vec2(1.0, 0.0)), f.x),
                   mix(rand(i + vec2(0.0, 1.0)), rand(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      
      // Sharp crystalline pattern
      float crystal(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        
        float minDist = 1.0;
        for(int y = -1; y <= 1; y++) {
          for(int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = rand(i + neighbor) * vec2(0.6) + 0.2;
            float d = length(neighbor + point - f);
            minDist = min(minDist, d);
          }
        }
        return minDist;
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        float t = u_time * u_speed;
        
        // EXTREME crystalline frost patterns - MORE DETAIL
        float frost1 = crystal(uv * 30.0 + t * 0.18);
        float frost2 = crystal(uv * 60.0 - t * 0.1);
        float frost3 = crystal(uv * 15.0 + t * 0.12);
        float frost4 = crystal(uv * 45.0 + t * 0.08);
        float frostPattern = frost1 * 0.4 + frost2 * 0.25 + frost3 * 0.2 + frost4 * 0.15;
        frostPattern = pow(frostPattern, 0.55);
        
        // RICH ice color palette - MORE saturated blues
        vec3 iceDeep = vec3(0.03, 0.12, 0.45);
        vec3 iceMid = vec3(0.35, 0.75, 1.0);
        vec3 iceHighlight = vec3(0.95, 0.98, 1.0);
        
        vec3 iceColor = mix(iceDeep, iceMid, frostPattern);
        iceColor = mix(iceColor, iceHighlight, pow(frostPattern, 1.8));
        
        // MEGA sparkling crystals - 5x more
        float sparkle = pow(rand(floor(uv * 100.0)), 13.0) * 4.0;
        float sparkle2 = pow(rand(floor(uv * 150.0 + t * 12.0)), 15.0) * 3.0;
        sparkle *= sin(t * 15.0 + rand(floor(uv * 100.0)) * 12.0) * 0.5 + 0.7;
        
        // Edge frost accumulation - WIDER
        float edge = 0.0;
        for(float i = 0.0; i < 16.0; i++) {
          float angle = i / 16.0 * 6.28318;
          vec2 offset = vec2(cos(angle), sin(angle)) * 0.02;
          edge += abs(tex.a - texture2D(u_texture, uv + offset).a);
        }
        edge = min(edge, 1.0);
        
        // Frost spreading wave - FASTER
        float spreadWave = sin(length(uv - 0.5) * 25.0 - t * 4.0) * 0.5 + 0.5;
        spreadWave = pow(spreadWave, 2.5);
        
        // Combine with MAXIMUM visibility
        vec3 finalColor = mix(tex.rgb, iceColor, u_intensity * tex.a * 1.3);
        finalColor += iceHighlight * (sparkle + sparkle2) * u_intensity;
        finalColor += iceMid * edge * 0.6 * u_intensity;
        finalColor += iceHighlight * spreadWave * edge * 0.4;
        
        gl_FragColor = vec4(finalColor, tex.a);
      }
    `
  },

  hologram3D: {
    id: 'hologram3D',
    name: 'Hologram 3D',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'add',
    uniforms: {
      u_color: { type: 'color', value: [0.0, 0.95, 1.0], label: 'Hologram Color' },
      u_intensity: { type: 'float', value: 1.8, min: 0.5, max: 2.5, step: 0.1, label: 'Intensity' },
      u_speed: { type: 'float', value: 1.8, min: 0.5, max: 3.0, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform vec3 u_color;
      uniform float u_intensity;
      uniform float u_speed;
      
      float rand(float x) {
        return fract(sin(x * 12.9898) * 43758.5453);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        float t = u_time * u_speed;
        
        // EXTREME visible scanlines
        float scanLine = sin(uv.y * 180.0 + t * 12.0) * 0.5 + 0.5;
        scanLine = pow(scanLine, 0.35);
        
        // Strong interference pattern
        float interference = sin(uv.x * 100.0 + t * 8.0) * sin(uv.y * 75.0 - t * 5.0);
        interference = interference * 0.5 + 0.5;
        interference = pow(interference, 0.6);
        
        // Wide edge glow
        float edge = 0.0;
        for(float i = 0.0; i < 16.0; i++) {
          float angle = i / 16.0 * 6.28318;
          vec2 offset = vec2(cos(angle), sin(angle)) * 0.02;
          edge += abs(tex.a - texture2D(u_texture, uv + offset).a);
        }
        edge = min(edge * 1.5, 1.0);
        
        // 3D depth separation - SUPER VISIBLE
        float depth1 = texture2D(u_texture, uv + vec2(0.012, 0.0)).a;
        float depth2 = texture2D(u_texture, uv - vec2(0.012, 0.0)).a;
        float depth = abs(depth1 - depth2) * 4.0;
        
        // Aggressive flicker
        float flicker = 0.8 + rand(floor(t * 25.0)) * 0.4;
        
        // PREMIUM hologram effect
        vec3 holoColor = u_color * (0.35 + scanLine * 0.9);
        holoColor *= (0.5 + interference * 0.7);
        holoColor += u_color * edge * 3.0;
        holoColor += vec3(1.0) * depth * 0.6;
        
        // Color shifting
        holoColor.r += sin(t * 4.0) * 0.15;
        holoColor.b += cos(t * 3.0) * 0.15;
        
        vec3 finalColor = tex.rgb * 0.15 + holoColor * u_intensity * tex.a * flicker;
        
        // Visible scanline gaps
        float lineGap = step(0.65, sin(uv.y * 350.0));
        finalColor *= 0.65 + lineGap * 0.35;
        
        gl_FragColor = vec4(finalColor, tex.a * 0.95);
      }
    `
  },

  vhs: {
    id: 'vhs',
    name: 'VHS Tape',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'replace',
    uniforms: {
      u_intensity: { type: 'float', value: 0.8, min: 0.2, max: 1.0, step: 0.1, label: 'Intensity' },
      u_speed: { type: 'float', value: 1.2, min: 0.3, max: 2.0, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_intensity;
      uniform float u_speed;
      
      float random(float x) {
        return fract(sin(x * 12.9898) * 43758.5453);
      }
      
      float random2(vec2 st) {
        return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float t = u_time * u_speed;
        
        // VHS tracking wobble - MORE DRAMATIC
        float wobble = sin(uv.y * 25.0 + t * 6.0) * 0.004 * u_intensity;
        wobble += sin(uv.y * 60.0 + t * 10.0) * 0.002 * u_intensity;
        wobble += sin(uv.y * 10.0 + t * 2.0) * 0.003 * u_intensity;
        
        // Tracking error bands - MORE FREQUENT
        float trackingBand = step(0.94, random(floor(uv.y * 35.0) + floor(t * 4.0)));
        float trackingOffset = trackingBand * (random(floor(t * 4.0)) - 0.5) * 0.15 * u_intensity;
        
        vec2 uvDistorted = uv;
        uvDistorted.x += wobble + trackingOffset;
        
        // Color bleeding/smearing - MORE VISIBLE
        float colorBleed = 0.005 * u_intensity;
        float r = texture2D(u_texture, uvDistorted + vec2(colorBleed * 1.5, 0.0)).r;
        float g = texture2D(u_texture, uvDistorted).g;
        float b = texture2D(u_texture, uvDistorted - vec2(colorBleed, 0.0)).b;
        float a = texture2D(u_texture, uvDistorted).a;
        
        vec3 color = vec3(r, g, b);
        
        // Scanlines - MORE VISIBLE
        float scanline = sin(uv.y * 450.0) * 0.06 * u_intensity;
        color -= scanline;
        
        // Static noise - HEAVIER
        float noise = (random2(uv * 600.0 + t * 120.0) - 0.5) * 0.12 * u_intensity;
        color += noise;
        
        // Horizontal noise bands - MORE FREQUENT
        float noiseBand = step(0.95, random(floor(uv.y * 100.0) + floor(t * 12.0)));
        color += noiseBand * 0.4 * u_intensity;
        
        // Color desaturation/shift
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        color = mix(color, vec3(luma), 0.25 * u_intensity);
        
        // Slight color shift toward blue/green
        color.r -= 0.02 * u_intensity;
        color.b += 0.03 * u_intensity;
        
        // Vignette - STRONGER
        vec2 vignetteUV = uv * 2.0 - 1.0;
        float vignette = 1.0 - dot(vignetteUV, vignetteUV) * 0.4;
        color *= vignette;
        
        gl_FragColor = vec4(color, a);
      }
    `
  },

  laserEngrave: {
    id: 'laserEngrave',
    name: 'Laser Engrave',
    category: 'animation',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'add',
    uniforms: {
      u_color: { type: 'color', value: [1.0, 0.35, 0.1], label: 'Laser Color' },
      u_intensity: { type: 'float', value: 1.5, min: 0.5, max: 2.5, step: 0.1, label: 'Intensity' },
      u_speed: { type: 'float', value: 1.2, min: 0.3, max: 2.0, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform vec3 u_color;
      uniform float u_intensity;
      uniform float u_speed;
      
      float rand(vec2 st) {
        return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        float t = u_time * u_speed;
        
        // Edge detection for engraving path - WIDER
        float edge = 0.0;
        for(float i = 0.0; i < 16.0; i++) {
          float angle = i / 16.0 * 6.28318;
          vec2 offset = vec2(cos(angle), sin(angle)) * 0.012;
          edge += abs(tex.a - texture2D(u_texture, uv + offset).a);
        }
        edge = min(edge / 1.5, 1.0);
        
        // Laser beam position (moving along edges) - FASTER
        float beamPos = fract(t * 0.4);
        float beamY = beamPos;
        float beamWidth = 0.1;
        
        // Distance from laser beam
        float beamDist = abs(uv.y - beamY);
        float beam = smoothstep(beamWidth, 0.0, beamDist);
        
        // Engraving glow where beam meets edge - BRIGHTER
        float engraveGlow = beam * edge * 4.0;
        
        // Residual heat glow (trails behind beam) - LONGER
        float heatTrail = smoothstep(0.0, 0.4, beamY - uv.y) * edge;
        heatTrail *= smoothstep(0.6, 0.0, beamY - uv.y);
        
        // MEGA spark particles at engraving point
        float sparkle = 0.0;
        if (engraveGlow > 0.3) {
          sparkle = pow(rand(vec2(uv.x * 600.0 + t * 60.0, uv.y * 400.0)), 8.0) * 3.0;
        }
        
        // Hot core (white) to color gradient
        vec3 laserCore = vec3(1.0, 0.98, 0.9);
        vec3 laserColor = mix(u_color, laserCore, engraveGlow * 0.8);
        
        vec3 finalColor = tex.rgb;
        finalColor += laserColor * engraveGlow * u_intensity * 1.2;
        finalColor += u_color * heatTrail * u_intensity * 0.7;
        finalColor += laserCore * sparkle * u_intensity;
        
        // Subtle edge glow from heat - STRONGER
        finalColor += u_color * edge * 0.3 * u_intensity;
        
        gl_FragColor = vec4(finalColor, tex.a);
      }
    `
  },

  // ===== FILTERS =====
  
  frostedGlass: {
    id: 'frostedGlass',
    name: 'Frosted Glass',
    category: 'filter',
    isAnimated: false,
    requiresTexture: true,
    blendMode: 'replace',
    uniforms: {
      u_blur: { type: 'float', value: 0.012, min: 0.002, max: 0.04, step: 0.002, label: 'Blur' },
      u_frost: { type: 'float', value: 0.6, min: 0.1, max: 1.0, step: 0.1, label: 'Frost' },
    },
    fragmentShader: `
      precision highp float;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_blur;
      uniform float u_frost;
      
      float random(vec2 st) {
        return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        
        vec4 color = vec4(0.0);
        float total = 0.0;
        
        for(float x = -5.0; x <= 5.0; x += 1.0) {
          for(float y = -5.0; y <= 5.0; y += 1.0) {
            vec2 offset = vec2(x, y) * u_blur;
            offset += (vec2(random(uv + vec2(x, y)), random(uv + vec2(y, x))) - 0.5) * u_blur * u_frost * 1.5;
            float weight = 1.0 - length(vec2(x, y)) / 7.5;
            color += texture2D(u_texture, uv + offset) * weight;
            total += weight;
          }
        }
        
        color /= total;
        
        // Add subtle frost texture - MORE VISIBLE
        float frost = random(uv * 250.0) * 0.07 * u_frost;
        color.rgb += frost;
        
        gl_FragColor = color;
      }
    `
  },

  oilPainting: {
    id: 'oilPainting',
    name: 'Oil Painting',
    category: 'filter',
    isAnimated: false,
    requiresTexture: true,
    blendMode: 'replace',
    uniforms: {
      u_radius: { type: 'float', value: 5.0, min: 2, max: 10, step: 1, label: 'Brush Size' },
    },
    fragmentShader: `
      precision highp float;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_radius;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 texel = 1.0 / u_resolution;
        
        vec3 mean = vec3(0.0);
        float count = 0.0;
        
        for(float x = -5.0; x <= 5.0; x += 1.0) {
          for(float y = -5.0; y <= 5.0; y += 1.0) {
            if(length(vec2(x, y)) <= u_radius) {
              vec2 offset = vec2(x, y) * texel * (u_radius / 5.0);
              mean += texture2D(u_texture, uv + offset).rgb;
              count += 1.0;
            }
          }
        }
        
        mean /= count;
        
        // Add subtle brush stroke texture - MORE VISIBLE
        float stroke = sin(uv.x * 250.0 + uv.y * 180.0) * 0.035;
        float stroke2 = sin(uv.x * 150.0 - uv.y * 200.0) * 0.02;
        mean += stroke + stroke2;
        
        float a = texture2D(u_texture, uv).a;
        gl_FragColor = vec4(mean, a);
      }
    `
  },

  posterize: {
    id: 'posterize',
    name: 'Posterize',
    category: 'filter',
    isAnimated: false,
    requiresTexture: true,
    blendMode: 'replace',
    uniforms: {
      u_levels: { type: 'float', value: 5.0, min: 2, max: 12, step: 1, label: 'Levels' },
    },
    fragmentShader: `
      precision highp float;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_levels;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        
        vec3 color = floor(tex.rgb * u_levels + 0.5) / u_levels;
        
        gl_FragColor = vec4(color, tex.a);
      }
    `
  },

  pixelate: {
    id: 'pixelate',
    name: 'Pixelate',
    category: 'filter',
    isAnimated: false,
    requiresTexture: true,
    blendMode: 'replace',
    uniforms: {
      u_pixelSize: { type: 'float', value: 10.0, min: 2, max: 30, step: 1, label: 'Pixel Size' },
    },
    fragmentShader: `
      precision highp float;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_pixelSize;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        
        vec2 pixelUV = floor(uv * u_resolution / u_pixelSize) * u_pixelSize / u_resolution;
        pixelUV += (u_pixelSize * 0.5) / u_resolution;
        
        vec4 tex = texture2D(u_texture, pixelUV);
        gl_FragColor = tex;
      }
    `
  },

  duotone: {
    id: 'duotone',
    name: 'Duotone',
    category: 'filter',
    isAnimated: false,
    requiresTexture: true,
    blendMode: 'replace',
    uniforms: {
      u_darkColor: { type: 'color', value: [0.1, 0.0, 0.2], label: 'Dark' },
      u_lightColor: { type: 'color', value: [1.0, 0.7, 0.3], label: 'Light' },
    },
    fragmentShader: `
      precision highp float;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform vec3 u_darkColor;
      uniform vec3 u_lightColor;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        
        float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
        vec3 color = mix(u_darkColor, u_lightColor, luma);
        
        gl_FragColor = vec4(color, tex.a);
      }
    `
  },

  colorShift: {
    id: 'colorShift',
    name: 'Color Shift',
    category: 'filter',
    isAnimated: true,
    requiresTexture: true,
    blendMode: 'replace',
    uniforms: {
      u_hueShift: { type: 'float', value: 0.5, min: 0.0, max: 1.0, step: 0.05, label: 'Hue Shift' },
      u_speed: { type: 'float', value: 0.5, min: 0.0, max: 1.5, step: 0.1, label: 'Speed' },
    },
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_texture;
      uniform float u_hueShift;
      uniform float u_speed;
      
      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }
      
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 tex = texture2D(u_texture, uv);
        
        vec3 hsv = rgb2hsv(tex.rgb);
        hsv.x = fract(hsv.x + u_hueShift + u_time * u_speed * 0.1);
        vec3 rgb = hsv2rgb(hsv);
        
        gl_FragColor = vec4(rgb, tex.a);
      }
    `
  }
};

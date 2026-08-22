import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Original animated gradient field (kept as a scene). */
export function GradientField({ primary, accent, surface }: { primary: string; accent: string; surface: string }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(primary) },
    uColorB: { value: new THREE.Color(accent) },
    uColorC: { value: new THREE.Color(surface) },
  }), [primary, accent, surface]);

  useFrame((s) => { if (matRef.current) matRef.current.uniforms.uTime.value = s.clock.getElapsedTime(); });

  return (
    <mesh scale={[3.4, 3.4, 1]}>
      <planeGeometry args={[1, 1, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          uniform float uTime;
          void main(){
            vUv = uv;
            vec3 pos = position;
            float wave = sin(pos.x * 3.0 + uTime * 0.3) * cos(pos.y * 3.0 + uTime * 0.2) * 0.06;
            pos.z += wave;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uColorC;
          float noise(vec2 p){ return sin(p.x*4.0 + uTime*0.4) * cos(p.y*4.0 + uTime*0.35); }
          void main(){
            vec2 uv = vUv;
            float n = noise(uv * 1.5);
            float t = smoothstep(0.0, 1.0, uv.y + n * 0.25);
            vec3 col1 = mix(uColorA, uColorB, t);
            float t2 = smoothstep(0.2, 0.9, uv.x + sin(uTime * 0.2) * 0.15);
            vec3 col = mix(col1, uColorC, t2 * 0.4);
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

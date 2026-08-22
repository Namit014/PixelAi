import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Aurora-like sweeping ribbons. */
export function Aurora({ primary, accent, surface }: { primary: string; accent: string; surface: string }) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uA: { value: new THREE.Color(primary) },
    uB: { value: new THREE.Color(accent) },
    uC: { value: new THREE.Color(surface) },
  }), [primary, accent, surface]);

  useFrame((s) => { if (ref.current) ref.current.uniforms.uTime.value = s.clock.getElapsedTime(); });

  return (
    <mesh scale={[4, 4, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={ref}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          uniform vec3 uA;
          uniform vec3 uB;
          uniform vec3 uC;
          float band(vec2 uv, float offset, float speed, float width){
            float y = sin(uv.x * 4.0 + uTime * speed + offset) * 0.25 + 0.5 + offset * 0.2;
            return smoothstep(width, 0.0, abs(uv.y - y));
          }
          void main(){
            vec2 uv = vUv;
            float a = band(uv, 0.0, 0.4, 0.18);
            float b = band(uv, 0.3, 0.55, 0.14);
            float c = band(uv, -0.25, 0.3, 0.22);
            vec3 col = uC;
            col = mix(col, uA, a * 0.85);
            col = mix(col, uB, b * 0.7);
            col = mix(col, mix(uA, uB, 0.5), c * 0.6);
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Tech / fintech wireframe globe with subtle counter-rotating ring. */
export function WireframeGlobe({ primary, accent }: { primary: string; accent: string }) {
  const globe = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (globe.current) globe.current.rotation.y = t * 0.12;
    if (ring.current) {
      ring.current.rotation.x = Math.PI / 2.2;
      ring.current.rotation.z = -t * 0.05;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={globe} scale={1.3}>
        <icosahedronGeometry args={[1, 3]} />
        <meshBasicMaterial color={primary} wireframe transparent opacity={0.55} />
      </mesh>
      <mesh ref={ring} scale={1.7}>
        <torusGeometry args={[1, 0.005, 16, 128]} />
        <meshBasicMaterial color={accent} transparent opacity={0.7} />
      </mesh>
      <mesh scale={1.32}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={primary} transparent opacity={0.04} />
      </mesh>
    </group>
  );
}

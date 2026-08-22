import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Stage, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface Scene3DProps {
  preset: 'cube' | 'sphere' | 'torus' | 'globe' | 'product-stage' | 'particles';
  modelUrl?: string;
  autoRotate?: boolean;
  backgroundColor?: string;
  lightColor?: string;
  cameraPosition?: [number, number, number];
  accentColor?: string;
}

function RotatingCube({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => { ref.current.rotation.x += delta * 0.5; ref.current.rotation.y += delta * 0.7; });
  return (
    <group>
      <mesh ref={ref}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh ref={useRef<THREE.Mesh>(null!)}>
        <boxGeometry args={[2.05, 2.05, 2.05]} />
        <meshBasicMaterial color={color} wireframe opacity={0.3} transparent />
      </mesh>
    </group>
  );
}

function ReflectiveSphere({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => { ref.current.rotation.y += delta * 0.3; });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.5, 64, 64]} />
      <MeshDistortMaterial color={color} metalness={0.9} roughness={0.1} distort={0.2} speed={2} />
    </mesh>
  );
}

function TorusKnot({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => { ref.current.rotation.x += delta * 0.4; ref.current.rotation.y += delta * 0.6; });
  return (
    <mesh ref={ref}>
      <torusKnotGeometry args={[1, 0.35, 128, 32]} />
      <MeshWobbleMaterial color={color} metalness={0.5} roughness={0.3} factor={0.3} speed={1} />
    </mesh>
  );
}

function Globe({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, delta) => { ref.current.rotation.y += delta * 0.2; });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.15} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.52, 32, 32]} />
        <meshBasicMaterial color={color} wireframe opacity={0.4} transparent />
      </mesh>
      {/* Latitude lines */}
      {[-0.8, -0.4, 0, 0.4, 0.8].map((y, i) => {
        const r = Math.sqrt(1.53 * 1.53 - y * y);
        return (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r - 0.01, r + 0.01, 64]} />
            <meshBasicMaterial color={color} opacity={0.5} transparent side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

function ProductStage({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, delta) => { ref.current.rotation.y += delta * 0.3; });
  return (
    <Stage environment="city" intensity={0.6} adjustCamera={false}>
      <group ref={ref}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color} metalness={0.8} roughness={0.15} />
        </mesh>
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2, 2, 0.1, 64]} />
          <meshStandardMaterial color="#333" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>
    </Stage>
  );
}

function Particles({ color }: { color: string }) {
  const count = 500;
  const ref = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 6;
    return pos;
  }, []);
  useFrame((_, delta) => { ref.current.rotation.y += delta * 0.1; ref.current.rotation.x += delta * 0.05; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.05} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

function SceneContent({ preset, accentColor }: { preset: string; accentColor: string }) {
  switch (preset) {
    case 'cube': return <RotatingCube color={accentColor} />;
    case 'sphere': return <ReflectiveSphere color={accentColor} />;
    case 'torus': return <TorusKnot color={accentColor} />;
    case 'globe': return <Globe color={accentColor} />;
    case 'product-stage': return <ProductStage color={accentColor} />;
    case 'particles': return <Particles color={accentColor} />;
    default: return <RotatingCube color={accentColor} />;
  }
}

const Scene3DRenderer: React.FC<Scene3DProps> = ({
  preset, autoRotate = true, backgroundColor = 'transparent',
  cameraPosition = [0, 0, 5], accentColor = '#6366f1',
}) => {
  return (
    <div
      style={{ width: '100%', height: '100%', minHeight: 300, borderRadius: 12, overflow: 'hidden', background: backgroundColor === 'transparent' ? 'transparent' : backgroundColor }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Suspense fallback={
        <div style={{ width: '100%', height: '100%', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 16 }}>
          Loading 3D scene…
        </div>
      }>
        <Canvas camera={{ position: cameraPosition, fov: 50 }} style={{ width: '100%', height: '100%' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-5, -5, -5]} intensity={0.3} />
          <SceneContent preset={preset} accentColor={accentColor} />
          <OrbitControls enablePan enableZoom autoRotate={autoRotate} autoRotateSpeed={2} />
          {preset !== 'product-stage' && <Environment preset="studio" />}
        </Canvas>
      </Suspense>
    </div>
  );
};

export default Scene3DRenderer;

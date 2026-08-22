import { useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ParticleField } from './scenes/ParticleField';
import { DistortionBlob } from './scenes/DistortionBlob';
import { WireframeGlobe } from './scenes/WireframeGlobe';
import { Aurora } from './scenes/Aurora';
import { GradientField } from './scenes/GradientField';
import type { DesignDNA } from './designSystem';

interface WebGLHeroProps {
  primary: string;
  accent: string;
  surface: string;
  scene?: DesignDNA['heroScene'];
  className?: string;
}

export function WebGLHero({ primary, accent, surface, scene = 'gradient', className = '' }: WebGLHeroProps) {
  const supported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch { return false; }
  }, []);

  if (!supported) {
    return (
      <div
        className={className}
        style={{
          background: `radial-gradient(circle at 30% 20%, ${primary}, transparent 50%), radial-gradient(circle at 70% 80%, ${accent}, transparent 60%), ${surface}`,
        }}
      />
    );
  }

  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 2.4], fov: 60 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          {scene === 'particles'  && <ParticleField primary={primary} accent={accent} />}
          {scene === 'distortion' && <DistortionBlob primary={primary} accent={accent} />}
          {scene === 'wireframe'  && <WireframeGlobe primary={primary} accent={accent} />}
          {scene === 'aurora'     && <Aurora primary={primary} accent={accent} surface={surface} />}
          {(scene === 'gradient' || !scene) && <GradientField primary={primary} accent={accent} surface={surface} />}
        </Suspense>
      </Canvas>
    </div>
  );
}

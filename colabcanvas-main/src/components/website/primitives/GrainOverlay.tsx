/**
 * GrainOverlay — full-bleed SVG noise overlay for tactile, "printed" feel.
 * Sits absolutely on top of the parent. opacity defaults to subtle.
 */
import React from 'react';

interface Props {
  opacity?: number;
  blendMode?: React.CSSProperties['mixBlendMode'];
  className?: string;
}

export function GrainOverlay({ opacity = 0.08, blendMode = 'overlay', className = '' }: Props) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-[1] ${className}`}
      style={{
        opacity,
        mixBlendMode: blendMode,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundSize: '220px 220px',
      }}
    />
  );
}

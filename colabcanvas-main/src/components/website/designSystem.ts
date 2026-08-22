/**
 * Per-site Design System.
 *
 * Generates a deterministic but unique visual personality for each
 * landing page so two sites with the same brand never look identical.
 *
 * Inputs: a stable seed (job/project id or site title)
 * Outputs: scene choice, type scale, radius, surface, motion intensity
 */

import type { Theme } from './types';

export type DesignDNA = {
  // Hero scene to render behind the first section
  heroScene: 'gradient' | 'particles' | 'distortion' | 'wireframe' | 'aurora';
  // Overall typographic intensity
  typeScale: 'editorial' | 'modernist' | 'brutalist' | 'minimal';
  // Border radius personality
  radius: 'pill' | 'rounded' | 'square' | 'organic';
  // Background treatment
  surface: 'light' | 'dark' | 'duotone' | 'paper';
  // Motion intensity (controls reveal distance + parallax range)
  motion: 'subtle' | 'cinematic' | 'kinetic';
  // Section divider style
  divider: 'none' | 'glow' | 'rule' | 'noise';
  // Numeric tokens derived from the above
  tokens: {
    radiusSm: string;
    radiusLg: string;
    radiusBtn: string;
    headingWeight: number;
    headingTracking: string;
    revealY: number;
    parallax: number;
  };
};

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], n: number): T {
  return arr[n % arr.length];
}

export function generateDesignDNA(seed: string, theme?: Theme): DesignDNA {
  const h = hashString(seed || 'colab-default');

  const heroScene = pick<DesignDNA['heroScene']>(
    ['gradient', 'particles', 'distortion', 'wireframe', 'aurora'],
    Math.floor(h / 7),
  );
  const typeScale = pick<DesignDNA['typeScale']>(
    ['editorial', 'modernist', 'brutalist', 'minimal'],
    Math.floor(h / 13),
  );
  const radius = pick<DesignDNA['radius']>(
    ['pill', 'rounded', 'square', 'organic'],
    Math.floor(h / 17),
  );
  const surface = pick<DesignDNA['surface']>(
    ['light', 'dark', 'duotone', 'paper'],
    Math.floor(h / 19),
  );
  const motion = pick<DesignDNA['motion']>(
    ['subtle', 'cinematic', 'kinetic'],
    Math.floor(h / 23),
  );
  const divider = pick<DesignDNA['divider']>(
    ['none', 'glow', 'rule', 'noise'],
    Math.floor(h / 29),
  );

  const radiusMap: Record<DesignDNA['radius'], { sm: string; lg: string; btn: string }> = {
    pill:    { sm: '14px', lg: '32px', btn: '999px' },
    rounded: { sm: '12px', lg: '24px', btn: '14px' },
    square:  { sm: '2px',  lg: '4px',  btn: '4px' },
    organic: { sm: '20px 8px 20px 8px', lg: '40px 12px 40px 12px', btn: '999px 18px 999px 18px' },
  };

  const typeMap: Record<DesignDNA['typeScale'], { weight: number; tracking: string }> = {
    editorial:  { weight: 500, tracking: '-0.02em' },
    modernist:  { weight: 600, tracking: '-0.03em' },
    brutalist:  { weight: 800, tracking: '-0.04em' },
    minimal:    { weight: 400, tracking: '-0.01em' },
  };

  const motionMap: Record<DesignDNA['motion'], { revealY: number; parallax: number }> = {
    subtle:    { revealY: 16, parallax: 60 },
    cinematic: { revealY: 32, parallax: 140 },
    kinetic:   { revealY: 48, parallax: 220 },
  };

  return {
    heroScene,
    typeScale,
    radius,
    surface,
    motion,
    divider,
    tokens: {
      radiusSm: radiusMap[radius].sm,
      radiusLg: radiusMap[radius].lg,
      radiusBtn: radiusMap[radius].btn,
      headingWeight: typeMap[typeScale].weight,
      headingTracking: typeMap[typeScale].tracking,
      revealY: motionMap[motion].revealY,
      parallax: motionMap[motion].parallax,
    },
  };
}

/** Apply DNA to CSS variables on the page root container. */
export function dnaToCssVars(dna: DesignDNA): React.CSSProperties {
  return {
    // @ts-expect-error custom properties
    '--site-radius-sm': dna.tokens.radiusSm,
    '--site-radius-lg': dna.tokens.radiusLg,
    '--site-radius-btn': dna.tokens.radiusBtn,
    '--site-heading-weight': String(dna.tokens.headingWeight),
    '--site-heading-tracking': dna.tokens.headingTracking,
    '--site-reveal-y': `${dna.tokens.revealY}px`,
  };
}

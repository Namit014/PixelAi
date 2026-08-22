/**
 * Shared types and helpers for landing page renderer.
 */

export type Theme = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  surface: string;
};

export type Brand = {
  name?: string;
  logoUrl?: string;
  headingFont?: string;
  bodyFont?: string;
};

export type SectionData = {
  id?: string;
  type: string;
  layoutVariant?: string;
  animationStyle?: string;
  kicker?: string;
  heading?: string;
  subheading?: string;
  body?: string;
  bullets?: string[];
  features?: Array<{ title: string; description: string; icon?: string }>;
  testimonials?: Array<{ quote: string; name: string; role?: string }>;
  stats?: Array<{ label: string; value: string }>;
  pricing?: Array<{ name: string; price: string; description?: string; features?: string[]; highlighted?: boolean }>;
  faqs?: Array<{ question: string; answer: string }>;
  ctaText?: string;
  secondaryCtaText?: string;
  urgency?: string;
  imageUrl?: string | null;
  navLinks?: Array<{ label: string; href?: string }>;
};

export interface SectionProps {
  section: SectionData;
  index: number;
  theme: Theme;
  brand: Brand;
  editable?: boolean;
  /** Per-site visual personality (scene, radius, motion, etc). Legacy. */
  dna?: import('./designSystem').DesignDNA;
  /** New 6-axis Art Direction Vector. Preferred. */
  art?: import('./artDirection').ArtDirection;
}

/** Convert hex/rgb to slightly transparent overlay color. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Determine readable text color (#fff or #111) given a background hex. */
export function readableOn(bgHex: string): string {
  const h = bgHex.replace('#', '');
  if (h.length < 6) return '#111111';
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#0a0a0a' : '#ffffff';
}

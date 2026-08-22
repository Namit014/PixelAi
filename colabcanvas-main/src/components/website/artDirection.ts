/**
 * Art Direction Vector — replaces the 5-bucket "DesignDNA" with a
 * 6-dimensional, deterministic system. Same brief → same vector
 * (reproducibility) but the space is ~5,250 distinct combinations
 * vs the previous 5, so two consecutive generations of the same
 * brand still produce visibly different sites because the vector
 * also folds in `objective` + `sectionMix` + a low-bit nonce.
 *
 * Used by both the frontend renderer (`dispatchSection`,
 * `WebsitePreview`) and the backend (`rumi-autonomous-execute`)
 * via a parallel definition.
 */

export type Composition = 'asymmetric' | 'centered' | 'editorial' | 'oversized' | 'split';
export type TypeScale = 'modernist' | 'editorial' | 'kinetic' | 'brutalist' | 'minimal';
export type Motion = 'subtle' | 'cinematic' | 'kinetic' | 'static';
export type Surface = 'clean' | 'grainy' | 'duotone' | 'glassy' | 'paper';
export type Rhythm = 'breathing' | 'dense' | 'staccato';
export type Signature =
  | 'marquee'
  | 'massiveMark'
  | 'dragGallery'
  | 'horizScroll'
  | 'videoLoop'
  | 'kineticType'
  | 'none';

export interface ArtVector {
  composition: Composition;
  type: TypeScale;
  motion: Motion;
  surface: Surface;
  rhythm: Rhythm;
  signature: Signature;
}

export interface ArtTokens {
  radius: { sm: string; lg: string; btn: string };
  headingWeight: number;
  headingTracking: string;
  revealY: number;
  parallax: number;
  sectionPadY: string;
  /** SVG noise opacity if surface=grainy. */
  grain: number;
  /** Section background treatment. */
  surfaceBg: 'background' | 'foreground' | 'surface';
}

export interface ArtDirection {
  vector: ArtVector;
  tokens: ArtTokens;
  /** Stable seed for nested deterministic choices (e.g. bento sizing). */
  seed: number;
}

// ─── Hash + pick helpers ────────────────────────────────
function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pick<T>(arr: readonly T[], n: number): T {
  return arr[n % arr.length];
}

const COMPS: readonly Composition[] = ['asymmetric', 'centered', 'editorial', 'oversized', 'split'];
const TYPES: readonly TypeScale[] = ['modernist', 'editorial', 'kinetic', 'brutalist', 'minimal'];
const MOTIONS: readonly Motion[] = ['subtle', 'cinematic', 'kinetic', 'static'];
const SURFACES: readonly Surface[] = ['clean', 'grainy', 'duotone', 'glassy', 'paper'];
const RHYTHMS: readonly Rhythm[] = ['breathing', 'dense', 'staccato'];
const SIGNATURES: readonly Signature[] = [
  'marquee',
  'massiveMark',
  'dragGallery',
  'horizScroll',
  'videoLoop',
  'kineticType',
];

interface BriefInput {
  /** Stable: brand id or name. */
  seedId?: string;
  /** Brand voice: 'professional', 'playful', 'luxury', 'bold', 'minimal'… */
  voice?: string;
  /** Industry hint. */
  industry?: string;
  /** Tone preference from the brief. */
  tone?: string;
  /** Audience description. */
  audience?: string;
  /** Single-sentence objective. */
  objective?: string;
  /** Section types in order — affects rhythm + signature pick. */
  sectionMix?: string[];
  /** Optional regen counter so re-runs of same brief feel different. */
  nonce?: number;
}

/**
 * Derive a deterministic Art Direction from a brief. Pure function — no IO.
 */
export function deriveArtDirection(input: BriefInput): ArtDirection {
  const voice = (input.voice || input.tone || '').toLowerCase();
  const industry = (input.industry || '').toLowerCase();
  const audience = (input.audience || '').toLowerCase();
  const objective = (input.objective || '').toLowerCase();
  const blob = `${input.seedId || ''}|${voice}|${industry}|${audience}|${objective}|${(input.sectionMix || []).join(',')}|${input.nonce ?? 0}`;
  const seed = fnv1a(blob);

  // ── Composition: bias by voice/industry but allow variance via seed
  const compBias: Record<Composition, number> = {
    asymmetric: 1, centered: 1, editorial: 1, oversized: 1, split: 1,
  };
  if (/luxur|fashion|atelier|jewel|hotel|spa|gallery|studio/.test(voice + industry)) compBias.editorial += 2;
  if (/bold|brutal|launch|disrupt|manifesto/.test(voice + objective)) compBias.oversized += 2;
  if (/saas|platform|tool|app|api|developer|cloud/.test(industry)) compBias.split += 2;
  if (/minimal|clean|calm|essential/.test(voice)) compBias.centered += 1;
  const composition = weightedPick(COMPS, compBias, seed);

  // ── Type
  const typeBias: Record<TypeScale, number> = {
    modernist: 1, editorial: 1, kinetic: 1, brutalist: 1, minimal: 1,
  };
  if (/luxur|atelier|gallery|fashion/.test(voice + industry)) typeBias.editorial += 2;
  if (/bold|disrupt|brutal/.test(voice)) typeBias.brutalist += 2;
  if (/playful|fun|launch|bold/.test(voice + objective)) typeBias.kinetic += 1;
  if (/minimal|clean|enterprise/.test(voice)) typeBias.minimal += 1;
  const type = weightedPick(TYPES, typeBias, seed >> 3);

  // ── Motion
  const motionBias: Record<Motion, number> = { subtle: 1, cinematic: 1, kinetic: 1, static: 0.5 };
  if (/saas|enterprise|finance|health/.test(industry)) motionBias.subtle += 2;
  if (/luxur|fashion|gallery/.test(voice + industry)) motionBias.cinematic += 2;
  if (/playful|launch|bold/.test(voice + objective)) motionBias.kinetic += 2;
  const motion = weightedPick(MOTIONS, motionBias, seed >> 7);

  // ── Surface
  const surfaceBias: Record<Surface, number> = {
    clean: 1, grainy: 1, duotone: 1, glassy: 1, paper: 1,
  };
  if (/saas|tech|cloud|ai/.test(industry)) { surfaceBias.glassy += 2; surfaceBias.clean += 1; }
  if (/editorial|magazine|fashion|paper|print/.test(voice + industry)) { surfaceBias.paper += 2; surfaceBias.grainy += 1; }
  if (/bold|brutal/.test(voice)) surfaceBias.grainy += 2;
  if (/luxury|hotel|spa/.test(voice + industry)) surfaceBias.duotone += 2;
  const surface = weightedPick(SURFACES, surfaceBias, seed >> 11);

  // ── Rhythm
  const rhythmBias: Record<Rhythm, number> = { breathing: 1, dense: 1, staccato: 1 };
  if ((input.sectionMix?.length ?? 0) > 7) rhythmBias.dense += 2;
  if (/luxury|minimal|gallery/.test(voice + industry)) rhythmBias.breathing += 2;
  if (/bold|launch|brutal/.test(voice)) rhythmBias.staccato += 2;
  const rhythm = weightedPick(RHYTHMS, rhythmBias, seed >> 17);

  // ── Signature: every site gets ONE bold idea
  const sigBias: Record<Signature, number> = {
    marquee: 1, massiveMark: 1, dragGallery: 1, horizScroll: 1,
    videoLoop: 0.6, kineticType: 1, none: 0,
  };
  if (composition === 'oversized') sigBias.massiveMark += 2;
  if (type === 'kinetic') sigBias.kineticType += 2;
  if (motion === 'cinematic') sigBias.videoLoop += 1;
  if (composition === 'editorial') sigBias.marquee += 1;
  if (/portfolio|studio|gallery|fashion/.test(industry + voice)) { sigBias.dragGallery += 2; sigBias.horizScroll += 1; }
  const signature = weightedPick(SIGNATURES, sigBias, seed >> 19);

  // ── Tokens derived from the vector
  const tokens: ArtTokens = {
    radius: radiusFor(type, composition),
    headingWeight: headingWeightFor(type),
    headingTracking: trackingFor(type),
    revealY: motion === 'kinetic' ? 48 : motion === 'cinematic' ? 32 : motion === 'subtle' ? 16 : 0,
    parallax: motion === 'kinetic' ? 220 : motion === 'cinematic' ? 140 : motion === 'subtle' ? 60 : 0,
    sectionPadY: rhythm === 'dense' ? '4rem' : rhythm === 'staccato' ? '6rem' : '8rem',
    grain: surface === 'grainy' ? 0.12 : surface === 'paper' ? 0.06 : 0,
    surfaceBg: surface === 'duotone' ? 'foreground' : 'background',
  };

  return { vector: { composition, type, motion, surface, rhythm, signature }, tokens, seed };
}

function weightedPick<T extends string>(items: readonly T[], biases: Record<T, number>, seed: number): T {
  const weights = items.map((it) => Math.max(0, biases[it] ?? 1));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pick(items, seed);
  let r = ((seed >>> 0) % 1000) / 1000 * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function radiusFor(type: TypeScale, comp: Composition) {
  if (type === 'brutalist' || comp === 'oversized') return { sm: '2px', lg: '4px', btn: '4px' };
  if (type === 'editorial') return { sm: '8px', lg: '20px', btn: '999px' };
  if (type === 'kinetic') return { sm: '20px 8px 20px 8px', lg: '40px 12px 40px 12px', btn: '999px' };
  if (type === 'minimal') return { sm: '6px', lg: '14px', btn: '999px' };
  return { sm: '12px', lg: '24px', btn: '14px' };
}
function headingWeightFor(t: TypeScale) {
  return t === 'brutalist' ? 800 : t === 'editorial' ? 500 : t === 'minimal' ? 400 : 600;
}
function trackingFor(t: TypeScale) {
  return t === 'brutalist' ? '-0.045em' : t === 'editorial' ? '-0.02em' : t === 'kinetic' ? '-0.035em' : '-0.025em';
}

/** Map the vector → CSS variables consumed by every section component. */
export function artDirectionToCssVars(ad: ArtDirection): React.CSSProperties {
  return {
    // @ts-expect-error custom properties
    '--site-radius-sm': ad.tokens.radius.sm,
    '--site-radius-lg': ad.tokens.radius.lg,
    '--site-radius-btn': ad.tokens.radius.btn,
    '--site-heading-weight': String(ad.tokens.headingWeight),
    '--site-heading-tracking': ad.tokens.headingTracking,
    '--site-reveal-y': `${ad.tokens.revealY}px`,
    '--site-section-pad-y': ad.tokens.sectionPadY,
  };
}

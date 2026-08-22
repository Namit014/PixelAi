// Creative Orchestrator Shared Utilities
// Anti-AI aesthetic lock, style purity, fingerprint similarity, defaults
// Phase 2: Master Enforcement Block — 9-Layer Cliché Suppression + Strategic Depth

export const STYLE_MODES = [
  'Editorial Minimal',
  'Swiss Grid', 
  'Modern Luxury',
  'Tech Precision',
  'Brutalist Poster',
  'Corporate Clean'
] as const;

export type StyleMode = typeof STYLE_MODES[number];

export const DEFAULT_STYLE_MODE: StyleMode = 'Editorial Minimal';

// Anti-AI Aesthetic Lock — these visual elements are BANNED unless explicitly justified
export const ANTI_AI_EXCLUSION_LIST = [
  'floating circles',
  'random outlined shapes',
  'yellow highlight scribbles',
  'gradient blobs',
  'glow effects',
  'shadow stacking',
  'sticker style icons',
  'over textured backgrounds',
  'clipart',
  'stock vector packs',
  'random geometric fillers',
  'scribble overlays',
  'fake shadows',
  'AI noise textures',
  '3D chrome (unless Tech Precision)',
  'neon gradients with luxury typography',
  'corporate grid with playful doodles',
  'editorial minimal with 3D chrome',
  'swiss grid with random asymmetry',
];

// Style Purity Matrix — forbidden combinations
export const STYLE_PURITY_VIOLATIONS: Array<{ a: string; b: string; reason: string }> = [
  { a: 'luxury typography', b: 'neon gradients', reason: 'Luxury and neon clash' },
  { a: 'corporate grid', b: 'playful doodles', reason: 'Corporate and playful are incompatible' },
  { a: 'editorial minimal', b: '3D chrome', reason: 'Editorial minimal rejects 3D chrome' },
  { a: 'swiss grid', b: 'random asymmetry', reason: 'Swiss grid demands precision' },
  { a: 'modern luxury', b: 'emoji aesthetic', reason: 'Luxury rejects emoji style' },
  { a: 'brutalist poster', b: 'soft gradients', reason: 'Brutalist rejects softness' },
];

// Brand Intelligence JSON schema
export interface BrandIntelligence {
  category: string;
  subcategory: string;
  audience: {
    age_range: string;
    sophistication_level: string;
    income_tier: string;
    geographic_market: string;
  };
  positioning: string;
  tone: string;
  visual_maturity: string;
  risk_tolerance: string;
  competitive_archetype: string;
  brand_personality_traits: string[];
  price_positioning: string;
}

// Creative Blueprint schema
export interface CreativeBlueprint {
  core_idea: string;
  visual_metaphor: string;
  layout_philosophy: string;
  typography_system: { primary: string; secondary: string };
  color_discipline: { palette: string[]; max_colors: number };
  image_style: string;
  negative_space_strategy: string;
  exclusion_list: string[];
  locked_style_mode: StyleMode;
}

// Layout Wireframe Spec schema
export interface LayoutWireframeSpec {
  grid_system: string;
  margin_system: string;
  focal_hierarchy: string;
  type_scale_ratio: { heading_to_subheading: number; subheading_to_body: number };
  image_text_ratio: string;
  alignment_rules: string;
  whitespace_minimum: number;
  max_typefaces: number;
  max_colors: number;
  focal_anchor: string;
  content_blocks: number;
}

// QC Score schema — Phase 2 expanded with concept depth dimensions
export interface QCScores {
  clarity: number;
  hierarchy: number;
  restraint: number;
  originality: number;
  professional_maturity: number;
  concept_strength: number;
  // Phase 2 — Concept Depth Scoring (Layer 7)
  strategic_distinctiveness: number;
  typographic_refinement: number;
  memorability: number;
  system_scalability: number;
  overall_pass: boolean;
  rejection_reason?: string;
}

// Design Fingerprint
export interface DesignFingerprint {
  grid_type: string;
  focal_position: string;
  text_placement: string;
  image_proportion: string;
  alignment_style: string;
  whitespace_ratio: number;
  style_mode: string;
}

// Calculate fingerprint similarity (0-1) between two fingerprints
export function calculateFingerprintSimilarity(a: DesignFingerprint, b: DesignFingerprint): number {
  let matchCount = 0;
  const fields: (keyof DesignFingerprint)[] = [
    'grid_type', 'focal_position', 'text_placement', 
    'image_proportion', 'alignment_style', 'style_mode'
  ];
  
  for (const field of fields) {
    if (String(a[field]).toLowerCase() === String(b[field]).toLowerCase()) {
      matchCount++;
    }
  }
  
  // Also compare whitespace_ratio (within 10% = match)
  if (Math.abs((a.whitespace_ratio || 0) - (b.whitespace_ratio || 0)) < 0.1) {
    matchCount++;
  }
  
  return matchCount / (fields.length + 1); // +1 for whitespace_ratio
}

// Check if a new fingerprint is too similar to recent ones (>40%)
export function isTooSimilar(
  newFingerprint: DesignFingerprint, 
  recentFingerprints: DesignFingerprint[]
): boolean {
  for (const existing of recentFingerprints) {
    const similarity = calculateFingerprintSimilarity(newFingerprint, existing);
    if (similarity > 0.4) {
      return true;
    }
  }
  return false;
}

// Extract fingerprint from composition spec
export function extractFingerprint(spec: LayoutWireframeSpec, styleMode: string): DesignFingerprint {
  return {
    grid_type: spec.grid_system || 'unknown',
    focal_position: spec.focal_anchor || 'center',
    text_placement: spec.alignment_rules || 'left',
    image_proportion: spec.image_text_ratio || '50:50',
    alignment_style: spec.alignment_rules || 'left-aligned',
    whitespace_ratio: spec.whitespace_minimum || 0.4,
    style_mode: styleMode,
  };
}

// Resolve style mode from user brief (default: Editorial Minimal)
export function resolveStyleMode(brief: string): StyleMode {
  const lower = brief.toLowerCase();
  
  if (lower.includes('swiss') || lower.includes('grid') || lower.includes('bauhaus')) return 'Swiss Grid';
  if (lower.includes('luxury') || lower.includes('premium') || lower.includes('high-end') || lower.includes('elegant')) return 'Modern Luxury';
  if (lower.includes('tech') || lower.includes('precision') || lower.includes('digital') || lower.includes('saas')) return 'Tech Precision';
  if (lower.includes('brutalist') || lower.includes('raw') || lower.includes('bold type')) return 'Brutalist Poster';
  if (lower.includes('corporate') || lower.includes('enterprise') || lower.includes('b2b') || lower.includes('clean')) return 'Corporate Clean';
  if (lower.includes('editorial') || lower.includes('minimal') || lower.includes('magazine')) return 'Editorial Minimal';
  
  return DEFAULT_STYLE_MODE;
}

// Get category-specific image generation rules
export function getCategoryRules(category: string): string {
  const rules: Record<string, string> = {
    photography: `Generate realistic editorial photography style. No over-saturated stock look. No HDR look. No exaggerated AI lighting.`,
    illustration: `Generate refined geometric vector system. No icon pack style. No emoji aesthetic.`,
    logo: `Must pass monochrome test. Must be scalable. No swooshes. No abstract gradient blobs. No initial letter inside random shape.`,
    ecommerce: `White or neutral background. Clear hierarchy. No clutter. Benefit-driven layout.`,
    linkedin: `Editorial tone. Minimal color. Professional typography. No loud marketing graphics.`,
    packaging: `Shelf impact through restraint. Bold typography. Controlled color field. No pattern overload.`,
    campaign: `One idea only. One metaphor only. No multi-concept visuals.`,
    social_media: `Minimum 60% breathing space. Single clear message. Mobile-first.`,
    poster: `Exhibition quality. Bold typography hierarchy. Rule of thirds. Strategic color palette.`,
  };
  
  return rules[category] || rules['campaign'];
}

// Build anti-AI aesthetic lock instruction for prompts
export function getAntiAILockInstruction(): string {
  return `STRICTLY REJECT and DO NOT include any of the following:
${ANTI_AI_EXCLUSION_LIST.map(item => `- ${item}`).join('\n')}

These are markers of amateur AI-generated content. Your output must be indistinguishable from work produced by a top-tier London or New York branding agency.`;
}

// Build style purity check instruction
export function getStylePurityInstruction(styleMode: StyleMode): string {
  const relevantViolations = STYLE_PURITY_VIOLATIONS.filter(v => 
    styleMode.toLowerCase().includes(v.a.split(' ')[0].toLowerCase()) ||
    styleMode.toLowerCase().includes(v.b.split(' ')[0].toLowerCase())
  );
  
  if (relevantViolations.length === 0) return '';
  
  return `STYLE PURITY — The following combinations are FORBIDDEN for ${styleMode}:
${relevantViolations.map(v => `- Never mix "${v.a}" with "${v.b}" (${v.reason})`).join('\n')}`;
}


// ═══════════════════════════════════════════════════════════════════
// PHASE 2 — MASTER ENFORCEMENT BLOCK
// 9-Layer Cliché Suppression + Strategic Depth System
// Sits ABOVE all agents. Overrides Creative Director if needed.
// ═══════════════════════════════════════════════════════════════════

// ─── LAYER 1: CLICHÉ SUPPRESSION ENGINE ──────────────────────────

export const CLICHE_TRIGGER_WORDS = [
  'carbon', 'tech', 'ai', 'digital', 'green', 'eco', 'energy',
  'finance', 'future', 'data', 'cloud', 'security', 'lab',
  'studio', 'creative', 'agency',
] as const;

export const FORBIDDEN_SYMBOL_ASSOCIATIONS: Record<string, string[]> = {
  carbon:   ['atom', 'molecule', 'hexagonal carbon structure', 'diamond lattice'],
  tech:     ['circuit lines', 'chip icon', 'binary code', 'motherboard pattern', 'pixel grid'],
  ai:       ['brain icon', 'neural network', 'robot head', 'circuit brain', 'digital brain'],
  digital:  ['pixel grid', 'binary code', 'screen glow', 'digital wave', 'data stream'],
  green:    ['leaf icon', 'tree', 'sprout', 'recycling arrows', 'earth globe'],
  eco:      ['leaf icon', 'globe', 'recycling symbol', 'green gradient', 'nature illustration'],
  energy:   ['lightning bolt', 'sun rays', 'power button', 'battery icon', 'flame'],
  finance:  ['chart line', 'dollar sign', 'coin stack', 'upward arrow', 'bar graph'],
  future:   ['orbit rings', 'rocket', 'starfield', 'warp speed lines', 'hologram effect'],
  data:     ['bar chart', 'pie chart', 'database cylinder', 'node network', 'spreadsheet grid'],
  cloud:    ['cloud shape', 'sky gradient', 'floating server', 'cloud outline', 'weather icon'],
  security: ['shield', 'lock icon', 'key', 'padlock', 'checkmark shield'],
  lab:      ['beaker', 'flask', 'microscope', 'DNA helix', 'test tube'],
  studio:   ['paintbrush', 'palette', 'easel', 'camera', 'film strip'],
  creative: ['lightbulb', 'paint splatter', 'crayon', 'rainbow', 'spark'],
  agency:   ['handshake', 'briefcase', 'skyline', 'globe', 'corporate building'],
};

export function getClicheSuppressionInstruction(brandName: string, category: string): string {
  const combined = `${brandName} ${category}`.toLowerCase();
  const matchedTriggers: string[] = [];
  const allForbidden: string[] = [];

  for (const trigger of CLICHE_TRIGGER_WORDS) {
    if (combined.includes(trigger)) {
      matchedTriggers.push(trigger);
      const symbols = FORBIDDEN_SYMBOL_ASSOCIATIONS[trigger];
      if (symbols) allForbidden.push(...symbols);
    }
  }

  if (matchedTriggers.length === 0) return '';

  const unique = [...new Set(allForbidden)];
  return `LAYER 1 — CLICHÉ SUPPRESSION ENGINE
Detected triggers in brand/category: ${matchedTriggers.join(', ')}

The following literal symbol associations are FORBIDDEN:
${unique.map(s => `- ${s}`).join('\n')}

RULE: Never visually illustrate the literal meaning of the word unless Creative Director explicitly authorizes a conceptual twist.
- "Carbon" does NOT equal atom.
- "Tech" does NOT equal circuit board.
- "Eco" does NOT equal leaf.
Literal equals generic. Generic equals rejected.`;
}

// ─── LAYER 2: LETTERFORM CUSTOMIZATION MANDATE ──────────────────

export const LETTERFORM_INTERVENTIONS = [
  'terminal cuts',
  'stem merges',
  'crossbar shift',
  'negative space carving',
  'letter compression',
  'monogram integration',
  'subtle alignment distortion',
] as const;

export function getLetterformMandate(): string {
  return `LAYER 2 — LETTERFORM CUSTOMIZATION MANDATE (Logo Only)
Default font output is ILLEGAL.

The wordmark MUST include at least one structural typographic intervention:
${LETTERFORM_INTERVENTIONS.map(i => `- ${i}`).join('\n')}

Additional mandatory actions:
- Adjust kerning optically, not mechanically
- Modify at least one character form
- Introduce subtle geometry logic
- Create tension or rhythm in spacing
- Refine stroke weight relationships

If typography looks like an untouched Google Font preview, REJECT.
Agency-grade logos are typographically engineered.
If no engineering detected, regenerate.`;
}

// ─── LAYER 3: SYMBOL NECESSITY TEST ─────────────────────────────

export function getSymbolNecessityInstruction(): string {
  return `LAYER 3 — SYMBOL NECESSITY TEST (Logo Only)
Before adding a symbol, ask: Does the brand architecture REQUIRE a symbol?

If NO → generate wordmark only. Do not force a symbol.
If YES → the symbol MUST:
  - Be abstract, not literal
  - Be scalable in monochrome
  - Have a strong silhouette
  - NOT rely on gradients to feel premium

If the symbol depends on effects to work, REJECT it.`;
}

// ─── LAYER 4: IDEA ELEVATION TEST ───────────────────────────────

export function getIdeaElevationInstruction(): string {
  return `LAYER 4 — IDEA ELEVATION TEST
Every design must pass these 3 tests:

1. If the symbol is removed, does the wordmark alone feel distinctive?
2. If the wordmark is removed, does the symbol feel unique?
3. Can the concept extend into a full brand system (stationery, signage, digital)?

If ANY answer is NO → reject and regenerate.`;
}

// ─── LAYER 5: DRIBBBLE SIMILARITY FILTER ────────────────────────

export function getDribbbleSimilarityInstruction(): string {
  return `LAYER 5 — DRIBBBLE / MARKETPLACE SIMILARITY FILTER
Before approval, internally simulate comparison against common marketplace aesthetics.

If the design resembles ANY of the following, REJECT immediately:
- SaaS template branding
- Tech startup pitch deck identity
- Gaming logo pack
- Stock logo library output
- Envato / GraphicRiver template
- Fiverr brand package

Design must feel custom-built, not marketplace-familiar.
If you've seen this pattern 100 times on Dribbble, it fails.`;
}

// ─── LAYER 6: EFFECT DEPENDENCY CHECK ───────────────────────────

export const BANNED_PREMIUM_EFFECTS = [
  'gradient-only premium feel',
  'metallic bevel',
  'drop shadow as design element',
  'glow effect',
  'emboss',
  'texture overlay for depth',
] as const;

export function getEffectDependencyInstruction(): string {
  return `LAYER 6 — EFFECT DEPENDENCY CHECK
If the premium feeling is achieved using ANY of the following, REJECT:
${BANNED_PREMIUM_EFFECTS.map(e => `- ${e}`).join('\n')}

Premium MUST come from:
- Proportion
- Spacing
- Restraint
- Typographic quality
- Structural geometry

Not from decoration. If you strip all effects and the design collapses, it was never good.`;
}

// ─── LAYER 7: CONCEPT DEPTH SCORING ─────────────────────────────
// (Extended QCScores interface is defined above with the additional fields)

export function getConceptDepthInstruction(): string {
  return `LAYER 7 — CONCEPT DEPTH SCORING
Score from 1 to 10 on ALL of the following dimensions:
- clarity
- hierarchy
- restraint
- originality
- professional_maturity
- concept_strength
- strategic_distinctiveness
- typographic_refinement
- memorability
- system_scalability

If ANY single score falls below 8, the design FAILS.
Regenerate from Creative Director stage.`;
}

// ─── LAYER 8: VISUAL MATURITY LOCK ──────────────────────────────

export function getVisualMaturityInstruction(): string {
  return `LAYER 8 — VISUAL MATURITY LOCK
The design MUST feel like it belongs in:
- Brand New (underconsideration.com)
- Pentagram portfolio
- Koto case study
- Base Design studio archive
- Collins NYC portfolio

If it feels like:
- Canva template
- Envato marketplace item
- Fiverr logo pack
- AI logo generator output
- Wix logo maker

REJECT immediately. No exceptions.`;
}

// ─── LAYER 9: LOGO STRUCTURAL RULES ─────────────────────────────

export function getLogoStructuralRules(): string {
  return `LAYER 9 — LOGO STRUCTURAL RULES (Logo Only)

FOR WORDMARKS — AVOID:
- Centered generic stacking
- Predictable tech sans-serif with wide tracking
- Random underline accents
- Default gradient fills
- Symmetrical letter arrangements with no tension

FOR SYMBOLS — AVOID:
- Enclosed hexagon badges
- Floating circular frames
- Decorative orbit rings
- Symmetrical cliché tech shapes (abstract "A" inside circle, etc.)
- Initials inside geometric containers

PREFER:
- Structural geometry derived from brand meaning
- Controlled asymmetry with intentional tension
- Typographic dominance over symbolic decoration
- Monolithic simplicity (one strong move, not five weak ones)
- Grid-disciplined construction with mathematical relationships`;
}

// ─── MASTER ENFORCEMENT BLOCK COMPOSER ──────────────────────────

export function getMasterEnforcementBlock(
  brandName: string,
  category: string,
  designType: string
): string {
  const isLogo = designType === 'logo' ||
    brandName.toLowerCase().includes('logo') ||
    category.toLowerCase().includes('logo');

  const blocks: string[] = [];

  blocks.push(`═══ COLAB MASTER ENFORCEMENT BLOCK — Phase 2 ═══
GLOBAL RULE: Colab must NOT generate designs that feel like:
- AI logo generator output
- Fiverr brand pack
- Dribbble beginner concept
- Startup template kit
Design must feel authored, intentional, and strategically distinct.
If output feels generic, regenerate.
═══════════════════════════════════════════════`);

  // Layer 1 — always active
  const clicheBlock = getClicheSuppressionInstruction(brandName, category);
  if (clicheBlock) blocks.push(clicheBlock);

  // Layers 2, 3, 4, 9 — logo only
  if (isLogo) {
    blocks.push(getLetterformMandate());
    blocks.push(getSymbolNecessityInstruction());
    blocks.push(getIdeaElevationInstruction());
    blocks.push(getLogoStructuralRules());
  }

  // Layers 5, 6, 7, 8 — always active
  blocks.push(getDribbbleSimilarityInstruction());
  blocks.push(getEffectDependencyInstruction());
  blocks.push(getConceptDepthInstruction());
  blocks.push(getVisualMaturityInstruction());

  blocks.push(`═══ END MASTER ENFORCEMENT BLOCK ═══
FINAL DELIVERY RULE: Present maximum 3 highly differentiated, strategically justified concepts. Quality over quantity. If quality threshold not met, regenerate automatically. User should never see mediocre drafts.`);

  return blocks.join('\n\n');
}

// ─── LOGO DETECTION HELPER ──────────────────────────────────────

const LOGO_KEYWORDS = [
  'logo', 'wordmark', 'logomark', 'logotype', 'monogram',
  'brand mark', 'brand identity', 'emblem', 'insignia', 'crest',
];

export function detectLogoGeneration(prompt: string, designType?: string): boolean {
  if (designType === 'logo') return true;
  const lower = prompt.toLowerCase();
  return LOGO_KEYWORDS.some(kw => lower.includes(kw));
}

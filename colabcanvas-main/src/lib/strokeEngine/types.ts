/**
 * Figma-Level Stroke Engine — Type Definitions
 */

export type StrokeType = 'basic' | 'dynamic' | 'brush';

export type StrokeStyle = 'solid' | 'dash' | 'dotted' | 'dash-dot' | 'long-dash' | 'dash-dot-dot';

export type StrokeAlignment = 'center' | 'inside' | 'outside';

export type JoinType = 'miter' | 'round' | 'bevel';

export type CapType = 'butt' | 'round' | 'square';

export interface WidthProfileStop {
  t: number;   // 0 to 1 along path
  width: number; // multiplier (1 = base width)
}

export interface WidthProfile {
  id: string;
  name: string;
  stops: WidthProfileStop[];
}

export interface DynamicMeta {
  frequency: number;   // noise frequency (0.5–20)
  wiggle: number;      // amplitude in px (0–50)
  smoothen: number;    // smoothing passes (0–10)
}

export interface BrushMeta {
  brushId: string;
  direction: 'forward' | 'reverse';
}

export interface StrokeConfig {
  id: string;
  type: StrokeType;
  style: StrokeStyle;
  width: number;
  alignment: StrokeAlignment;
  join: JoinType;
  miterAngle: number;
  cap: CapType;
  widthProfile?: WidthProfile;
  dynamicMeta?: DynamicMeta;
  brushMeta?: BrushMeta;
  scaleWithObject: boolean;
}

export interface SamplePoint {
  x: number;
  y: number;
  t: number;           // normalized 0→1 along entire path
  tangent: Vec2;
  normal: Vec2;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface StrokeMesh {
  /** SVG path data string for the expanded fill polygon */
  pathData: string;
  /** Version counter for cache invalidation */
  version: number;
  /** The stroke config that generated this mesh */
  configHash: string;
}

// ── Preset Width Profiles ──

export const WIDTH_PROFILE_FLAT: WidthProfile = {
  id: 'flat',
  name: 'Flat',
  stops: [
    { t: 0, width: 1 },
    { t: 1, width: 1 },
  ],
};

export const WIDTH_PROFILE_TAPER: WidthProfile = {
  id: 'taper',
  name: 'Taper',
  stops: [
    { t: 0, width: 1 },
    { t: 1, width: 0 },
  ],
};

export const WIDTH_PROFILE_REVERSE_TAPER: WidthProfile = {
  id: 'reverse-taper',
  name: 'Reverse Taper',
  stops: [
    { t: 0, width: 0 },
    { t: 1, width: 1 },
  ],
};

export const WIDTH_PROFILE_BULGE: WidthProfile = {
  id: 'bulge',
  name: 'Bulge',
  stops: [
    { t: 0, width: 0.2 },
    { t: 0.5, width: 1 },
    { t: 1, width: 0.2 },
  ],
};

export const PRESET_WIDTH_PROFILES: WidthProfile[] = [
  WIDTH_PROFILE_FLAT,
  WIDTH_PROFILE_TAPER,
  WIDTH_PROFILE_REVERSE_TAPER,
  WIDTH_PROFILE_BULGE,
];

// ── Brush Presets ──

export interface BrushPreset {
  id: string;
  name: string;
  /** Width multiplier curve for the brush texture */
  widthCurve: WidthProfileStop[];
  /** Edge roughness (0 = smooth, 1 = max jitter) */
  edgeRoughness: number;
}

export const BRUSH_PRESETS: BrushPreset[] = [
  {
    id: 'marker',
    name: 'Marker',
    widthCurve: [{ t: 0, width: 0.9 }, { t: 0.1, width: 1 }, { t: 0.9, width: 1 }, { t: 1, width: 0.9 }],
    edgeRoughness: 0.05,
  },
  {
    id: 'taper',
    name: 'Taper',
    widthCurve: [{ t: 0, width: 1 }, { t: 1, width: 0.02 }],
    edgeRoughness: 0,
  },
  {
    id: 'ink',
    name: 'Ink',
    widthCurve: [{ t: 0, width: 0.1 }, { t: 0.15, width: 0.8 }, { t: 0.5, width: 1 }, { t: 0.85, width: 0.6 }, { t: 1, width: 0.05 }],
    edgeRoughness: 0.15,
  },
  {
    id: 'rough-pencil',
    name: 'Pencil',
    widthCurve: [{ t: 0, width: 0.6 }, { t: 0.5, width: 0.8 }, { t: 1, width: 0.5 }],
    edgeRoughness: 0.3,
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    widthCurve: [{ t: 0, width: 0.7 }, { t: 0.5, width: 1 }, { t: 1, width: 0.8 }],
    edgeRoughness: 0.4,
  },
  {
    id: 'calligraphy',
    name: 'Calligraphy',
    widthCurve: [{ t: 0, width: 0.05 }, { t: 0.3, width: 1 }, { t: 0.7, width: 1 }, { t: 1, width: 0.05 }],
    edgeRoughness: 0,
  },
];

/** Create a default stroke config */
export function createDefaultStrokeConfig(): StrokeConfig {
  return {
    id: `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'basic',
    style: 'solid',
    width: 2,
    alignment: 'center',
    join: 'miter',
    miterAngle: 28.96, // default SVG miter limit ~4
    cap: 'butt',
    scaleWithObject: true,
  };
}

/** Hash a stroke config for cache comparison */
export function hashStrokeConfig(config: StrokeConfig, pathVersion?: number): string {
  return JSON.stringify({
    type: config.type,
    style: config.style,
    width: config.width,
    alignment: config.alignment,
    join: config.join,
    miterAngle: config.miterAngle,
    cap: config.cap,
    wp: config.widthProfile?.stops,
    dm: config.dynamicMeta,
    bm: config.brushMeta,
    pv: pathVersion ?? 0,
  });
}

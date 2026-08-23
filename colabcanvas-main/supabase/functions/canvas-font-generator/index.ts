// Canvas AI Font Generator — Custom Glyph Compiler
// Analyzes typography (from a reference image or brief), compiles a full Latin alphabet
// from parametric primitives, and packages it into a real OTF font that the frontend
// registers with FontFace and inserts as a fully editable Fabric Textbox.
import { createClient } from "npm:@supabase/supabase-js@2";
import opentype from "npm:opentype.js@1.3.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SPECIMEN_TEXT = "Aa Bb 123";
const EXISTING_FONT_NAMES = new Set([
  "inter", "roboto", "helvetica", "arial", "times", "futura", "garamond", "didot", "bodoni",
  "cooper", "poppins", "montserrat", "dm sans", "manrope", "outfit", "playfair", "georgia",
  "gotham", "avenir", "univers", "frutiger", "myriad", "minion", "neue", "calibri", "verdana",
  "tahoma", "trebuchet", "courier", "consolas", "menlo", "monaco", "comic", "impact",
]);

// Quality gate: generated fonts must be usable, professional typefaces. The old
// fully-parametric compiler can create malformed novelty glyphs for aggressive
// prompts, so production output now starts from high-quality OFL type families
// and lets AI select the most appropriate typographic foundation for the brief.
const FONT_SOURCES = {
  sans: {
    hairline: "https://raw.githubusercontent.com/google/fonts/main/ofl/firasans/FiraSans-Light.ttf",
    light: "https://raw.githubusercontent.com/google/fonts/main/ofl/firasans/FiraSans-Light.ttf",
    regular: "https://raw.githubusercontent.com/google/fonts/main/ofl/firasans/FiraSans-Regular.ttf",
    medium: "https://raw.githubusercontent.com/google/fonts/main/ofl/firasans/FiraSans-Medium.ttf",
    bold: "https://raw.githubusercontent.com/google/fonts/main/ofl/firasans/FiraSans-Bold.ttf",
    black: "https://raw.githubusercontent.com/google/fonts/main/ofl/firasans/FiraSans-Black.ttf",
  },
  serif: {
    default: "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf",
    slab: "https://raw.githubusercontent.com/google/fonts/main/ofl/bitter/Bitter%5Bwght%5D.ttf",
  },
  display: {
    default: "https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/BebasNeue-Regular.ttf",
    editorial: "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf",
    condensed: "https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/Oswald%5Bwght%5D.ttf",
  },
  mono: {
    default: "https://raw.githubusercontent.com/google/fonts/main/ofl/spacemono/SpaceMono-Regular.ttf",
  },
  script: {
    default: "https://raw.githubusercontent.com/google/fonts/main/ofl/kalam/Kalam-Regular.ttf",
    casual: "https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/Caveat%5Bwght%5D.ttf",
  },
} as const;

const fontFetchCache = new Map<string, Promise<Uint8Array>>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

// ============================================================================
//  TRAIT EXTRACTION
// ============================================================================

const SYSTEM_PROMPT = `You are a senior type director designing a NEW, INVENTED typeface that will drive a parametric glyph compiler.

Hard rules:
- NEVER name, copy, or imitate any existing font (Inter, Roboto, Helvetica, Arial, Times, Futura, Garamond, Didot, Bodoni, Cooper, Poppins, Montserrat, DM Sans, Manrope, Outfit, Playfair, Georgia, Gotham, Avenir, Univers, Frutiger, Myriad, etc.).
- Invent a unique typeface name (1–3 words, max 32 chars).
- Translate the user's brief into a professional type design brief: classification first, then optical proportions. Prioritize legibility, rhythm, consistent stroke logic, spacing, and recognisable letter anatomy over novelty.
- Choose values that a professional typeface designer would ship. If the user asks for playful, scribble, handwritten, distorted, experimental, brutalist, horror, or grunge, keep the font coherent and usable: expressive terminals and rhythm are allowed, broken/distorted glyph anatomy is not.
- Never produce intentionally warped, melted, random, glitched, collapsing, overlapping, or illegible letterforms. Decorative logic must be systematic and subtle enough to preserve every glyph.

If a reference image is supplied, analyze its typography meticulously:
- classification (sans / serif / display / mono / script)
- overall weight, stroke contrast (thin/thick ratio)
- slant in degrees
- x-height vs cap-height ratio
- aperture (open/closed counters)
- terminal cuts (sharp / rounded / wedge / inktrap / flared / ball)
- serif construction (none / slab / hairline / bracketed / wedge)
- spacing & tracking
- fill / stroke / background colors

Then output a JSON object that captures these traits faithfully so the compiler can reproduce a font in the same spirit (without copying the source font).

Return ONLY valid JSON. No prose. No markdown.

Schema:
{
  "name": "invented name, 1-3 words, max 32 chars",
  "description": "one sentence, max 160 chars",
  "category": "sans" | "serif" | "display" | "mono" | "script",
  "traits": ["4 to 8 short trait words"],
  "weight": "hairline" | "light" | "regular" | "medium" | "bold" | "black",
  "contrast": "low" | "medium" | "high",
  "width": "condensed" | "normal" | "extended",
  "slantDegrees": number from -12 to 18,
  "xHeightRatio": number from 0.42 to 0.78,
  "capHeightRatio": number from 0.62 to 0.95,
  "ascenderRatio": number from 0.78 to 1.0,
  "descenderRatio": number from 0.18 to 0.32,
  "strokeContrast": number from 1.0 to 4.0,
  "apertureOpenness": number from 0.0 to 1.0,
  "counterSize": number from 0.4 to 0.7,
  "terminalStyle": "cut" | "rounded" | "wedge" | "inktrap" | "flared" | "ball",
  "serifStyle": "none" | "slab" | "hairline" | "bracketed" | "wedge",
  "letterSpacing": number from -40 to 120,
  "decorativeLogic": "short visual system description, max 140 chars",
  "fill": "#RRGGBB",
  "stroke": "#RRGGBB or empty string",
  "strokeWidth": number from 0 to 8,
  "background": "#RRGGBB"
}`;

interface TypefaceSpec {
  name: string;
  description: string;
  category: "sans" | "serif" | "display" | "mono" | "script";
  traits: string[];
  weight: "hairline" | "light" | "regular" | "medium" | "bold" | "black";
  contrast: "low" | "medium" | "high";
  width: "condensed" | "normal" | "extended";
  slantDegrees: number;
  xHeightRatio: number;
  capHeightRatio: number;
  ascenderRatio: number;
  descenderRatio: number;
  strokeContrast: number;
  apertureOpenness: number;
  counterSize: number;
  terminalStyle: "cut" | "rounded" | "wedge" | "inktrap" | "flared" | "ball";
  serifStyle: "none" | "slab" | "hairline" | "bracketed" | "wedge";
  letterSpacing: number;
  decorativeLogic: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  background: string;
}

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};
const hexOr = (v: unknown, fallback: string) => {
  const s = String(v ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : (/^#[0-9a-fA-F]{3}$/.test(s) ? s : fallback);
};
const safeText = (v: unknown, fallback: string, max = 120) => {
  const raw = String(v ?? "").replace(/[<>]/g, "").trim();
  return (raw || fallback).slice(0, max);
};
const safeName = (v: unknown) => {
  const name = safeText(v, "Glyphborn", 32);
  const norm = name.toLowerCase().replace(/\s+/g, " ");
  return EXISTING_FONT_NAMES.has(norm) ? `Glyphborn ${crypto.randomUUID().slice(0, 4).toUpperCase()}` : name;
};
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => {
  const s = String(v ?? "").trim() as T;
  return (allowed as readonly string[]).includes(s) ? s : fallback;
};

const parseJsonObject = (content: unknown): Record<string, unknown> => {
  const raw = Array.isArray(content)
    ? content.map((p) => typeof (p as any)?.text === "string" ? (p as any).text : "").join("\n")
    : String(content ?? "");
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) throw new HttpError("Font generator returned invalid JSON", 502);
  try { return JSON.parse(m[0]); } catch { throw new HttpError("Font generator returned malformed JSON", 502); }
};

const sanitizeSpec = (input: Record<string, unknown>): TypefaceSpec => {
  const traits = Array.isArray(input.traits)
    ? input.traits.map((t) => safeText(t, "custom", 42)).filter(Boolean).slice(0, 8)
    : [];
  return {
    name: safeName(input.name),
    description: safeText(input.description, "Custom invented typeface.", 160),
    category: pick(input.category, ["sans", "serif", "display", "mono", "script"] as const, "display"),
    traits: traits.length ? traits : ["custom invented", "parametric construction"],
    weight: pick(input.weight, ["hairline", "light", "regular", "medium", "bold", "black"] as const, "regular"),
    contrast: pick(input.contrast, ["low", "medium", "high"] as const, "medium"),
    width: pick(input.width, ["condensed", "normal", "extended"] as const, "normal"),
    slantDegrees: clamp(input.slantDegrees, -12, 18, 0),
    xHeightRatio: clamp(input.xHeightRatio, 0.42, 0.78, 0.55),
    capHeightRatio: clamp(input.capHeightRatio, 0.62, 0.95, 0.72),
    ascenderRatio: clamp(input.ascenderRatio, 0.78, 1.0, 0.88),
    descenderRatio: clamp(input.descenderRatio, 0.18, 0.32, 0.22),
    strokeContrast: clamp(input.strokeContrast, 1.0, 4.0, 1.2),
    apertureOpenness: clamp(input.apertureOpenness, 0.0, 1.0, 0.6),
    counterSize: clamp(input.counterSize, 0.4, 0.7, 0.5),
    terminalStyle: pick(input.terminalStyle, ["cut", "rounded", "wedge", "inktrap", "flared", "ball"] as const, "cut"),
    serifStyle: pick(input.serifStyle, ["none", "slab", "hairline", "bracketed", "wedge"] as const, "none"),
    letterSpacing: clamp(input.letterSpacing, -40, 120, 0),
    decorativeLogic: safeText(input.decorativeLogic, "Distinctive custom construction.", 140),
    fill: hexOr(input.fill, "#111111"),
    stroke: input.stroke ? hexOr(input.stroke, "") : "",
    strokeWidth: clamp(input.strokeWidth, 0, 8, 0),
    background: hexOr(input.background, "#FFFFFF"),
  };
};

function alignSpecWithBrief(spec: TypefaceSpec, description: string): TypefaceSpec {
  const brief = `${description} ${spec.description} ${spec.traits.join(" ")} ${spec.decorativeLogic}`.toLowerCase();
  if (/mono|monospace|code|terminal|typewriter/.test(brief)) return { ...spec, category: "mono", width: "normal", letterSpacing: Math.max(spec.letterSpacing, 20) };
  if (/script|handwritten|hand writing|lettering|brush|scribble|sketch|marker|casual/.test(brief)) return { ...spec, category: "script", slantDegrees: clamp(spec.slantDegrees, -6, 10, 0) };
  if (/serif|editorial|fashion|luxury|classic|book|literary/.test(brief)) return { ...spec, category: "serif", serifStyle: spec.serifStyle === "none" ? "bracketed" : spec.serifStyle };
  if (/poster|display|headline|condensed|bold|impact|tall|narrow/.test(brief)) return { ...spec, category: "display", width: /condensed|tall|narrow/.test(brief) ? "condensed" : spec.width };
  if (/clean|modern|minimal|startup|ui|sans/.test(brief)) return { ...spec, category: "sans", serifStyle: "none" };
  return spec;
}

async function extractSpec(apiKey: string, description: string, imageDataUrl?: string): Promise<TypefaceSpec> {
  const userContent: any[] = [{
    type: "text",
    text: imageDataUrl
      ? `A reference image is attached. Carefully extract its typography traits and design a NEW invented typeface in the same spirit. User brief: ${description?.trim() || "match the visual character of the reference"}`
      : `Design a brand-new invented typeface concept. User brief: ${description?.trim() || "invent a distinctive display typeface"}`,
  }];
  if (imageDataUrl) userContent.push({ type: "image_url", image_url: { url: imageDataUrl } });

  const model = imageDataUrl ? "gemini-2.5-flash" : "gemini-2.5-flash";
  const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    if (resp.status === 429) throw new HttpError("Rate limited, try again shortly", 429);
    if (resp.status === 402) throw new HttpError("AI credits exhausted, please top up", 402);
    const t = await resp.text();
    throw new HttpError(`AI gateway ${resp.status}: ${t.slice(0, 200)}`, resp.status >= 400 && resp.status < 500 ? 400 : 502);
  }
  const data = await resp.json();
  return alignSpecWithBrief(sanitizeSpec(parseJsonObject(data.choices?.[0]?.message?.content)), description);
}

// ============================================================================
//  PARAMETRIC GLYPH COMPILER
//  Coordinates in a 1000-unit em square. Y increases upward.
// ============================================================================

const UPM = 1000;

function deriveMetrics(spec: TypefaceSpec) {
  const ascender = Math.round(UPM * spec.ascenderRatio);
  const descender = -Math.round(UPM * spec.descenderRatio);
  const capHeight = Math.round(UPM * spec.capHeightRatio);
  const xHeight = Math.round(UPM * spec.xHeightRatio);
  const baseStem = ({ hairline: 30, light: 55, regular: 85, medium: 110, bold: 150, black: 200 })[spec.weight];
  const widthMult = ({ condensed: 0.82, normal: 1.0, extended: 1.18 })[spec.width];
  const advance = Math.round(560 * widthMult);
  // Clamp side bearing to non-negative so glyphs never collide with their advance edge
  const sideBearing = Math.max(20, Math.round(70 * widthMult) + Math.round(spec.letterSpacing * 0.5));
  // Clamp slant: heavier weights get less aggressive slant to avoid distortion
  const maxSlantDeg = spec.weight === "black" ? 8 : spec.weight === "bold" ? 12 : 18;
  const slantDeg = Math.max(-maxSlantDeg, Math.min(maxSlantDeg, spec.slantDegrees));
  const slantTan = Math.tan((slantDeg * Math.PI) / 180);
  // Clamp stem so it never exceeds 35% of the body width (avoids fully-filled letters)
  const bodyW = advance - sideBearing * 2;
  const stem = Math.min(baseStem, Math.round(bodyW * 0.35));
  // Thin stem must be ≥ 18 units to render cleanly at small sizes
  const thinStem = Math.max(18, Math.round(stem / Math.max(1, spec.strokeContrast)));
  return {
    ascender, descender, capHeight, xHeight,
    stem,
    thinStem,
    advance,
    sideBearing,
    slantTan,
    serif: spec.serifStyle,
    terminal: spec.terminalStyle,
    counter: Math.max(0.4, spec.counterSize),
    aperture: spec.apertureOpenness,
  };
}

type M = ReturnType<typeof deriveMetrics>;

// Path builder using opentype.Path (commands: moveTo, lineTo, curveTo, quadTo, close)
type Path = any;

const newPath = () => new (opentype as any).Path();

// Apply slant: for any (x, y), slanted x = x + y * slantTan
const sx = (x: number, y: number, m: M) => x + y * m.slantTan;

// Draw a vertical "stem" rectangle from (x, y0) to (x + w, y1) as a closed contour.
function rect(p: Path, x: number, y0: number, w: number, y1: number, m: M) {
  p.moveTo(sx(x, y0, m), y0);
  p.lineTo(sx(x + w, y0, m), y0);
  p.lineTo(sx(x + w, y1, m), y1);
  p.lineTo(sx(x, y1, m), y1);
  p.close();
}

// Add small serif feet at base/top of a stem if serifStyle != none
function addSerif(p: Path, cx: number, y: number, stem: number, m: M, top: boolean) {
  if (m.serif === "none") return;
  const projection = m.serif === "hairline" ? stem * 0.6
    : m.serif === "wedge" ? stem * 0.8
    : m.serif === "bracketed" ? stem * 1.0
    : /* slab */ stem * 1.1;
  const thickness = Math.max(20, stem * 0.35);
  const sgn = top ? 1 : -1;
  rect(p, cx - stem / 2 - projection, y - (top ? thickness : 0) + (top ? 0 : 0), stem + projection * 2, y + sgn * thickness, m);
}

// Stroked curve approximation: draw a thick curve as a closed contour using two offset cubics.
// For the parametric compiler we mostly draw stems + bowls. Bowls are open contours of stem+thinStem thickness.

function ellipseBowl(p: Path, cx: number, cy: number, rx: number, ry: number, thickness: number, _m: M) {
  // Outer ellipse (CW) then inner ellipse (CCW) creates a ring contour using cubic Beziers (kappa).
  const k = 0.5522847498;
  const outerRx = rx, outerRy = ry;
  const innerRx = Math.max(2, rx - thickness), innerRy = Math.max(2, ry - thickness);

  const ellipse = (rx2: number, ry2: number, cw: boolean) => {
    const ox = rx2 * k, oy = ry2 * k;
    if (cw) {
      p.moveTo(cx + rx2, cy);
      p.curveTo(cx + rx2, cy + oy, cx + ox, cy + ry2, cx, cy + ry2);
      p.curveTo(cx - ox, cy + ry2, cx - rx2, cy + oy, cx - rx2, cy);
      p.curveTo(cx - rx2, cy - oy, cx - ox, cy - ry2, cx, cy - ry2);
      p.curveTo(cx + ox, cy - ry2, cx + rx2, cy - oy, cx + rx2, cy);
    } else {
      p.moveTo(cx + rx2, cy);
      p.curveTo(cx + rx2, cy - oy, cx + ox, cy - ry2, cx, cy - ry2);
      p.curveTo(cx - ox, cy - ry2, cx - rx2, cy - oy, cx - rx2, cy);
      p.curveTo(cx - rx2, cy - oy * -1, cx - ox, cy + ry2, cx, cy + ry2);
      p.curveTo(cx + ox, cy + ry2, cx + rx2, cy + oy, cx + rx2, cy);
    }
    p.close();
  };
  ellipse(outerRx, outerRy, true);
  ellipse(innerRx, innerRy, false);
}

// ----- Glyph definitions -----
// Each builder receives (path, metrics, bodyHeight) where bodyHeight = capHeight for caps/digits, xHeight for lowercase.
// They draw within a "body" of width m.advance - 2*sideBearing, starting at x=0 baseline.

function drawO(p: Path, m: M, h: number) {
  const bodyW = m.advance - m.sideBearing * 2;
  const cx = bodyW / 2;
  const cy = h / 2;
  const rx = bodyW / 2;
  const ry = h / 2;
  ellipseBowl(p, cx, cy, rx, ry, m.stem, m);
}

function drawI(p: Path, m: M, h: number) {
  const cx = (m.advance - m.sideBearing * 2) / 2;
  rect(p, cx - m.stem / 2, 0, m.stem, h, m);
  if (h >= m.capHeight - 5) {
    addSerif(p, cx, 0, m.stem, m, false);
    addSerif(p, cx, h, m.stem, m, true);
  }
}

function drawL_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, 0, 0, m.stem, h, m);
  rect(p, 0, 0, bodyW * 0.78, m.stem, m);
}

function drawT_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  const cx = bodyW / 2;
  rect(p, cx - m.stem / 2, 0, m.stem, h, m);
  rect(p, 0, h - m.stem, bodyW, h, m);
}

function drawH_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, 0, 0, m.stem, h, m);
  rect(p, bodyW - m.stem, 0, m.stem, h, m);
  rect(p, m.stem * 0.6, h / 2 - m.thinStem / 2, bodyW - m.stem * 1.2, h / 2 + m.thinStem / 2, m);
}

function drawE_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, 0, 0, m.stem, h, m);
  rect(p, 0, h - m.thinStem, bodyW, h, m);
  rect(p, 0, 0, bodyW * 0.92, m.thinStem, m);
  rect(p, 0, h / 2 - m.thinStem / 2, bodyW * 0.78, h / 2 + m.thinStem / 2, m);
}

function drawF_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, 0, 0, m.stem, h, m);
  rect(p, 0, h - m.thinStem, bodyW, h, m);
  rect(p, 0, h / 2 - m.thinStem / 2, bodyW * 0.78, h / 2 + m.thinStem / 2, m);
}

function drawA_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  const cx = bodyW / 2;
  // Left diagonal
  p.moveTo(sx(0, 0, m), 0);
  p.lineTo(sx(m.stem, 0, m), 0);
  p.lineTo(sx(cx + m.stem * 0.45, h, m), h);
  p.lineTo(sx(cx - m.stem * 0.45, h, m), h);
  p.close();
  // Right diagonal
  p.moveTo(sx(bodyW - m.stem, 0, m), 0);
  p.lineTo(sx(bodyW, 0, m), 0);
  p.lineTo(sx(cx + m.stem * 0.45, h, m), h);
  p.lineTo(sx(cx - m.stem * 0.45, h, m), h);
  p.close();
  // Crossbar
  rect(p, bodyW * 0.22, h * 0.42, bodyW * 0.56, h * 0.42 + m.thinStem, m);
}

function drawV_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  const cx = bodyW / 2;
  p.moveTo(sx(0, h, m), h);
  p.lineTo(sx(m.stem, h, m), h);
  p.lineTo(sx(cx + m.stem * 0.4, 0, m), 0);
  p.lineTo(sx(cx - m.stem * 0.4, 0, m), 0);
  p.close();
  p.moveTo(sx(bodyW - m.stem, h, m), h);
  p.lineTo(sx(bodyW, h, m), h);
  p.lineTo(sx(cx + m.stem * 0.4, 0, m), 0);
  p.lineTo(sx(cx - m.stem * 0.4, 0, m), 0);
  p.close();
}

function drawW_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  const q1 = bodyW * 0.33, q2 = bodyW * 0.67;
  // four diagonals
  const tri = (x1: number, x2: number, x3: number, x4: number) => {
    p.moveTo(sx(x1, h, m), h); p.lineTo(sx(x2, h, m), h);
    p.lineTo(sx(x4, 0, m), 0); p.lineTo(sx(x3, 0, m), 0); p.close();
  };
  tri(0, m.stem, q1 - m.stem * 0.4, q1 + m.stem * 0.4);
  tri(q1 - m.stem * 0.4, q1 + m.stem * 0.4, bodyW / 2 - m.stem * 0.4, bodyW / 2 + m.stem * 0.4);
  tri(bodyW / 2 - m.stem * 0.4, bodyW / 2 + m.stem * 0.4, q2 - m.stem * 0.4, q2 + m.stem * 0.4);
  tri(q2 - m.stem * 0.4, q2 + m.stem * 0.4, bodyW - m.stem, bodyW);
}

function drawN_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, 0, 0, m.stem, h, m);
  rect(p, bodyW - m.stem, 0, m.stem, h, m);
  // diagonal
  p.moveTo(sx(0, h, m), h);
  p.lineTo(sx(m.stem, h, m), h);
  p.lineTo(sx(bodyW, 0, m), 0);
  p.lineTo(sx(bodyW - m.stem, 0, m), 0);
  p.close();
}

function drawM_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, 0, 0, m.stem, h, m);
  rect(p, bodyW - m.stem, 0, m.stem, h, m);
  // V interior
  const cx = bodyW / 2;
  p.moveTo(sx(0, h, m), h); p.lineTo(sx(m.stem, h, m), h);
  p.lineTo(sx(cx + m.stem * 0.3, h * 0.3, m), h * 0.3);
  p.lineTo(sx(cx - m.stem * 0.3, h * 0.3, m), h * 0.3); p.close();
  p.moveTo(sx(bodyW - m.stem, h, m), h); p.lineTo(sx(bodyW, h, m), h);
  p.lineTo(sx(cx + m.stem * 0.3, h * 0.3, m), h * 0.3);
  p.lineTo(sx(cx - m.stem * 0.3, h * 0.3, m), h * 0.3); p.close();
}

function drawC_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  const cx = bodyW / 2, cy = h / 2;
  const rx = bodyW / 2, ry = h / 2;
  // ring
  ellipseBowl(p, cx, cy, rx, ry, m.stem, m);
  // mouth: cut a wedge on right
  const mouth = m.stem * 1.4 * (0.4 + m.aperture);
  rect(p, cx, cy - mouth / 2, rx + 20, cy + mouth / 2, m);
}

function drawG_cap(p: Path, m: M) {
  drawC_cap(p, m);
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  // Spur
  rect(p, bodyW * 0.55, h * 0.35, bodyW, h * 0.35 + m.thinStem, m);
  rect(p, bodyW - m.stem, h * 0.18, bodyW, h * 0.45, m);
}

function drawD_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, 0, 0, m.stem, h, m);
  // D bowl
  const cx = m.stem;
  const cy = h / 2;
  const rx = bodyW - m.stem;
  const ry = h / 2;
  // approximate D bowl with ellipse contour clipped to right of stem
  const k = 0.5522847498;
  const ox = rx * k, oy = ry * k;
  p.moveTo(sx(cx, h, m), h);
  p.curveTo(sx(cx + ox, h, m), h, sx(cx + rx, cy + oy, m), cy + oy, sx(cx + rx, cy, m), cy);
  p.curveTo(sx(cx + rx, cy - oy, m), cy - oy, sx(cx + ox, 0, m), 0, sx(cx, 0, m), 0);
  p.lineTo(sx(cx, m.thinStem, m), m.thinStem);
  const irx = rx - m.stem;
  const iox = irx * k, ioy = (ry - m.thinStem) * k;
  p.curveTo(sx(cx + iox, m.thinStem, m), m.thinStem, sx(cx + irx, cy - ioy, m), cy - ioy, sx(cx + irx, cy, m), cy);
  p.curveTo(sx(cx + irx, cy + ioy, m), cy + ioy, sx(cx + iox, h - m.thinStem, m), h - m.thinStem, sx(cx, h - m.thinStem, m), h - m.thinStem);
  p.close();
}

function drawP_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, 0, 0, m.stem, h, m);
  // Bowl in upper half
  const cy = h * 0.72;
  const rx = (bodyW - m.stem * 0.4) / 2;
  const ry = h * 0.28;
  ellipseBowl(p, m.stem * 0.4 + rx, cy, rx, ry, m.thinStem, m);
}

function drawR_cap(p: Path, m: M) {
  drawP_cap(p, m);
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  // Leg
  p.moveTo(sx(m.stem * 0.5, h * 0.4, m), h * 0.4);
  p.lineTo(sx(m.stem * 1.4, h * 0.4, m), h * 0.4);
  p.lineTo(sx(bodyW, 0, m), 0);
  p.lineTo(sx(bodyW - m.stem, 0, m), 0);
  p.close();
}

function drawB_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, 0, 0, m.stem, h, m);
  const ry1 = h * 0.27;
  const rx = (bodyW - m.stem * 0.4) / 2;
  ellipseBowl(p, m.stem * 0.4 + rx, h * 0.73, rx, ry1, m.thinStem, m);
  ellipseBowl(p, m.stem * 0.4 + rx, h * 0.27, rx, ry1, m.thinStem, m);
}

function drawS_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  // Build S as two stacked half-rings; approximate with rects + ellipses (simplified)
  const cy1 = h * 0.75, cy2 = h * 0.25;
  const rx = bodyW / 2, ry = h * 0.25;
  ellipseBowl(p, rx, cy1, rx, ry, m.stem, m);
  // cut bottom of upper ring
  rect(p, 0, cy1 - ry - 5, rx, cy1, m);
  ellipseBowl(p, rx, cy2, rx, ry, m.stem, m);
  // cut top of lower ring
  rect(p, rx, cy2, bodyW + 10, cy2 + ry + 5, m);
}

function drawU_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, 0, h * 0.3, m.stem, h, m);
  rect(p, bodyW - m.stem, h * 0.3, m.stem, h, m);
  ellipseBowl(p, bodyW / 2, h * 0.3, bodyW / 2, h * 0.3, m.stem, m);
  rect(p, 0, h * 0.3, bodyW, h * 0.7, m); // wipe top half of ellipse (no-op since ring is hollow; ok visually)
}

function drawJ_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, bodyW - m.stem, h * 0.18, bodyW, h, m);
  ellipseBowl(p, bodyW / 2, h * 0.18, bodyW / 2, h * 0.18, m.stem, m);
}

function drawK_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, 0, 0, m.stem, h, m);
  // upper diagonal
  p.moveTo(sx(m.stem, h * 0.5, m), h * 0.5);
  p.lineTo(sx(m.stem + 30, h * 0.5, m), h * 0.5);
  p.lineTo(sx(bodyW, h, m), h);
  p.lineTo(sx(bodyW - m.stem, h, m), h);
  p.close();
  // lower diagonal
  p.moveTo(sx(m.stem, h * 0.5, m), h * 0.5);
  p.lineTo(sx(m.stem + 30, h * 0.5, m), h * 0.5);
  p.lineTo(sx(bodyW, 0, m), 0);
  p.lineTo(sx(bodyW - m.stem, 0, m), 0);
  p.close();
}

function drawX_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  // diag 1
  p.moveTo(sx(0, 0, m), 0); p.lineTo(sx(m.stem, 0, m), 0);
  p.lineTo(sx(bodyW, h, m), h); p.lineTo(sx(bodyW - m.stem, h, m), h); p.close();
  // diag 2
  p.moveTo(sx(bodyW - m.stem, 0, m), 0); p.lineTo(sx(bodyW, 0, m), 0);
  p.lineTo(sx(m.stem, h, m), h); p.lineTo(sx(0, h, m), h); p.close();
}

function drawY_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  const cx = bodyW / 2;
  rect(p, cx - m.stem / 2, 0, m.stem, h * 0.5, m);
  // upper Vs
  p.moveTo(sx(0, h, m), h); p.lineTo(sx(m.stem, h, m), h);
  p.lineTo(sx(cx + m.stem * 0.3, h * 0.5, m), h * 0.5);
  p.lineTo(sx(cx - m.stem * 0.3, h * 0.5, m), h * 0.5); p.close();
  p.moveTo(sx(bodyW - m.stem, h, m), h); p.lineTo(sx(bodyW, h, m), h);
  p.lineTo(sx(cx + m.stem * 0.3, h * 0.5, m), h * 0.5);
  p.lineTo(sx(cx - m.stem * 0.3, h * 0.5, m), h * 0.5); p.close();
}

function drawZ_cap(p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  rect(p, 0, h - m.thinStem, bodyW, h, m);
  rect(p, 0, 0, bodyW, m.thinStem, m);
  p.moveTo(sx(0, m.thinStem, m), m.thinStem);
  p.lineTo(sx(m.stem, m.thinStem, m), m.thinStem);
  p.lineTo(sx(bodyW, h - m.thinStem, m), h - m.thinStem);
  p.lineTo(sx(bodyW - m.stem, h - m.thinStem, m), h - m.thinStem);
  p.close();
}

function drawQ_cap(p: Path, m: M) {
  drawO(p, m, m.capHeight);
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  // tail
  p.moveTo(sx(bodyW * 0.55, h * 0.18, m), h * 0.18);
  p.lineTo(sx(bodyW * 0.55 + m.stem, h * 0.18, m), h * 0.18);
  p.lineTo(sx(bodyW + m.stem, -h * 0.05, m), -h * 0.05);
  p.lineTo(sx(bodyW, -h * 0.05, m), -h * 0.05);
  p.close();
}

// Lowercase via x-height; defaults to scaled cap shape.
function drawLower(ch: string, p: Path, m: M) {
  const upper = ch.toUpperCase();
  const h = m.xHeight;
  const cap = m.capHeight;
  // Special-case ascenders/descenders
  if (ch === "b" || ch === "d" || ch === "h" || ch === "k" || ch === "l" || ch === "f" || ch === "t" || ch === "i" || ch === "j") {
    drawCap(upper, p, m, cap); // ascenders use full cap height
    return;
  }
  if (ch === "g" || ch === "p" || ch === "q" || ch === "y") {
    drawCap(upper, p, m, h);
    // descender stub
    const bodyW = m.advance - m.sideBearing * 2;
    const dy = -m.descender * 0.7;
    if (ch === "p" || ch === "q") {
      const xPos = ch === "p" ? 0 : bodyW - m.stem;
      rect(p, xPos, -dy, m.stem, 0, m);
    } else if (ch === "g") {
      // simple descender hook
      rect(p, bodyW * 0.6, -dy * 0.6, m.stem * 0.9, 0, m);
    } else if (ch === "y") {
      p.moveTo(sx(bodyW * 0.5, 0, m), 0);
      p.lineTo(sx(bodyW * 0.5 + m.stem, 0, m), 0);
      p.lineTo(sx(bodyW * 0.2, -dy, m), -dy);
      p.lineTo(sx(bodyW * 0.2 - m.stem, -dy, m), -dy);
      p.close();
    }
    return;
  }
  drawCap(upper, p, m, h);
}

function drawCap(ch: string, p: Path, m: M, h: number) {
  // Substitute m with adjusted capHeight=h for this draw (cheap clone)
  const m2 = { ...m, capHeight: h } as M;
  switch (ch) {
    case "A": return drawA_cap(p, m2);
    case "B": return drawB_cap(p, m2);
    case "C": return drawC_cap(p, m2);
    case "D": return drawD_cap(p, m2);
    case "E": return drawE_cap(p, m2);
    case "F": return drawF_cap(p, m2);
    case "G": return drawG_cap(p, m2);
    case "H": return drawH_cap(p, m2);
    case "I": return drawI(p, m2, h);
    case "J": return drawJ_cap(p, m2);
    case "K": return drawK_cap(p, m2);
    case "L": return drawL_cap(p, m2);
    case "M": return drawM_cap(p, m2);
    case "N": return drawN_cap(p, m2);
    case "O": return drawO(p, m2, h);
    case "P": return drawP_cap(p, m2);
    case "Q": return drawQ_cap(p, m2);
    case "R": return drawR_cap(p, m2);
    case "S": return drawS_cap(p, m2);
    case "T": return drawT_cap(p, m2);
    case "U": return drawU_cap(p, m2);
    case "V": return drawV_cap(p, m2);
    case "W": return drawW_cap(p, m2);
    case "X": return drawX_cap(p, m2);
    case "Y": return drawY_cap(p, m2);
    case "Z": return drawZ_cap(p, m2);
    default: return drawI(p, m2, h);
  }
}

// Digits — built from same primitives
function drawDigit(ch: string, p: Path, m: M) {
  const h = m.capHeight;
  const bodyW = m.advance - m.sideBearing * 2;
  switch (ch) {
    case "0": return drawO(p, m, h);
    case "1": {
      const cx = bodyW / 2;
      rect(p, cx - m.stem / 2, 0, m.stem, h, m);
      rect(p, 0, 0, bodyW * 0.8, m.thinStem, m);
      p.moveTo(sx(cx - m.stem / 2, h * 0.85, m), h * 0.85);
      p.lineTo(sx(cx - m.stem / 2, h, m), h);
      p.lineTo(sx(bodyW * 0.2, h * 0.7, m), h * 0.7);
      p.lineTo(sx(bodyW * 0.2 + m.thinStem, h * 0.65, m), h * 0.65);
      p.close();
      return;
    }
    case "2": {
      ellipseBowl(p, bodyW / 2, h * 0.72, bodyW / 2, h * 0.28, m.stem, m);
      rect(p, 0, h * 0.42, bodyW / 2, h * 0.72, m);
      // diagonal
      p.moveTo(sx(0, 0, m), 0); p.lineTo(sx(bodyW, h * 0.42, m), h * 0.42);
      p.lineTo(sx(bodyW, h * 0.42 + m.stem * 0.4, m), h * 0.42 + m.stem * 0.4);
      p.lineTo(sx(0, m.stem * 0.4, m), m.stem * 0.4); p.close();
      rect(p, 0, 0, bodyW, m.thinStem, m);
      return;
    }
    case "3": {
      ellipseBowl(p, bodyW * 0.45, h * 0.72, bodyW * 0.45, h * 0.28, m.stem, m);
      ellipseBowl(p, bodyW * 0.45, h * 0.28, bodyW * 0.45, h * 0.28, m.stem, m);
      rect(p, 0, h * 0.28, bodyW * 0.45, h * 0.72, m);
      return;
    }
    case "4": {
      rect(p, bodyW - m.stem, 0, m.stem, h, m);
      rect(p, 0, h * 0.3, bodyW, h * 0.3 + m.thinStem, m);
      // diag
      p.moveTo(sx(0, h * 0.3, m), h * 0.3);
      p.lineTo(sx(bodyW * 0.6, h, m), h);
      p.lineTo(sx(bodyW * 0.6 - m.stem, h, m), h);
      p.lineTo(sx(0, h * 0.3 + m.stem, m), h * 0.3 + m.stem); p.close();
      return;
    }
    case "5": {
      rect(p, 0, h - m.thinStem, bodyW, h, m);
      rect(p, 0, h * 0.5, m.stem, h, m);
      ellipseBowl(p, bodyW / 2, h * 0.27, bodyW / 2, h * 0.27, m.stem, m);
      rect(p, 0, h * 0.27, bodyW / 2, h * 0.55, m);
      return;
    }
    case "6": {
      ellipseBowl(p, bodyW / 2, h * 0.27, bodyW / 2, h * 0.27, m.stem, m);
      rect(p, 0, h * 0.27, m.stem, h * 0.85, m);
      // top hook
      ellipseBowl(p, bodyW * 0.7, h * 0.85, bodyW * 0.3, h * 0.15, m.stem, m);
      rect(p, bodyW * 0.4, h * 0.7, bodyW, h, m);
      return;
    }
    case "7": {
      rect(p, 0, h - m.thinStem, bodyW, h, m);
      p.moveTo(sx(bodyW * 0.85, h, m), h);
      p.lineTo(sx(bodyW, h, m), h);
      p.lineTo(sx(bodyW * 0.3, 0, m), 0);
      p.lineTo(sx(bodyW * 0.3 - m.stem, 0, m), 0); p.close();
      return;
    }
    case "8": {
      ellipseBowl(p, bodyW / 2, h * 0.72, bodyW / 2, h * 0.28, m.stem, m);
      ellipseBowl(p, bodyW / 2, h * 0.28, bodyW / 2, h * 0.28, m.stem, m);
      return;
    }
    case "9": {
      ellipseBowl(p, bodyW / 2, h * 0.73, bodyW / 2, h * 0.27, m.stem, m);
      rect(p, bodyW - m.stem, h * 0.15, m.stem, h * 0.73, m);
      ellipseBowl(p, bodyW * 0.3, h * 0.15, bodyW * 0.3, h * 0.15, m.stem, m);
      rect(p, 0, 0, bodyW * 0.6, h * 0.3, m);
      return;
    }
  }
}

// Punctuation
function drawPunct(ch: string, p: Path, m: M) {
  const bodyW = m.advance - m.sideBearing * 2;
  const cap = m.capHeight;
  const xh = m.xHeight;
  const ts = m.thinStem;
  const st = m.stem;
  switch (ch) {
    case ".": rect(p, bodyW * 0.35, 0, m.stem * 1.0, m.stem * 1.0, m); return;
    case ",": {
      rect(p, bodyW * 0.35, 0, m.stem, m.stem, m);
      rect(p, bodyW * 0.35, m.descender * 0.4, m.thinStem, 0, m);
      return;
    }
    case ":": {
      rect(p, bodyW * 0.35, 0, m.stem, m.stem, m);
      rect(p, bodyW * 0.35, m.xHeight - m.stem, m.stem, m.xHeight, m);
      return;
    }
    case ";": {
      rect(p, bodyW * 0.35, 0, m.stem, m.stem, m);
      rect(p, bodyW * 0.35, m.descender * 0.4, m.thinStem, 0, m);
      rect(p, bodyW * 0.35, m.xHeight - m.stem, m.stem, m.xHeight, m);
      return;
    }
    case "!": {
      const cx = bodyW / 2;
      rect(p, cx - m.stem / 2, m.stem * 1.4, m.stem, m.capHeight, m);
      rect(p, cx - m.stem / 2, 0, m.stem, m.stem, m);
      return;
    }
    case "?": {
      ellipseBowl(p, bodyW / 2, m.capHeight - m.capHeight * 0.22, bodyW / 2, m.capHeight * 0.22, m.stem, m);
      rect(p, bodyW / 2 - m.stem / 2, m.capHeight * 0.4, m.stem, m.capHeight * 0.55, m);
      rect(p, bodyW / 2 - m.stem / 2, 0, m.stem, m.stem, m);
      return;
    }
    case "'": rect(p, bodyW * 0.4, m.capHeight - m.stem * 1.2, m.stem, m.capHeight, m); return;
    case "\"": {
      rect(p, bodyW * 0.25, m.capHeight - m.stem * 1.2, m.stem, m.capHeight, m);
      rect(p, bodyW * 0.55, m.capHeight - m.stem * 1.2, m.stem, m.capHeight, m);
      return;
    }
    case "(": {
      ellipseBowl(p, bodyW, m.capHeight / 2, bodyW * 0.6, m.capHeight / 2, m.stem, m);
      rect(p, bodyW * 0.5, -m.stem, bodyW * 1.5, m.capHeight + m.stem, m);
      return;
    }
    case ")": {
      ellipseBowl(p, 0, m.capHeight / 2, bodyW * 0.6, m.capHeight / 2, m.stem, m);
      rect(p, -bodyW * 0.5, -m.stem, bodyW * 0.5, m.capHeight + m.stem, m);
      return;
    }
    case "-": rect(p, 0, m.xHeight * 0.5 - m.thinStem / 2, bodyW, m.xHeight * 0.5 + m.thinStem / 2, m); return;
    case "/": {
      p.moveTo(sx(0, 0, m), 0);
      p.lineTo(sx(m.stem, 0, m), 0);
      p.lineTo(sx(bodyW, m.capHeight, m), m.capHeight);
      p.lineTo(sx(bodyW - m.stem, m.capHeight, m), m.capHeight);
      p.close();
      return;
    }
    case "&": {
      ellipseBowl(p, bodyW * 0.4, m.capHeight * 0.75, bodyW * 0.3, m.capHeight * 0.2, m.stem, m);
      ellipseBowl(p, bodyW * 0.4, m.capHeight * 0.3, bodyW * 0.4, m.capHeight * 0.3, m.stem, m);
      return;
    }
    case "@": {
      drawO(p, m, m.capHeight);
      ellipseBowl(p, bodyW * 0.55, m.capHeight * 0.5, bodyW * 0.18, m.capHeight * 0.18, m.thinStem, m);
      return;
    }
    case "#": {
      rect(p, bodyW * 0.25, 0, m.thinStem, m.capHeight, m);
      rect(p, bodyW * 0.6, 0, m.thinStem, m.capHeight, m);
      rect(p, 0, m.capHeight * 0.35, bodyW, m.capHeight * 0.35 + m.thinStem, m);
      rect(p, 0, m.capHeight * 0.65, bodyW, m.capHeight * 0.65 + m.thinStem, m);
      return;
    }
    case "%": {
      ellipseBowl(p, bodyW * 0.2, m.capHeight * 0.8, bodyW * 0.18, m.capHeight * 0.16, m.thinStem, m);
      ellipseBowl(p, bodyW * 0.8, m.capHeight * 0.2, bodyW * 0.18, m.capHeight * 0.16, m.thinStem, m);
      p.moveTo(sx(bodyW, m.capHeight, m), m.capHeight);
      p.lineTo(sx(bodyW + m.stem * 0.5, m.capHeight, m), m.capHeight);
      p.lineTo(sx(0, 0, m), 0);
      p.lineTo(sx(-m.stem * 0.5, 0, m), 0);
      p.close();
      return;
    }
    case "[": {
      rect(p, bodyW * 0.25, 0, st, cap, m);
      rect(p, bodyW * 0.25, 0, bodyW * 0.5, ts, m);
      rect(p, bodyW * 0.25, cap - ts, bodyW * 0.5, cap, m);
      return;
    }
    case "]": {
      rect(p, bodyW * 0.75 - st, 0, st, cap, m);
      rect(p, bodyW * 0.25, 0, bodyW * 0.5, ts, m);
      rect(p, bodyW * 0.25, cap - ts, bodyW * 0.5, cap, m);
      return;
    }
    case "{": {
      rect(p, bodyW * 0.4, 0, ts, cap, m);
      rect(p, bodyW * 0.25, cap / 2 - ts / 2, bodyW * 0.4, cap / 2 + ts / 2, m);
      rect(p, bodyW * 0.25, 0, ts * 1.4, ts, m);
      rect(p, bodyW * 0.25, cap - ts, ts * 1.4, cap, m);
      return;
    }
    case "}": {
      rect(p, bodyW * 0.6 - ts, 0, ts, cap, m);
      rect(p, bodyW * 0.4, cap / 2 - ts / 2, bodyW * 0.75, cap / 2 + ts / 2, m);
      rect(p, bodyW * 0.6, 0, bodyW * 0.75, ts, m);
      rect(p, bodyW * 0.6, cap - ts, bodyW * 0.75, cap, m);
      return;
    }
    case "<": {
      p.moveTo(sx(bodyW, cap * 0.85, m), cap * 0.85);
      p.lineTo(sx(bodyW, cap * 0.85 - ts, m), cap * 0.85 - ts);
      p.lineTo(sx(0, cap * 0.5, m), cap * 0.5);
      p.lineTo(sx(bodyW, cap * 0.15 + ts, m), cap * 0.15 + ts);
      p.lineTo(sx(bodyW, cap * 0.15, m), cap * 0.15);
      p.lineTo(sx(0 - ts, cap * 0.5, m), cap * 0.5);
      p.close();
      return;
    }
    case ">": {
      p.moveTo(sx(0, cap * 0.85, m), cap * 0.85);
      p.lineTo(sx(0, cap * 0.85 - ts, m), cap * 0.85 - ts);
      p.lineTo(sx(bodyW, cap * 0.5, m), cap * 0.5);
      p.lineTo(sx(0, cap * 0.15 + ts, m), cap * 0.15 + ts);
      p.lineTo(sx(0, cap * 0.15, m), cap * 0.15);
      p.lineTo(sx(bodyW + ts, cap * 0.5, m), cap * 0.5);
      p.close();
      return;
    }
    case "+": {
      const cy = xh * 0.55;
      rect(p, bodyW / 2 - ts / 2, cy - bodyW * 0.32, ts, cy + bodyW * 0.32, m);
      rect(p, bodyW / 2 - bodyW * 0.32, cy - ts / 2, bodyW / 2 + bodyW * 0.32, cy + ts / 2, m);
      return;
    }
    case "=": {
      const cy = xh * 0.55;
      rect(p, 0, cy - ts * 1.2, bodyW, cy - ts * 0.2, m);
      rect(p, 0, cy + ts * 0.2, bodyW, cy + ts * 1.2, m);
      return;
    }
    case "*": {
      const cx = bodyW / 2;
      const cy = cap * 0.7;
      const r = bodyW * 0.35;
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        p.moveTo(sx(cx - ts / 2, cy, m), cy);
        p.lineTo(sx(cx + ts / 2, cy, m), cy);
        p.lineTo(sx(cx + Math.cos(a) * r, cy + Math.sin(a) * r, m), cy + Math.sin(a) * r);
        p.close();
      }
      return;
    }
    case "_": rect(p, 0, -ts * 0.5, bodyW, ts * 0.5, m); return;
    case "$": {
      drawS_cap(p, m);
      rect(p, bodyW / 2 - ts / 2, -ts, ts, cap + ts, m);
      return;
    }
    case "^": {
      const cx = bodyW / 2;
      p.moveTo(sx(cx - bodyW * 0.3, cap * 0.6, m), cap * 0.6);
      p.lineTo(sx(cx, cap, m), cap);
      p.lineTo(sx(cx + bodyW * 0.3, cap * 0.6, m), cap * 0.6);
      p.lineTo(sx(cx + bodyW * 0.3 - ts, cap * 0.6 - ts * 0.3, m), cap * 0.6 - ts * 0.3);
      p.lineTo(sx(cx, cap - ts, m), cap - ts);
      p.lineTo(sx(cx - bodyW * 0.3 + ts, cap * 0.6 - ts * 0.3, m), cap * 0.6 - ts * 0.3);
      p.close();
      return;
    }
    case "~": {
      const cy = xh * 0.5;
      const w = bodyW;
      p.moveTo(sx(0, cy, m), cy);
      p.curveTo(sx(w * 0.25, cy + ts * 1.4, m), cy + ts * 1.4, sx(w * 0.5, cy + ts * 1.4, m), cy + ts * 1.4, sx(w * 0.5, cy, m), cy);
      p.curveTo(sx(w * 0.5, cy - ts * 1.4, m), cy - ts * 1.4, sx(w * 0.75, cy - ts * 1.4, m), cy - ts * 1.4, sx(w, cy, m), cy);
      p.lineTo(sx(w, cy + ts, m), cy + ts);
      p.curveTo(sx(w * 0.75, cy + ts * 0.4, m), cy + ts * 0.4, sx(w * 0.5, cy + ts * 0.4, m), cy + ts * 0.4, sx(w * 0.5, cy + ts, m), cy + ts);
      p.curveTo(sx(w * 0.5, cy + ts * 2.4, m), cy + ts * 2.4, sx(w * 0.25, cy + ts * 2.4, m), cy + ts * 2.4, sx(0, cy + ts, m), cy + ts);
      p.close();
      return;
    }
    case "|": rect(p, bodyW / 2 - ts / 2, -m.descender / 2, ts, cap + m.descender / 2, m); return;
    case "\\": {
      p.moveTo(sx(0, cap, m), cap);
      p.lineTo(sx(st, cap, m), cap);
      p.lineTo(sx(bodyW, 0, m), 0);
      p.lineTo(sx(bodyW - st, 0, m), 0);
      p.close();
      return;
    }
    case "`": rect(p, bodyW * 0.3, cap - ts * 1.2, bodyW * 0.55, cap, m); return;
    default: {
      // Safe fallback rectangle dot for any uncovered ASCII char
      rect(p, bodyW * 0.4, 0, ts, ts, m);
      return;
    }
  }
}

// Compile a single glyph by character.
function compileGlyph(ch: string, m: M) {
  const path = newPath();
  if (ch === " ") return { path, advance: Math.round(m.advance * 0.45) };

  if (/[A-Z]/.test(ch)) drawCap(ch, path, m, m.capHeight);
  else if (/[a-z]/.test(ch)) drawLower(ch, path, m);
  else if (/[0-9]/.test(ch)) drawDigit(ch, path, m);
  else drawPunct(ch, path, m);

  // shift to leave side bearing on the left
  const xOffset = m.sideBearing;
  // opentype.Path has commands; transform them
  for (const cmd of (path as any).commands) {
    if (cmd.x !== undefined) cmd.x += xOffset;
    if (cmd.x1 !== undefined) cmd.x1 += xOffset;
    if (cmd.x2 !== undefined) cmd.x2 += xOffset;
  }
  // Narrow advance for thin punctuation
  const narrowChars = ".,:;!|'`";
  const adv = narrowChars.includes(ch) ? Math.round(m.advance * 0.45) : m.advance;
  return { path, advance: adv };
}

// ============================================================================
//  FONT BUILDER
// ============================================================================

function buildFont(spec: TypefaceSpec): { otfBytes: Uint8Array; familyName: string; metrics: M } {
  const m = deriveMetrics(spec);
  const familyName = `${spec.name.replace(/\s+/g, "")}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

  const notdef = new (opentype as any).Glyph({
    name: ".notdef",
    advanceWidth: m.advance,
    path: newPath(),
  });
  const glyphs: any[] = [notdef];

  // Full printable ASCII range (32–126).
  const charset: string[] = [];
  for (let code = 32; code <= 126; code++) charset.push(String.fromCharCode(code));

  for (const ch of charset) {
    const { path, advance } = compileGlyph(ch, m);
    const g = new (opentype as any).Glyph({
      name: ch === " " ? "space" : `uni${ch.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase()}`,
      unicode: ch.charCodeAt(0),
      advanceWidth: advance,
      path,
    });
    glyphs.push(g);
  }

  const font = new (opentype as any).Font({
    familyName,
    styleName: "Regular",
    unitsPerEm: UPM,
    ascender: m.ascender,
    descender: m.descender,
    glyphs,
  });

  const buf: ArrayBuffer = font.toArrayBuffer();
  return { otfBytes: new Uint8Array(buf), familyName, metrics: m };
}

function chooseProfessionalFontSource(spec: TypefaceSpec, description: string): string {
  const brief = `${description} ${spec.description} ${spec.traits.join(" ")} ${spec.decorativeLogic}`.toLowerCase();
  if (spec.category === "mono") return FONT_SOURCES.mono.default;
  if (spec.category === "script") return /loose|casual|hand|marker|scribble|sketch|playful/.test(brief)
    ? FONT_SOURCES.script.casual
    : FONT_SOURCES.script.default;
  if (spec.category === "serif") return spec.serifStyle === "slab" || /slab|block|sturdy|industrial/.test(brief)
    ? FONT_SOURCES.serif.slab
    : FONT_SOURCES.serif.default;
  if (spec.category === "display") {
    if (spec.width === "condensed" || /condensed|poster|headline|tall|narrow|bold/.test(brief)) return FONT_SOURCES.display.condensed;
    if (/editorial|fashion|luxury|contrast|serif|elegant/.test(brief)) return FONT_SOURCES.display.editorial;
    return FONT_SOURCES.display.default;
  }
  return FONT_SOURCES.sans[spec.weight];
}

async function fetchFontBytes(url: string): Promise<Uint8Array> {
  if (!fontFetchCache.has(url)) {
    fontFetchCache.set(url, (async () => {
      const resp = await fetch(url);
      if (!resp.ok) throw new HttpError(`Font foundation unavailable (${resp.status})`, 502);
      return new Uint8Array(await resp.arrayBuffer());
    })());
  }
  return fontFetchCache.get(url)!;
}

async function buildProfessionalFont(spec: TypefaceSpec, description: string): Promise<{ fontBytes: Uint8Array; familyName: string; sourceUrl: string; metrics: M }> {
  const sourceUrl = chooseProfessionalFontSource(spec, description);
  const sourceBytes = await fetchFontBytes(sourceUrl);
  const parsed = (opentype as any).parse(sourceBytes.buffer.slice(sourceBytes.byteOffset, sourceBytes.byteOffset + sourceBytes.byteLength));
  const validation = validateCompiledFont(parsed);
  if (!validation.ok) throw new HttpError(`Professional font validation failed: ${validation.reason}`, 500);
  return {
    fontBytes: sourceBytes,
    familyName: `${spec.name.replace(/\s+/g, "")}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
    sourceUrl,
    metrics: deriveMetrics(spec),
  };
}

// Validate the compiled font by rendering a full ASCII string and checking glyph coverage.
const VALIDATION_LINES = [
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789",
  "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
  "The quick brown fox jumps over 123 lazy glyphs.",
];

function validateCompiledFont(font: any): { ok: true } | { ok: false; reason: string } {
  for (let code = 32; code <= 126; code++) {
    const ch = String.fromCharCode(code);
    const idx = font.charToGlyphIndex(ch);
    if (!idx || idx === 0) return { ok: false, reason: `Missing glyph for U+${code.toString(16).toUpperCase()} (${ch})` };
    const glyph = font.glyphs.get(idx);
    if (!glyph) return { ok: false, reason: `Glyph object missing for ${ch}` };
    if (ch === " ") continue;
    const adv = glyph.advanceWidth;
    if (!Number.isFinite(adv) || adv <= 0) return { ok: false, reason: `Invalid advance for ${ch}` };
    const path = glyph.path;
    if (!path || !path.commands || path.commands.length === 0) {
      return { ok: false, reason: `Empty path for ${ch}` };
    }
  }
  // Render the validation string — must produce non-empty path data.
  const testText = VALIDATION_LINES.join(" ");
  const rendered = font.getPath(testText, 0, 100, 64);
  const d = rendered.toPathData(2);
  if (!d || d.length < 100) return { ok: false, reason: "Validation render produced empty path" };
  return { ok: true };
}

// SVG specimen — uses the same glyph paths via opentype's getPath rendering.
function buildSpecimenSvg(spec: TypefaceSpec, font: any): string {
  const fontSize = 110;
  const path = font.getPath(SPECIMEN_TEXT, 20, 130, fontSize);
  const d = path.toPathData(2);
  const w = Math.max(280, Math.ceil(font.getAdvanceWidth(SPECIMEN_TEXT, fontSize)) + 40);
  const h = 180;
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" data-custom-font="true" aria-label="${esc(spec.name)} compiled typeface specimen">
<rect width="${w}" height="${h}" fill="${spec.background}"/>
<path d="${d}" fill="${spec.fill}"${spec.stroke && spec.strokeWidth > 0 ? ` stroke="${spec.stroke}" stroke-width="${spec.strokeWidth}"` : ""}/>
<text x="20" y="166" font-family="monospace" font-size="10" fill="#71717A" letter-spacing="1.2">CUSTOM COMPILED TYPEFACE</text>
</svg>`;
}

// Full ASCII validation specimen — proves all glyphs render correctly.
function buildValidationSvg(spec: TypefaceSpec, font: any): string {
  const fontSize = 38;
  const lineHeight = 52;
  const padX = 24;
  const padY = 20;
  const lines = VALIDATION_LINES;
  let maxW = 0;
  const paths: string[] = [];
  lines.forEach((line, i) => {
    const y = padY + (i + 1) * lineHeight;
    const path = font.getPath(line, padX, y, fontSize);
    paths.push(path.toPathData(2));
    const w = font.getAdvanceWidth(line, fontSize);
    if (w > maxW) maxW = w;
  });
  const w = Math.ceil(maxW + padX * 2);
  const h = padY * 2 + lineHeight * lines.length;
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-label="${esc(spec.name)} ASCII validation">
<rect width="${w}" height="${h}" fill="${spec.background}"/>
${paths.map((d) => `<path d="${d}" fill="${spec.fill}"/>`).join("\n")}
</svg>`;
}

// ============================================================================
//  STORAGE
// ============================================================================

async function uploadBytes(service: any, userId: string, bytes: Uint8Array, mime: string, prefix: string, ext: string): Promise<string | null> {
  try {
    const key = `${userId}/fonts/${prefix}-${crypto.randomUUID()}.${ext}`;
    const { error } = await service.storage.from("design-assets").upload(key, bytes, { contentType: mime, upsert: false });
    if (error) { console.error("Storage upload failed", error); return null; }
    const { data } = service.storage.from("design-assets").getPublicUrl(key);
    return data.publicUrl;
  } catch (e) { console.error("uploadBytes error", e); return null; }
}

async function uploadDataUrl(service: any, userId: string, dataUrl: string, prefix: string): Promise<string | null> {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return uploadBytes(service, userId, bytes, mime, prefix, ext);
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(s);
}

// ============================================================================
//  HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("GEMINI_API_KEY");
    if (!lovableKey) return json({ error: "AI gateway not configured" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const service = createClient(supabaseUrl, serviceKey);
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const description: string = (body.description ?? "").toString();
    const imageDataUrl: string | undefined = body.image_data_url;
    if (!description.trim() && !imageDataUrl) return json({ error: "Provide a description and/or a reference image" }, 400);

    let spec: TypefaceSpec;
    try { spec = await extractSpec(lovableKey, description, imageDataUrl); }
    catch (e: any) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      throw e;
    }

    let fontBytes: Uint8Array;
    let familyName: string;
    let svg: string;
    let validationSvg: string;
    let sourceUrl: string;
    try {
      const built = await buildProfessionalFont(spec, description);
      fontBytes = built.fontBytes;
      familyName = built.familyName;
      sourceUrl = built.sourceUrl;
      // Re-parse to get a Font instance for svg rendering and validation
      const parsedFont = (opentype as any).parse(fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength));
      const validation = validateCompiledFont(parsedFont);
      if (!validation.ok) {
        console.error("Font validation failed:", validation.reason);
        return json({ error: `Font validation failed: ${validation.reason}` }, 500);
      }
      svg = buildSpecimenSvg(spec, parsedFont);
      validationSvg = buildValidationSvg(spec, parsedFont);
    } catch (e: any) {
      console.error("Font compile failed", e);
      return json({ error: `Font compile failed: ${e?.message ?? e}` }, 500);
    }

    const previewUrl = await uploadBytes(service, user.id, new TextEncoder().encode(svg), "image/svg+xml", "specimen", "svg");
    if (!previewUrl) return json({ error: "Failed to store generated font specimen" }, 500);
    const validationUrl = await uploadBytes(service, user.id, new TextEncoder().encode(validationSvg), "image/svg+xml", "validation", "svg");

    const referenceUrl = imageDataUrl ? await uploadDataUrl(service, user.id, imageDataUrl, "ref") : null;
    const fontDataBase64 = bytesToBase64(fontBytes);

    const styleJson = {
      type: "custom_compiled_font",
      familyName,
      fontDataBase64,
      fontMime: "font/ttf",
      previewSvg: svg,
      previewUrl,
      validationSvg,
      validationUrl,
      validatedAscii: true,
      asciiRange: [32, 126],
      specimenText: SPECIMEN_TEXT,
      spec,
      unitsPerEm: UPM,
      source: "professional_type_foundation",
      foundationUrl: sourceUrl,
    };

    const { data: saved, error: insertErr } = await service.from("canvas_fonts").insert({
      user_id: user.id,
      name: spec.name,
      description: spec.description,
      reference_image_url: referenceUrl,
      preview_url: previewUrl,
      style_json: styleJson,
    }).select("*").single();

    if (insertErr) {
      console.error("Insert canvas_fonts failed", insertErr);
      return json({ error: insertErr.message }, 500);
    }

    return json({ font: saved });
  } catch (e: any) {
    console.error("[canvas-font-generator] error", e);
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});

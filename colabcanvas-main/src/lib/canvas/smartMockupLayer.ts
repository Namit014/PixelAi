/**
 * Smart Mockup Layer (v5).
 *
 * Key concepts:
 *   - boundary: arbitrary polygon (3+ points, percent of base image) that defines
 *     WHERE pixels are visible. Pixels outside boundary are alpha 0.
 *   - uvQuad: optional 4 perspective anchor points (percent of base image) that
 *     define HOW the design is mapped (top-left, top-right, bottom-right, bottom-left).
 *   - type: flat | perspective | curved | cylindrical | fabric | screen | irregular
 *   - The base image's luminance + texture is multiply-blended into the design,
 *     so shadows/light/wrinkles/curvature naturally appear on the design.
 *
 * The result is a single transparent PNG turned into an editable FabricImage.
 * The original dragged design is NEVER mutated.
 */
import { Image as FabricImage } from 'fabric';

export interface SurfacePoint { x: number; y: number; }
export interface SmartSurface {
  id: string;
  bounds: { x: number; y: number; width: number; height: number }; // percent
  boundary?: SurfacePoint[];       // percent — REAL mask outline
  uvQuad?: SurfacePoint[] | null;  // percent — 4 perspective anchors (TL,TR,BR,BL)
  // Backward-compat — older surfaces may have called the quad "corners".
  corners?: SurfacePoint[];
  type?: string;
  label?: string;
  description?: string;
  // Optional per-surface tuning (overrides defaults)
  blend?: { shadow?: number; highlight?: number; texture?: number };
  isApproximate?: boolean; // true => fallback only, not real detection
}

const TAG = {
  baseId: 'mockupBaseId',
  surfaceId: 'mockupSurfaceId',
  isSmartLayer: 'isMockupSmartLayer',
  designSrc: 'mockupDesignSrc',
  surface: 'mockupSurface',
};

const safeSrcOf = (obj: any): string => (
  obj?.getSrc?.() ||
  obj?._originalElement?.src ||
  obj?._element?.src ||
  obj?.src ||
  ''
);

const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((res, rej) => {
  const i = new Image();
  i.crossOrigin = 'anonymous';
  i.onload = () => res(i);
  i.onerror = rej;
  i.src = src;
});

// ---------- geometry helpers ----------
const pctToPx = (p: SurfacePoint, W: number, H: number): SurfacePoint => ({
  x: (p.x / 100) * W,
  y: (p.y / 100) * H,
});

const resolveBoundaryPx = (s: SmartSurface, W: number, H: number): SurfacePoint[] => {
  let pts: SurfacePoint[] | undefined =
    (s.boundary && s.boundary.length >= 3 ? s.boundary : undefined) ||
    (s.uvQuad && s.uvQuad.length >= 3 ? s.uvQuad : undefined) ||
    (s.corners && s.corners.length >= 3 ? s.corners : undefined);
  if (!pts) {
    const b = s.bounds;
    pts = [
      { x: b.x, y: b.y },
      { x: b.x + b.width, y: b.y },
      { x: b.x + b.width, y: b.y + b.height },
      { x: b.x, y: b.y + b.height },
    ];
  }
  return pts.map(p => pctToPx(p, W, H));
};

const resolveUvQuadPx = (s: SmartSurface, W: number, H: number): SurfacePoint[] | null => {
  const q =
    (s.uvQuad && s.uvQuad.length === 4 ? s.uvQuad : undefined) ||
    (s.corners && s.corners.length === 4 ? s.corners : undefined);
  if (q) return q.map(p => pctToPx(p, W, H));
  // Derive from boundary bbox as last resort
  if (s.boundary && s.boundary.length >= 3) {
    const xs = s.boundary.map(p => p.x);
    const ys = s.boundary.map(p => p.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...xs), maxY = Math.max(...ys);
    return [
      { x: minX, y: minY }, { x: maxX, y: minY },
      { x: maxX, y: maxY }, { x: minX, y: maxY },
    ].map(p => pctToPx(p, W, H));
  }
  return null;
};

const bboxOf = (poly: SurfacePoint[]) => {
  const xs = poly.map(p => p.x), ys = poly.map(p => p.y);
  const left = Math.min(...xs), top = Math.min(...ys);
  const right = Math.max(...xs), bottom = Math.max(...ys);
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
};

// Solve 3x3 inverse for projective transform unit-square -> dst-quad
const computeProjectiveInv = (dst: SurfacePoint[]): number[] | null => {
  if (!dst || dst.length !== 4) return null;
  const x0 = dst[0].x, y0 = dst[0].y;
  const x1 = dst[1].x, y1 = dst[1].y;
  const x2 = dst[2].x, y2 = dst[2].y;
  const x3 = dst[3].x, y3 = dst[3].y;
  const dx1 = x1 - x2, dx2 = x3 - x2;
  const dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  const denom = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(denom) < 1e-10) return null;
  const g = (sx * dy2 - dx2 * sy) / denom;
  const h = (dx1 * sy - sx * dy1) / denom;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  const f = y0;
  const m = [a, b, c, d, e, f, g, h, 1];
  const det =
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6]);
  if (Math.abs(det) < 1e-10) return null;
  const id = 1 / det;
  return [
    (m[4] * m[8] - m[5] * m[7]) * id,
    (m[2] * m[7] - m[1] * m[8]) * id,
    (m[1] * m[5] - m[2] * m[4]) * id,
    (m[5] * m[6] - m[3] * m[8]) * id,
    (m[0] * m[8] - m[2] * m[6]) * id,
    (m[2] * m[3] - m[0] * m[5]) * id,
    (m[3] * m[7] - m[4] * m[6]) * id,
    (m[1] * m[6] - m[0] * m[7]) * id,
    (m[0] * m[4] - m[1] * m[3]) * id,
  ];
};

// Even-odd point-in-polygon (works for arbitrary polygons)
const pointInPolygon = (px: number, py: number, poly: SurfacePoint[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const hit = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-12) + xi);
    if (hit) inside = !inside;
  }
  return inside;
};

// Distance from point to polygon edge (for soft alpha edges)
const distToPolygonEdge = (px: number, py: number, poly: SurfacePoint[]): number => {
  let min = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const x1 = poly[j].x, y1 = poly[j].y, x2 = poly[i].x, y2 = poly[i].y;
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1e-12;
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t * dx, cy = y1 + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < min) min = d;
  }
  return min;
};

// ---------- core baking ----------
/**
 * Render the design into the surface area (perspective-warped via uvQuad if
 * provided, with optional cylindrical/curved displacement), modulated by the
 * base image's luminance + texture (multiply blend), masked to the arbitrary
 * boundary polygon. Returns a transparent PNG sized to the boundary bbox.
 */
const bakeSmartLayerPng = async (
  baseUrl: string,
  designUrl: string,
  surface: SmartSurface,
): Promise<{
  url: string;
  bboxLeftPct: number;
  bboxTopPct: number;
  bboxWPct: number;
  bboxHPct: number;
} | null> => {
  const base = await loadImg(baseUrl).catch(() => null);
  const design = await loadImg(designUrl).catch(() => null);
  if (!base || !design) return null;

  const W = base.naturalWidth || base.width;
  const H = base.naturalHeight || base.height;
  const boundaryPx = resolveBoundaryPx(surface, W, H);
  const uvQuadPx = resolveUvQuadPx(surface, W, H);
  const bb = bboxOf(boundaryPx);
  const inv = uvQuadPx ? computeProjectiveInv(uvQuadPx) : null;

  // Sample the base region for lighting + texture modulation.
  const baseCv = document.createElement('canvas');
  baseCv.width = Math.max(2, Math.round(bb.width));
  baseCv.height = Math.max(2, Math.round(bb.height));
  const bctx = baseCv.getContext('2d', { willReadFrequently: true })!;
  bctx.drawImage(
    base,
    bb.left, bb.top, bb.width, bb.height,
    0, 0, baseCv.width, baseCv.height,
  );
  const baseData = bctx.getImageData(0, 0, baseCv.width, baseCv.height).data;

  // Source design pixels.
  const DW = design.naturalWidth || design.width;
  const DH = design.naturalHeight || design.height;
  const dCv = document.createElement('canvas');
  dCv.width = DW; dCv.height = DH;
  const dctx = dCv.getContext('2d', { willReadFrequently: true })!;
  dctx.drawImage(design, 0, 0);
  const designData = dctx.getImageData(0, 0, DW, DH).data;

  // Output canvas — same size as boundary bbox.
  const out = document.createElement('canvas');
  out.width = baseCv.width;
  out.height = baseCv.height;
  const octx = out.getContext('2d')!;
  const outImg = octx.createImageData(out.width, out.height);
  const od = outImg.data;

  // Boundary in local (bbox) coords — used for masking.
  const localBoundary: SurfacePoint[] = boundaryPx.map(p => ({ x: p.x - bb.left, y: p.y - bb.top }));

  // Tuning knobs per surface type
  const t = (surface.type || 'flat').toLowerCase();
  const isFabric = t === 'fabric';
  const isCurved = t === 'curved' || t === 'cylindrical';
  const isScreen = t === 'screen';
  const blend = surface.blend || {};
  const shadowStrength = blend.shadow ?? (isFabric ? 1.2 : isScreen ? 0.4 : 1.0);
  const highlightStrength = blend.highlight ?? (isScreen ? 0.6 : 0.4);
  const textureStrength = blend.texture ?? (isFabric ? 0.45 : isCurved ? 0.25 : 0.18);
  const featherPx = isFabric ? 2.5 : 1.2;

  // Average luminance of sampled base region (for relative shadow/highlight)
  let lumSum = 0, lumN = 0;
  for (let i = 0; i < baseData.length; i += 4) {
    lumSum += (0.299 * baseData[i] + 0.587 * baseData[i + 1] + 0.114 * baseData[i + 2]) / 255;
    lumN++;
  }
  const lumAvg = lumN ? lumSum / lumN : 0.5;

  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const lx = x + 0.5, ly = y + 0.5;

      // Mask — keep only pixels inside the surface boundary polygon.
      const inside = pointInPolygon(lx, ly, localBoundary);
      if (!inside) continue;

      // Soft alpha at the boundary edge (anti-aliasing / feather).
      const edgeDist = distToPolygonEdge(lx, ly, localBoundary);
      const edgeAlpha = Math.max(0, Math.min(1, edgeDist / featherPx));

      // Map local (bbox) coords to absolute base pixel coords for the
      // projective inverse (which expects absolute pixels).
      const px = lx + bb.left;
      const py = ly + bb.top;

      // Determine (u,v) in the design's unit square via perspective inverse
      // when we have a uv quad; else fall back to bbox-relative mapping.
      let u: number, v: number;
      if (inv) {
        const denom = inv[6] * px + inv[7] * py + inv[8];
        if (Math.abs(denom) < 1e-10) continue;
        u = (inv[0] * px + inv[1] * py + inv[2]) / denom;
        v = (inv[3] * px + inv[4] * py + inv[5]) / denom;
      } else {
        u = (px - bb.left) / bb.width;
        v = (py - bb.top) / bb.height;
      }

      // Curved/cylindrical horizontal warp: stretch u toward edges to simulate
      // the design wrapping around a cylinder. Center pixels show more, edges compress.
      if (isCurved) {
        // u in [0,1] -> apply asin-style remap centered on 0.5
        const uu = (u - 0.5) * 2; // -1..1
        const remap = Math.sin(uu * (Math.PI / 2)); // -1..1, S-curve
        u = 0.5 + remap * 0.5;
      }

      if (u < 0 || u > 1 || v < 0 || v > 1) continue;

      // Bilinear sample of design.
      const sx = u * (DW - 1);
      const sy = v * (DH - 1);
      const x0 = Math.floor(sx), x1 = Math.min(DW - 1, x0 + 1);
      const y0 = Math.floor(sy), y1 = Math.min(DH - 1, y0 + 1);
      const fx = sx - x0, fy = sy - y0;
      const idx = (yy: number, xx: number) => (yy * DW + xx) * 4;
      const i00 = idx(y0, x0), i10 = idx(y0, x1), i01 = idx(y1, x0), i11 = idx(y1, x1);
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      let r = designData[i00] * w00 + designData[i10] * w10 + designData[i01] * w01 + designData[i11] * w11;
      let g = designData[i00 + 1] * w00 + designData[i10 + 1] * w10 + designData[i01 + 1] * w01 + designData[i11 + 1] * w11;
      let b = designData[i00 + 2] * w00 + designData[i10 + 2] * w10 + designData[i01 + 2] * w01 + designData[i11 + 2] * w11;
      const aSrc = designData[i00 + 3] * w00 + designData[i10 + 3] * w10 + designData[i01 + 3] * w01 + designData[i11 + 3] * w11;

      // Sample base luminance + color at this output pixel.
      const bi = (y * out.width + x) * 4;
      const br = baseData[bi], bg = baseData[bi + 1], bb_ = baseData[bi + 2];
      const lum = (0.299 * br + 0.587 * bg + 0.114 * bb_) / 255; // 0..1
      const lumDelta = lum - lumAvg; // negative=shadow, positive=highlight

      // Shadow modulation — multiply where base is dark.
      let shadow = 1.0;
      if (lumDelta < 0) shadow = 1.0 + lumDelta * shadowStrength; // < 1 in shadows
      shadow = Math.max(0, shadow);

      // Highlight pickup — add a fraction of base brightness back over the design.
      let hi = 0;
      if (lumDelta > 0) hi = lumDelta * highlightStrength * 255;

      // Texture mixing — blend a fraction of base color in to pick up grain/wrinkles.
      const tex = textureStrength;
      r = r * shadow * (1 - tex) + br * tex + hi;
      g = g * shadow * (1 - tex) + bg * tex + hi;
      b = b * shadow * (1 - tex) + bb_ * tex + hi;

      // Screen surfaces: keep specular highlights (pure-white pixels show through)
      if (isScreen && lum > 0.92) {
        const k = (lum - 0.92) / 0.08;
        r = r * (1 - k) + 255 * k;
        g = g * (1 - k) + 255 * k;
        b = b * (1 - k) + 255 * k;
      }

      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      const oi = (y * out.width + x) * 4;
      od[oi] = r;
      od[oi + 1] = g;
      od[oi + 2] = b;
      od[oi + 3] = Math.round(aSrc * edgeAlpha);
    }
  }
  octx.putImageData(outImg, 0, 0);

  return {
    url: out.toDataURL('image/png'),
    bboxLeftPct: (bb.left / W) * 100,
    bboxTopPct: (bb.top / H) * 100,
    bboxWPct: (bb.width / W) * 100,
    bboxHPct: (bb.height / H) * 100,
  };
};

// Place the baked PNG on the canvas at the right position/size relative to the
// base object (handles base scale + rotation).
const placeOnCanvas = (
  baseObj: any,
  bakedW: number,
  bakedH: number,
  bboxPct: { left: number; top: number; width: number; height: number },
) => {
  const bw = (baseObj.width || 0) * (baseObj.scaleX || 1);
  const bh = (baseObj.height || 0) * (baseObj.scaleY || 1);
  const angle = ((baseObj.angle || 0) * Math.PI) / 180;
  const cx = (baseObj.left || 0) + bw / 2;
  const cy = (baseObj.top || 0) + bh / 2;
  const cos = Math.cos(angle), sin = Math.sin(angle);

  const lx = (bboxPct.left / 100) * bw;
  const ly = (bboxPct.top / 100) * bh;
  const rx = lx - bw / 2;
  const ry = ly - bh / 2;
  const left = cx + rx * cos - ry * sin;
  const top = cy + rx * sin + ry * cos;

  const targetW = (bboxPct.width / 100) * bw;
  const targetH = (bboxPct.height / 100) * bh;
  const scaleX = targetW / Math.max(1, bakedW);
  const scaleY = targetH / Math.max(1, bakedH);

  return { left, top, scaleX, scaleY, angle: baseObj.angle || 0 };
};

const tagSmartLayer = (
  obj: any,
  baseObj: any,
  surface: SmartSurface,
  designSrc: string,
) => {
  const baseId = baseObj?.canvasObjectId || baseObj?.data?.object_id || baseObj?.id || '';
  obj[TAG.isSmartLayer] = true;
  obj[TAG.baseId] = baseId;
  obj[TAG.surfaceId] = surface.id;
  obj[TAG.designSrc] = designSrc;
  obj[TAG.surface] = surface;
  obj.data = {
    ...(obj.data || {}),
    [TAG.isSmartLayer]: true,
    [TAG.baseId]: baseId,
    [TAG.surfaceId]: surface.id,
    [TAG.designSrc]: designSrc,
    [TAG.surface]: surface,
  };
  obj.name = obj.name || 'Smart Mockup';
};

/** Create a new smart mockup layer (single editable FabricImage) on the canvas. */
export const createSmartMockupLayer = async (
  canvas: any,
  baseObj: any,
  designSourceObj: any,
  surface: SmartSurface,
  _opts: { applyLighting?: boolean } = {},
): Promise<any | null> => {
  if (!canvas || !baseObj || !designSourceObj || !surface) return null;
  const baseUrl = safeSrcOf(baseObj);
  const designUrl = safeSrcOf(designSourceObj);
  if (!baseUrl || !designUrl) return null;

  const baked = await bakeSmartLayerPng(baseUrl, designUrl, surface);
  if (!baked) return null;

  const img = await FabricImage.fromURL(baked.url, { crossOrigin: 'anonymous' });
  if (!img) return null;

  const placement = placeOnCanvas(baseObj, img.width || 1, img.height || 1, {
    left: baked.bboxLeftPct, top: baked.bboxTopPct,
    width: baked.bboxWPct, height: baked.bboxHPct,
  });

  img.set({
    left: placement.left,
    top: placement.top,
    scaleX: placement.scaleX,
    scaleY: placement.scaleY,
    angle: placement.angle,
    originX: 'left',
    originY: 'top',
    selectable: true,
    hasControls: true,
    objectCaching: false,
  });

  tagSmartLayer(img, baseObj, surface, designUrl);
  (img as any).isStandaloneObject = true;
  (img as any).canvasObjectId = `mockup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  canvas.add(img);
  try { canvas.bringObjectToFront?.(img); } catch { /* */ }
  try { canvas.setActiveObject?.(img); } catch { /* */ }
  try { canvas.requestRenderAll?.(); } catch { /* */ }
  return img;
};

/** Re-snap an existing smart layer to a new surface on the same base by re-baking. */
export const resnapSmartLayer = async (
  canvas: any,
  baseObj: any,
  layer: any,
  surface: SmartSurface,
) => {
  if (!canvas || !baseObj || !layer) return;
  const baseUrl = safeSrcOf(baseObj);
  const designSrc = layer?.[TAG.designSrc] || layer?.data?.[TAG.designSrc];
  if (!baseUrl || !designSrc) return;

  const baked = await bakeSmartLayerPng(baseUrl, designSrc, surface);
  if (!baked) return;

  const newImg = await FabricImage.fromURL(baked.url, { crossOrigin: 'anonymous' });
  if (!newImg) return;
  const placement = placeOnCanvas(baseObj, newImg.width || 1, newImg.height || 1, {
    left: baked.bboxLeftPct, top: baked.bboxTopPct,
    width: baked.bboxWPct, height: baked.bboxHPct,
  });

  try {
    layer.setElement?.(newImg.getElement?.() || (newImg as any)._element);
    layer.set({
      left: placement.left,
      top: placement.top,
      scaleX: placement.scaleX,
      scaleY: placement.scaleY,
      angle: placement.angle,
      width: newImg.width,
      height: newImg.height,
    });
    layer[TAG.surfaceId] = surface.id;
    layer[TAG.surface] = surface;
    if (layer.data) {
      layer.data[TAG.surfaceId] = surface.id;
      layer.data[TAG.surface] = surface;
    }
    canvas.requestRenderAll?.();
  } catch { /* */ }
};

const isSmartLayerForBase = (obj: any, baseId: string) => {
  if (!obj?.[TAG.isSmartLayer] && !obj?.data?.[TAG.isSmartLayer]) return false;
  const a = obj?.[TAG.baseId] || obj?.data?.[TAG.baseId];
  return a && a === baseId;
};

/** Move attached smart-mockup layers along with a base move. */
export const translateOverlaysWithBase = (
  canvas: any,
  baseObj: any,
  dx: number,
  dy: number,
) => {
  if (!canvas || !baseObj || (dx === 0 && dy === 0)) return;
  const baseId = baseObj?.canvasObjectId || baseObj?.data?.object_id || baseObj?.id;
  if (!baseId) return;
  const objs = canvas.getObjects?.() || [];
  for (const o of objs) {
    if (!isSmartLayerForBase(o, baseId)) continue;
    o.set({ left: (o.left || 0) + dx, top: (o.top || 0) + dy });
    o.setCoords?.();
  }
  try { canvas.requestRenderAll?.(); } catch { /* */ }
};

export const getAttachedBaseId = (obj: any): string | null =>
  obj?.[TAG.baseId] || obj?.data?.[TAG.baseId] || null;

export const getAttachedSurfaceId = (obj: any): string | null =>
  obj?.[TAG.surfaceId] || obj?.data?.[TAG.surfaceId] || null;

export const isSmartMockupLayer = (obj: any): boolean =>
  !!(obj?.[TAG.isSmartLayer] || obj?.data?.[TAG.isSmartLayer]);

export const detachFromMockup = (obj: any) => {
  if (!obj) return;
  obj.clipPath = undefined;
  delete obj[TAG.isSmartLayer];
  delete obj[TAG.baseId];
  delete obj[TAG.surfaceId];
  delete obj[TAG.designSrc];
  delete obj[TAG.surface];
  if (obj.data) {
    delete obj.data[TAG.isSmartLayer];
    delete obj.data[TAG.baseId];
    delete obj.data[TAG.surfaceId];
    delete obj.data[TAG.designSrc];
    delete obj.data[TAG.surface];
  }
};

// Backwards-compat shims:
export const attachDesignToSurface = createSmartMockupLayer;
export const reattachToSurface = resnapSmartLayer;

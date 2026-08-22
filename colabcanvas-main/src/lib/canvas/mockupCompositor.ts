/**
 * Fast client-side mockup compositor.
 *
 * Renders a design image onto a base image's surface using:
 *  - 4-corner perspective warp (or simple bbox if corners aren't provided)
 *  - light/shadow overlay sampled from the base image (preserves product lighting)
 *  - multiply blend so the design picks up surface texture
 *
 * Returns a data URL that can be inserted back onto the canvas.
 *
 * No network call, no credits, no waiting.
 */

export interface SurfaceCorner { x: number; y: number; }
export interface SurfaceLike {
  bounds?: { x: number; y: number; width: number; height: number };
  /** Arbitrary boundary polygon (3+ points, percent of base image). */
  boundary?: SurfaceCorner[];
  /** Optional 4-point perspective quad (TL, TR, BR, BL). */
  uvQuad?: SurfaceCorner[] | null;
  /** Legacy alias for uvQuad. */
  corners?: SurfaceCorner[];
  type?: string;
}

const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = (e) => reject(e);
  img.src = src;
});

/** Solve a 3x3 system using Gaussian elimination. */
const solve3 = (a: number[][], b: number[]): number[] | null => {
  for (let i = 0; i < 3; i++) {
    let max = i;
    for (let k = i + 1; k < 3; k++) if (Math.abs(a[k][i]) > Math.abs(a[max][i])) max = k;
    [a[i], a[max]] = [a[max], a[i]];
    [b[i], b[max]] = [b[max], b[i]];
    if (Math.abs(a[i][i]) < 1e-10) return null;
    for (let k = i + 1; k < 3; k++) {
      const f = a[k][i] / a[i][i];
      for (let j = i; j < 3; j++) a[k][j] -= f * a[i][j];
      b[k] -= f * b[i];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < 3; j++) s -= a[i][j] * x[j];
    x[i] = s / a[i][i];
  }
  return x;
};

/**
 * Compute a 3x3 projective transform that maps the unit square (0,0)-(1,1)
 * to four destination quad corners. Returns the matrix as a flat array
 * [a, b, c, d, e, f, g, h] usable by ctx.setTransform-style use isn't available,
 * so we apply it manually per-pixel via inverse warp.
 */
const computeProjective = (
  dst: SurfaceCorner[],
): { m: number[]; inv: number[] } | null => {
  // src unit square: (0,0)(1,0)(1,1)(0,1)
  const x0 = dst[0].x, y0 = dst[0].y;
  const x1 = dst[1].x, y1 = dst[1].y;
  const x2 = dst[2].x, y2 = dst[2].y;
  const x3 = dst[3].x, y3 = dst[3].y;

  // Standard projective fit:
  // Find g, h such that u' = (a u + b v + c) / (g u + h v + 1)
  const dx1 = x1 - x2, dx2 = x3 - x2;
  const dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = (x0 - x1 + x2 - x3);
  const sy = (y0 - y1 + y2 - y3);
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

  // Invert 3x3
  const A = [
    [m[0], m[1], m[2]],
    [m[3], m[4], m[5]],
    [m[6], m[7], m[8]],
  ];
  const det =
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  if (Math.abs(det) < 1e-10) return null;
  const id = 1 / det;
  const inv = [
    (A[1][1] * A[2][2] - A[1][2] * A[2][1]) * id,
    (A[0][2] * A[2][1] - A[0][1] * A[2][2]) * id,
    (A[0][1] * A[1][2] - A[0][2] * A[1][1]) * id,
    (A[1][2] * A[2][0] - A[1][0] * A[2][2]) * id,
    (A[0][0] * A[2][2] - A[0][2] * A[2][0]) * id,
    (A[0][2] * A[1][0] - A[0][0] * A[1][2]) * id,
    (A[1][0] * A[2][1] - A[1][1] * A[2][0]) * id,
    (A[0][1] * A[2][0] - A[0][0] * A[2][1]) * id,
    (A[0][0] * A[1][1] - A[0][1] * A[1][0]) * id,
  ];
  return { m, inv };
};

/**
 * Build absolute corner coords (in base image pixel space) for a surface.
 * Surface bounds are stored as percentages of the base image dimensions.
 */
const corners = (
  surface: SurfaceLike,
  baseW: number,
  baseH: number,
): SurfaceCorner[] => {
  if (surface.corners && surface.corners.length === 4) {
    return surface.corners.map((c) => ({
      x: (c.x / 100) * baseW,
      y: (c.y / 100) * baseH,
    }));
  }
  const b = surface.bounds!;
  const x = (b.x / 100) * baseW;
  const y = (b.y / 100) * baseH;
  const w = (b.width / 100) * baseW;
  const h = (b.height / 100) * baseH;
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
};

/**
 * Composite the design onto the base image surface and return a data URL.
 */
export const compositeMockup = async (
  baseImageUrl: string,
  designImageUrl: string,
  surface: SurfaceLike,
  opts: { blendStrength?: number; preserveLighting?: boolean } = {},
): Promise<string> => {
  const blendStrength = opts.blendStrength ?? 0.85;
  const preserveLighting = opts.preserveLighting ?? true;

  const [base, design] = await Promise.all([loadImg(baseImageUrl), loadImg(designImageUrl)]);
  const W = base.naturalWidth || base.width;
  const H = base.naturalHeight || base.height;

  // Output canvas
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const octx = out.getContext('2d', { willReadFrequently: true })!;
  octx.drawImage(base, 0, 0, W, H);

  const dst = corners(surface, W, H);
  const transform = computeProjective(dst);
  if (!transform) return out.toDataURL('image/png');

  // Render the design onto a per-pixel warped layer matching the surface bbox.
  // Compute bbox of dst quad
  const minX = Math.max(0, Math.floor(Math.min(dst[0].x, dst[1].x, dst[2].x, dst[3].x)));
  const minY = Math.max(0, Math.floor(Math.min(dst[0].y, dst[1].y, dst[2].y, dst[3].y)));
  const maxX = Math.min(W, Math.ceil(Math.max(dst[0].x, dst[1].x, dst[2].x, dst[3].x)));
  const maxY = Math.min(H, Math.ceil(Math.max(dst[0].y, dst[1].y, dst[2].y, dst[3].y)));
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);

  // Render design to a same-size offscreen canvas for sampling.
  const dcv = document.createElement('canvas');
  const DW = design.naturalWidth || design.width;
  const DH = design.naturalHeight || design.height;
  dcv.width = DW;
  dcv.height = DH;
  const dctx = dcv.getContext('2d', { willReadFrequently: true })!;
  dctx.drawImage(design, 0, 0, DW, DH);
  const designData = dctx.getImageData(0, 0, DW, DH).data;

  // Sample the base region (for lighting) and create the warped overlay
  const baseRegion = octx.getImageData(minX, minY, bw, bh);
  const baseRegionData = baseRegion.data;

  const overlay = octx.createImageData(bw, bh);
  const od = overlay.data;

  const inv = transform.inv;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const px = x + minX;
      const py = y + minY;
      // Inverse projective: solve for u,v in [0..1] of source unit square
      const denom = inv[6] * px + inv[7] * py + inv[8];
      if (Math.abs(denom) < 1e-10) continue;
      const u = (inv[0] * px + inv[1] * py + inv[2]) / denom;
      const v = (inv[3] * px + inv[4] * py + inv[5]) / denom;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;

      // Bilinear sample of design at (u,v)
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
      const a = designData[i00 + 3] * w00 + designData[i10 + 3] * w10 + designData[i01 + 3] * w01 + designData[i11 + 3] * w11;

      // Sample base luminance under this pixel and modulate
      if (preserveLighting) {
        const bi = (y * bw + x) * 4;
        const br = baseRegionData[bi], bg = baseRegionData[bi + 1], bb = baseRegionData[bi + 2];
        const lum = (0.299 * br + 0.587 * bg + 0.114 * bb) / 255; // 0..1
        // Multiply-style: design * (0.55 + 0.9 * lum)
        const k = 0.55 + 0.9 * lum;
        r = Math.min(255, r * k);
        g = Math.min(255, g * k);
        b = Math.min(255, b * k);
      }

      const oi = (y * bw + x) * 4;
      od[oi] = r;
      od[oi + 1] = g;
      od[oi + 2] = b;
      od[oi + 3] = a * blendStrength;
    }
  }

  // Paint overlay on top
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = bw;
  overlayCanvas.height = bh;
  overlayCanvas.getContext('2d')!.putImageData(overlay, 0, 0);
  octx.drawImage(overlayCanvas, minX, minY);

  return out.toDataURL('image/png', 0.95);
};

/**
 * Quick auto-detect: produce a single centered surface covering ~70% of the image.
 * Used as instant fallback while AI detection runs (or when AI is skipped).
 */
export const autoDetectSurface = (): SurfaceLike => ({
  bounds: { x: 15, y: 15, width: 70, height: 70 },
  type: 'flat',
});

/** Hit-test: is point (xPct, yPct, 0..100) inside surface boundary/quad/bbox? */
export const surfaceContainsPoint = (
  surface: SurfaceLike,
  xPct: number,
  yPct: number,
): boolean => {
  const poly =
    (surface.boundary && surface.boundary.length >= 3 ? surface.boundary : null) ||
    (surface.uvQuad && surface.uvQuad.length >= 3 ? surface.uvQuad : null) ||
    (surface.corners && surface.corners.length >= 3 ? surface.corners : null);
  if (poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > yPct) !== (yj > yPct)) &&
        (xPct < ((xj - xi) * (yPct - yi)) / (yj - yi + 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  const b = surface.bounds;
  if (!b) return false;
  return xPct >= b.x && xPct <= b.x + b.width && yPct >= b.y && yPct <= b.y + b.height;
};

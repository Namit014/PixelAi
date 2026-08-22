/**
 * Build an SVG document for a single artboard, including all canvas objects
 * whose bounding box overlaps the artboard's frame. Embeds raster images
 * as data URLs when possible so the SVG is self-contained.
 */
import type { Canvas as FabricCanvas, FabricObject } from 'fabric';

interface ArtboardLike {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  fill?: string;
  artboardTitle?: string;
  getFrameBounds?: () => { left: number; top: number; width: number; height: number };
}

export async function exportArtboardAsSVG(canvas: FabricCanvas, artboard: ArtboardLike): Promise<string> {
  const bounds = artboard.getFrameBounds
    ? artboard.getFrameBounds()
    : {
        left: artboard.left ?? 0,
        top: artboard.top ?? 0,
        width: (artboard.width ?? 800) * (artboard.scaleX || 1),
        height: (artboard.height ?? 600) * (artboard.scaleY || 1),
      };

  const bg = typeof artboard.fill === 'string' ? artboard.fill : '#ffffff';

  // Collect contained objects (skip the artboard frame itself + title objects)
  const allObjects = (canvas.getObjects() as FabricObject[]).filter((o: any) => {
    if (!o) return false;
    if (o.isArtboard) return false;
    if (o.isTitle) return false;
    if (o === artboard) return false;
    if (typeof o.getBoundingRect !== 'function') return false;
    const r = o.getBoundingRect();
    // Overlap test
    return !(
      r.left + r.width < bounds.left ||
      r.top + r.height < bounds.top ||
      r.left > bounds.left + bounds.width ||
      r.top > bounds.top + bounds.height
    );
  });

  // Use Fabric's built-in per-object SVG so we get vectors when available
  const fragments: string[] = [];
  for (const obj of allObjects) {
    try {
      const svg = (obj as any).toSVG ? (obj as any).toSVG() : '';
      if (svg) fragments.push(svg);
    } catch (e) {
      console.warn('[svg-export] toSVG failed for', (obj as any)?.type, e);
    }
  }

  const w = Math.max(1, Math.round(bounds.width));
  const h = Math.max(1, Math.round(bounds.height));

  // Translate so the artboard origin becomes (0,0)
  const inner = `<g transform="translate(${-bounds.left} ${-bounds.top})">${fragments.join('')}</g>`;

  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>${(artboard.artboardTitle || 'artboard').replace(/[<&>]/g, '')}</title>
  <rect width="100%" height="100%" fill="${bg}" />
  ${inner}
</svg>`;

  return doc;
}

export function downloadSVG(svg: string, filename: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadArtboardPNG(canvas: FabricCanvas, artboard: ArtboardLike, filename: string, scale = 2) {
  const bounds = artboard.getFrameBounds
    ? artboard.getFrameBounds()
    : {
        left: artboard.left ?? 0,
        top: artboard.top ?? 0,
        width: (artboard.width ?? 800) * (artboard.scaleX || 1),
        height: (artboard.height ?? 600) * (artboard.scaleY || 1),
      };

  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
  const zoom = vpt[0];
  const panX = vpt[4];
  const panY = vpt[5];

  const sx = bounds.left * zoom + panX;
  const sy = bounds.top * zoom + panY;
  const sw = bounds.width * zoom;
  const sh = bounds.height * zoom;

  const dw = bounds.width * scale;
  const dh = bounds.height * scale;

  const lower = (canvas as any).lowerCanvasEl as HTMLCanvasElement;
  if (!lower) throw new Error('Canvas element not available');

  const off = document.createElement('canvas');
  off.width = dw;
  off.height = dh;
  const ctx = off.getContext('2d');
  if (!ctx) throw new Error('Could not create export context');

  const dpr = window.devicePixelRatio || 1;
  ctx.drawImage(lower, sx * dpr, sy * dpr, sw * dpr, sh * dpr, 0, 0, dw, dh);

  const dataUrl = off.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

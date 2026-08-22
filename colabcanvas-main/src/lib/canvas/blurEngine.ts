/**
 * Figma-level Blur Engine
 * Supports: Layer Blur (shapes + images), Background Blur, Progressive Blur
 */

import { FabricObject, Canvas as FabricCanvas } from 'fabric';

export type BlurMode = 'layer' | 'background' | 'progressive';

export interface BlurConfig {
  mode: BlurMode;
  amount: number; // 0-100
  /** Progressive blur: angle in degrees (0 = left→right, 90 = top→bottom) */
  angle?: number;
}

// Store original _render so we can restore it
const originalRenderMap = new WeakMap<FabricObject, Function>();

/**
 * Apply layer blur to any Fabric object (shapes + images)
 * Uses Canvas2D ctx.filter for GPU-accelerated blur
 */
export function applyLayerBlur(obj: FabricObject, amount: number) {
  if (amount <= 0) {
    removeLayerBlur(obj);
    return;
  }

  // Store blur config on the object for persistence
  (obj as any).__blurConfig = { mode: 'layer', amount };

  // For images, use Fabric's built-in filter (already handled in PropertiesPanel)
  if (obj.type === 'image') return;

  // For shapes: override _render to apply ctx.filter
  if (!originalRenderMap.has(obj)) {
    originalRenderMap.set(obj, obj._render.bind(obj));
  }

  const originalRender = originalRenderMap.get(obj)!;
  const blurPx = (amount / 200) * 80; // Map 0-200 to 0-80px

  obj._render = function (ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.filter = `blur(${blurPx}px)`;
    originalRender(ctx);
    ctx.restore();
  };

  obj.dirty = true;
  obj.canvas?.requestRenderAll();
}

/**
 * Remove layer blur from object, restoring original render
 */
export function removeLayerBlur(obj: FabricObject) {
  const original = originalRenderMap.get(obj);
  if (original) {
    obj._render = original as any;
    originalRenderMap.delete(obj);
  }
  delete (obj as any).__blurConfig;
  obj.dirty = true;
  obj.canvas?.requestRenderAll();
}

/**
 * Apply background blur — blurs content behind the object
 * Implemented via after:render hook
 */
export function applyBackgroundBlur(obj: FabricObject, amount: number) {
  if (amount <= 0) {
    delete (obj as any).__backgroundBlur;
    obj.dirty = true;
    obj.canvas?.requestRenderAll();
    return;
  }
  (obj as any).__backgroundBlur = amount;
  obj.dirty = true;
  obj.canvas?.requestRenderAll();
}

/**
 * Apply progressive (gradient/linear) blur
 * Uses multiple render passes with varying blur and alpha masks
 */
export function applyProgressiveBlur(obj: FabricObject, amount: number, angle: number = 0) {
  if (amount <= 0) {
    removeProgressiveBlur(obj);
    return;
  }

  (obj as any).__progressiveBlur = { amount, angle };

  if (!originalRenderMap.has(obj)) {
    originalRenderMap.set(obj, obj._render.bind(obj));
  }

  const originalRender = originalRenderMap.get(obj)!;
  const maxBlurPx = (amount / 200) * 80;
  const STEPS = 5;

  obj._render = function (ctx: CanvasRenderingContext2D) {
    const w = obj.width || 100;
    const h = obj.height || 100;
    const rx = (obj as any).rx || 0;
    const ry = (obj as any).ry || 0;
    const angleRad = (angle * Math.PI) / 180;

    for (let i = STEPS; i >= 0; i--) {
      const t = i / STEPS;
      const blurPx = maxBlurPx * t;

      ctx.save();

      // Clip to the step's region, respecting corner radius
      const stepStart = i / STEPS;
      const stepEnd = (i + 1) / STEPS;

      ctx.beginPath();
      if (Math.abs(Math.cos(angleRad)) > Math.abs(Math.sin(angleRad))) {
        const sx = -w / 2 + w * stepStart;
        const ex = -w / 2 + w * stepEnd;
        if ((rx > 0 || ry > 0) && typeof ctx.roundRect === 'function') {
          ctx.roundRect(sx, -h / 2, ex - sx, h, [Math.min(rx, ry)]);
        } else {
          ctx.rect(sx, -h / 2, ex - sx, h);
        }
      } else {
        const sy = -h / 2 + h * stepStart;
        const ey = -h / 2 + h * stepEnd;
        if ((rx > 0 || ry > 0) && typeof ctx.roundRect === 'function') {
          ctx.roundRect(-w / 2, sy, w, ey - sy, [Math.min(rx, ry)]);
        } else {
          ctx.rect(-w / 2, sy, w, ey - sy);
        }
      }
      ctx.clip();

      if (blurPx > 0.5) {
        ctx.filter = `blur(${blurPx}px)`;
      } else {
        ctx.filter = 'none';
      }

      originalRender(ctx);
      ctx.restore();
    }
  };

  obj.dirty = true;
  obj.canvas?.requestRenderAll();
}

export function removeProgressiveBlur(obj: FabricObject) {
  const original = originalRenderMap.get(obj);
  if (original) {
    obj._render = original as any;
    originalRenderMap.delete(obj);
  }
  delete (obj as any).__progressiveBlur;
  obj.dirty = true;
  obj.canvas?.requestRenderAll();
}

/**
 * Render background blur for all objects that have it enabled.
 * Call this from an after:render handler on the canvas.
 */
export function renderBackgroundBlurs(canvas: FabricCanvas, ctx: CanvasRenderingContext2D) {
  const objects = canvas.getObjects();
  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
  const retina = canvas.getRetinaScaling();

  for (const obj of objects) {
    const bgBlur = (obj as any).__backgroundBlur;
    if (!bgBlur || bgBlur <= 0) continue;

    const blurPx = (bgBlur / 200) * 80;
    const coords = (obj as any).aCoords;
    if (!coords) continue;

    // Get bounding box in screen space
    const toScreen = (p: any) => ({
      x: (vpt[0] * p.x + vpt[2] * p.y + vpt[4]) * retina,
      y: (vpt[1] * p.x + vpt[3] * p.y + vpt[5]) * retina,
    });

    const tl = toScreen(coords.tl);
    const tr = toScreen(coords.tr);
    const br = toScreen(coords.br);
    const bl = toScreen(coords.bl);

    // Calculate bounding rect
    const minX = Math.min(tl.x, tr.x, br.x, bl.x);
    const minY = Math.min(tl.y, tr.y, br.y, bl.y);
    const maxX = Math.max(tl.x, tr.x, br.x, bl.x);
    const maxY = Math.max(tl.y, tr.y, br.y, bl.y);
    const w = maxX - minX;
    const h = maxY - minY;

    if (w <= 0 || h <= 0) continue;

    // Capture the region behind the object
    const sourceCanvas = ctx.canvas;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.ceil(w);
    tempCanvas.height = Math.ceil(h);
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) continue;

    // Copy the region from the main canvas
    tempCtx.drawImage(
      sourceCanvas,
      Math.floor(minX), Math.floor(minY), Math.ceil(w), Math.ceil(h),
      0, 0, Math.ceil(w), Math.ceil(h)
    );

    // Apply blur
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = tempCanvas.width;
    blurCanvas.height = tempCanvas.height;
    const blurCtx = blurCanvas.getContext('2d');
    if (!blurCtx) continue;

    blurCtx.filter = `blur(${blurPx}px)`;
    blurCtx.drawImage(tempCanvas, 0, 0);

    // Draw blurred region back, clipped to object shape
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Clip to object shape (respecting corner radius)
    const rx = (obj as any).rx || 0;
    const ry = (obj as any).ry || 0;
    const scaleX = obj.scaleX || 1;
    const scaleY = obj.scaleY || 1;
    ctx.beginPath();
    if ((rx > 0 || ry > 0) && typeof ctx.roundRect === 'function') {
      const scaledRx = rx * scaleX * retina;
      const scaledRy = ry * scaleY * retina;
      ctx.roundRect(minX, minY, w, h, [Math.min(scaledRx, scaledRy)]);
    } else {
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
    }
    ctx.closePath();
    ctx.clip();

    // Draw blurred content
    ctx.drawImage(blurCanvas, Math.floor(minX), Math.floor(minY));

    ctx.restore();
  }
}

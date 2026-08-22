import { Canvas as FabricCanvas, Rect, Line } from 'fabric';
import { FrameContainer } from './FrameContainer';
import { applyFrameClip } from './frameReparenting';

export type LayoutDirection = 'horizontal' | 'vertical' | 'wrap';
export type LayoutAlign = 'start' | 'center' | 'end';

export interface AutoLayoutConfig {
  enabled: boolean;
  direction: LayoutDirection;
  gap: number;
  padding: number;
  align: LayoutAlign;
}

export const DEFAULT_AUTO_LAYOUT: AutoLayoutConfig = {
  enabled: false,
  direction: 'vertical',
  gap: 16,
  padding: 24,
  align: 'start',
};

// ── Drop guide state ────────────────────────────────────────────
let _dropGuideLine: any = null;

function getFrameChildren(canvas: FabricCanvas, frameId: string): any[] {
  return canvas.getObjects().filter(
    (o: any) => o.parentFrameId === frameId && !o.isArtboard && !o.isTitle && !o.isArtboardImage && !o._isAutoLayoutGuide
  );
}

function sortByPosition(children: any[], direction: LayoutDirection): any[] {
  return [...children].sort((a, b) => {
    if (direction === 'horizontal' || direction === 'wrap') {
      const dy = (a.top ?? 0) - (b.top ?? 0);
      // For wrap: sort by row first (top), then by column (left)
      if (direction === 'wrap' && Math.abs(dy) > 5) return dy;
      const dx = (a.left ?? 0) - (b.left ?? 0);
      return dx !== 0 ? dx : dy;
    }
    const dy = (a.top ?? 0) - (b.top ?? 0);
    return dy !== 0 ? dy : (a.left ?? 0) - (b.left ?? 0);
  });
}

function getObjSize(obj: any): { w: number; h: number } {
  return {
    w: (obj.width ?? 0) * (obj.scaleX ?? 1),
    h: (obj.height ?? 0) * (obj.scaleY ?? 1),
  };
}

/**
 * Apply auto layout to frame children. Supports horizontal, vertical, and wrap modes.
 */
export function applyAutoLayout(canvas: FabricCanvas, frame: FrameContainer): void {
  const config = frame.autoLayoutConfig;
  if (!config?.enabled) return;

  const { direction, gap, padding, align } = config;
  const bounds = frame.getFrameBounds();
  const children = sortByPosition(getFrameChildren(canvas, frame.artboardId), direction);

  if (children.length === 0) return;

  if (direction === 'wrap') {
    // ── Wrap/Grid: horizontal flow with row wrapping ──
    const maxWidth = bounds.width - padding * 2;
    let cursorX = bounds.left + padding;
    let cursorY = bounds.top + padding;
    let rowHeight = 0;

    for (const child of children) {
      const size = getObjSize(child);

      // Wrap to next row if exceeds width (unless first item in row)
      if (cursorX > bounds.left + padding && cursorX + size.w > bounds.left + padding + maxWidth) {
        cursorX = bounds.left + padding;
        cursorY += rowHeight + gap;
        rowHeight = 0;
      }

      child.set({ left: cursorX, top: cursorY });
      child.setCoords();
      cursorX += size.w + gap;
      rowHeight = Math.max(rowHeight, size.h);
    }

    // Auto-expand frame height
    const neededHeight = (cursorY + rowHeight + padding) - bounds.top;
    if (neededHeight > bounds.height) {
      frame.set({ height: neededHeight / (frame.scaleY || 1) });
      frame.setCoords();
    }

  } else if (direction === 'horizontal') {
    // ── Horizontal: single row, expand width ──
    let cursorX = bounds.left + padding;
    let maxChildH = 0;

    for (const child of children) {
      const size = getObjSize(child);
      maxChildH = Math.max(maxChildH, size.h);
    }

    for (const child of children) {
      const size = getObjSize(child);
      let yPos = bounds.top + padding;
      if (align === 'center') {
        yPos = bounds.top + padding + (maxChildH - size.h) / 2;
      } else if (align === 'end') {
        yPos = bounds.top + padding + maxChildH - size.h;
      }

      child.set({ left: cursorX, top: yPos });
      child.setCoords();
      cursorX += size.w + gap;
    }

    const neededWidth = cursorX - gap + padding - bounds.left;
    const neededHeight = maxChildH + padding * 2;
    let changed = false;
    if (neededWidth > bounds.width) {
      frame.set({ width: neededWidth / (frame.scaleX || 1) });
      changed = true;
    }
    if (neededHeight > bounds.height) {
      frame.set({ height: neededHeight / (frame.scaleY || 1) });
      changed = true;
    }
    if (changed) frame.setCoords();

  } else {
    // ── Vertical: single column, expand height ──
    let cursorY = bounds.top + padding;
    let maxChildW = 0;

    for (const child of children) {
      const size = getObjSize(child);
      maxChildW = Math.max(maxChildW, size.w);
    }

    for (const child of children) {
      const size = getObjSize(child);
      let xPos = bounds.left + padding;
      if (align === 'center') {
        xPos = bounds.left + (bounds.width - size.w) / 2;
      } else if (align === 'end') {
        xPos = bounds.left + bounds.width - padding - size.w;
      }

      child.set({ left: xPos, top: cursorY });
      child.setCoords();
      cursorY += size.h + gap;
    }

    const neededHeight = cursorY - gap + padding - bounds.top;
    const neededWidth = maxChildW + padding * 2;
    let changed = false;
    if (neededHeight > bounds.height) {
      frame.set({ height: neededHeight / (frame.scaleY || 1) });
      changed = true;
    }
    if (neededWidth > bounds.width && align === 'start') {
      frame.set({ width: neededWidth / (frame.scaleX || 1) });
      changed = true;
    }
    if (changed) frame.setCoords();
  }

  // Refresh all clipPaths after potential resize
  for (const child of children) {
    applyFrameClip(child, frame);
  }

  canvas.requestRenderAll();
}

/**
 * Trigger auto-layout if the frame has it enabled.
 */
export function triggerAutoLayoutIfEnabled(canvas: FabricCanvas, frame: FrameContainer): void {
  if (frame.autoLayoutConfig?.enabled) {
    applyAutoLayout(canvas, frame);
  }
}

// ── Visual drop guide ────────────────────────────────────────────

/**
 * Find the insertion index and position for a drop guide line.
 * Returns item-sized guide coordinates.
 */
export function computeDropGuidePosition(
  canvas: FabricCanvas,
  frame: FrameContainer,
  pointerX: number,
  pointerY: number,
  draggedObj?: any
): { x1: number; y1: number; x2: number; y2: number } | null {
  const config = frame.autoLayoutConfig;
  if (!config?.enabled) return null;

  const { direction, padding } = config;
  const bounds = frame.getFrameBounds();
  const children = sortByPosition(
    getFrameChildren(canvas, frame.artboardId).filter(c => c !== draggedObj),
    direction
  );

  // Get a representative child height/width for guide sizing
  const draggedSize = draggedObj ? getObjSize(draggedObj) : null;
  const avgChildH = draggedSize?.h ?? (children.length > 0 ? Math.max(...children.map(c => getObjSize(c).h)) : 40);
  const avgChildW = draggedSize?.w ?? (children.length > 0 ? Math.max(...children.map(c => getObjSize(c).w)) : 40);

  if (direction === 'horizontal' || direction === 'wrap') {
    // Find insertion position along X axis
    let insertX = bounds.left + padding;
    let nearestY = bounds.top + padding;
    for (const child of children) {
      const size = getObjSize(child);
      const midX = (child.left ?? 0) + size.w / 2;
      if (pointerX > midX) {
        insertX = (child.left ?? 0) + size.w + config.gap / 2;
        nearestY = child.top ?? nearestY;
      } else {
        nearestY = child.top ?? nearestY;
        break;
      }
    }
    // Draw vertical blue line sized to child height
    return {
      x1: insertX - config.gap / 2,
      y1: nearestY,
      x2: insertX - config.gap / 2,
      y2: nearestY + avgChildH,
    };
  } else {
    // Find insertion position along Y axis
    let insertY = bounds.top + padding;
    let nearestX = bounds.left + padding;
    for (const child of children) {
      const size = getObjSize(child);
      const midY = (child.top ?? 0) + size.h / 2;
      if (pointerY > midY) {
        insertY = (child.top ?? 0) + size.h + config.gap / 2;
        nearestX = child.left ?? nearestX;
      } else {
        nearestX = child.left ?? nearestX;
        break;
      }
    }
    // Draw horizontal blue line sized to child width
    return {
      x1: nearestX,
      y1: insertY - config.gap / 2,
      x2: nearestX + avgChildW,
      y2: insertY - config.gap / 2,
    };
  }
}

/**
 * Show a blue drop-guide line on the canvas.
 */
export function showDropGuide(canvas: FabricCanvas, coords: { x1: number; y1: number; x2: number; y2: number }): void {
  removeDropGuide(canvas);
  
  const line = new Line([coords.x1, coords.y1, coords.x2, coords.y2], {
    stroke: '#3B82F6',
    strokeWidth: 4,
    strokeDashArray: undefined,
    selectable: false,
    evented: false,
    excludeFromExport: true,
    originX: 'left',
    originY: 'top',
  });
  (line as any)._isAutoLayoutGuide = true;
  canvas.add(line);
  _dropGuideLine = line;
  canvas.requestRenderAll();
}

/**
 * Remove the drop-guide line from the canvas.
 */
export function removeDropGuide(canvas: FabricCanvas): void {
  if (_dropGuideLine) {
    try {
      canvas.remove(_dropGuideLine);
    } catch {}
    _dropGuideLine = null;
  }
  // Also clean up any stale guides
  const stale = canvas.getObjects().filter((o: any) => o._isAutoLayoutGuide);
  for (const s of stale) {
    try { canvas.remove(s); } catch {}
  }
}

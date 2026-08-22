import { Canvas as FabricCanvas, Rect, util } from 'fabric';
import { FrameContainer } from './FrameContainer';
import { triggerAutoLayoutIfEnabled, computeDropGuidePosition, showDropGuide, removeDropGuide } from './autoLayout';

/**
 * Frame Reparenting System v3
 * 
 * Architecture: Objects stay as TOP-LEVEL canvas objects. Frame membership
 * is tracked via `parentFrameId` property on each object. Clipping is applied
 * via clipPath on individual objects based on their parent frame's bounds.
 * 
 * During drag: only highlight the target frame (visual feedback).
 * On drop (object:modified): reparent + apply/remove clipPath.
 * This eliminates the expensive add/remove-from-group during every mouse move.
 */

// ── Drag-session state ─────────────────────────────────────────────
let _highlightedFrame: FrameContainer | null = null;
let _isDragging = false;

// ── Helpers ────────────────────────────────────────────────────────

export function getAllFrames(canvas: FabricCanvas): FrameContainer[] {
  return canvas.getObjects().filter(
    (o: any) => o.isArtboard && o instanceof FrameContainer
  ) as FrameContainer[];
}

function findFrameAtPoint(
  frames: FrameContainer[],
  px: number,
  py: number,
  exclude?: any
): FrameContainer | null {
  for (let i = frames.length - 1; i >= 0; i--) {
    const frame = frames[i];
    if (frame === exclude) continue;
    if (frame.containsWorldPoint(px, py)) return frame;
  }
  return null;
}

function getWorldCenter(obj: any): { x: number; y: number } {
  const center = obj.getCenterPoint();
  return { x: center.x, y: center.y };
}

function isPointInsideBounds(
  px: number,
  py: number,
  bounds: { left: number; top: number; width: number; height: number } | null
): boolean {
  if (!bounds) return false;
  return (
    px >= bounds.left &&
    px <= bounds.left + bounds.width &&
    py >= bounds.top &&
    py <= bounds.top + bounds.height
  );
}

function getObjectWorldBounds(obj: any): {
  left: number;
  top: number;
  width: number;
  height: number;
} | null {
  if (!obj) return null;

  if (typeof obj.getBoundingRect === 'function') {
    const rect = obj.getBoundingRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  return {
    left: obj.left ?? 0,
    top: obj.top ?? 0,
    width: (obj.width ?? 0) * (obj.scaleX ?? 1),
    height: (obj.height ?? 0) * (obj.scaleY ?? 1),
  };
}

function shouldTreatAsFrameBackgroundClick(
  frame: FrameContainer,
  target: any,
  pointer: { x: number; y: number }
): boolean {
  if (!target || (target as any).isArtboard || (target as any).isTitle) return false;
  if ((target as any).parentFrameId !== frame.artboardId) return false;

  const targetBounds = getObjectWorldBounds(target);
  if (targetBounds && !isPointInsideBounds(pointer.x, pointer.y, targetBounds)) {
    return true;
  }

  const clipBounds = getObjectWorldBounds(target.clipPath);
  if (clipBounds && !isPointInsideBounds(pointer.x, pointer.y, clipBounds)) {
    return true;
  }

  return false;
}

// ── Clip path management ───────────────────────────────────────────

/**
 * Apply a clipPath to an object based on its parent frame's bounds.
 * The clipPath is a Rect matching the frame's world-space bounding box.
 */
export function applyFrameClip(obj: any, frame: FrameContainer): void {
  const bounds = frame.getFrameBounds();
  
  // Create clip rect in absolute (world) coordinates
  const clipRect = new Rect({
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
    rx: (frame as any).rx || 0,
    ry: (frame as any).ry || 0,
    absolutePositioned: true,
  });
  
  obj.clipPath = clipRect;
  obj.parentFrameId = frame.artboardId;
  obj.dirty = true;
}

/**
 * Remove clipPath from an object (exiting a frame).
 */
export function removeFrameClip(obj: any): void {
  obj.clipPath = null;
  obj.parentFrameId = null;
  obj.dirty = true;
}

/**
 * Refresh clipPaths for all objects that belong to a frame.
 * Call after a frame moves or resizes.
 */
export function refreshFrameClips(canvas: FabricCanvas, frame: FrameContainer): void {
  const frameId = frame.artboardId;
  const objects = canvas.getObjects();
  for (const obj of objects) {
    if ((obj as any).parentFrameId === frameId && !(obj as any).isArtboard) {
      applyFrameClip(obj, frame);
    }
  }
}

// ── Highlight ──────────────────────────────────────────────────────

function setHighlightFrame(
  canvas: FabricCanvas,
  frame: FrameContainer | null
): void {
  if (_highlightedFrame === frame) return;
  if (_highlightedFrame) _highlightedFrame.setHighlight(false);
  if (frame) frame.setHighlight(true);
  _highlightedFrame = frame;
  canvas.requestRenderAll();
}

// ── Drag handler (lightweight — only highlights) ───────────────────

function handleObjectMoving(canvas: FabricCanvas, obj: any): void {
  if (obj.isTitle) return;

  // ── Frame is being dragged → move children + artboard images with it ──
  if (obj.isArtboard && obj instanceof FrameContainer) {
    const frame = obj as FrameContainer;
    const curX = frame.left ?? 0;
    const curY = frame.top ?? 0;

    if (!(frame as any)._lastMovePos) {
      (frame as any)._lastMovePos = { x: curX, y: curY };
      return; // first event — just record, no delta yet
    }

    const dx = curX - (frame as any)._lastMovePos.x;
    const dy = curY - (frame as any)._lastMovePos.y;
    (frame as any)._lastMovePos = { x: curX, y: curY };

    if (dx === 0 && dy === 0) return;

    const frameId = frame.artboardId;
    for (const child of canvas.getObjects()) {
      // Move children with matching parentFrameId
      if ((child as any).parentFrameId === frameId && !(child as any).isArtboard) {
        child.set({ left: (child.left ?? 0) + dx, top: (child.top ?? 0) + dy });
        // Also translate the clipPath so content stays visually clipped during drag
        if (child.clipPath && (child.clipPath as any).absolutePositioned) {
          child.clipPath.set({
            left: ((child.clipPath as any).left ?? 0) + dx,
            top: ((child.clipPath as any).top ?? 0) + dy,
          });
        }
        child.setCoords();
      }
      // Move artboard images tagged with this frame
      if ((child as any).isArtboardImage && (child as any).artboardId === frameId) {
        child.set({ left: (child.left ?? 0) + dx, top: (child.top ?? 0) + dy });
        child.setCoords();
      }
    }
    return;
  }

  // ── Regular object being dragged → highlight target frame + show drop guide ──
  _isDragging = true;
  const center = getWorldCenter(obj);
  const frames = getAllFrames(canvas);
  const targetFrame = findFrameAtPoint(frames, center.x, center.y, obj);
  setHighlightFrame(canvas, targetFrame || null);

  // Show auto-layout drop guide
  if (targetFrame && targetFrame.autoLayoutConfig?.enabled) {
    const guideCoords = computeDropGuidePosition(canvas, targetFrame, center.x, center.y, obj);
    if (guideCoords) {
      showDropGuide(canvas, guideCoords);
    }
  } else {
    removeDropGuide(canvas);
  }
}

// ── Drop handler (reparent on release) ─────────────────────────────

function handleObjectDrop(canvas: FabricCanvas, obj: any): void {
  // Always clear highlight, drop guide, and drag state
  setHighlightFrame(canvas, null);
  removeDropGuide(canvas);
  _isDragging = false;

  if (obj.isArtboard || obj.isTitle) {
    // Clear delta tracker
    if (obj instanceof FrameContainer) {
      (obj as any)._lastMovePos = null;
      const frame = obj as FrameContainer;
      const oldW = frame.width || 0;
      const oldH = frame.height || 0;
      const sx = frame.scaleX || 1;
      const sy = frame.scaleY || 1;
      
      // Proportionally scale children before normalizing frame dimensions
      if (sx !== 1 || sy !== 1) {
        const children = canvas.getObjects().filter(
          (o: any) => (o as any).parentFrameId === frame.artboardId && !(o as any).isArtboard
        );
        for (const child of children) {
          const frameBounds = frame.getFrameBounds();
          const relX = ((child.left || 0) - frameBounds.left) / (oldW * (sx === 1 ? 1 : 1));
          const relY = ((child.top || 0) - frameBounds.top) / (oldH * (sy === 1 ? 1 : 1));
          child.set({
            left: frameBounds.left + relX * oldW * sx,
            top: frameBounds.top + relY * oldH * sy,
            scaleX: (child.scaleX || 1) * sx,
            scaleY: (child.scaleY || 1) * sy,
          });
          child.setCoords();
        }
      }
      
      frame.applyResize();
      refreshFrameClips(canvas, frame);
    }
    return;
  }

  try {
    const center = getWorldCenter(obj);
    const frames = getAllFrames(canvas);
    const targetFrame = findFrameAtPoint(frames, center.x, center.y, obj);
    const currentParentId = (obj as any).parentFrameId;

    if (targetFrame) {
      const targetId = targetFrame.artboardId;
      if (currentParentId !== targetId) {
        // If leaving an old frame with auto-layout, trigger re-layout
        if (currentParentId) {
          const oldFrame = frames.find(f => f.artboardId === currentParentId);
          if (oldFrame) triggerAutoLayoutIfEnabled(canvas, oldFrame);
        }
        // Enter new frame (or switch frames)
        applyFrameClip(obj, targetFrame);
        canvas.requestRenderAll();
      }
      // Trigger auto-layout on the target frame
      triggerAutoLayoutIfEnabled(canvas, targetFrame);
    } else if (currentParentId) {
      // Exit frame → remove clip
      removeFrameClip(obj);
      // Trigger re-layout on the frame we left
      const oldFrame = frames.find(f => f.artboardId === currentParentId);
      if (oldFrame) triggerAutoLayoutIfEnabled(canvas, oldFrame);
      canvas.requestRenderAll();
    }
  } catch (err) {
    console.error('Frame reparenting failed:', err);
  }
}

// ── Post-load reparenting ──────────────────────────────────────────

/**
 * Post-load: scan standalone objects and assign them to overlapping frames
 * using the new metadata + clipPath model (no group nesting).
 */
export function reparentObjectsIntoFrames(canvas: FabricCanvas): void {
  const frames = getAllFrames(canvas);
  if (frames.length === 0) return;

  let reparented = 0;
  const objects = canvas.getObjects();

  for (const obj of objects) {
    if ((obj as any).isArtboard || (obj as any).isTitle || obj instanceof FrameContainer) continue;
    // Skip if already has a valid parent
    if ((obj as any).parentFrameId) {
      // Verify parent still exists and refresh clip
      const parentFrame = frames.find(f => f.artboardId === (obj as any).parentFrameId);
      if (parentFrame) {
        applyFrameClip(obj, parentFrame);
        continue;
      } else {
        // Parent frame gone — remove stale reference
        removeFrameClip(obj);
      }
    }

    const center = obj.getCenterPoint();
    const targetFrame = findFrameAtPoint(frames, center.x, center.y, obj);
    if (targetFrame) {
      applyFrameClip(obj, targetFrame);
      reparented++;
    }
  }

  if (reparented > 0) {
    canvas.requestRenderAll();
  }
}

/**
 * Get all canvasObjectIds that are assigned to frames via parentFrameId.
 */
export function getFrameChildIds(canvas: FabricCanvas): Set<string> {
  const ids = new Set<string>();
  for (const obj of canvas.getObjects()) {
    const parentId = (obj as any).parentFrameId;
    if (parentId) {
      const id = (obj as any).canvasObjectId || (obj as any).databaseUUID;
      if (id) ids.add(id);
    }
  }
  return ids;
}

/**
 * Collect ALL saveable objects. Objects are already top-level,
 * so no coordinate conversion is needed (unlike the old group-based model).
 */
export function collectAllSaveableObjects(canvas: FabricCanvas): any[] {
  const result: any[] = [];
  for (const obj of canvas.getObjects()) {
    if ((obj as any).isTitle) continue;
    if ((obj as any).isArtboard) continue; // frames are saved separately via artboards table
    result.push(obj);
  }
  return result;
}

// ── Click-through for clipped objects ──────────────────────────────

/**
 * If the user clicks a clipped child object but the click point falls
 * outside the clip bounds (i.e. the invisible/clipped-out area),
 * select the parent frame instead.
 */
function handleMouseDownBefore(canvas: FabricCanvas, e: any): void {
  if (!e?.e) return;

  const pointer = canvas.getScenePoint(e.e);
  const frames = getAllFrames(canvas);
  const parentFrame = findFrameAtPoint(frames, pointer.x, pointer.y);
  if (!parentFrame) return;

  const temporarilyDisabled: Array<{ target: any; evented: boolean; selectable: boolean }> = [];
  let target = canvas.findTarget(e.e);

  while (target && shouldTreatAsFrameBackgroundClick(parentFrame, target, pointer)) {
    temporarilyDisabled.push({
      target,
      evented: !!target.evented,
      selectable: !!target.selectable,
    });

    target.evented = false;
    target.selectable = false;
    target = canvas.findTarget(e.e);
  }

  if (temporarilyDisabled.length === 0) return;

  setTimeout(() => {
    for (const item of temporarilyDisabled) {
      item.target.evented = item.evented;
      item.target.selectable = item.selectable;
    }
  }, 0);

  if (!target || target === parentFrame || (target as any).parentFrameId !== parentFrame.artboardId) {
    e.e.preventDefault?.();
    e.e.stopPropagation?.();
    e.e.stopImmediatePropagation?.();
    canvas.discardActiveObject();
    canvas.setActiveObject(parentFrame);
    canvas.requestRenderAll();
  }
}

// ── Install ────────────────────────────────────────────────────────

export function installFrameReparenting(canvas: FabricCanvas): () => void {
  const onMoving = (e: any) => {
    if (e.target) handleObjectMoving(canvas, e.target);
  };

  const onModified = (e: any) => {
    if (e.target) handleObjectDrop(canvas, e.target);
  };

  const onMouseDownBefore = (e: any) => {
    handleMouseDownBefore(canvas, e);
  };

  // Refresh clipPath during scaling so content stays clipped inside artboard
  const onScaling = (e: any) => {
    const obj = e.target;
    if (!obj || !obj.parentFrameId) return;
    const frames = getAllFrames(canvas);
    const frame = frames.find(f => f.artboardId === obj.parentFrameId);
    if (frame) applyFrameClip(obj, frame);
  };

  // Refresh clipPath after text editing changes
  const onTextChanged = (e: any) => {
    const obj = e.target;
    if (!obj || !obj.parentFrameId) return;
    const frames = getAllFrames(canvas);
    const frame = frames.find(f => f.artboardId === obj.parentFrameId);
    if (frame) {
      applyFrameClip(obj, frame);
      triggerAutoLayoutIfEnabled(canvas, frame);
    }
  };

  canvas.on('object:moving', onMoving);
  canvas.on('object:modified', onModified);
  canvas.on('mouse:down:before', onMouseDownBefore);
  canvas.on('object:scaling', onScaling);
  canvas.on('text:changed', onTextChanged);

  return () => {
    canvas.off('object:moving', onMoving);
    canvas.off('object:modified', onModified);
    canvas.off('mouse:down:before', onMouseDownBefore);
    canvas.off('object:scaling', onScaling);
    canvas.off('text:changed', onTextChanged);
    _highlightedFrame = null;
    _isDragging = false;
  };
}

export function isDragInProgress(): boolean {
  return _isDragging;
}

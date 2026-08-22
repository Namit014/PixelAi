/**
 * FlattenEngine — Converts Boolean groups, regular groups, and text objects
 * into single clean SVG path objects on the Fabric.js canvas.
 */

import { Path, Group } from 'fabric';
import { performBooleanOperation, flattenObjectsToPath, type BooleanOperation, type BooleanResult } from './booleanEngine';
import { fabricTextToOutlines, convertTextToGlyphPaths } from './textToOutlines';
import { parseSvgPathToSegments, parseSvgPathToContours } from '@/lib/penTool/pathParser';

export interface BooleanGroupData {
  operation: BooleanOperation;
  originalObjects: any[]; // serialized Fabric objects for undo
}

/**
 * Create a Boolean group from selected objects on the canvas.
 */
export function createBooleanGroup(
  canvas: any,
  objects: any[],
  operation: BooleanOperation,
  onCanvasObjectDelete?: (id: string) => void
): any | null {
  if (objects.length < 2) return null;

  // CRITICAL: Discard active selection FIRST so objects get world-space transforms
  // When objects are inside an activeSelection, calcTransformMatrix() returns
  // transforms relative to the selection group, not world-space coordinates.
  canvas.discardActiveObject();
  canvas.requestRenderAll();

  const result = performBooleanOperation(objects, operation);
  if (!result) return null;

  const resultPath = createFabricPathFromResult(result);
  if (!resultPath) return null;

  // Store boolean metadata for editability
  (resultPath as any).isBooleanResult = true;
  (resultPath as any).booleanOperation = operation;
  (resultPath as any).booleanSourceCount = objects.length;

  // Generate a unique ID
  (resultPath as any).id = `bool_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Remove original objects from canvas
  for (const obj of objects) {
    const objId = (obj as any).id;
    canvas.remove(obj);
    if (objId && onCanvasObjectDelete) {
      onCanvasObjectDelete(objId);
    }
  }

  // Add result
  canvas.add(resultPath);
  canvas.setActiveObject(resultPath);
  canvas.requestRenderAll();

  return resultPath;
}

/**
 * Change the boolean operation on an existing boolean result.
 */
export function changeBooleanOperation(
  canvas: any,
  booleanResult: any,
  newOperation: BooleanOperation,
  originalObjects: any[]
): any | null {
  const result = performBooleanOperation(originalObjects, newOperation);
  if (!result) return null;

  const newPath = createFabricPathFromResult(result);
  if (!newPath) return null;

  // Copy metadata
  (newPath as any).isBooleanResult = true;
  (newPath as any).booleanOperation = newOperation;
  (newPath as any).booleanSourceCount = originalObjects.length;
  (newPath as any).id = (booleanResult as any).id;

  // Replace on canvas
  canvas.remove(booleanResult);
  canvas.add(newPath);
  canvas.setActiveObject(newPath);
  canvas.requestRenderAll();

  return newPath;
}

/**
 * Flatten a group or boolean group into a single path.
 */
export function flattenGroup(
  canvas: any,
  group: any,
  onCanvasObjectDelete?: (id: string) => void
): any | null {
  const objects = group.getObjects?.() || group._objects || [];
  if (objects.length === 0) return null;

  const result = flattenObjectsToPath(objects);
  if (!result) return null;

  const flatPath = createFabricPathFromResult(result);
  if (!flatPath) return null;

  (flatPath as any).id = `flat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Remove group
  const groupId = (group as any).id;
  canvas.discardActiveObject();
  canvas.remove(group);
  if (groupId && onCanvasObjectDelete) {
    onCanvasObjectDelete(groupId);
  }

  canvas.add(flatPath);
  canvas.setActiveObject(flatPath);
  canvas.requestRenderAll();

  return flatPath;
}

/**
 * Flatten (convert to outlines) a text object.
 */
export async function flattenText(
  canvas: any,
  textObj: any,
  onCanvasObjectDelete?: (id: string) => void
): Promise<any | null> {
  const text = textObj.text || '';
  if (!text.trim()) return null;

  // Try per-glyph approach first — each character becomes its own Path
  const glyphPaths = await convertTextToGlyphPaths({
    text,
    fontFamily: textObj.fontFamily || 'Arial',
    fontSize: textObj.fontSize || 16,
    fontWeight: textObj.fontWeight || 'normal',
    fontStyle: textObj.fontStyle || 'normal',
    letterSpacing: (textObj.charSpacing || 0) / 1000 * (textObj.fontSize || 16),
    lineHeight: textObj.lineHeight || 1.2,
    textAlign: textObj.textAlign || 'left',
    width: textObj.width,
  });

  if (glyphPaths && glyphPaths.length > 0) {
    try {
      const fill = textObj.fill || '#000000';
      const stroke = textObj.stroke || '';
      const strokeWidth = textObj.strokeWidth || 0;

      const pathObjects = glyphPaths.map((glyph) => {
        const p = new Path(glyph.pathData, {
          fill,
          stroke: stroke || undefined,
          strokeWidth,
          objectCaching: false,
          strokeUniform: true,
        });
        // Attach penToolData so each glyph path is editable via double-click
        attachPenToolData(p, glyph.pathData, fill, stroke || '', strokeWidth);
        return p;
      });

      const group = new Group(pathObjects, {
        left: textObj.left || 0,
        top: textObj.top || 0,
        opacity: textObj.opacity ?? 1,
        angle: textObj.angle || 0,
        scaleX: textObj.scaleX || 1,
        scaleY: textObj.scaleY || 1,
      });

      (group as any).id = `outline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      (group as any).isTextOutline = true;

      // Remove text object
      const textId = (textObj as any).id;
      canvas.discardActiveObject();
      canvas.remove(textObj);
      if (textId && onCanvasObjectDelete) {
        onCanvasObjectDelete(textId);
      }

      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.requestRenderAll();

      return group;
    } catch (e) {
      console.error('FlattenEngine: Per-glyph approach failed, falling back to compound path', e);
    }
  }

  // Fallback: compound path approach
  const outlineResult = await fabricTextToOutlines(textObj);
  if (!outlineResult) return null;

  try {
    const path = new Path(outlineResult.pathData, {
      left: outlineResult.left,
      top: outlineResult.top,
      fill: outlineResult.fill,
      stroke: outlineResult.stroke,
      strokeWidth: outlineResult.strokeWidth,
      opacity: outlineResult.opacity,
      angle: outlineResult.angle,
      scaleX: outlineResult.scaleX,
      scaleY: outlineResult.scaleY,
      objectCaching: false,
      strokeUniform: true,
    });

    (path as any).id = `outline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    (path as any).isTextOutline = true;

    const textId = (textObj as any).id;
    canvas.discardActiveObject();
    canvas.remove(textObj);
    if (textId && onCanvasObjectDelete) {
      onCanvasObjectDelete(textId);
    }

    canvas.add(path);
    canvas.setActiveObject(path);
    canvas.requestRenderAll();

    return path;
  } catch (e) {
    console.error('FlattenEngine: Failed to create path from text outlines', e);
    return null;
  }
}

/**
 * Auto-detect and flatten any selected object(s).
 * Optionally accepts pre-captured objects to avoid stale selection issues.
 */
export async function flattenSelected(
  canvas: any,
  onCanvasObjectDelete?: (id: string) => void,
  capturedObjects?: any[]
): Promise<boolean> {
  // If pre-captured objects provided, use them directly
  if (capturedObjects && capturedObjects.length > 0) {
    if (capturedObjects.length === 1) {
      const obj = capturedObjects[0];
      if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
        const result = await flattenText(canvas, obj, onCanvasObjectDelete);
        return result !== null;
      }
      if (obj.type === 'group') {
        const result = flattenGroup(canvas, obj, onCanvasObjectDelete);
        return result !== null;
      }
      return false;
    }

    // Multiple objects — discard selection first for world-space transforms
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    
    const result = flattenObjectsToPath(capturedObjects);
    if (!result) return false;

    const flatPath = createFabricPathFromResult(result);
    if (!flatPath) return false;

    (flatPath as any).id = `flat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    for (const obj of capturedObjects) {
      const objId = (obj as any).id;
      canvas.remove(obj);
      if (objId && onCanvasObjectDelete) onCanvasObjectDelete(objId);
    }

    canvas.add(flatPath);
    canvas.setActiveObject(flatPath);
    canvas.requestRenderAll();
    return true;
  }

  // Fallback: use canvas active object
  const active = canvas.getActiveObject();
  if (!active) return false;

  // Text object
  if (active.type === 'i-text' || active.type === 'textbox' || active.type === 'text') {
    const result = await flattenText(canvas, active, onCanvasObjectDelete);
    return result !== null;
  }

  // Group
  if (active.type === 'group') {
    const result = flattenGroup(canvas, active, onCanvasObjectDelete);
    return result !== null;
  }

  // ActiveSelection (multiple selected objects)
  if (active.type === 'activeSelection') {
    const objects = active.getObjects?.() || [];
    if (objects.length < 2) return false;
    
    // Discard selection FIRST so objects have world-space transforms
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    
    const result = flattenObjectsToPath(objects);
    if (!result) return false;

    const flatPath = createFabricPathFromResult(result);
    if (!flatPath) return false;

    (flatPath as any).id = `flat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    for (const obj of objects) {
      const objId = (obj as any).id;
      canvas.remove(obj);
      if (objId && onCanvasObjectDelete) onCanvasObjectDelete(objId);
    }

    canvas.add(flatPath);
    canvas.setActiveObject(flatPath);
    canvas.requestRenderAll();
    return true;
  }

  return false;
}

/**
 * Create a Fabric.js Path from a BooleanResult.
 * Clears penToolData to prevent pen tool editing of computed geometry.
 */
function createFabricPathFromResult(result: BooleanResult): any | null {
  try {
    const path = new Path(result.pathData, {
      fill: result.fill,
      stroke: result.stroke || undefined,
      strokeWidth: result.strokeWidth,
      opacity: result.opacity,
      objectCaching: false,
      strokeUniform: true,
    });

    // Generate penToolData so double-click editing works
    attachPenToolData(path, result.pathData, result.fill, result.stroke, result.strokeWidth);

    return path;
  } catch (e) {
    console.error('FlattenEngine: Failed to create Fabric Path', e);
    return null;
  }
}

/**
 * Attach penToolData to a Fabric Path so it can be edited via double-click.
 */
function attachPenToolData(
  fabricPath: any,
  pathData: string,
  fill: string,
  stroke: string,
  strokeWidth: number
): void {
  try {
    const { contours } = parseSvgPathToContours(pathData);
    if (contours.length === 0) return;

    // Compute shared bounding box across all contours
    let minX = Infinity, minY = Infinity;
    for (const contour of contours) {
      for (const seg of contour.segments) {
        if (seg.anchor.x < minX) minX = seg.anchor.x;
        if (seg.anchor.y < minY) minY = seg.anchor.y;
        if (seg.handleIn) { if (seg.handleIn.x < minX) minX = seg.handleIn.x; if (seg.handleIn.y < minY) minY = seg.handleIn.y; }
        if (seg.handleOut) { if (seg.handleOut.x < minX) minX = seg.handleOut.x; if (seg.handleOut.y < minY) minY = seg.handleOut.y; }
      }
    }
    if (!isFinite(minX)) minX = 0;
    if (!isFinite(minY)) minY = 0;

    const normalizeContour = (contour: { segments: any[]; closed: boolean }) => ({
      segments: contour.segments.map(s => ({
        ...s,
        anchor: { x: s.anchor.x - minX, y: s.anchor.y - minY },
        handleIn: s.handleIn ? { x: s.handleIn.x - minX, y: s.handleIn.y - minY } : null,
        handleOut: s.handleOut ? { x: s.handleOut.x - minX, y: s.handleOut.y - minY } : null,
      })),
      closed: contour.closed,
    });

    const normalizedContours = contours.map(normalizeContour);
    const primaryContour = normalizedContours[0];

    fabricPath.penToolData = {
      segments: primaryContour.segments,
      closed: primaryContour.closed,
      contours: normalizedContours,
      strokeColor: stroke || '#000000',
      fillColor: fill || 'transparent',
      strokeWidth: strokeWidth || 2,
      originalLeft: 0,
      originalTop: 0,
      pathOffset: { x: 0, y: 0 },
    };
  } catch (e) {
    console.warn('FlattenEngine: Failed to generate penToolData', e);
  }
}

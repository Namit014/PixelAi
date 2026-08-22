/**
 * BooleanEngine — Production-grade SVG path boolean operations.
 * Uses Paper.js as a headless geometry engine for Union, Subtract, Intersect, Exclude.
 * Converts between Fabric.js paths and Paper.js paths, performs boolean ops, returns clean SVG path data.
 */

import paper from 'paper';

// Initialize Paper.js headlessly (no canvas rendering)
let paperInitialized = false;
function ensurePaperSetup() {
  if (!paperInitialized) {
    paper.setup(new paper.Size(1, 1));
    paperInitialized = true;
  }
}

export type BooleanOperation = 'union' | 'subtract' | 'intersect' | 'exclude';

export interface BooleanResult {
  pathData: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

/**
 * Extract absolute SVG path data from a Fabric object by applying all transforms.
 * This ensures boolean operations work in world-space coordinates.
 */
function fabricObjectToAbsolutePathData(obj: any): string | null {
  if (!obj) return null;

  let pathData: string | null = null;

  // CRITICAL: Fabric.js v6 defaults to originX/originY = 'center'.
  // calcTransformMatrix() transforms around the object's center.
  // So local path geometry MUST be centered at (0,0) for correct world-space positioning.

  if (obj.type === 'path' && obj.path) {
    // Fabric path arrays are in local coords relative to pathOffset.
    // We need to shift them so they're centered at (0,0).
    const rawPath = fabricPathArrayToString(obj.path);
    const pathOffsetX = obj.pathOffset?.x || 0;
    const pathOffsetY = obj.pathOffset?.y || 0;
    if (pathOffsetX !== 0 || pathOffsetY !== 0) {
      // Shift path data by -pathOffset to center at origin
      ensurePaperSetup();
      try {
        const p = new paper.CompoundPath(rawPath);
        p.translate(new paper.Point(-pathOffsetX, -pathOffsetY));
        pathData = p.pathData;
        p.remove();
      } catch {
        pathData = rawPath;
      }
    } else {
      pathData = rawPath;
    }
  } else if (obj.type === 'rect') {
    const w = obj.width || 0;
    const h = obj.height || 0;
    const hw = w / 2;
    const hh = h / 2;
    const rx = obj.rx || 0;
    const ry = obj.ry || 0;
    if (rx > 0 || ry > 0) {
      pathData = `M${-hw + rx},${-hh} L${hw - rx},${-hh} Q${hw},${-hh} ${hw},${-hh + ry} L${hw},${hh - ry} Q${hw},${hh} ${hw - rx},${hh} L${-hw + rx},${hh} Q${-hw},${hh} ${-hw},${hh - ry} L${-hw},${-hh + ry} Q${-hw},${-hh} ${-hw + rx},${-hh} Z`;
    } else {
      pathData = `M${-hw},${-hh} L${hw},${-hh} L${hw},${hh} L${-hw},${hh} Z`;
    }
  } else if (obj.type === 'circle' || obj.type === 'ellipse') {
    const rx = obj.rx || obj.radius || 0;
    const ry = obj.ry || obj.radius || 0;
    const k = 0.5522847498;
    // Centered at (0,0)
    pathData = `M0,${-ry} C${rx * k},${-ry} ${rx},${-ry * k} ${rx},0 C${rx},${ry * k} ${rx * k},${ry} 0,${ry} C${-rx * k},${ry} ${-rx},${ry * k} ${-rx},0 C${-rx},${-ry * k} ${-rx * k},${-ry} 0,${-ry} Z`;
  } else if (obj.type === 'polygon' || obj.type === 'polyline') {
    const points = obj.points;
    if (points && points.length > 0) {
      // Center the points around (0,0)
      const minX = Math.min(...points.map((p: any) => p.x));
      const maxX = Math.max(...points.map((p: any) => p.x));
      const minY = Math.min(...points.map((p: any) => p.y));
      const maxY = Math.max(...points.map((p: any) => p.y));
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      pathData = `M${points[0].x - cx},${points[0].y - cy}` + points.slice(1).map((p: any) => ` L${p.x - cx},${p.y - cy}`).join('') + ' Z';
    }
  } else if (obj.type === 'group') {
    return null; // Handled separately
  }

  if (!pathData) return null;

  // Apply the object's transform matrix to get world-space coordinates
  const matrix = obj.calcTransformMatrix();
  return applyMatrixToPathData(pathData, matrix);
}

/**
 * Convert Fabric path array format to SVG path string
 */
function fabricPathArrayToString(pathArray: any[]): string {
  return pathArray.map((cmd: any[]) => cmd.join(' ')).join(' ');
}

/**
 * Apply a 2D transform matrix to SVG path data using Paper.js
 */
function applyMatrixToPathData(pathData: string, matrix: number[]): string {
  ensurePaperSetup();
  try {
    const path = new paper.CompoundPath(pathData);
    const paperMatrix = new paper.Matrix(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
    path.transform(paperMatrix);
    const result = path.pathData;
    path.remove();
    return result;
  } catch (e) {
    console.warn('BooleanEngine: Failed to transform path data', e);
    return pathData;
  }
}

/**
 * Convert a Fabric object (or group of objects) to Paper.js path(s)
 */
function fabricToPaper(obj: any): paper.PathItem | null {
  ensurePaperSetup();

  if (obj.type === 'group') {
    // Recursively convert group children and unite them
    const children = (obj.getObjects?.() || obj._objects || []);
    const paperPaths: paper.PathItem[] = [];
    for (const child of children) {
      const pp = fabricToPaper(child);
      if (pp) paperPaths.push(pp);
    }
    if (paperPaths.length === 0) return null;
    if (paperPaths.length === 1) return paperPaths[0];
    // Combine into compound path
    let result = paperPaths[0];
    for (let i = 1; i < paperPaths.length; i++) {
      const united = result.unite(paperPaths[i]);
      result.remove();
      paperPaths[i].remove();
      result = united;
    }
    return result;
  }

  const pathData = fabricObjectToAbsolutePathData(obj);
  if (!pathData) return null;

  try {
    const paperPath = new paper.CompoundPath(pathData);
    return paperPath;
  } catch (e) {
    console.warn('BooleanEngine: Failed to create Paper.js path', e);
    return null;
  }
}

/**
 * Perform a boolean operation on multiple Fabric objects.
 * 
 * @param objects - Array of Fabric objects (paths, rects, circles, etc.)
 * @param operation - The boolean operation to perform
 * @returns BooleanResult with clean SVG path data, or null if operation fails
 */
export function performBooleanOperation(
  objects: any[],
  operation: BooleanOperation
): BooleanResult | null {
  if (objects.length < 2) return null;

  ensurePaperSetup();

  // Convert all objects to Paper.js paths
  const paperPaths: paper.PathItem[] = [];
  for (const obj of objects) {
    const pp = fabricToPaper(obj);
    if (pp) paperPaths.push(pp);
  }

  if (paperPaths.length < 2) {
    paperPaths.forEach(p => p.remove());
    return null;
  }

  // Perform operation sequentially
  let result = paperPaths[0];
  for (let i = 1; i < paperPaths.length; i++) {
    let newResult: paper.PathItem;
    switch (operation) {
      case 'union':
        newResult = result.unite(paperPaths[i]);
        break;
      case 'subtract':
        newResult = result.subtract(paperPaths[i]);
        break;
      case 'intersect':
        newResult = result.intersect(paperPaths[i]);
        break;
      case 'exclude':
        newResult = result.exclude(paperPaths[i]);
        break;
    }
    result.remove();
    paperPaths[i].remove();
    result = newResult;
  }

  const pathData = result.pathData;
  result.remove();

  if (!pathData || pathData.trim() === '') return null;

  // Take visual properties from the first (topmost) object
  const primary = objects[0];

  return {
    pathData,
    fill: primary.fill || '#000000',
    stroke: primary.stroke || '',
    strokeWidth: primary.strokeWidth || 0,
    opacity: primary.opacity ?? 1,
  };
}

/**
 * Flatten a group of objects into a single SVG path.
 * Combines all paths via union.
 */
export function flattenObjectsToPath(objects: any[]): BooleanResult | null {
  if (objects.length === 0) return null;
  if (objects.length === 1) {
    // Single object — just extract its path data
    const pathData = fabricObjectToAbsolutePathData(objects[0]);
    if (!pathData) return null;
    return {
      pathData,
      fill: objects[0].fill || '#000000',
      stroke: objects[0].stroke || '',
      strokeWidth: objects[0].strokeWidth || 0,
      opacity: objects[0].opacity ?? 1,
    };
  }
  return performBooleanOperation(objects, 'union');
}

/**
 * Preview a boolean operation without committing.
 * Returns SVG path data string for overlay rendering.
 */
export function previewBooleanOperation(
  objects: any[],
  operation: BooleanOperation
): string | null {
  const result = performBooleanOperation(objects, operation);
  return result?.pathData ?? null;
}

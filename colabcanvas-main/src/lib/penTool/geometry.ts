// Pure math module for Bézier pen tool — no side effects, no DOM

export type Point = {
  x: number;
  y: number;
};

export type Segment = {
  anchor: Point;
  handleIn: Point | null;
  handleOut: Point | null;
  width?: number;
  cornerMode?: boolean;
};

// ── 2D affine matrix helpers ─────────────────────────────────

export type Matrix2D = [number, number, number, number, number, number];

export function applyMatrix(p: Point, m: Matrix2D): Point {
  return {
    x: m[0] * p.x + m[2] * p.y + m[4],
    y: m[1] * p.x + m[3] * p.y + m[5],
  };
}

export function transformSegments(segments: Segment[], m: Matrix2D): Segment[] {
  return segments.map((seg) => ({
    ...seg,
    anchor: applyMatrix(seg.anchor, m),
    handleIn: seg.handleIn ? applyMatrix(seg.handleIn, m) : null,
    handleOut: seg.handleOut ? applyMatrix(seg.handleOut, m) : null,
  }));
}

export type PathModel = {
  id: string;
  closed: boolean;
  segments: Segment[];
  strokeConfig?: import('@/lib/strokeEngine/types').StrokeConfig;
  strokeColor?: string;
  editGroupId?: string;  // Links split/contour paths for compound commit
};

export type Viewport = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

// ── Vector math ──────────────────────────────────────────────

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(p: Point, s: number): Point {
  return { x: p.x * s, y: p.y * s };
}

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

// ── Cubic Bézier evaluation ──────────────────────────────────

export function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return add(
    add(scale(p0, mt2 * mt), scale(p1, 3 * mt2 * t)),
    add(scale(p2, 3 * mt * t2), scale(p3, t2 * t)),
  );
}

// ── De Casteljau split ───────────────────────────────────────

export function splitCubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number) {
  const p01 = lerp(p0, p1, t);
  const p12 = lerp(p1, p2, t);
  const p23 = lerp(p2, p3, t);
  const p012 = lerp(p01, p12, t);
  const p123 = lerp(p12, p23, t);
  const p0123 = lerp(p012, p123, t);

  return {
    left: { p0, p1: p01, p2: p012, p3: p0123 },
    right: { p0: p0123, p1: p123, p2: p23, p3 },
  };
}

// ── Insert anchor into path via cubic split ──────────────────

export function insertAnchor(path: PathModel, segmentIndex: number, t: number): PathModel {
  const segments = path.segments.map((s) => ({ ...s }));
  const prev = segments[segmentIndex];
  const nextIdx = path.closed
    ? (segmentIndex + 1) % segments.length
    : segmentIndex + 1;
  const next = segments[nextIdx];

  const p0 = prev.anchor;
  const p1 = prev.handleOut ?? prev.anchor;
  const p2 = next.handleIn ?? next.anchor;
  const p3 = next.anchor;

  const { left, right } = splitCubic(p0, p1, p2, p3, t);

  segments[segmentIndex] = { ...prev, handleOut: left.p1 };

  const newSeg: Segment = {
    anchor: left.p3,
    handleIn: left.p2,
    handleOut: right.p1,
  };

  segments[nextIdx] = { ...next, handleIn: right.p2 };
  segments.splice(segmentIndex + 1, 0, newSeg);

  return { ...path, segments };
}

// ── Delete anchor from path ──────────────────────────────────

export function deleteAnchor(path: PathModel, anchorIndex: number): PathModel | null {
  const minSegments = path.closed ? 3 : 2;
  if (path.segments.length <= minSegments) return null;
  const segments = path.segments.filter((_, i) => i !== anchorIndex);
  return { ...path, segments, closed: path.closed };
}

// ── SVG path string generator ────────────────────────────────

export function generatePathD(path: PathModel): string {
  const { segments } = path;
  if (segments.length === 0) return '';

  let d = `M ${segments[0].anchor.x} ${segments[0].anchor.y}`;

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const curr = segments[i];
    const p1 = prev.handleOut ?? prev.anchor;
    const p2 = curr.handleIn ?? curr.anchor;
    const p3 = curr.anchor;
    d += ` C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
  }

  if (path.closed && segments.length > 1) {
    const last = segments[segments.length - 1];
    const first = segments[0];
    const p1 = last.handleOut ?? last.anchor;
    const p2 = first.handleIn ?? first.anchor;
    const p3 = first.anchor;
    d += ` C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y} Z`;
  }

  return d;
}

// Generate preview segment from last committed anchor to cursor
export function generatePreviewD(
  lastSegment: Segment,
  previewPoint: Point,
  previewHandleIn: Point | null,
): string {
  const p0 = lastSegment.anchor;
  const p1 = lastSegment.handleOut ?? lastSegment.anchor;
  const p2 = previewHandleIn ?? previewPoint;
  const p3 = previewPoint;
  return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
}

// ── Hit testing ──────────────────────────────────────────────

export function hitTestCubic(
  p0: Point, p1: Point, p2: Point, p3: Point,
  test: Point, threshold: number,
): { hit: boolean; t: number } {
  const steps = 30;
  let minDist = Infinity;
  let bestT = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt = cubicAt(p0, p1, p2, p3, t);
    const d = distance(pt, test);
    if (d < minDist) {
      minDist = d;
      bestT = t;
    }
  }
  return { hit: minDist <= threshold, t: bestT };
}

export function hitTestPath(
  path: PathModel, test: Point, threshold: number,
): { hit: boolean; segmentIndex: number; t: number } {
  const { segments } = path;
  const len = path.closed ? segments.length : segments.length - 1;

  for (let i = 0; i < len; i++) {
    const next = (i + 1) % segments.length;
    const prev = segments[i];
    const curr = segments[next];
    const p0 = prev.anchor;
    const p1 = prev.handleOut ?? prev.anchor;
    const p2 = curr.handleIn ?? curr.anchor;
    const p3 = curr.anchor;
    const result = hitTestCubic(p0, p1, p2, p3, test, threshold);
    if (result.hit) return { hit: true, segmentIndex: i, t: result.t };
  }
  return { hit: false, segmentIndex: -1, t: 0 };
}

// ── Viewport transforms ─────────────────────────────────────

export function screenToWorld(p: Point, viewport: Viewport): Point {
  return {
    x: (p.x - viewport.offsetX) / viewport.scale,
    y: (p.y - viewport.offsetY) / viewport.scale,
  };
}

export function worldToScreen(p: Point, viewport: Viewport): Point {
  return {
    x: p.x * viewport.scale + viewport.offsetX,
    y: p.y * viewport.scale + viewport.offsetY,
  };
}

// ── Angle constraint (Shift key 45° snapping) ────────────────

export function constrainAngle(origin: Point, target: Point, incrementDeg = 15): Point {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const angle = Math.atan2(dy, dx);
  const increment = (incrementDeg * Math.PI) / 180;
  const snapped = Math.round(angle / increment) * increment;
  const dist = distance(origin, target);
  return {
    x: origin.x + Math.cos(snapped) * dist,
    y: origin.y + Math.sin(snapped) * dist,
  };
}

// ── Smart guide / alignment helpers ──────────────────────────

export type GuideInfo = {
  type: 'horizontal' | 'vertical';
  value: number; // the x or y coordinate of the guide
  fromAnchor: Point;
};

export function findAlignmentGuides(
  allAnchors: Point[],
  currentPoint: Point,
  threshold: number,
): { snappedPoint: Point; guides: GuideInfo[] } {
  const guides: GuideInfo[] = [];
  let snapX = currentPoint.x;
  let snapY = currentPoint.y;
  let closestDx = threshold + 1;
  let closestDy = threshold + 1;

  for (const anchor of allAnchors) {
    const dx = Math.abs(anchor.x - currentPoint.x);
    const dy = Math.abs(anchor.y - currentPoint.y);
    if (dx < threshold && dx < closestDx) {
      closestDx = dx;
      snapX = anchor.x;
      guides.push({ type: 'vertical', value: anchor.x, fromAnchor: anchor });
    }
    if (dy < threshold && dy < closestDy) {
      closestDy = dy;
      snapY = anchor.y;
      guides.push({ type: 'horizontal', value: anchor.y, fromAnchor: anchor });
    }
  }

  // Keep only the closest guide per axis
  const filteredGuides: GuideInfo[] = [];
  if (closestDx <= threshold) {
    filteredGuides.push(guides.find(g => g.type === 'vertical' && g.value === snapX)!);
  }
  if (closestDy <= threshold) {
    filteredGuides.push(guides.find(g => g.type === 'horizontal' && g.value === snapY)!);
  }

  return { snappedPoint: { x: snapX, y: snapY }, guides: filteredGuides };
}

// ── Mirror handle (symmetric) ────────────────────────────────

export function mirrorHandle(anchor: Point, handle: Point): Point {
  return {
    x: 2 * anchor.x - handle.x,
    y: 2 * anchor.y - handle.y,
  };
}

// ── Collapse zero-length handles ─────────────────────────────

export function collapseHandle(anchor: Point, handle: Point | null, threshold = 0.5): Point | null {
  if (!handle) return null;
  return distance(anchor, handle) < threshold ? null : handle;
}

// ── Variable width outline generation ────────────────────────

function perpendicularOffset(p0: Point, p1: Point, p2: Point, p3: Point, t: number, offset: number): Point {
  // Derivative of cubic bezier
  const mt = 1 - t;
  const dx = 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
  const dy = 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular normal
  const nx = -dy / len;
  const ny = dx / len;
  const pt = cubicAt(p0, p1, p2, p3, t);
  return { x: pt.x + nx * offset, y: pt.y + ny * offset };
}

export function generateVariableWidthOutline(
  path: PathModel,
  defaultWidth: number,
  steps = 20,
): string {
  const { segments } = path;
  if (segments.length < 2) return '';

  const topPoints: Point[] = [];
  const bottomPoints: Point[] = [];
  const len = path.closed ? segments.length : segments.length - 1;

  for (let i = 0; i < len; i++) {
    const next = (i + 1) % segments.length;
    const prev = segments[i];
    const curr = segments[next];
    const p0 = prev.anchor;
    const p1 = prev.handleOut ?? prev.anchor;
    const p2 = curr.handleIn ?? curr.anchor;
    const p3 = curr.anchor;
    const w0 = (prev.width ?? defaultWidth) / 2;
    const w1 = (curr.width ?? defaultWidth) / 2;

    for (let s = 0; s <= steps; s++) {
      // Skip first point of subsequent segments to avoid duplicates
      if (i > 0 && s === 0) continue;
      const t = s / steps;
      const w = w0 + (w1 - w0) * t;
      topPoints.push(perpendicularOffset(p0, p1, p2, p3, t, w));
      bottomPoints.push(perpendicularOffset(p0, p1, p2, p3, t, -w));
    }
  }

  if (topPoints.length === 0) return '';

  // Build outline: top forward, bottom reverse
  let d = `M ${topPoints[0].x} ${topPoints[0].y}`;
  for (let i = 1; i < topPoints.length; i++) {
    d += ` L ${topPoints[i].x} ${topPoints[i].y}`;
  }
  // Round cap at end using proper semicircle
  const lastTop = topPoints[topPoints.length - 1];
  const lastBottom = bottomPoints[bottomPoints.length - 1];
  const endCapR = distance(lastTop, lastBottom) / 2;
  if (endCapR > 0.1) {
    d += ` A ${endCapR} ${endCapR} 0 0 1 ${lastBottom.x} ${lastBottom.y}`;
  } else {
    d += ` L ${lastBottom.x} ${lastBottom.y}`;
  }
  // Bottom reverse
  for (let i = bottomPoints.length - 2; i >= 0; i--) {
    d += ` L ${bottomPoints[i].x} ${bottomPoints[i].y}`;
  }
  // Round cap at start
  const firstTop = topPoints[0];
  const firstBottom = bottomPoints[0];
  const startCapR = distance(firstBottom, firstTop) / 2;
  if (startCapR > 0.1) {
    d += ` A ${startCapR} ${startCapR} 0 0 1 ${firstTop.x} ${firstTop.y}`;
  }
  d += ' Z';

  return d;
}

// ── Break path at anchor ─────────────────────────────────────

export function breakAtAnchor(path: PathModel, anchorIndex: number): PathModel[] {
  const { segments } = path;
  if (path.closed) {
    // Open the path at this anchor — reorder so anchorIndex becomes the LAST segment
    // This way, drawing can continue from the clicked anchor (appended at the end)
    const reordered: Segment[] = [];
    for (let i = 1; i <= segments.length; i++) {
      reordered.push({ ...segments[(anchorIndex + i) % segments.length] });
    }
    // Clear handleIn of first and handleOut of last for clean open ends
    reordered[0] = { ...reordered[0], handleIn: null };
    reordered[reordered.length - 1] = { ...reordered[reordered.length - 1], handleOut: null };
    const groupId = path.editGroupId || path.id;
    return [{ id: path.id, closed: false, segments: reordered, editGroupId: groupId, strokeConfig: path.strokeConfig, strokeColor: path.strokeColor }];
  }

  // Open path: split into two
  if (anchorIndex <= 0 || anchorIndex >= segments.length - 1) {
    // At endpoints — just remove the anchor
    const result = deleteAnchor(path, anchorIndex);
    return result ? [result] : [];
  }

  const left: Segment[] = segments.slice(0, anchorIndex + 1).map(s => ({ ...s }));
  const right: Segment[] = segments.slice(anchorIndex).map(s => ({ ...s }));
  // Clean break points
  left[left.length - 1] = { ...left[left.length - 1], handleOut: null };
  right[0] = { ...right[0], handleIn: null };

  const groupId = path.editGroupId || path.id;
  return [
    { id: path.id, closed: false, segments: left, editGroupId: groupId, strokeConfig: path.strokeConfig, strokeColor: path.strokeColor },
    { id: path.id + '_split', closed: false, segments: right, editGroupId: groupId, strokeConfig: path.strokeConfig, strokeColor: path.strokeColor },
  ];
}

// ── Catmull-Rom to cubic Bézier handle conversion ────────────

function catmullRomHandles(
  prev: Point, curr: Point, next: Point, tension = 0.35,
): { handleIn: Point; handleOut: Point } {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  return {
    handleIn: { x: curr.x - dx * tension, y: curr.y - dy * tension },
    handleOut: { x: curr.x + dx * tension, y: curr.y + dy * tension },
  };
}

// ── Offset path ──────────────────────────────────────────────

export function offsetPath(path: PathModel, offsetDist: number, steps = 80): PathModel {
  const { segments } = path;
  if (segments.length < 2) return { ...path, id: path.id + '_offset', segments: segments.map(s => ({ ...s })) };

  const len = path.closed ? segments.length : segments.length - 1;

  // Step 1: Densely sample the path and compute offset points along normals
  const rawPoints: Point[] = [];

  for (let i = 0; i < len; i++) {
    const next = (i + 1) % segments.length;
    const prev = segments[i];
    const curr = segments[next];
    const p0 = prev.anchor;
    const p1 = prev.handleOut ?? prev.anchor;
    const p2 = curr.handleIn ?? curr.anchor;
    const p3 = curr.anchor;

    for (let s = 0; s <= steps; s++) {
      if (i > 0 && s === 0) continue;
      const t = s / steps;
      // Compute tangent via derivative
      const mt = 1 - t;
      const dx = 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
      const dy = 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
      const tangentLen = Math.sqrt(dx * dx + dy * dy) || 1;
      // Normal is perpendicular to tangent
      const nx = -dy / tangentLen;
      const ny = dx / tangentLen;
      const pt = cubicAt(p0, p1, p2, p3, t);
      rawPoints.push({ x: pt.x + nx * offsetDist, y: pt.y + ny * offsetDist });
    }
  }

  if (rawPoints.length < 2) {
    return { ...path, id: path.id + '_offset', segments: [] };
  }

  // Step 2: Remove self-intersections (simple loop clipping)
  // For closed paths with inward offset, the path can self-intersect
  const cleanedPoints = removeOffsetSelfIntersections(rawPoints, path.closed);

  if (cleanedPoints.length < 2) {
    return { ...path, id: path.id + '_offset', segments: [] };
  }

  // Step 3: Downsample to reasonable anchor count
  const targetCount = Math.max(segments.length, Math.min(cleanedPoints.length, 80));
  const keep = Math.max(1, Math.floor((cleanedPoints.length - 1) / (targetCount - 1)));
  const sampled: Point[] = [];
  for (let i = 0; i < cleanedPoints.length; i++) {
    if (i === 0 || i === cleanedPoints.length - 1 || i % keep === 0) {
      sampled.push(cleanedPoints[i]);
    }
  }

  // Step 4: Build smooth segments using Catmull-Rom → Bézier handles
  const newSegments: Segment[] = sampled.map((pt, i) => {
    if (sampled.length < 3) {
      return { anchor: pt, handleIn: null, handleOut: null };
    }

    const prevPt = path.closed
      ? sampled[(i - 1 + sampled.length) % sampled.length]
      : i > 0 ? sampled[i - 1] : pt;
    const nextPt = path.closed
      ? sampled[(i + 1) % sampled.length]
      : i < sampled.length - 1 ? sampled[i + 1] : pt;

    if (!path.closed && i === 0) {
      const { handleOut } = catmullRomHandles(pt, pt, nextPt, 0.35);
      return { anchor: pt, handleIn: null, handleOut };
    }
    if (!path.closed && i === sampled.length - 1) {
      const { handleIn } = catmullRomHandles(prevPt, pt, pt, 0.35);
      return { anchor: pt, handleIn, handleOut: null };
    }

    const { handleIn, handleOut } = catmullRomHandles(prevPt, pt, nextPt, 0.35);
    return { anchor: pt, handleIn, handleOut };
  });

  return {
    id: path.id + '_offset',
    closed: path.closed,
    segments: newSegments,
  };
}

// ── Self-intersection removal for offset paths ──────────────

function segmentIntersection(
  a1: Point, a2: Point, b1: Point, b2: Point
): Point | null {
  const d1x = a2.x - a1.x, d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x, d2y = b2.y - b1.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return null;
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / cross;
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / cross;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: a1.x + t * d1x, y: a1.y + t * d1y };
  }
  return null;
}

function removeOffsetSelfIntersections(points: Point[], closed: boolean): Point[] {
  if (points.length < 4) return points;
  
  // Simple approach: detect crossings and remove the looped portion
  const result: Point[] = [points[0]];
  let i = 0;
  
  while (i < points.length - 1) {
    const a1 = points[i];
    const a2 = points[i + 1];
    
    // Check against all non-adjacent segments ahead
    let foundIntersection = false;
    for (let j = i + 2; j < points.length - 1; j++) {
      // Skip adjacent segment
      if (j === i + 1) continue;
      const b1 = points[j];
      const b2 = points[j + 1];
      const ix = segmentIntersection(a1, a2, b1, b2);
      if (ix) {
        // Found self-intersection: skip the loop between i+1 and j
        result.push(ix);
        i = j + 1;
        foundIntersection = true;
        break;
      }
    }
    
    if (!foundIntersection) {
      result.push(a2);
      i++;
    }
  }
  
  return result;
}

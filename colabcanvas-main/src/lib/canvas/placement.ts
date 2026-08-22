/**
 * Collision-aware placement for canvas artboards & placeholders.
 *
 * Single source of truth for "where should this new rect go on the infinite
 * canvas without overlapping existing content?". Used by both the placeholder
 * spawn path and the real-artboard creation path in Canvas.tsx so behavior
 * stays consistent and parallel generations never land on top of each other.
 */

export interface PlacementRect {
  position_x: number;
  position_y: number;
  width: number;
  height: number;
}

export interface FindSpotOptions {
  width: number;
  height: number;
  /** Caller-preferred top-left X (e.g. derived from viewport center). */
  preferredX?: number;
  preferredY?: number;
  /** All currently-occupied rects (real artboards + in-flight placeholders). */
  existingRects: PlacementRect[];
  /** Padding around existing rects considered "occupied". Default 50px. */
  padding?: number;
}

const DEFAULT_PADDING = 50;
const SPIRAL_STEP = 100;
const SPIRAL_MAX_RADIUS = 2000;

function rectsCollide(
  ax: number, ay: number, aw: number, ah: number,
  rects: PlacementRect[], padding: number,
): boolean {
  for (const r of rects) {
    const left = r.position_x - padding;
    const right = r.position_x + r.width + padding;
    const top = r.position_y - padding;
    const bottom = r.position_y + r.height + padding;
    const aLeft = ax;
    const aRight = ax + aw;
    const aTop = ay;
    const aBottom = ay + ah;
    if (!(aRight < left || aLeft > right || aBottom < top || aTop > bottom)) {
      return true;
    }
  }
  return false;
}

/**
 * Find the nearest non-overlapping (top-left) coordinate for a rect of
 * `width`x`height`, preferring `preferredX/preferredY` when given.
 *
 * Strategy:
 * 1. If preferred slot is free → use as-is.
 * 2. Spiral outward in 100px steps, checking 8 directions per ring.
 * 3. Fallback: place to the right of the rightmost existing rect.
 */
export function findNonOverlappingSpot(opts: FindSpotOptions): { x: number; y: number } {
  const {
    width,
    height,
    preferredX,
    preferredY,
    existingRects,
    padding = DEFAULT_PADDING,
  } = opts;

  const startX = preferredX ?? 100;
  const startY = preferredY ?? 100;

  if (!rectsCollide(startX, startY, width, height, existingRects, padding)) {
    return { x: startX, y: startY };
  }

  for (let radius = SPIRAL_STEP; radius <= SPIRAL_MAX_RADIUS; radius += SPIRAL_STEP) {
    for (let angle = 0; angle < 360; angle += 45) {
      const rad = (angle * Math.PI) / 180;
      const testX = startX + Math.cos(rad) * radius;
      const testY = startY + Math.sin(rad) * radius;
      if (!rectsCollide(testX, testY, width, height, existingRects, padding)) {
        return { x: testX, y: testY };
      }
    }
  }

  const maxX = existingRects.reduce(
    (m, r) => Math.max(m, r.position_x + r.width),
    0,
  );
  return { x: maxX + padding * 2, y: 100 };
}

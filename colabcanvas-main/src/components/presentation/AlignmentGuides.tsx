import { memo } from 'react';

interface Guide {
  type: 'horizontal' | 'vertical';
  position: number; // px from top/left
}

interface AlignmentGuidesProps {
  guides: Guide[];
  slideW: number;
  slideH: number;
  accentColor: string;
}

export const AlignmentGuides = memo(function AlignmentGuides({ guides, slideW, slideH, accentColor }: AlignmentGuidesProps) {
  if (guides.length === 0) return null;
  return (
    <>
      {guides.map((g, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: g.type === 'vertical' ? g.position : 0,
            top: g.type === 'horizontal' ? g.position : 0,
            width: g.type === 'vertical' ? 1 : slideW,
            height: g.type === 'horizontal' ? 1 : slideH,
            backgroundColor: accentColor,
            opacity: 0.6,
            pointerEvents: 'none',
            zIndex: 50,
          }}
        />
      ))}
    </>
  );
});

// Compute alignment guides for a dragging block against all other floating blocks
// Now includes center-of-slide guides and distance indicators
export function computeAlignmentGuides(
  dragBlockId: string,
  dragPos: { x: number; y: number; w: number; h: number },
  otherBlocks: { id: string; x: number; y: number; w: number; h: number }[],
  snapThreshold = 8,
  slideW?: number,
  slideH?: number
): { guides: { type: 'horizontal' | 'vertical'; position: number }[]; snapX: number | null; snapY: number | null } {
  const guides: { type: 'horizontal' | 'vertical'; position: number }[] = [];
  let snapX: number | null = null;
  let snapY: number | null = null;

  const dragCenterX = dragPos.x + dragPos.w / 2;
  const dragCenterY = dragPos.y + dragPos.h / 2;
  const dragRight = dragPos.x + dragPos.w;
  const dragBottom = dragPos.y + dragPos.h;

  // ── Center-of-slide guides ──
  if (slideW != null && slideH != null) {
    const slideCenterX = slideW / 2;
    const slideCenterY = slideH / 2;

    // Vertical center of slide
    if (Math.abs(dragCenterX - slideCenterX) < snapThreshold) {
      guides.push({ type: 'vertical', position: slideCenterX });
      if (snapX === null) snapX = slideCenterX - dragPos.w / 2;
    }
    if (Math.abs(dragPos.x - slideCenterX) < snapThreshold) {
      guides.push({ type: 'vertical', position: slideCenterX });
      if (snapX === null) snapX = slideCenterX;
    }
    if (Math.abs(dragRight - slideCenterX) < snapThreshold) {
      guides.push({ type: 'vertical', position: slideCenterX });
      if (snapX === null) snapX = slideCenterX - dragPos.w;
    }

    // Horizontal center of slide
    if (Math.abs(dragCenterY - slideCenterY) < snapThreshold) {
      guides.push({ type: 'horizontal', position: slideCenterY });
      if (snapY === null) snapY = slideCenterY - dragPos.h / 2;
    }
    if (Math.abs(dragPos.y - slideCenterY) < snapThreshold) {
      guides.push({ type: 'horizontal', position: slideCenterY });
      if (snapY === null) snapY = slideCenterY;
    }
    if (Math.abs(dragBottom - slideCenterY) < snapThreshold) {
      guides.push({ type: 'horizontal', position: slideCenterY });
      if (snapY === null) snapY = slideCenterY - dragPos.h;
    }
  }

  // ── Object-to-object alignment ──
  for (const other of otherBlocks) {
    if (other.id === dragBlockId) continue;
    const otherCenterX = other.x + other.w / 2;
    const otherCenterY = other.y + other.h / 2;
    const otherRight = other.x + other.w;
    const otherBottom = other.y + other.h;

    // Vertical guides (X alignment)
    const xChecks = [
      { drag: dragPos.x, other: other.x, label: 'left-left' },
      { drag: dragPos.x, other: otherRight, label: 'left-right' },
      { drag: dragRight, other: other.x, label: 'right-left' },
      { drag: dragRight, other: otherRight, label: 'right-right' },
      { drag: dragCenterX, other: otherCenterX, label: 'center-center' },
    ];
    for (const check of xChecks) {
      if (Math.abs(check.drag - check.other) < snapThreshold) {
        guides.push({ type: 'vertical', position: check.other });
        if (snapX === null) {
          if (check.label.startsWith('left')) snapX = check.other;
          else if (check.label.startsWith('right')) snapX = check.other - dragPos.w;
          else snapX = check.other - dragPos.w / 2;
        }
      }
    }

    // Horizontal guides (Y alignment)
    const yChecks = [
      { drag: dragPos.y, other: other.y, label: 'top-top' },
      { drag: dragPos.y, other: otherBottom, label: 'top-bottom' },
      { drag: dragBottom, other: other.y, label: 'bottom-top' },
      { drag: dragBottom, other: otherBottom, label: 'bottom-bottom' },
      { drag: dragCenterY, other: otherCenterY, label: 'center-center' },
    ];
    for (const check of yChecks) {
      if (Math.abs(check.drag - check.other) < snapThreshold) {
        guides.push({ type: 'horizontal', position: check.other });
        if (snapY === null) {
          if (check.label.startsWith('top')) snapY = check.other;
          else if (check.label.startsWith('bottom')) snapY = check.other - dragPos.h;
          else snapY = check.other - dragPos.h / 2;
        }
      }
    }
  }

  // Deduplicate guides
  const seen = new Set<string>();
  const uniqueGuides = guides.filter(g => {
    const key = `${g.type}-${g.position}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { guides: uniqueGuides, snapX, snapY };
}

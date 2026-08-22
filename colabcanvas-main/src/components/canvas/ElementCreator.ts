import { Canvas as FabricCanvas, Path } from 'fabric';
import { generatePathD } from '@/lib/penTool/geometry';
import type { Segment } from '@/lib/penTool/geometry';
import {
  circleToSegments,
  rectangleToSegments,
  regularPolygonToSegments,
  starToSegments,
  triangleToSegments,
  hexagonToSegments,
  arrowToSegments,
  type ShapeMeta,
} from '@/lib/penTool/shapeToPath';

/**
 * Build a Fabric.Path from segments + styling, attaching penToolData
 * so the shape is immediately editable via the pen tool on double-click.
 */
function buildPathFromSegments(
  segments: Segment[],
  opts: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    shapeMeta: ShapeMeta;
    left: number;
    top: number;
  },
): Path {
  const pathD = generatePathD({ id: '', closed: true, segments });

  // Create path WITHOUT left/top — InfiniteCanvas handles positioning
  const path = new Path(pathD, {
    fill: opts.fill,
    stroke: opts.stroke,
    strokeWidth: opts.strokeWidth,
    strokeUniform: true,
    objectCaching: false,
  });

  // Store pathOffset for correct coordinate transforms in overlays/dblclick
  const pathOffset = (path as any).pathOffset || { x: 0, y: 0 };

  // Attach penToolData — position will be set by InfiniteCanvas
  (path as any).penToolData = {
    segments,
    closed: true,
    originalLeft: 0,
    originalTop: 0,
    pathOffsetX: pathOffset.x,
    pathOffsetY: pathOffset.y,
    strokeColor: opts.stroke,
    fillColor: opts.fill,
    strokeWidth: opts.strokeWidth,
    shapeMeta: opts.shapeMeta,
  };

  return path;
}

export const createElement = (type: string, canvas: FabricCanvas, color: string = '#000000', customSize?: { width: number; height: number }) => {
  const centerX = canvas.width! / 2;
  const centerY = canvas.height! / 2;

  // Use custom size or defaults
  const getSize = (defW: number, defH: number) => ({
    w: customSize ? customSize.width : defW,
    h: customSize ? customSize.height : defH,
  });
  const getRadius = (defR: number) => customSize ? Math.min(customSize.width, customSize.height) / 2 : defR;

  switch (type) {
    case 'rectangle': {
      const { w, h } = getSize(100, 100);
      const segments = rectangleToSegments(w, h, 0);
      return buildPathFromSegments(segments, {
        fill: color, stroke: '', strokeWidth: 0,
        shapeMeta: { type: 'rectangle', width: w, height: h, cornerRadius: 0 },
        left: centerX - w / 2, top: centerY - h / 2,
      });
    }

    case 'circle': {
      const r = getRadius(50);
      const segments = circleToSegments(r, r, r);
      return buildPathFromSegments(segments, {
        fill: color, stroke: '', strokeWidth: 0,
        shapeMeta: { type: 'circle', outerRadius: r },
        left: centerX - r, top: centerY - r,
      });
    }

    case 'star': {
      const outerR = getRadius(50);
      const innerR = outerR / 2;
      const spikes = 5;
      const segments = starToSegments(spikes, outerR, innerR);
      return buildPathFromSegments(segments, {
        fill: color, stroke: '', strokeWidth: 0,
        shapeMeta: { type: 'star', sides: spikes, outerRadius: outerR, innerRadius: innerR },
        left: centerX - outerR, top: centerY - outerR,
      });
    }

    case 'triangle': {
      const { w, h } = getSize(100, 100);
      const segments = triangleToSegments(w, h);
      return buildPathFromSegments(segments, {
        fill: color, stroke: '', strokeWidth: 0,
        shapeMeta: { type: 'triangle', width: w, height: h },
        left: centerX - w / 2, top: centerY - h / 2,
      });
    }

    case 'hexagon': {
      const r = getRadius(50);
      const segments = hexagonToSegments(r);
      return buildPathFromSegments(segments, {
        fill: color, stroke: '', strokeWidth: 0,
        shapeMeta: { type: 'hexagon', outerRadius: r, sides: 6 },
        left: centerX - r, top: centerY - r,
      });
    }

    case 'polygon': {
      const r = getRadius(50);
      const sides = 5;
      const segments = regularPolygonToSegments(sides, r);
      return buildPathFromSegments(segments, {
        fill: color, stroke: '', strokeWidth: 0,
        shapeMeta: { type: 'polygon', outerRadius: r, sides },
        left: centerX - r, top: centerY - r,
      });
    }

    case 'arrow': {
      const { w, h } = getSize(100, 60);
      const segments = arrowToSegments(w, h);
      return buildPathFromSegments(segments, {
        fill: color, stroke: '', strokeWidth: 0,
        shapeMeta: { type: 'arrow', width: w, height: h },
        left: centerX - w / 2, top: centerY - h / 2,
      });
    }

    default: {
      const { w, h } = getSize(100, 100);
      const segments = rectangleToSegments(w, h, 0);
      return buildPathFromSegments(segments, {
        fill: color, stroke: '', strokeWidth: 0,
        shapeMeta: { type: 'rectangle', width: w, height: h },
        left: centerX - w / 2, top: centerY - h / 2,
      });
    }
  }
};

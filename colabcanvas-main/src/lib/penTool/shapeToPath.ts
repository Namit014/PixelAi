// Pure shape-to-Bézier segment generators
// Output is identical to pen tool Segment[] for seamless edit-mode integration

import type { Segment, Point } from './geometry';

const KAPPA = 0.5522847498;

// ── Shape metadata for parametric editing ────────────────────

export type ShapeMeta = {
  type: 'circle' | 'rectangle' | 'triangle' | 'star' | 'polygon' | 'hexagon' | 'arrow';
  sides?: number;
  innerRadius?: number;
  outerRadius?: number;
  cornerRadius?: number;
  width?: number;
  height?: number;
};

// ── Circle: 4 cubic Bézier curves (kappa approximation) ──────

export function circleToSegments(cx: number, cy: number, r: number): Segment[] {
  const k = r * KAPPA;
  return [
    {
      anchor: { x: cx, y: cy - r },
      handleIn: { x: cx - k, y: cy - r },
      handleOut: { x: cx + k, y: cy - r },
    },
    {
      anchor: { x: cx + r, y: cy },
      handleIn: { x: cx + r, y: cy - k },
      handleOut: { x: cx + r, y: cy + k },
    },
    {
      anchor: { x: cx, y: cy + r },
      handleIn: { x: cx + k, y: cy + r },
      handleOut: { x: cx - k, y: cy + r },
    },
    {
      anchor: { x: cx - r, y: cy },
      handleIn: { x: cx - r, y: cy + k },
      handleOut: { x: cx - r, y: cy - k },
    },
  ];
}

// ── Rectangle (with optional corner radius) ──────────────────

export function rectangleToSegments(w: number, h: number, cornerRadius = 0): Segment[] {
  const r = Math.min(cornerRadius, w / 2, h / 2);

  if (r <= 0) {
    // Sharp corners — straight-line segments (null handles)
    return [
      { anchor: { x: 0, y: 0 }, handleIn: null, handleOut: null },
      { anchor: { x: w, y: 0 }, handleIn: null, handleOut: null },
      { anchor: { x: w, y: h }, handleIn: null, handleOut: null },
      { anchor: { x: 0, y: h }, handleIn: null, handleOut: null },
    ];
  }

  // Rounded corners — each corner becomes a cubic Bézier arc
  const k = r * KAPPA;
  return [
    // Top-left corner start (moving right along top edge)
    { anchor: { x: r, y: 0 }, handleIn: { x: r - k, y: 0 }, handleOut: null },
    // Top-right corner
    { anchor: { x: w - r, y: 0 }, handleIn: null, handleOut: { x: w - r + k, y: 0 } },
    { anchor: { x: w, y: r }, handleIn: { x: w, y: r - k }, handleOut: null },
    // Bottom-right corner
    { anchor: { x: w, y: h - r }, handleIn: null, handleOut: { x: w, y: h - r + k } },
    { anchor: { x: w - r, y: h }, handleIn: { x: w - r + k, y: h }, handleOut: null },
    // Bottom-left corner
    { anchor: { x: r, y: h }, handleIn: null, handleOut: { x: r - k, y: h } },
    { anchor: { x: 0, y: h - r }, handleIn: { x: 0, y: h - r + k }, handleOut: null },
    // Top-left corner
    { anchor: { x: 0, y: r }, handleIn: null, handleOut: { x: 0, y: r - k } },
  ];
}

// ── Regular polygon (N sides) ────────────────────────────────

export function regularPolygonToSegments(sides: number, radius: number): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    segments.push({
      anchor: {
        x: radius + radius * Math.cos(angle),
        y: radius + radius * Math.sin(angle),
      },
      handleIn: null,
      handleOut: null,
    });
  }
  return segments;
}

// ── Star (N spikes with inner/outer radius) ──────────────────

export function starToSegments(spikes: number, outerRadius: number, innerRadius: number): Segment[] {
  const segments: Segment[] = [];
  const totalPoints = spikes * 2;
  for (let i = 0; i < totalPoints; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    segments.push({
      anchor: {
        x: outerRadius + r * Math.cos(angle),
        y: outerRadius + r * Math.sin(angle),
      },
      handleIn: null,
      handleOut: null,
    });
  }
  return segments;
}

// ── Triangle ─────────────────────────────────────────────────

export function triangleToSegments(w: number, h: number): Segment[] {
  return [
    { anchor: { x: w / 2, y: 0 }, handleIn: null, handleOut: null },
    { anchor: { x: w, y: h }, handleIn: null, handleOut: null },
    { anchor: { x: 0, y: h }, handleIn: null, handleOut: null },
  ];
}

// ── Hexagon (convenience wrapper) ────────────────────────────

export function hexagonToSegments(radius: number): Segment[] {
  return regularPolygonToSegments(6, radius);
}

// ── Arrow ────────────────────────────────────────────────────

export function arrowToSegments(w = 100, h = 60): Segment[] {
  // Arrow pointing right: shaft + head
  const shaftH = h * 0.33;
  const headStart = w * 0.6;
  const midY = h / 2;
  const shaftTop = midY - shaftH / 2;
  const shaftBottom = midY + shaftH / 2;

  return [
    { anchor: { x: 0, y: shaftTop }, handleIn: null, handleOut: null },
    { anchor: { x: headStart, y: shaftTop }, handleIn: null, handleOut: null },
    { anchor: { x: headStart, y: 0 }, handleIn: null, handleOut: null },
    { anchor: { x: w, y: midY }, handleIn: null, handleOut: null },
    { anchor: { x: headStart, y: h }, handleIn: null, handleOut: null },
    { anchor: { x: headStart, y: shaftBottom }, handleIn: null, handleOut: null },
    { anchor: { x: 0, y: shaftBottom }, handleIn: null, handleOut: null },
  ];
}

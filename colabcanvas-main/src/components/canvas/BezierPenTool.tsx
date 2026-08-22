import { useRef, useEffect, useCallback, useState, memo, useMemo } from 'react';
import {
  type Point, type PathModel, type Segment, type Viewport,
  generatePathD, generatePreviewD, distance, sub, add, scale as scaleVec,
  screenToWorld, constrainAngle, mirrorHandle, collapseHandle,
  hitTestPath, insertAnchor, deleteAnchor, generateVariableWidthOutline,
  findAlignmentGuides, cubicAt, breakAtAnchor,
} from '@/lib/penTool/geometry';
import { usePenToolStore } from '@/stores/penToolStore';
import PenEditToolbar from './PenEditToolbar';
import { generateStrokeMesh, needsExpansion } from '@/lib/strokeEngine/strokeRenderer';
import type { StrokeConfig } from '@/lib/strokeEngine/types';

// ── Constants ────────────────────────────────────────────────
const CLOSE_THRESHOLD_PX = 14;
const MIN_ANCHOR_DIST = 5;
const ANCHOR_RADIUS = 4;
const HANDLE_RADIUS = 3;
const PATH_HIT_THRESHOLD = 8;
const GUIDE_SNAP_THRESHOLD = 5; // world-space px

// ── Helpers ──────────────────────────────────────────────────
let idCounter = 0;
const nextId = () => `pen_path_${Date.now()}_${idCounter++}`;

interface BezierPenToolProps {
  viewport: Viewport;
  containerWidth: number;
  containerHeight: number;
  isActive: boolean;
  onWheel?: (e: WheelEvent) => void;
}

type DragTarget =
  | { type: 'newHandle'; pathId: string; anchorIndex: number; historyPushed?: boolean }
  | { type: 'anchor'; pathId: string; anchorIndex: number; startPos: Point; historyPushed?: boolean }
  | { type: 'handleIn'; pathId: string; anchorIndex: number; historyPushed?: boolean }
  | { type: 'handleOut'; pathId: string; anchorIndex: number; historyPushed?: boolean }
  | { type: 'width'; pathId: string; anchorIndex: number; startY: number; startWidth: number; historyPushed?: boolean }
  | { type: 'selectRect'; startPos: Point }
  | null;

// Cursor now managed by CursorEngine — no local PEN_CURSOR needed

const BezierPenTool = memo(({ viewport, containerWidth, containerHeight, isActive, onWheel }: BezierPenToolProps) => {
  const {
    paths, activePath, selectedAnchorIndices, mode, editSubTool,
    addPath, updatePath, deletePath, setActivePath, setSelectedAnchor,
    toggleSelectedAnchor, setSelectedAnchorIndices,
    setMode, pushHistory, undo, redo, setViewport, initHistory,
    strokeColor, strokeWidth, originalStrokeColor, originalFillColor,
    guides, setGuides, midpointPreview, midpointPathId, midpointSegIndex, midpointT,
    setMidpointPreview, selectionRect, setSelectionRect, setFillColor,
  } = usePenToolStore();

  // Derive single selectedAnchorIndex for backward compat
  const selectedAnchorIndex = selectedAnchorIndices.size === 1
    ? Array.from(selectedAnchorIndices)[0]
    : null;

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragTarget>(null);
  const previewRef = useRef<SVGPathElement>(null);
  const rafRef = useRef<number>(0);
  const cursorWorldRef = useRef<Point>({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPointerDown = useRef<number>(0);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const shiftHeldRef = useRef(false);

  // Init history when pen tool activates
  useEffect(() => {
    if (isActive) initHistory();
  }, [isActive, initHistory]);

  // Sync viewport from props
  useEffect(() => {
    setViewport(viewport);
  }, [viewport, setViewport]);

  // Forward wheel events to canvas for zoom while drawing
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !onWheel) return;
    const handler = (e: WheelEvent) => {
      // Don't prevent default — forward to canvas
      onWheel(e);
    };
    svg.addEventListener('wheel', handler, { passive: true });
    return () => svg.removeEventListener('wheel', handler);
  }, [onWheel]);

  // Track space key for pan passthrough
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) setSpaceHeld(true);
      if (e.key === 'Shift') shiftHeldRef.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
      if (e.key === 'Shift') shiftHeldRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ── Coordinate conversion ──────────────────────────────────
  const toWorld = useCallback((e: React.PointerEvent | PointerEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return screenToWorld(
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
      viewport,
    );
  }, [viewport]);

  // ── Collect all anchors for alignment guides ───────────────
  const getAllAnchorsExcept = useCallback((excludePathId: string | null, excludeIndex: number): Point[] => {
    const anchors: Point[] = [];
    for (const path of paths) {
      for (let i = 0; i < path.segments.length; i++) {
        if (path.id === excludePathId && i === excludeIndex) continue;
        anchors.push(path.segments[i].anchor);
      }
    }
    return anchors;
  }, [paths]);

  // ── Preview update via rAF ─────────────────────────────────
  const updatePreview = useCallback(() => {
    if (!previewRef.current) return;
    const ap = paths.find((p) => p.id === activePath);
    if (!ap || ap.segments.length === 0 || mode !== 'creating') {
      previewRef.current.setAttribute('d', '');
      return;
    }
    const lastSeg = ap.segments[ap.segments.length - 1];
    // Apply shift-snapping to preview cursor
    let previewTarget = cursorWorldRef.current;
    if (shiftHeldRef.current) {
      previewTarget = constrainAngle(lastSeg.anchor, previewTarget, 15);
    }
    const d = generatePreviewD(lastSeg, previewTarget, null);
    previewRef.current.setAttribute('d', d);
  }, [paths, activePath, mode]);

  // ── Midpoint hover detection ───────────────────────────────
  const updateMidpointHover = useCallback((worldPt: Point) => {
    if (mode !== 'idle' && mode !== 'creating') {
      setMidpointPreview(null, null, -1, 0);
      return;
    }
    for (const path of paths) {
      const hit = hitTestPath(path, worldPt, PATH_HIT_THRESHOLD / viewport.scale);
      if (hit.hit) {
        // Calculate the point on the curve
        const seg = path.segments[hit.segmentIndex];
        const nextIdx = path.closed
          ? (hit.segmentIndex + 1) % path.segments.length
          : hit.segmentIndex + 1;
        if (nextIdx >= path.segments.length && !path.closed) continue;
        const next = path.segments[nextIdx];
        const p0 = seg.anchor;
        const p1 = seg.handleOut ?? seg.anchor;
        const p2 = next.handleIn ?? next.anchor;
        const p3 = next.anchor;
        const pt = cubicAt(p0, p1, p2, p3, hit.t);
        setMidpointPreview(pt, path.id, hit.segmentIndex, hit.t);
        return;
      }
    }
    setMidpointPreview(null, null, -1, 0);
  }, [mode, paths, viewport.scale, setMidpointPreview]);

  // ── Pointer handlers ───────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isActive || spaceHeld) return;
    const worldPt = toWorld(e);
    cursorWorldRef.current = worldPt;
    const now = Date.now();

    // ── CLOSE PATH CHECK FIRST (priority over double-click) ──
    if (mode === 'creating') {
      const ap = activePath ? paths.find((p) => p.id === activePath) : null;
      if (ap && ap.segments.length > 1) {
        const firstAnchor = ap.segments[0].anchor;
        const svgRect = svgRef.current!.getBoundingClientRect();
        const screenFirst = {
          x: firstAnchor.x * viewport.scale + viewport.offsetX + svgRect.left,
          y: firstAnchor.y * viewport.scale + viewport.offsetY + svgRect.top,
        };
        const screenCursor = { x: e.clientX, y: e.clientY };
        if (distance(screenFirst, screenCursor) < CLOSE_THRESHOLD_PX) {
          pushHistory();
          updatePath(ap.id, (p) => ({ ...p, closed: true }));
          setMode('idle');
          setActivePath(null);
          lastPointerDown.current = 0;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    }

    // Double-click detection → end open path
    if (now - lastPointerDown.current < 300 && mode === 'creating') {
      lastPointerDown.current = 0;
      setMode('idle');
      setActivePath(null);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    lastPointerDown.current = now;

    if (mode === 'idle' || mode === 'creating') {
      // ── CREATE MODE ──────────────────────────────────────
      const ap = activePath ? paths.find((p) => p.id === activePath) : null;

      // Min distance check
      if (ap && ap.segments.length > 0) {
        const lastAnchor = ap.segments[ap.segments.length - 1].anchor;
        if (distance(lastAnchor, worldPt) < MIN_ANCHOR_DIST) return;
      }

      // ── CHECK ANCHOR HIT FIRST (priority over midpoint) ──
      if (mode === 'idle') {
        const anchorThreshold = PATH_HIT_THRESHOLD / viewport.scale;
        let anchorHandled = false;
        for (const path of paths) {
          for (let i = 0; i < path.segments.length; i++) {
            if (distance(path.segments[i].anchor, worldPt) < anchorThreshold) {
              // Check if this is an open endpoint — allow resuming drawing
              const isEndpoint = !path.closed && (i === 0 || i === path.segments.length - 1);
              if (isEndpoint) {
                if (i === 0) {
                  updatePath(path.id, p => ({
                    ...p,
                    segments: [...p.segments].reverse().map(s => ({
                      anchor: s.anchor,
                      handleIn: s.handleOut,
                      handleOut: s.handleIn,
                    })),
                  }));
                }
                setActivePath(path.id);
                setMode('creating');
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              // Any other anchor (closed path or mid-anchor): break and continue
              pushHistory();
              const results = breakAtAnchor(path, i);
              if (results.length > 0) {
                updatePath(path.id, () => results[0]);
                if (results.length > 1) {
                  addPath(results[1]);
                }
                setActivePath(path.id);
                updatePath(path.id, (p) => {
                  const segs = [...p.segments];
                  const last = { ...segs[segs.length - 1] };
                  last.handleOut = null;
                  segs[segs.length - 1] = last;
                  return { ...p, segments: segs };
                });
                setMode('creating');
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              setActivePath(path.id);
              setSelectedAnchor(i);
              setMode('editing');
              dragRef.current = { type: 'anchor', pathId: path.id, anchorIndex: i, startPos: { ...worldPt } };
              isDragging.current = false;
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          }
        }
      }

      // ── CHECK MIDPOINT CLICK (only if no anchor was hit) ──
      if (midpointPreview && midpointPathId) {
        const path = paths.find(p => p.id === midpointPathId);
        if (path) {
          pushHistory();
          const newPath = insertAnchor(path, midpointSegIndex, midpointT);
          updatePath(midpointPathId, () => newPath);
          setActivePath(midpointPathId);
          // After inserting, immediately enter creating mode to draw from this point
          const insertedIdx = midpointSegIndex + 1;
          // Break at the inserted anchor to continue drawing from it
          const updatedPath = { ...newPath, id: midpointPathId };
          const results = breakAtAnchor(updatedPath, insertedIdx);
          if (results.length > 0) {
            updatePath(midpointPathId, () => results[0]);
            if (results.length > 1) {
              addPath(results[1]);
            }
            updatePath(midpointPathId, (p) => {
              const segs = [...p.segments];
              const last = { ...segs[segs.length - 1] };
              last.handleOut = null;
              segs[segs.length - 1] = last;
              return { ...p, segments: segs };
            });
            setMode('creating');
          } else {
            setSelectedAnchor(insertedIdx);
            setMode('editing');
          }
          setMidpointPreview(null, null, -1, 0);
          isDragging.current = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // ── CHECK PATH SEGMENT HIT for insertion (idle only, no anchor nearby) ──
      if (mode === 'idle') {
        for (const path of paths) {
          const hit = hitTestPath(path, worldPt, PATH_HIT_THRESHOLD / viewport.scale);
          if (hit.hit) {
            pushHistory();
            const newPath = insertAnchor(path, hit.segmentIndex, hit.t);
            updatePath(path.id, () => newPath);
            setActivePath(path.id);
            setSelectedAnchor(hit.segmentIndex + 1);
            setMode('editing');
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }

      // Add new anchor — consume event
      e.preventDefault();
      e.stopPropagation();

      // Apply shift-snapping relative to last anchor
      let anchorPos = worldPt;
      if (e.shiftKey && ap && ap.segments.length > 0) {
        const lastAnchor = ap.segments[ap.segments.length - 1].anchor;
        anchorPos = constrainAngle(lastAnchor, worldPt, 15);
      }

      // Apply smart guide snapping
      const allAnchors = getAllAnchorsExcept(ap?.id ?? null, -1);
      const { snappedPoint, guides: newGuides } = findAlignmentGuides(allAnchors, anchorPos, GUIDE_SNAP_THRESHOLD / viewport.scale);
      anchorPos = snappedPoint;
      setGuides(newGuides);

      const newSeg: Segment = { anchor: anchorPos, handleIn: null, handleOut: null };

      pushHistory();
      if (!ap) {
        const storeState = usePenToolStore.getState();
        const newPath: PathModel = {
          id: nextId(),
          closed: false,
          segments: [newSeg],
          strokeConfig: storeState.activeStrokeConfig || undefined,
          strokeColor: storeState.strokeColor,
        };
        addPath(newPath);
        setActivePath(newPath.id);
        setMode('creating');
        dragRef.current = { type: 'newHandle', pathId: newPath.id, anchorIndex: 0 };
      } else {
        updatePath(ap.id, (p) => ({
          ...p,
          segments: [...p.segments, newSeg],
        }));
        dragRef.current = { type: 'newHandle', pathId: ap.id, anchorIndex: ap.segments.length };
      }
      isDragging.current = false;
    } else if (mode === 'editing') {
      // ── EDIT MODE ────────────────────────────────────────
      const ap = activePath ? paths.find((p) => p.id === activePath) : null;
      if (!ap) return;

      // Bend tool or Alt/Cmd+click: toggle handle mirroring
      if (editSubTool === 'bend' || e.metaKey) {
        for (let i = 0; i < ap.segments.length; i++) {
          if (distance(ap.segments[i].anchor, worldPt) < PATH_HIT_THRESHOLD / viewport.scale) {
            setSelectedAnchor(i);
            pushHistory();
            e.preventDefault();
            e.stopPropagation();
            updatePath(ap.id, (p) => {
              const segs = [...p.segments];
              const seg = { ...segs[i] };
              if (seg.handleIn && seg.handleOut) {
                const mirrored = mirrorHandle(seg.anchor, seg.handleOut);
                const isMirrored = distance(mirrored, seg.handleIn) < 1;
                if (isMirrored) {
                  const dx = seg.handleIn.x - seg.anchor.x;
                  const dy = seg.handleIn.y - seg.anchor.y;
                  const angle = Math.atan2(dy, dx) + Math.PI / 12;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  seg.handleIn = { x: seg.anchor.x + Math.cos(angle) * len, y: seg.anchor.y + Math.sin(angle) * len };
                  seg.cornerMode = true;
                } else {
                  seg.handleIn = mirrorHandle(seg.anchor, seg.handleOut);
                  seg.cornerMode = false;
                }
              } else if (seg.handleOut && !seg.handleIn) {
                seg.handleIn = mirrorHandle(seg.anchor, seg.handleOut);
                seg.cornerMode = false;
              } else if (seg.handleIn && !seg.handleOut) {
                seg.handleOut = mirrorHandle(seg.anchor, seg.handleIn);
                seg.cornerMode = false;
              }
              segs[i] = seg;
              return { ...p, segments: segs };
            });
            return;
          }
        }
        return;
      }

      // Cut tool: break path at clicked anchor
      if (editSubTool === 'cut') {
        for (let i = 0; i < ap.segments.length; i++) {
          if (distance(ap.segments[i].anchor, worldPt) < PATH_HIT_THRESHOLD / viewport.scale) {
            pushHistory();
            const results = breakAtAnchor(ap, i);
            if (results.length === 0) return;
            // Replace original path with first result
            updatePath(ap.id, () => results[0]);
            // Add second path if split occurred
            if (results.length > 1) {
              addPath(results[1]);
            }
            setSelectedAnchor(null);
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
        return;
      }

      // Width tool: drag up/down to adjust anchor width
      if (editSubTool === 'width') {
        for (let i = 0; i < ap.segments.length; i++) {
          if (distance(ap.segments[i].anchor, worldPt) < PATH_HIT_THRESHOLD / viewport.scale) {
            setSelectedAnchor(i);
            const currentWidth = ap.segments[i].width ?? strokeWidth;
            dragRef.current = { type: 'width', pathId: ap.id, anchorIndex: i, startY: worldPt.y, startWidth: currentWidth };
            isDragging.current = false;
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
        return;
      }

      // Check handles of ALL anchors
      for (let i = 0; i < ap.segments.length; i++) {
        const seg = ap.segments[i];
        if (seg.handleOut && distance(seg.handleOut, worldPt) < PATH_HIT_THRESHOLD / viewport.scale) {
          setSelectedAnchor(i);
          pushHistory();
          dragRef.current = { type: 'handleOut', pathId: ap.id, anchorIndex: i };
          isDragging.current = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (seg.handleIn && distance(seg.handleIn, worldPt) < PATH_HIT_THRESHOLD / viewport.scale) {
          setSelectedAnchor(i);
          pushHistory();
          dragRef.current = { type: 'handleIn', pathId: ap.id, anchorIndex: i };
          isDragging.current = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Check anchors — with Shift support for multi-select
      for (let i = 0; i < ap.segments.length; i++) {
        if (distance(ap.segments[i].anchor, worldPt) < PATH_HIT_THRESHOLD / viewport.scale) {
          // Draw-from-anchor: if clicking an endpoint of an open path, extend it
          if (!ap.closed && (i === 0 || i === ap.segments.length - 1) && !e.shiftKey) {
            if (i === 0) {
              updatePath(ap.id, (p) => ({
                ...p,
                segments: [...p.segments].reverse().map(seg => ({
                  ...seg,
                  handleIn: seg.handleOut,
                  handleOut: seg.handleIn,
                })),
              }));
            }
            setMode('creating');
            // Clear handleOut on last segment so drawing starts straight
            updatePath(ap.id, (p) => {
              const segs = [...p.segments];
              const last = { ...segs[segs.length - 1] };
              last.handleOut = null;
              segs[segs.length - 1] = last;
              return { ...p, segments: segs };
            });
            pushHistory();
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          if (e.shiftKey) {
            toggleSelectedAnchor(i);
          } else if (!selectedAnchorIndices.has(i)) {
            // Only replace selection if clicking a NON-selected anchor
            setSelectedAnchor(i);
          }
          // If anchor is already in multi-selection, keep the set and just start drag
          // NOTE: pushHistory moved to drag handler — only push on actual movement
          dragRef.current = { type: 'anchor', pathId: ap.id, anchorIndex: i, startPos: { ...worldPt }, historyPushed: false };
          isDragging.current = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Click on empty space — start drag selection rect (with or without Shift in edit mode)
      dragRef.current = { type: 'selectRect', startPos: worldPt };
      setSelectionRect({ start: worldPt, end: worldPt });
      isDragging.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, [isActive, spaceHeld, toWorld, mode, activePath, paths, viewport, editSubTool, addPath, updatePath, setActivePath, setSelectedAnchor, toggleSelectedAnchor, setMode, pushHistory, strokeWidth, midpointPreview, midpointPathId, midpointSegIndex, midpointT, setMidpointPreview, getAllAnchorsExcept, setGuides, setSelectionRect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isActive || spaceHeld) return;
    const worldPt = toWorld(e);
    const shiftKey = e.shiftKey;

    cursorWorldRef.current = worldPt;

    const drag = dragRef.current;
    if (!drag) {
      // Midpoint hover detection — suppress when near an existing anchor
      let nearAnchor = false;
      if (mode === 'idle' || mode === 'creating') {
        const anchorThreshold = PATH_HIT_THRESHOLD / viewport.scale;
        for (const path of paths) {
          for (const seg of path.segments) {
            if (distance(seg.anchor, worldPt) < anchorThreshold) {
              nearAnchor = true;
              break;
            }
          }
          if (nearAnchor) break;
        }
      }
      if (!nearAnchor) {
        updateMidpointHover(worldPt);
      } else {
        setMidpointPreview(null, null, -1, 0);
      }

      // Smart guides during creating mode — show alignment before clicking
      if (mode === 'creating') {
        const ap = activePath ? paths.find(p => p.id === activePath) : null;
        let guidePt = worldPt;
        if (shiftKey && ap && ap.segments.length > 0) {
          guidePt = constrainAngle(ap.segments[ap.segments.length - 1].anchor, worldPt, 15);
        }
        const allAnchors = getAllAnchorsExcept(ap?.id ?? null, -1);
        const { guides: newGuides } = findAlignmentGuides(allAnchors, guidePt, GUIDE_SNAP_THRESHOLD / viewport.scale);
        setGuides(newGuides);
      }

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePreview);
      return;
    }

    isDragging.current = true;
    e.preventDefault();
    e.stopPropagation();

    // Push history only once on first actual drag movement
    if (drag.type !== 'selectRect' && drag.type !== 'newHandle' && !drag.historyPushed) {
      pushHistory();
      drag.historyPushed = true;
    }

    if (drag.type === 'selectRect') {
      setSelectionRect({ start: drag.startPos, end: worldPt });
      return;
    }

    if (drag.type === 'newHandle') {
      updatePath(drag.pathId, (p) => {
        const segs = [...p.segments];
        const seg = { ...segs[drag.anchorIndex] };
        let handleOut = worldPt;
        if (shiftKey) handleOut = constrainAngle(seg.anchor, handleOut, 15);
        seg.handleOut = collapseHandle(seg.anchor, handleOut);
        // During creation: symmetric by default, Alt breaks
        if (!e.altKey) {
          const handleIn = mirrorHandle(seg.anchor, handleOut);
          seg.handleIn = collapseHandle(seg.anchor, handleIn);
        } else {
          seg.cornerMode = true;
        }
        segs[drag.anchorIndex] = seg;
        return { ...p, segments: segs };
      });
    } else if (drag.type === 'anchor') {
      let targetPt = worldPt;

      // Shift-snap during anchor drag
      if (shiftKey) {
        targetPt = constrainAngle(drag.startPos, worldPt, 15);
      }

      // Smart guide snapping
      const allAnchors = getAllAnchorsExcept(drag.pathId, drag.anchorIndex);
      const { snappedPoint, guides: newGuides } = findAlignmentGuides(allAnchors, targetPt, GUIDE_SNAP_THRESHOLD / viewport.scale);
      targetPt = snappedPoint;
      setGuides(newGuides);

      const delta = sub(targetPt, drag.startPos);

      // Multi-select: move all selected anchors
      const indicesToMove = selectedAnchorIndices.has(drag.anchorIndex)
        ? selectedAnchorIndices
        : new Set([drag.anchorIndex]);

      updatePath(drag.pathId, (p) => {
        const segs = [...p.segments];
        indicesToMove.forEach(idx => {
          if (idx >= segs.length) return;
          const seg = { ...segs[idx] };
          seg.anchor = add(p.segments[idx].anchor, delta);
          if (seg.handleIn) seg.handleIn = add(p.segments[idx].handleIn!, delta);
          if (seg.handleOut) seg.handleOut = add(p.segments[idx].handleOut!, delta);
          segs[idx] = seg;
        });
        return { ...p, segments: segs };
      });
      drag.startPos = targetPt;
    } else if (drag.type === 'handleOut') {
      updatePath(drag.pathId, (p) => {
        const segs = [...p.segments];
        const seg = { ...segs[drag.anchorIndex] };
        let pt = worldPt;
        if (shiftKey) pt = constrainAngle(seg.anchor, pt, 15);
        seg.handleOut = pt;
        // FIXED: Default to independent movement. Only mirror when Alt is held.
        if (e.altKey && !seg.cornerMode && seg.handleIn) {
          seg.handleIn = mirrorHandle(seg.anchor, pt);
        } else if (!e.altKey) {
          // Mark as corner after independent drag
          seg.cornerMode = true;
        }
        segs[drag.anchorIndex] = seg;
        return { ...p, segments: segs };
      });
    } else if (drag.type === 'handleIn') {
      updatePath(drag.pathId, (p) => {
        const segs = [...p.segments];
        const seg = { ...segs[drag.anchorIndex] };
        let pt = worldPt;
        if (shiftKey) pt = constrainAngle(seg.anchor, pt, 15);
        seg.handleIn = pt;
        // FIXED: Default to independent movement. Only mirror when Alt is held.
        if (e.altKey && !seg.cornerMode && seg.handleOut) {
          seg.handleOut = mirrorHandle(seg.anchor, pt);
        } else if (!e.altKey) {
          seg.cornerMode = true;
        }
        segs[drag.anchorIndex] = seg;
        return { ...p, segments: segs };
      });
    } else if (drag.type === 'width') {
      const deltaY = drag.startY - worldPt.y;
      const newWidth = Math.max(0.5, drag.startWidth + deltaY * 0.5);
      updatePath(drag.pathId, (p) => {
        const segs = [...p.segments];
        segs[drag.anchorIndex] = { ...segs[drag.anchorIndex], width: newWidth };
        return { ...p, segments: segs };
      });
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updatePreview);
  }, [isActive, spaceHeld, toWorld, updatePath, updatePreview, updateMidpointHover, getAllAnchorsExcept, viewport.scale, setGuides, selectedAnchorIndices, setSelectionRect]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isActive) return;
    const drag = dragRef.current;

    // Handle selection rectangle completion
    if (drag?.type === 'selectRect' && selectionRect) {
      const rectWidth = Math.abs(selectionRect.end.x - selectionRect.start.x);
      const rectHeight = Math.abs(selectionRect.end.y - selectionRect.start.y);
      const isClick = rectWidth < 2 / viewport.scale && rectHeight < 2 / viewport.scale;

      if (isClick && !e.shiftKey) {
        // Tiny rect = click on empty space → deselect and exit edit mode
        setMode('idle');
        setActivePath(null);
        setSelectedAnchor(null);
        setGuides([]);
      } else {
        const ap = activePath ? paths.find(p => p.id === activePath) : null;
        if (ap) {
          const minX = Math.min(selectionRect.start.x, selectionRect.end.x);
          const maxX = Math.max(selectionRect.start.x, selectionRect.end.x);
          const minY = Math.min(selectionRect.start.y, selectionRect.end.y);
          const maxY = Math.max(selectionRect.start.y, selectionRect.end.y);
          const newIndices = new Set<number>();
          ap.segments.forEach((seg, i) => {
            if (seg.anchor.x >= minX && seg.anchor.x <= maxX &&
                seg.anchor.y >= minY && seg.anchor.y <= maxY) {
              newIndices.add(i);
            }
          });
          if (e.shiftKey) {
            const combined = new Set(selectedAnchorIndices);
            newIndices.forEach(i => combined.add(i));
            setSelectedAnchorIndices(combined);
          } else {
            setSelectedAnchorIndices(newIndices);
          }
        }
      }
      setSelectionRect(null);
      dragRef.current = null;
      isDragging.current = false;
      return;
    }

    if (drag && isDragging.current) {
      if (drag.type === 'newHandle') {
        updatePath(drag.pathId, (p) => {
          const segs = [...p.segments];
          const seg = { ...segs[drag.anchorIndex] };
          seg.handleOut = collapseHandle(seg.anchor, seg.handleOut);
          seg.handleIn = collapseHandle(seg.anchor, seg.handleIn);
          segs[drag.anchorIndex] = seg;
          return { ...p, segments: segs };
        });
      }
    }

    // Clear guides on pointer up
    setGuides([]);
    dragRef.current = null;
    isDragging.current = false;
  }, [isActive, updatePath, activePath, paths, selectionRect, selectedAnchorIndices, setSelectedAnchorIndices, setSelectionRect, setGuides]);

  // ── Keyboard: Escape, Delete, Backspace, Undo/Redo ──────────
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo — stop immediate propagation to prevent canvas undo
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        undo();
        return;
      }
      if (isMod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        redo();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (mode === 'creating' && activePath) {
          deletePath(activePath);
          setMode('idle');
          setActivePath(null);
        } else {
          setMode('idle');
          setActivePath(null);
          setSelectedAnchor(null);
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && mode === 'editing' && activePath && selectedAnchorIndices.size > 0) {
        e.preventDefault();
        const ap = paths.find((p) => p.id === activePath);
        if (!ap) return;
        pushHistory();

        // Delete selected anchors (in reverse order to preserve indices)
        const sortedIndices = Array.from(selectedAnchorIndices).sort((a, b) => b - a);
        let currentPath: PathModel | null = ap;
        for (const idx of sortedIndices) {
          if (!currentPath) break;
          currentPath = deleteAnchor(currentPath, idx);
        }
        if (currentPath) {
          updatePath(activePath, () => currentPath!);
          setSelectedAnchor(null);
        } else {
          deletePath(activePath);
          setMode('idle');
          setActivePath(null);
          setSelectedAnchor(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true); // capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isActive, mode, activePath, selectedAnchorIndices, paths, deletePath, updatePath, setMode, setActivePath, setSelectedAnchor, pushHistory, undo, redo]);

  if (!isActive) return null;

  const invScale = 1 / viewport.scale;

  const hasVariableWidth = (path: PathModel) =>
    path.segments.some((s) => s.width !== undefined && s.width !== strokeWidth);

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {mode === 'editing' && <PenEditToolbar />}

      <svg
        ref={svgRef}
        width={containerWidth}
        height={containerHeight}
        className="absolute inset-0 z-30"
        style={{
          cursor: 'crosshair', // Pen tool default — CursorEngine handles canvas cursor
          touchAction: 'none',
          pointerEvents: spaceHeld ? 'none' : 'auto',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Transform group for viewport */}
        <g transform={`matrix(${viewport.scale},0,0,${viewport.scale},${viewport.offsetX},${viewport.offsetY})`}>
          {/* Smart alignment guides */}
          {guides.map((guide, idx) => (
            <line
              key={`guide-${idx}`}
              x1={guide.type === 'vertical' ? guide.value : -100000}
              y1={guide.type === 'horizontal' ? guide.value : -100000}
              x2={guide.type === 'vertical' ? guide.value : 100000}
              y2={guide.type === 'horizontal' ? guide.value : 100000}
              stroke="#FF00FF"
              strokeWidth={1 * invScale}
              strokeDasharray={`${3 * invScale} ${3 * invScale}`}
              pointerEvents="none"
              opacity={0.7}
            />
          ))}

          {/* Selection rectangle */}
          {selectionRect && (
            <rect
              x={Math.min(selectionRect.start.x, selectionRect.end.x)}
              y={Math.min(selectionRect.start.y, selectionRect.end.y)}
              width={Math.abs(selectionRect.end.x - selectionRect.start.x)}
              height={Math.abs(selectionRect.end.y - selectionRect.start.y)}
              fill="rgba(59,130,246,0.1)"
              stroke="#3b82f6"
              strokeWidth={1 * invScale}
              strokeDasharray={`${4 * invScale} ${2 * invScale}`}
              pointerEvents="none"
            />
          )}

          {/* Committed paths */}
          {paths.map((path) => {
            const pathStroke = originalStrokeColor || strokeColor;
            const pathFill = path.closed
              ? (originalFillColor && originalFillColor !== 'transparent' ? originalFillColor : `${pathStroke}1A`)
              : 'none';
            return (
            <g key={path.id}>
              {/* Stroke engine mesh overlay (for advanced strokes) */}
              {path.strokeConfig && needsExpansion(path.strokeConfig) && (() => {
                const mesh = generateStrokeMesh(
                  path.segments, path.closed, path.strokeConfig, path.id
                );
                return mesh ? (
                  <path
                    d={mesh.pathData}
                    fill={pathStroke}
                    stroke="none"
                    opacity={0.8}
                    pointerEvents="none"
                  />
                ) : null;
              })()}
              {/* Variable width outline (legacy) */}
              {!path.strokeConfig && hasVariableWidth(path) && (
                <path
                  d={generateVariableWidthOutline(path, strokeWidth)}
                  fill={pathStroke}
                  stroke="none"
                  opacity={0.6}
                  pointerEvents="none"
                />
              )}
              <path
                d={generatePathD(path)}
                fill={pathFill}
                stroke={pathStroke}
                strokeWidth={
                  (path.strokeConfig && needsExpansion(path.strokeConfig))
                    ? 0
                    : hasVariableWidth(path) ? 0 : 1.5 * invScale
                }
                strokeLinecap={path.strokeConfig?.cap || "round"}
                strokeLinejoin={path.strokeConfig?.join || "round"}
                strokeDasharray={
                  path.strokeConfig?.style === 'dash' ? `${6 * invScale} ${4 * invScale}` :
                  path.strokeConfig?.style === 'dotted' ? `${1.5 * invScale} ${3 * invScale}` :
                  path.strokeConfig?.style === 'dash-dot' ? `${6 * invScale} ${3 * invScale} ${2 * invScale} ${3 * invScale}` :
                  path.strokeConfig?.style === 'long-dash' ? `${12 * invScale} ${4 * invScale}` :
                  path.strokeConfig?.style === 'dash-dot-dot' ? `${6 * invScale} ${2 * invScale} ${2 * invScale} ${2 * invScale} ${2 * invScale} ${2 * invScale}` :
                  undefined
                }
                pointerEvents="none"
              />
            </g>
            );
          })}

          {/* Preview segment */}
          <path
            ref={previewRef}
            fill="none"
            stroke="#0F8EFF"
            strokeWidth={1.5 * invScale}
            strokeDasharray={`${4 * invScale} ${4 * invScale}`}
            strokeLinecap="round"
            pointerEvents="none"
          />

          {/* Midpoint preview indicator */}
          {midpointPreview && (
            <g pointerEvents="none">
              <circle
                cx={midpointPreview.x}
                cy={midpointPreview.y}
                r={5 * invScale}
                fill="white"
                stroke="#10B981"
                strokeWidth={2 * invScale}
              />
              <line
                x1={midpointPreview.x - 3 * invScale}
                y1={midpointPreview.y}
                x2={midpointPreview.x + 3 * invScale}
                y2={midpointPreview.y}
                stroke="#10B981"
                strokeWidth={1.5 * invScale}
              />
              <line
                x1={midpointPreview.x}
                y1={midpointPreview.y - 3 * invScale}
                x2={midpointPreview.x}
                y2={midpointPreview.y + 3 * invScale}
                stroke="#10B981"
                strokeWidth={1.5 * invScale}
              />
            </g>
          )}

          {/* Overlay: anchors and handles */}
          {paths.map((path) => {
            const isActivePath = path.id === activePath;
            return (
              <g key={`overlay-${path.id}`}>
                {path.segments.map((seg, i) => {
                  const isSelected = isActivePath && selectedAnchorIndices.has(i);
                  return (
                    <g key={`anchor-${path.id}-${i}`}>
                      {/* Handle In — only show for selected anchors in edit mode */}
                      {isActivePath && (mode === 'creating' || (mode === 'editing' && isSelected)) && seg.handleIn && (
                        <>
                          <line
                            x1={seg.anchor.x} y1={seg.anchor.y}
                            x2={seg.handleIn.x} y2={seg.handleIn.y}
                            stroke="#3b82f6"
                            strokeWidth={1 * invScale}
                          />
                          <circle
                            cx={seg.handleIn.x} cy={seg.handleIn.y}
                            r={HANDLE_RADIUS * invScale}
                            fill="white"
                            stroke="#3b82f6"
                            strokeWidth={1.5 * invScale}
                            style={{ cursor: 'pointer' }}
                          />
                        </>
                      )}
                      {/* Handle Out — only show for selected anchors in edit mode */}
                      {isActivePath && (mode === 'creating' || (mode === 'editing' && isSelected)) && seg.handleOut && (
                        <>
                          <line
                            x1={seg.anchor.x} y1={seg.anchor.y}
                            x2={seg.handleOut.x} y2={seg.handleOut.y}
                            stroke="#3b82f6"
                            strokeWidth={1 * invScale}
                          />
                          <circle
                            cx={seg.handleOut.x} cy={seg.handleOut.y}
                            r={HANDLE_RADIUS * invScale}
                            fill="white"
                            stroke="#3b82f6"
                            strokeWidth={1.5 * invScale}
                            style={{ cursor: 'pointer' }}
                          />
                        </>
                      )}
                      {/* Anchor point */}
                      <rect
                        x={seg.anchor.x - ANCHOR_RADIUS * invScale}
                        y={seg.anchor.y - ANCHOR_RADIUS * invScale}
                        width={ANCHOR_RADIUS * 2 * invScale}
                        height={ANCHOR_RADIUS * 2 * invScale}
                        fill={isSelected ? '#3b82f6' : 'white'}
                        stroke="#3b82f6"
                        strokeWidth={1.5 * invScale}
                        rx={isActivePath ? 0 : ANCHOR_RADIUS * invScale}
                        style={{ cursor: 'pointer' }}
                        pointerEvents={isActivePath ? 'auto' : 'none'}
                      />
                      {/* Corner mode indicator */}
                      {isActivePath && mode === 'editing' && seg.cornerMode && isSelected && (
                        <circle
                          cx={seg.anchor.x}
                          cy={seg.anchor.y - (ANCHOR_RADIUS + 4) * invScale}
                          r={2 * invScale}
                          fill="#f97316"
                          pointerEvents="none"
                        />
                      )}
                      {/* Width indicator label */}
                      {isActivePath && mode === 'editing' && editSubTool === 'width' && isSelected && seg.width !== undefined && (
                        <text
                          x={seg.anchor.x + 10 * invScale}
                          y={seg.anchor.y - 10 * invScale}
                          fill="#3b82f6"
                          fontSize={11 * invScale}
                          fontFamily="system-ui"
                          pointerEvents="none"
                        >
                          {seg.width.toFixed(1)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>
    </>
  );
});

BezierPenTool.displayName = 'BezierPenTool';

export default BezierPenTool;

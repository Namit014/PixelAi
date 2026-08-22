import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, Loader2, X, RefreshCw, Edit3, Plus, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ensureRemoteImageUrl } from '@/lib/canvas/imageToolHelpers';
import {
  surfaceContainsPoint,
  type SurfaceLike,
} from '@/lib/canvas/mockupCompositor';
import {
  createSmartMockupLayer,
  resnapSmartLayer,
  isSmartMockupLayer,
  getAttachedSurfaceId,
  type SmartSurface,
  type SurfacePoint,
} from '@/lib/canvas/smartMockupLayer';

interface MockupSurface extends SurfaceLike {
  id: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
  label: string;
  boundary?: SurfacePoint[];
  uvQuad?: SurfacePoint[] | null;
  corners?: SurfacePoint[];
  aspectRatio?: string;
  description?: string;
  isApproximate?: boolean;
}

interface MockupModeOverlayProps {
  imageUrl: string;
  imageBounds: { x: number; y: number; width: number; height: number };
  selectedObject: any;
  canvas: any;
  onApply: (newImageUrl: string) => void;
  onCancel: () => void;
}

const polyToString = (pts: { x: number; y: number }[]) =>
  pts.map((p) => `${p.x},${p.y}`).join(' ');

const screenToPct = (
  sx: number,
  sy: number,
  bounds: { x: number; y: number; width: number; height: number },
) => ({
  x: ((sx - bounds.x) / bounds.width) * 100,
  y: ((sy - bounds.y) / bounds.height) * 100,
});

const pctToScreen = (
  p: { x: number; y: number },
  bounds: { x: number; y: number; width: number; height: number },
) => ({
  x: bounds.x + (p.x / 100) * bounds.width,
  y: bounds.y + (p.y / 100) * bounds.height,
});

const MockupModeOverlay = ({
  imageUrl,
  imageBounds,
  selectedObject,
  canvas,
  onCancel,
}: MockupModeOverlayProps) => {
  // Lock the base image at mount.
  const baseObjectRef = useRef<any>(selectedObject);
  const baseIdRef = useRef<string>(
    selectedObject?.data?.object_id || selectedObject?.id || `base_${Date.now()}`,
  );
  const baseImageUrlRef = useRef<string>(imageUrl);

  const [surfaces, setSurfaces] = useState<MockupSurface[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [activeSurfaceId, setActiveSurfaceId] = useState<string | null>(null);
  const [hoverSurfaceId, setHoverSurfaceId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [screenBounds, setScreenBounds] = useState(imageBounds);

  // Manual editor state
  const [editing, setEditing] = useState(false);
  const [editMode, setEditMode] = useState<'boundary' | 'perspective'>('boundary');
  const [draggingIdx, setDraggingIdx] = useState<{ kind: 'b' | 'q'; i: number } | null>(null);

  const hasAnalyzedRef = useRef(false);
  const onCancelRef = useRef(onCancel);
  const surfacesRef = useRef<MockupSurface[]>([]);
  const editingRef = useRef(false);

  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => { surfacesRef.current = surfaces; }, [surfaces]);
  useEffect(() => { editingRef.current = editing; }, [editing]);

  // Pin overlay to the locked base image.
  useEffect(() => {
    if (!canvas) return;
    let rafId: number;
    const update = () => {
      try {
        const obj = baseObjectRef.current;
        if (!obj || !canvas) { rafId = requestAnimationFrame(update); return; }
        const br = obj.getBoundingRect();
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const canvasEl = canvas.getElement?.() || canvas.lowerCanvasEl;
        const rect = canvasEl?.getBoundingClientRect?.();
        const offsetX = rect?.left || 0;
        const offsetY = rect?.top || 0;
        setScreenBounds({
          x: br.left * vpt[0] + vpt[4] + offsetX,
          y: br.top * vpt[3] + vpt[5] + offsetY,
          width: br.width * vpt[0],
          height: br.height * vpt[3],
        });
      } catch { /* ignore */ }
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [canvas]);

  // Detection: show an APPROXIMATE shape immediately (clearly labeled), then
  // replace with real AI detection that includes a precise boundary polygon.
  useEffect(() => {
    if (hasAnalyzedRef.current) return;
    hasAnalyzedRef.current = true;

    const approx: MockupSurface = {
      id: 'approx-1',
      type: 'flat',
      bounds: { x: 15, y: 15, width: 70, height: 70 },
      boundary: [
        { x: 15, y: 15 }, { x: 85, y: 15 }, { x: 85, y: 85 }, { x: 15, y: 85 },
      ],
      uvQuad: [
        { x: 15, y: 15 }, { x: 85, y: 15 }, { x: 85, y: 85 }, { x: 15, y: 85 },
      ],
      label: 'Approximate area — tap Edit to refine',
      isApproximate: true,
    };
    setSurfaces([approx]);
    setActiveSurfaceId(approx.id);
    setIsAnalyzing(false);
    void runAiAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAiAnalyze = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let url = baseImageUrlRef.current;
      if (!url.startsWith('http')) {
        try { url = await ensureRemoteImageUrl(url); baseImageUrlRef.current = url; } catch { /* keep */ }
      }

      const { data: { session } } = await supabase.auth.getSession();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20_000);
      const { data, error } = await supabase.functions.invoke('analyze-mockup', {
        body: { imageUrl: url },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      }).finally(() => clearTimeout(timer));
      if (error) return;

      const detected: MockupSurface[] = (data?.surfaces || []).map((s: any, i: number) => ({
        id: s.id || `surface-${i}`,
        type: s.type || 'flat',
        bounds: s.bounds,
        boundary: Array.isArray(s.boundary) && s.boundary.length >= 3 ? s.boundary : undefined,
        uvQuad: Array.isArray(s.uvQuad) && s.uvQuad.length === 4 ? s.uvQuad : (Array.isArray(s.corners) && s.corners.length === 4 ? s.corners : null),
        corners: Array.isArray(s.corners) && s.corners.length === 4 ? s.corners : undefined,
        label: s.description || s.label || `Surface ${i + 1}`,
        aspectRatio: s.aspectRatio,
        description: s.description,
      })).filter((s: MockupSurface) => s.bounds && s.boundary);

      if (detected.length > 0) {
        setSurfaces(detected);
        setActiveSurfaceId(detected[0].id);
      } else {
        toast.message('No surfaces auto-detected. Tap Edit to draw the surface manually.');
      }
    } catch {
      // Silent
    }
  }, []);

  const updateActiveSurface = useCallback((updater: (s: MockupSurface) => MockupSurface) => {
    setSurfaces((prev) => prev.map((s) => (s.id === activeSurfaceId ? updater(s) : s)));
  }, [activeSurfaceId]);

  const applyMockup = useCallback(async (overlayObj: any, surfaceOverride?: MockupSurface) => {
    if (isApplying) return;
    const surface = surfaceOverride || surfacesRef.current.find((s) => s.id === activeSurfaceId);
    if (!surface) { toast.error('Select a surface first'); return; }
    if (!overlayObj) return;

    setIsApplying(true);
    try {
      const layer = await createSmartMockupLayer(
        canvas,
        baseObjectRef.current,
        overlayObj,
        surface as SmartSurface,
        { applyLighting: true },
      );
      if (!layer) throw new Error('Could not create smart mockup layer');

      const startPos = (overlayObj as any).__mockupStartPos;
      if (startPos) {
        try {
          overlayObj.set({ left: startPos.left, top: startPos.top });
          overlayObj.setCoords?.();
        } catch { /* */ }
        delete (overlayObj as any).__mockupStartPos;
      }
      try { canvas?.setActiveObject?.(layer); } catch { /* */ }
      try { canvas?.requestRenderAll?.(); } catch { /* */ }
      toast.success('Smart mockup added — drag to adjust');
    } catch (err: any) {
      console.error('[Mockup] attach failed', err);
      toast.error(err?.message || 'Failed to apply mockup');
    } finally {
      setIsApplying(false);
    }
  }, [isApplying, activeSurfaceId, canvas]);

  // Drag-and-drop apply (disabled while editing the mask).
  useEffect(() => {
    if (!canvas) return;
    const baseId = baseIdRef.current;

    const handleDown = (e: any) => {
      if (editingRef.current) return;
      const t = e?.target;
      if (!t) return;
      if (t.type === 'image' && (t.data?.object_id || t.id) !== baseId && !isSmartMockupLayer(t)) {
        (t as any).__mockupStartPos = { left: t.left || 0, top: t.top || 0 };
      }
    };

    const handleMove = (e: any) => {
      if (editingRef.current) return;
      const moved = e?.target;
      if (!moved) return;
      const id = moved.data?.object_id || moved.id;
      if (id === baseId) return;
      const isLayer = isSmartMockupLayer(moved);
      if (moved.type !== 'image' && !isLayer) return;

      try {
        const ptr = canvas.getPointer(e.e);
        const baseObj = baseObjectRef.current;
        const br = baseObj?.getBoundingRect?.();
        if (!br) return;
        const xPct = ((ptr.x - br.left) / br.width) * 100;
        const yPct = ((ptr.y - br.top) / br.height) * 100;
        if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) {
          setHoverSurfaceId(null);
          return;
        }
        const list = surfacesRef.current;
        const hit = list.find((s) => surfaceContainsPoint(s, xPct, yPct))
          || list.reduce<{ s: MockupSurface | null; d: number }>((best, s) => {
            const cx = s.bounds.x + s.bounds.width / 2;
            const cy = s.bounds.y + s.bounds.height / 2;
            const d = (cx - xPct) ** 2 + (cy - yPct) ** 2;
            return d < best.d ? { s, d } : best;
          }, { s: null, d: Infinity }).s;
        if (hit && hit.id !== hoverSurfaceId) {
          setHoverSurfaceId(hit.id);
          setActiveSurfaceId(hit.id);
        }
      } catch { /* */ }
    };

    const handleUp = async (e: any) => {
      if (editingRef.current) return;
      const dropped = e?.target;
      if (!dropped) return;
      const id = dropped.data?.object_id || dropped.id;
      if (id === baseId) return;
      const isLayer = isSmartMockupLayer(dropped);
      if (dropped.type !== 'image' && !isLayer) return;

      try {
        const ptr = canvas.getPointer(e.e);
        const baseObj = baseObjectRef.current;
        const br = baseObj?.getBoundingRect?.();
        if (!br) return;
        const inside =
          ptr.x >= br.left && ptr.x <= br.left + br.width &&
          ptr.y >= br.top && ptr.y <= br.top + br.height;
        if (!inside) { setHoverSurfaceId(null); return; }
      } catch { return; }

      const target = surfacesRef.current.find((s) => s.id === hoverSurfaceId)
        || surfacesRef.current.find((s) => s.id === activeSurfaceId);
      setHoverSurfaceId(null);
      if (!target) return;

      if (isLayer) {
        const attachedSurface = getAttachedSurfaceId(dropped);
        if (attachedSurface !== target.id) {
          try {
            await resnapSmartLayer(canvas, baseObjectRef.current, dropped, target as SmartSurface);
            toast.success('Re-snapped to new surface');
          } catch (err: any) {
            toast.error(err?.message || 'Could not re-snap');
          }
        }
        return;
      }

      await applyMockup(dropped, target);
    };

    canvas.on('mouse:down', handleDown);
    canvas.on('mouse:move', handleMove);
    canvas.on('mouse:up', handleUp);
    return () => {
      canvas.off('mouse:down', handleDown);
      canvas.off('mouse:move', handleMove);
      canvas.off('mouse:up', handleUp);
    };
  }, [canvas, applyMockup, hoverSurfaceId, activeSurfaceId]);

  // Escape exits editing first, then closes overlay.
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingRef.current) setEditing(false);
        else onCancelRef.current();
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const activeSurface = useMemo(
    () => surfaces.find((s) => s.id === activeSurfaceId) || null,
    [surfaces, activeSurfaceId],
  );

  // ---- Manual editor handlers ----
  const onSvgPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!editing || !activeSurface) return;
    // Clicked on empty area: in boundary mode, append a new point at click.
    const target = e.target as Element;
    if (target.tagName === 'svg' || target.tagName === 'polygon' || target.tagName === 'polyline') {
      if (editMode !== 'boundary') return;
      const pt = screenToPct(e.clientX, e.clientY, screenBounds);
      if (pt.x < 0 || pt.x > 100 || pt.y < 0 || pt.y > 100) return;
      updateActiveSurface((s) => ({
        ...s,
        boundary: [...(s.boundary || []), pt],
        isApproximate: false,
      }));
    }
  }, [editing, activeSurface, editMode, screenBounds, updateActiveSurface]);

  const onHandlePointerDown = useCallback((kind: 'b' | 'q', i: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDraggingIdx({ kind, i });
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingIdx) return;
    e.stopPropagation();
    const pt = screenToPct(e.clientX, e.clientY, screenBounds);
    pt.x = Math.max(0, Math.min(100, pt.x));
    pt.y = Math.max(0, Math.min(100, pt.y));
    updateActiveSurface((s) => {
      if (draggingIdx.kind === 'b') {
        const b = (s.boundary || []).slice();
        b[draggingIdx.i] = pt;
        return { ...s, boundary: b, isApproximate: false };
      } else {
        const q = (s.uvQuad ? s.uvQuad.slice() : [
          { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
        ]);
        q[draggingIdx.i] = pt;
        return { ...s, uvQuad: q };
      }
    });
  }, [draggingIdx, screenBounds, updateActiveSurface]);

  const onHandlePointerUp = useCallback(() => setDraggingIdx(null), []);

  const removeBoundaryPoint = useCallback((i: number) => {
    updateActiveSurface((s) => {
      const b = (s.boundary || []).slice();
      if (b.length <= 3) { toast.error('Need at least 3 points'); return s; }
      b.splice(i, 1);
      return { ...s, boundary: b };
    });
  }, [updateActiveSurface]);

  const addCustomSurface = useCallback(() => {
    const id = `manual-${Date.now()}`;
    const ns: MockupSurface = {
      id,
      type: 'flat',
      bounds: { x: 25, y: 25, width: 50, height: 50 },
      boundary: [
        { x: 25, y: 25 }, { x: 75, y: 25 }, { x: 75, y: 75 }, { x: 25, y: 75 },
      ],
      uvQuad: [
        { x: 25, y: 25 }, { x: 75, y: 25 }, { x: 75, y: 75 }, { x: 25, y: 75 },
      ],
      label: 'Custom surface',
    };
    setSurfaces((prev) => [...prev, ns]);
    setActiveSurfaceId(id);
    setEditing(true);
    setEditMode('boundary');
  }, []);

  const resetActive = useCallback(() => {
    updateActiveSurface((s) => ({
      ...s,
      boundary: [
        { x: 25, y: 25 }, { x: 75, y: 25 }, { x: 75, y: 75 }, { x: 25, y: 75 },
      ],
      uvQuad: [
        { x: 25, y: 25 }, { x: 75, y: 25 }, { x: 75, y: 75 }, { x: 25, y: 75 },
      ],
      isApproximate: false,
    }));
  }, [updateActiveSurface]);

  // Render boundary + handles for the active surface.
  const renderActiveOverlay = () => {
    if (!activeSurface) return null;
    const boundaryPts = (activeSurface.boundary && activeSurface.boundary.length >= 3)
      ? activeSurface.boundary
      : [
          { x: activeSurface.bounds.x, y: activeSurface.bounds.y },
          { x: activeSurface.bounds.x + activeSurface.bounds.width, y: activeSurface.bounds.y },
          { x: activeSurface.bounds.x + activeSurface.bounds.width, y: activeSurface.bounds.y + activeSurface.bounds.height },
          { x: activeSurface.bounds.x, y: activeSurface.bounds.y + activeSurface.bounds.height },
        ];
    const screenPts = boundaryPts.map((p) => pctToScreen(p, screenBounds));
    const minX = Math.min(...screenPts.map((p) => p.x));
    const minY = Math.min(...screenPts.map((p) => p.y));

    const quad = activeSurface.uvQuad && activeSurface.uvQuad.length === 4
      ? activeSurface.uvQuad.map((p) => pctToScreen(p, screenBounds))
      : null;

    const isApprox = !!activeSurface.isApproximate;
    const stroke = isApprox ? 'hsl(38 92% 50%)' : 'hsl(var(--primary))';
    const fill = isApprox ? 'hsl(38 92% 50% / 0.06)' : 'hsl(var(--primary) / 0.08)';
    const dash = isApprox ? '6 4' : undefined;

    return (
      <>
        <svg
          className="fixed inset-0 z-[54]"
          style={{
            width: '100vw', height: '100vh',
            pointerEvents: editing ? 'auto' : 'none',
          }}
          onPointerDown={onSvgPointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
        >
          <polygon
            points={polyToString(screenPts)}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
            strokeDasharray={dash}
            style={{ pointerEvents: editing ? 'auto' : 'none' }}
          />
          {/* Perspective quad */}
          {quad && editMode === 'perspective' && editing && (
            <polygon
              points={polyToString(quad)}
              fill="none"
              stroke="hsl(213 90% 60%)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}
          {/* Boundary handles */}
          {editing && editMode === 'boundary' && screenPts.map((p, i) => (
            <g key={`b-${i}`}>
              <circle
                cx={p.x} cy={p.y} r={7}
                fill="white"
                stroke={stroke}
                strokeWidth={2}
                style={{ cursor: 'grab' }}
                onPointerDown={onHandlePointerDown('b', i)}
              />
              <circle
                cx={p.x + 10} cy={p.y - 10} r={6}
                fill="hsl(0 70% 55%)"
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => { e.stopPropagation(); removeBoundaryPoint(i); }}
              />
              <text
                x={p.x + 10} y={p.y - 8}
                textAnchor="middle"
                fill="white"
                fontSize="9"
                fontWeight="bold"
                pointerEvents="none"
              >×</text>
            </g>
          ))}
          {/* Perspective quad handles */}
          {editing && editMode === 'perspective' && quad && quad.map((p, i) => (
            <g key={`q-${i}`}>
              <rect
                x={p.x - 7} y={p.y - 7}
                width={14} height={14}
                fill="white"
                stroke="hsl(213 90% 60%)"
                strokeWidth={2}
                style={{ cursor: 'grab' }}
                onPointerDown={onHandlePointerDown('q', i)}
              />
              <text
                x={p.x} y={p.y + 3}
                textAnchor="middle"
                fill="hsl(213 90% 60%)"
                fontSize="9"
                fontWeight="bold"
                pointerEvents="none"
              >{['TL', 'TR', 'BR', 'BL'][i]}</text>
            </g>
          ))}
        </svg>

        {/* Surface label */}
        <div
          className="fixed z-[55] px-2 py-0.5 text-[10px] rounded font-medium pointer-events-none"
          style={{
            left: `${minX}px`,
            top: `${Math.max(0, minY - 22)}px`,
            background: isApprox ? 'hsl(38 92% 50%)' : 'hsl(var(--primary))',
            color: 'white',
          }}
        >
          {isApprox ? '⚠ ' : ''}{activeSurface.label}
        </div>

        {isApplying && (
          <div
            className="fixed z-[56] flex items-center gap-2 px-3 py-1.5 bg-white/95 rounded-full pointer-events-none"
            style={{ left: `${minX + 8}px`, top: `${minY + 8}px` }}
          >
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-[10px] font-medium text-zinc-800">Applying…</span>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* Top status pill */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full border border-zinc-200 shadow-sm">
        <Box className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-zinc-800">Smart Mockup</span>
        <span className="text-xs text-zinc-500">·</span>
        <span className="text-xs text-zinc-600">
          {isAnalyzing
            ? 'Detecting…'
            : editing
              ? `${editMode === 'boundary' ? 'Click to add points · drag to move · × to delete' : 'Drag the 4 corners to set perspective'}`
              : 'Drag any image onto the surface'}
        </span>
        {surfaces.length > 1 && !editing && (
          <div className="flex items-center gap-1 ml-2">
            {surfaces.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveSurfaceId(s.id)}
                className={`w-5 h-5 rounded text-[10px] font-medium transition-all ${
                  s.id === activeSurfaceId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
                title={s.label}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
        {!isAnalyzing && (
          <>
            {!editing ? (
              <>
                <button
                  onClick={() => { setEditing(true); setEditMode('boundary'); }}
                  className="ml-2 flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                >
                  <Edit3 className="w-3 h-3" /> Edit shape
                </button>
                <button
                  onClick={addCustomSurface}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 ml-2 p-0.5 bg-zinc-100 rounded">
                  <button
                    onClick={() => setEditMode('boundary')}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${editMode === 'boundary' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-600'}`}
                  >Mask</button>
                  <button
                    onClick={() => setEditMode('perspective')}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${editMode === 'perspective' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-600'}`}
                  >Perspective</button>
                </div>
                <button
                  onClick={resetActive}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                  title="Reset to rectangle"
                >
                  <Trash2 className="w-3 h-3" /> Reset
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:opacity-90"
                >
                  <Check className="w-3 h-3" /> Done
                </button>
              </>
            )}
          </>
        )}
        <kbd className="ml-1 px-1.5 py-0.5 bg-zinc-100 rounded text-[10px] font-medium text-zinc-500">Esc</kbd>
        <button
          onClick={onCancel}
          className="ml-0.5 w-5 h-5 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-3 h-3 text-zinc-600" />
        </button>
      </div>

      {!isAnalyzing && renderActiveOverlay()}

      {isAnalyzing && (
        <div
          className="fixed z-[54] rounded-lg overflow-hidden pointer-events-none"
          style={{ left: `${screenBounds.x}px`, top: `${screenBounds.y}px`, width: `${screenBounds.width}px`, height: `${screenBounds.height}px` }}
        >
          <div className="absolute inset-0 bg-white/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/95 rounded-full">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              <span className="text-xs font-medium text-zinc-800">Preparing surface…</span>
            </div>
          </div>
        </div>
      )}

      {!isAnalyzing && surfaces.length === 0 && (
        <div
          className="fixed z-[54] flex items-center justify-center pointer-events-none"
          style={{ left: `${screenBounds.x}px`, top: `${screenBounds.y}px`, width: `${screenBounds.width}px`, height: `${screenBounds.height}px` }}
        >
          <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg border border-zinc-200 shadow-sm pointer-events-auto">
            <p className="text-sm text-zinc-700">No surfaces detected</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { hasAnalyzedRef.current = false; setIsAnalyzing(true); setSurfaces([]); }} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
              <Button variant="default" size="sm" onClick={addCustomSurface} className="gap-2">
                <Plus className="w-3.5 h-3.5" /> Draw manually
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MockupModeOverlay;

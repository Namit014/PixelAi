import { useRef, useCallback, useEffect, useState } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import { SlideRenderer } from './SlideRenderer';
import { SlashCommandOverlay } from './SlashCommandOverlay';
import { DiagramBuilder } from './DiagramBuilder';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';


const SLIDE_GAP = 48;

export function SlideWorkspace() {
  const slides = usePresentationStore((s) => s.slides);
  const tokens = usePresentationStore((s) => s.designTokens);
  const zoom = usePresentationStore((s) => s.zoom);
  const activeSlideId = usePresentationStore((s) => s.activeSlideId);
  const setActiveSlide = usePresentationStore((s) => s.setActiveSlide);
  const viewMode = usePresentationStore((s) => s.viewMode);
  const activeTool = usePresentationStore((s) => s.activeTool);
  const _tempToolOverride = usePresentationStore((s) => s._tempToolOverride);
  const setTempToolOverride = usePresentationStore((s) => s.setTempToolOverride);
  const containerRef = useRef<HTMLDivElement>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashPos, setSlashPos] = useState<{ x: number; y: number } | undefined>();
  const [afterBlockId, setAfterBlockId] = useState<string | null>(null);
  const diagramOpen = usePresentationStore((s) => s.diagramOpen);

  // Free user watermark
  const { user } = useAuth();
  const [isFreeUser, setIsFreeUser] = useState(true);
  useEffect(() => {
    if (!user) return;
    supabase.from('credits').select('subscription_tier').eq('user_id', user.id).single()
      .then(({ data }) => { setIsFreeUser(!data || data.subscription_tier === 'free'); });
  }, [user]);
  const setDiagramOpen = usePresentationStore((s) => s.setDiagramOpen);

  // Canvas mode state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const effectiveTool = _tempToolOverride || activeTool;

  useEffect(() => {
    if (!activeSlideId || !containerRef.current || viewMode === 'canvas') return;
    const el = containerRef.current.querySelector(`[data-slide-id="${activeSlideId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSlideId, viewMode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      usePresentationStore.getState().setZoom(zoom + delta);
    } else if (viewMode === 'canvas') {
      // Pan in canvas mode
      setPanOffset((p) => ({
        x: p.x - (e.shiftKey ? e.deltaY : e.deltaX),
        y: p.y - (e.shiftKey ? 0 : e.deltaY),
      }));
    }
  }, [zoom, viewMode]);

  // Canvas mode: mouse pan only when hand tool is active
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (viewMode !== 'canvas') return;
    if (effectiveTool !== 'hand') return;
    // Only pan if clicking on the container itself (empty space)
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).closest('[data-canvas-bg]')) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, ox: panOffset.x, oy: panOffset.y };
  }, [viewMode, panOffset, effectiveTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return;
    setPanOffset({
      x: panStart.current.ox + (e.clientX - panStart.current.x),
      y: panStart.current.oy + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
  }, []);

  // Spacebar hold for temporary hand tool
  useEffect(() => {
    if (viewMode !== 'canvas') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const t = e.target as HTMLElement;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
        e.preventDefault();
        setTempToolOverride('hand');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setTempToolOverride(null);
        setIsPanning(false);
        panStart.current = null;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [viewMode, setTempToolOverride]);

  // Listen for "open-slash-inside" from container/stack "+" button
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.rect) {
        setSlashPos({ x: detail.rect.left, y: detail.rect.bottom + 4 });
      } else {
        setSlashPos({ x: window.innerWidth / 2 - 160, y: window.innerHeight / 3 });
      }
      setAfterBlockId(detail?.blockId || null);
      setSlashOpen(true);
    };
    window.addEventListener('open-slash-inside', handler);
    return () => window.removeEventListener('open-slash-inside', handler);
  }, []);

  // "/" slash command listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      
      if (e.key === '/') {
        let blockId: string | null = null;
        const blockWrapper = target.closest?.('[data-block-wrapper]');
        if (blockWrapper) {
          const blockEl = blockWrapper.querySelector('[data-block-id]');
          if (blockEl) blockId = blockEl.getAttribute('data-block-id');
        }
        if (!blockId) blockId = usePresentationStore.getState().editingBlockId;

        if (target.isContentEditable) {
          try {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              if (rect.width === 0 && rect.height === 0) {
                const targetRect = target.getBoundingClientRect();
                setSlashPos({ x: targetRect.left, y: targetRect.bottom + 4 });
              } else {
                setSlashPos({ x: rect.left, y: rect.bottom + 4 });
              }
            }
          } catch { /* ignore positioning errors */ }

          setTimeout(() => {
            try {
              const s = window.getSelection();
              if (s && s.rangeCount > 0) {
                const r = s.getRangeAt(0);
                if (r.startOffset > 0) {
                  r.setStart(r.startContainer, r.startOffset - 1);
                  r.deleteContents();
                }
              }
            } catch (err) {
              console.warn('Slash removal failed:', err);
            }
          }, 0);
          setAfterBlockId(blockId);
          setSlashOpen(true);
          return;
        }

        e.preventDefault();
        
        // If a block is selected, enter isolation mode so new blocks nest inside it
        const store = usePresentationStore.getState();
        const selectedId = store.selectedBlockId;
        if (selectedId && !store.isolatedGroupId) {
          store.enterIsolation(selectedId);
        }
        
        setAfterBlockId(null);
        if (containerRef.current && activeSlideId) {
          const blockEl = selectedId ? containerRef.current.querySelector(`[data-block-id="${selectedId}"]`) : null;
          const slideEl = containerRef.current.querySelector(`[data-slide-id="${activeSlideId}"]`);
          if (blockEl) {
            const rect = blockEl.getBoundingClientRect();
            setSlashPos({ x: rect.left, y: rect.bottom + 4 });
          } else if (slideEl) {
            const rect = slideEl.getBoundingClientRect();
            setSlashPos({ x: rect.left + rect.width / 2 - 160, y: rect.top + rect.height / 2 - 100 });
          } else {
            setSlashPos({ x: window.innerWidth / 2 - 160, y: window.innerHeight / 3 });
          }
        } else {
          setSlashPos({ x: window.innerWidth / 2 - 160, y: window.innerHeight / 3 });
        }
        setSlashOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSlideId]);

  // ── Page Mode ────────────────────────────────────────────
  if (viewMode === 'page') {
    return (
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-auto overflow-x-hidden bg-white"
        onWheel={handleWheel}
        style={{ scrollBehavior: 'smooth' }}
      >
        <div
          className="flex flex-col items-center py-12"
          style={{ paddingLeft: 60, paddingRight: 570, gap: SLIDE_GAP }}
        >
          {slides.map((slide, index) => (
            <div key={slide.id} data-slide-id={slide.id} className="relative group">
              <div className="absolute -left-12 top-2 text-sm font-medium select-none text-muted-foreground">
                {index + 1}
              </div>
              <SlideRenderer
                slide={slide}
                tokens={tokens}
                scale={zoom}
                isActive={activeSlideId === slide.id}
                onClick={() => setActiveSlide(slide.id)}
                showWatermark={isFreeUser}
              />
            </div>
          ))}
        </div>

        <SlashCommandOverlay
          isOpen={slashOpen}
          onClose={() => { setSlashOpen(false); setAfterBlockId(null); }}
          position={slashPos}
          afterBlockId={afterBlockId}
          onOpenDiagram={() => { setSlashOpen(false); setTimeout(() => setDiagramOpen(true), 50); }}
        />
        <DiagramBuilder isOpen={diagramOpen} onClose={() => setDiagramOpen(false)} />
      </div>
    );
  }

  // ── Canvas Mode ──────────────────────────────────────────
  const canvasSlideW = 1920 * zoom;
  const canvasSlideH = 1080 * zoom;
  const canvasGap = 60;

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-white"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      data-canvas-bg
      style={{ cursor: effectiveTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
    >
      <div
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: canvasGap,
          padding: '80px 120px',
          width: 'fit-content',
          minHeight: '100%',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {slides.map((slide, index) => (
          <div key={slide.id} data-slide-id={slide.id} className="relative flex-shrink-0 group">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-medium select-none text-muted-foreground">
              {index + 1}
            </div>
            <SlideRenderer
              slide={slide}
              tokens={tokens}
              scale={zoom}
              isActive={activeSlideId === slide.id}
              onClick={() => setActiveSlide(slide.id)}
              showWatermark={isFreeUser}
            />
          </div>
        ))}
      </div>

      <SlashCommandOverlay
        isOpen={slashOpen}
        onClose={() => { setSlashOpen(false); setAfterBlockId(null); }}
        position={slashPos}
        afterBlockId={afterBlockId}
        onOpenDiagram={() => { setSlashOpen(false); setTimeout(() => setDiagramOpen(true), 50); }}
      />
      <DiagramBuilder isOpen={diagramOpen} onClose={() => setDiagramOpen(false)} />
    </div>
  );
}

import React, { useState, useCallback, useRef } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Play, Pause, RotateCcw, Clock, ChevronUp, ChevronDown, Zap, Settings2, Type, List, Image, BarChart3, Lightbulb, Quote, Hash, Code, Table2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentBlock } from '@/types/presentation';

const TIMELINE_SCALE = 0.15;
const MAX_DURATION = 5000;
const SNAP_INTERVAL = 250;

const EASING_OPTIONS = [
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
  { value: 'linear', label: 'Linear' },
  { value: 'cubic-bezier(0.68,-0.55,0.27,1.55)', label: 'Bounce' },
];

function blockLabel(b: ContentBlock): string {
  if ('text' in b && typeof (b as any).text === 'string') return (b as any).text.slice(0, 16) || b.type;
  if (b.type === 'bullets') return 'Bullets';
  if (b.type === 'chart') return 'Chart';
  return b.type.charAt(0).toUpperCase() + b.type.slice(1);
}

const TIMELINE_ICON_MAP: Record<string, React.ComponentType<any>> = {
  title: Type, subtitle: Type, bullets: List, image: Image, chart: BarChart3,
  callout: Lightbulb, quote: Quote, metric: Hash, code: Code, table: Table2,
};

function TimelineBlockIcon({ type }: { type: string }) {
  const IconComp = TIMELINE_ICON_MAP[type] || Square;
  return <IconComp className="w-2.5 h-2.5" />;
}

export function SlideTimeline() {
  const activeSlideId = usePresentationStore((s) => s.activeSlideId);
  const slide = usePresentationStore((s) => s.slides.find((sl) => sl.id === s.activeSlideId));
  const updateBlock = usePresentationStore((s) => s.updateBlock);
  const [expanded, setExpanded] = useState(false);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEasing, setShowEasing] = useState<string | null>(null);
  const playRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  const play = useCallback(() => {
    setIsPlaying(true);
    startTimeRef.current = performance.now() - playheadMs;
    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      if (elapsed >= MAX_DURATION) {
        setPlayheadMs(0);
        setIsPlaying(false);
        return;
      }
      setPlayheadMs(elapsed);
      playRef.current = requestAnimationFrame(tick);
    };
    playRef.current = requestAnimationFrame(tick);
  }, [playheadMs]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    if (playRef.current) cancelAnimationFrame(playRef.current);
  }, []);

  const reset = useCallback(() => {
    stop();
    setPlayheadMs(0);
  }, [stop]);

  if (!slide || !activeSlideId) return null;

  const blocks = slide.contentBlocks;
  const animatedBlocks = blocks.filter((b) => {
    const anim = b.style?.animation;
    return anim?.effect && anim.effect !== 'none';
  });
  const tickMarks = Array.from({ length: Math.floor(MAX_DURATION / 500) + 1 }, (_, i) => i * 500);
  const snapMarks = Array.from({ length: Math.floor(MAX_DURATION / SNAP_INTERVAL) + 1 }, (_, i) => i * SNAP_INTERVAL);
  const timelineWidth = MAX_DURATION * TIMELINE_SCALE + 40;

  return (
    <div className="absolute bottom-4 left-[500px] right-[420px] z-30 min-w-0">
      <div className="bg-white dark:bg-card rounded-xl border border-border/50 overflow-hidden">
        {/* Toggle bar */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="font-semibold">Animation Timeline</span>
          <span className="text-[9px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-full ml-1">
            {animatedBlocks.length} animated
          </span>
          {expanded ? <ChevronDown className="h-3.5 w-3.5 ml-auto" /> : <ChevronUp className="h-3.5 w-3.5 ml-auto" />}
        </button>

        {expanded && (
          <div className="px-3 pb-3 border-t border-border/30">
            {/* Transport controls */}
            <div className="flex items-center gap-2 py-2 px-1">
              <button
                onClick={isPlaying ? stop : play}
                className={cn(
                  'h-7 w-7 rounded-lg flex items-center justify-center transition-colors',
                  isPlaying
                    ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                )}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
              </button>
              <button
                onClick={reset}
                className="h-7 w-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
              </button>

              {/* Time display */}
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg px-2.5 py-1">
                <span className="text-[11px] font-mono font-semibold text-foreground tabular-nums">
                  {(playheadMs / 1000).toFixed(1)}s
                </span>
                <span className="text-[9px] text-muted-foreground">/</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {(MAX_DURATION / 1000).toFixed(0)}s
                </span>
              </div>

              <div className="flex-1" />

              {/* Snap indicator */}
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Zap className="w-2.5 h-2.5" />
                <span>Snap: {SNAP_INTERVAL}ms</span>
              </div>
            </div>

            {animatedBlocks.length === 0 ? (
              <div className="py-6 text-center">
                <Zap className="w-5 h-5 mx-auto text-muted-foreground/30 mb-1" />
                <p className="text-[11px] text-muted-foreground">No animated blocks</p>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">Select a block → Interactions → add an entrance animation</p>
              </div>
            ) : (
              <ScrollArea className="w-full">
                <div className="flex" style={{ minWidth: timelineWidth + 120 }}>
                  {/* Block labels */}
                  <div className="w-[100px] shrink-0 space-y-px pt-5 overflow-hidden">
                    {blocks.map((b) => {
                      const anim = b.style?.animation;
                      const hasAnim = anim?.effect && anim.effect !== 'none';
                      return (
                        <div
                          key={b.id}
                          className={cn(
                            'h-8 flex items-center gap-1.5 px-2 text-[10px] truncate rounded-l-md',
                            hasAnim ? 'text-foreground font-medium' : 'text-muted-foreground/40'
                          )}
                          title={blockLabel(b)}
                        >
                          <span className="w-4 text-center shrink-0"><TimelineBlockIcon type={b.type} /></span>
                          <span className="truncate">{blockLabel(b)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Timeline area */}
                  <div className="flex-1 relative" style={{ width: timelineWidth }}>
                    {/* Ruler */}
                    <div className="h-5 relative border-b border-border/30">
                      {tickMarks.map((ms) => (
                        <div
                          key={ms}
                          className="absolute top-0 h-full"
                          style={{ left: ms * TIMELINE_SCALE }}
                        >
                          <div className="w-px h-3 bg-border/50" />
                          <span className="text-[7px] text-muted-foreground/60 ml-0.5 select-none">{(ms / 1000).toFixed(1)}s</span>
                        </div>
                      ))}
                      {/* Snap grid lines */}
                      {snapMarks.map((ms) => (
                        <div
                          key={`snap-${ms}`}
                          className="absolute top-0 h-full w-px bg-border/10"
                          style={{ left: ms * TIMELINE_SCALE }}
                        />
                      ))}
                    </div>

                    {/* Block rows */}
                    <div className="space-y-px">
                      {blocks.map((b) => {
                        const anim = b.style?.animation;
                        const delay = anim?.delay ?? 0;
                        const dur = anim?.duration ?? 500;
                        const hasAnim = anim?.effect && anim.effect !== 'none';

                        return (
                          <div key={b.id} className="h-8 relative">
                            {/* Grid background */}
                            <div className="absolute inset-0 flex">
                              {snapMarks.map((ms) => (
                                <div
                                  key={ms}
                                  className="h-full border-l border-border/5"
                                  style={{ left: ms * TIMELINE_SCALE, position: 'absolute' }}
                                />
                              ))}
                            </div>

                            {hasAnim ? (
                              <TimelineBar
                                blockId={b.id}
                                delay={delay}
                                duration={dur}
                                effect={anim!.effect}
                                easing={(anim as any)?.easing || 'ease'}
                                onChangeDelay={(d) =>
                                  updateBlock(activeSlideId, b.id, {
                                    style: { ...b.style, animation: { ...anim!, delay: d } },
                                  } as any)
                                }
                                onChangeDuration={(d) =>
                                  updateBlock(activeSlideId, b.id, {
                                    style: { ...b.style, animation: { ...anim!, duration: d } },
                                  } as any)
                                }
                                onChangeEasing={(e) =>
                                  updateBlock(activeSlideId, b.id, {
                                    style: { ...b.style, animation: { ...anim!, easing: e } },
                                  } as any)
                                }
                                showEasing={showEasing === b.id}
                                onToggleEasing={() => setShowEasing(showEasing === b.id ? null : b.id)}
                              />
                            ) : (
                              <div className="absolute inset-y-1 left-0 right-0 bg-muted/10 rounded" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Playhead */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-primary z-10 pointer-events-none"
                      style={{ left: playheadMs * TIMELINE_SCALE }}
                    >
                      <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-primary rounded-full shadow-md shadow-primary/30" />
                      <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-primary rounded-full animate-ping opacity-30" />
                    </div>
                  </div>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineBar({
  blockId,
  delay,
  duration,
  effect,
  easing,
  onChangeDelay,
  onChangeDuration,
  onChangeEasing,
  showEasing,
  onToggleEasing,
}: {
  blockId: string;
  delay: number;
  duration: number;
  effect: string;
  easing: string;
  onChangeDelay: (d: number) => void;
  onChangeDuration: (d: number) => void;
  onChangeEasing: (e: string) => void;
  showEasing: boolean;
  onToggleEasing: () => void;
}) {
  const left = delay * TIMELINE_SCALE;
  const width = Math.max(duration * TIMELINE_SCALE, 16);
  const dragRef = useRef<{ type: 'move' | 'resize'; startX: number; origDelay: number; origDur: number } | null>(null);

  const snapToGrid = (ms: number) => Math.round(ms / SNAP_INTERVAL) * SNAP_INTERVAL;

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { type, startX: e.clientX, origDelay: delay, origDur: duration };

    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dMs = dx / TIMELINE_SCALE;

      if (dragRef.current.type === 'move') {
        const raw = dragRef.current.origDelay + dMs;
        onChangeDelay(Math.max(0, Math.min(MAX_DURATION - duration, snapToGrid(raw))));
      } else {
        const raw = dragRef.current.origDur + dMs;
        onChangeDuration(Math.max(100, Math.min(MAX_DURATION - delay, snapToGrid(raw))));
      }
    };

    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const EFFECT_COLORS: Record<string, { bg: string; border: string }> = {
    'fade-in': { bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
    'fade-up': { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50' },
    'slide-in-left': { bg: 'bg-violet-500/20', border: 'border-violet-500/50' },
    'slide-in-right': { bg: 'bg-violet-500/20', border: 'border-violet-500/50' },
    'scale-in': { bg: 'bg-amber-500/20', border: 'border-amber-500/50' },
    'bounce': { bg: 'bg-rose-500/20', border: 'border-rose-500/50' },
  };

  const EFFECT_DOT: Record<string, string> = {
    'fade-in': 'bg-blue-500',
    'fade-up': 'bg-emerald-500',
    'slide-in-left': 'bg-violet-500',
    'slide-in-right': 'bg-violet-500',
    'scale-in': 'bg-amber-500',
    'bounce': 'bg-rose-500',
  };

  const colors = EFFECT_COLORS[effect] || { bg: 'bg-primary/20', border: 'border-primary/50' };
  const dotColor = EFFECT_DOT[effect] || 'bg-primary';

  return (
    <>
      <div
        className={cn(
          'absolute inset-y-1 rounded-md cursor-grab active:cursor-grabbing flex items-center border',
          colors.bg, colors.border,
          'hover:shadow-sm transition-shadow'
        )}
        style={{ left, width }}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
        title={`${effect} — ${delay}ms + ${duration}ms (${easing})`}
      >
        {/* Effect indicator dot */}
        <div className={cn('w-1.5 h-1.5 rounded-full ml-1.5 shrink-0', dotColor)} />
        <span className="text-[8px] text-foreground/70 px-1 truncate select-none font-medium">{effect}</span>

        {/* Easing button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleEasing(); }}
          className="ml-auto mr-1 p-0.5 rounded hover:bg-foreground/10 shrink-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Settings2 className="w-2.5 h-2.5 text-foreground/40" />
        </button>

        {/* Resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-foreground/10 rounded-r-md"
          onMouseDown={(e) => handleMouseDown(e, 'resize')}
        />
      </div>

      {/* Easing dropdown */}
      {showEasing && (
        <div
          className="absolute z-50 bg-white dark:bg-card rounded-lg border border-border/50 shadow-lg py-1 w-[140px]"
          style={{ left: left + width + 4, top: 0 }}
        >
          <div className="px-2 py-1 text-[8px] font-semibold text-muted-foreground uppercase tracking-wider">Easing</div>
          {EASING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChangeEasing(opt.value); onToggleEasing(); }}
              className={cn(
                'w-full text-left px-2 py-1 text-[10px] hover:bg-muted/50 transition-colors',
                easing === opt.value ? 'text-primary font-medium' : 'text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

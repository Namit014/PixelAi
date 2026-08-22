import { useRef, useEffect, useCallback, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSvgAnimationStore } from '@/stores/svgAnimationStore';
import { buildTimeline } from '@/lib/svgAnimationEngine';

interface SvgAnimationTimelineProps {
  svgElement: SVGElement | HTMLElement | null;
}

export function SvgAnimationTimeline({ svgElement }: SvgAnimationTimelineProps) {
  const { activeAnimationId, isPlaying, currentTime, animationConfigs, play, pause, seek } = useSvgAnimationStore();
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const rafRef = useRef<number>(0);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const config = activeAnimationId ? animationConfigs.get(activeAnimationId) : null;
  const duration = config?.duration || 0.7;

  // Rebuild GSAP timeline when config changes
  useEffect(() => {
    if (!svgElement || !config) return;
    timelineRef.current?.kill();
    timelineRef.current = buildTimeline(svgElement, config);
    return () => { timelineRef.current?.kill(); };
  }, [svgElement, config]);

  // Play / pause
  useEffect(() => {
    const tl = timelineRef.current;
    if (!tl) return;

    if (isPlaying) {
      tl.play();
      const tick = () => {
        seek(tl.time());
        if (tl.isActive()) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          pause();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      tl.pause();
      cancelAnimationFrame(rafRef.current);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, seek, pause]);

  // Scrub
  useEffect(() => {
    if (!dragging && timelineRef.current && !isPlaying) {
      timelineRef.current.time(currentTime);
    }
  }, [currentTime, dragging, isPlaying]);

  const handleScrubberMouse = useCallback((e: React.MouseEvent) => {
    if (!scrubberRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = pct * duration;
    seek(t);
    timelineRef.current?.time(t);
  }, [duration, seek]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    handleScrubberMouse(e);

    const onMove = (ev: MouseEvent) => {
      if (!scrubberRef.current) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const t = pct * duration;
      seek(t);
      timelineRef.current?.time(t);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [duration, seek, handleScrubberMouse]);

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      className="flex items-center gap-2 bg-background/95 backdrop-blur-md border border-border rounded-lg px-3 py-2"
      style={{ minWidth: 260 }}
    >
      {/* Play / Pause */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 shrink-0"
        onClick={() => (isPlaying ? pause() : play())}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </Button>

      {/* Time label left */}
      <span className="text-[10px] text-muted-foreground tabular-nums w-6 text-right shrink-0">
        {currentTime.toFixed(1)}
      </span>

      {/* Scrubber track */}
      <div
        ref={scrubberRef}
        className="relative flex-1 h-5 cursor-pointer flex items-center"
        onMouseDown={handleMouseDown}
      >
        {/* Track background */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-muted" />
        {/* Filled portion */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-primary"
          style={{ width: `${progress * 100}%` }}
        />
        {/* Tick marks */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 w-px h-2 bg-muted-foreground/30"
            style={{ left: `${(i / 6) * 100}%` }}
          />
        ))}
        {/* Playhead */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-destructive border-2 border-background shadow-sm"
          style={{ left: `${progress * 100}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* Time label right */}
      <span className="text-[10px] text-muted-foreground tabular-nums w-6 shrink-0">
        {duration.toFixed(1)}
      </span>
    </div>
  );
}

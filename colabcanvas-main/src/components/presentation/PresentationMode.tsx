import { useState, useEffect, useCallback } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import { SlideRenderer } from './SlideRenderer';
import { PresenterView } from './PresenterView';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

export type PresentMode = 'tab' | 'fullscreen' | 'presenter';

interface Props {
  onExit: () => void;
  mode?: PresentMode;
  isFreeUser?: boolean;
}

const transitionVariants: Record<string, any> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.5 },
  },
  slide: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 },
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
  zoom: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.2, opacity: 0 },
    transition: { duration: 0.4 },
  },
  morph: {
    initial: { scale: 0.95, opacity: 0, filter: 'blur(4px)' },
    animate: { scale: 1, opacity: 1, filter: 'blur(0px)' },
    exit: { scale: 1.05, opacity: 0, filter: 'blur(4px)' },
    transition: { duration: 0.5 },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
    transition: { duration: 0 },
  },
};

export function PresentationMode({ onExit, mode = 'fullscreen', isFreeUser = true }: Props) {
  const slides = usePresentationStore((s) => s.slides);
  const tokens = usePresentationStore((s) => s.designTokens);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [direction, setDirection] = useState(1);
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [animationKey, setAnimationKey] = useState(0);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((i) => {
      const next = Math.min(i + 1, slides.length - 1);
      if (next !== i) setAnimationKey((k) => k + 1);
      return next;
    });
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((i) => {
      const prev = Math.max(i - 1, 0);
      if (prev !== i) setAnimationKey((k) => k + 1);
      return prev;
    });
  }, []);

  // Fullscreen + keyboard
  useEffect(() => {
    if (mode === 'presenter') return; // PresenterView handles its own

    if (mode === 'fullscreen') {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onExit(); return; }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
      if (e.key === 'n' || e.key === 'N') { setShowNotes((v) => !v); }
    };

    const handleFullscreenChange = () => {
      if (mode === 'fullscreen' && !document.fullscreenElement) onExit();
    };

    document.addEventListener('keydown', handleKey);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (mode === 'fullscreen' && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onExit, goNext, goPrev, mode]);

  // Responsive scale
  useEffect(() => {
    const onResize = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auto-hide cursor
  useEffect(() => {
    if (mode === 'presenter') return;
    let timer: ReturnType<typeof setTimeout>;
    const handleMove = () => {
      setCursorHidden(false);
      clearTimeout(timer);
      timer = setTimeout(() => setCursorHidden(true), 3000);
    };
    window.addEventListener('mousemove', handleMove);
    return () => { window.removeEventListener('mousemove', handleMove); clearTimeout(timer); };
  }, [mode]);

  // Delegate to PresenterView for presenter mode
  if (mode === 'presenter') {
    return <PresenterView onExit={onExit} isFreeUser={isFreeUser} />;
  }

  const slide = slides[currentIndex];
  if (!slide) return null;

  const headerOffset = mode === 'tab' ? 56 : 0;
  const notesHeight = showNotes ? 160 : 0;
  const availH = dimensions.h - notesHeight - headerOffset;
  const scale = Math.min(dimensions.w / 1920, availH / 1080);

  const transition = slide.animationConfig?.transition || 'fade';
  const variant = transitionVariants[transition] || transitionVariants.fade;

  const progressPct = slides.length > 1 ? (currentIndex / (slides.length - 1)) * 100 : 100;

  return (
    <div
      className="fixed inset-0 z-[999] bg-black flex flex-col"
      style={{
        cursor: cursorHidden ? 'none' : 'default',
        top: headerOffset,
      }}
    >
      {/* Slide area */}
      <div className="flex-1 flex items-center justify-center relative" onClick={goNext}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`slide-${currentIndex}-${animationKey}`}
            initial={variant.initial}
            animate={variant.animate}
            exit={variant.exit}
            transition={variant.transition}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <SlideRenderer
              slide={slide}
              tokens={tokens}
              scale={scale}
              isActive={false}
              onClick={() => {}}
              readOnly
              showWatermark={isFreeUser}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-[3px] bg-white/30 transition-all duration-300"
        style={{ width: `${progressPct}%`, opacity: cursorHidden ? 0 : 0.8 }}
      />

      {/* Bottom controls */}
      <div
        className="absolute bottom-4 left-0 right-0 flex items-center justify-between px-6"
        style={{ opacity: cursorHidden ? 0 : 1, transition: 'opacity 0.3s', pointerEvents: cursorHidden ? 'none' : 'auto' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); setShowNotes((v) => !v); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${showNotes ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Notes
          </button>
        </div>

        <div className="text-white/50 text-sm font-mono">
          {currentIndex + 1} / {slides.length}
        </div>

        {/* Slide dots */}
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); setAnimationKey((k) => k + 1); }}
              className={`h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50 w-2'}`}
            />
          ))}
        </div>
      </div>

      {/* Speaker Notes Panel */}
      <div
        className="transition-all duration-300 overflow-hidden bg-zinc-900/95 backdrop-blur-sm border-t border-white/10"
        style={{ height: notesHeight, opacity: showNotes ? 1 : 0 }}
      >
        <div className="p-4 h-full overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Speaker Notes</span>
            <span className="text-[11px] text-white/30">Press N to toggle</span>
          </div>
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
            {slide.speakerNotes || 'No speaker notes for this slide.'}
          </p>
        </div>
      </div>

      {/* Keyboard hints on first slide */}
      {currentIndex === 0 && !cursorHidden && (
        <div className="absolute top-4 right-4 text-white/30 text-[11px] font-mono space-y-0.5">
          <div>← → Navigate</div>
          <div>N Toggle notes</div>
          <div>ESC Exit</div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import { SlideRenderer } from './SlideRenderer';
import { ChevronLeft, ChevronRight, X, Clock, Minus, Plus, Type } from 'lucide-react';

interface Props {
  onExit: () => void;
  isFreeUser?: boolean;
}

export function PresenterView({ onExit, isFreeUser = true }: Props) {
  const slides = usePresentationStore((s) => s.slides);
  const tokens = usePresentationStore((s) => s.designTokens);
  const title = usePresentationStore((s) => s.title);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notesFontSize, setNotesFontSize] = useState(16);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState('00:00');
  const [currentTime, setCurrentTime] = useState('');
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight });

  const goNext = useCallback(() => setCurrentIndex((i) => Math.min(i + 1, slides.length - 1)), [slides.length]);
  const goPrev = useCallback(() => setCurrentIndex((i) => Math.max(i - 1, 0)), []);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Date.now() - startTime;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onExit(); return; }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onExit, goNext, goPrev]);

  // Responsive
  useEffect(() => {
    const onResize = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Fullscreen
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    const handleFs = () => { if (!document.fullscreenElement) onExit(); };
    document.addEventListener('fullscreenchange', handleFs);
    return () => {
      document.removeEventListener('fullscreenchange', handleFs);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onExit]);

  const slide = slides[currentIndex];
  const nextSlide = slides[currentIndex + 1];
  if (!slide) return null;

  // Layout: left 65% for current slide, right 35% for controls
  const leftWidth = dimensions.w * 0.63;
  const rightWidth = dimensions.w * 0.37;
  const mainScale = Math.min((leftWidth - 40) / 1920, (dimensions.h - 120) / 1080);
  const nextScale = Math.min((rightWidth - 40) / 1920, 200 / 1080);
  const filmstripScale = 80 / 1080;

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <div className="h-12 flex items-center justify-between px-4 bg-zinc-900 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <span className="text-white/50 text-sm font-medium truncate max-w-[200px]">{title}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white/60 text-sm font-mono">
            <Clock className="w-4 h-4" />
            <span>{elapsed}</span>
            <span className="text-white/30">•</span>
            <span className="text-white/40">{currentTime}</span>
          </div>
        </div>
        <div className="text-white/50 text-sm font-mono">
          {currentIndex + 1} / {slides.length}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Current slide */}
        <div className="flex-1 flex items-center justify-center p-5" style={{ width: leftWidth }}>
          <SlideRenderer
            slide={slide}
            tokens={tokens}
            scale={mainScale}
            isActive={false}
            onClick={goNext}
            readOnly
            showWatermark={isFreeUser}
          />
        </div>

        {/* Right: Controls panel */}
        <div className="flex flex-col border-l border-white/10 bg-zinc-900/50" style={{ width: rightWidth }}>
          {/* Next slide preview */}
          <div className="p-3 border-b border-white/10">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2">Next Slide</div>
            {nextSlide ? (
              <div className="flex justify-center cursor-pointer" onClick={goNext}>
                <SlideRenderer
                  slide={nextSlide}
                  tokens={tokens}
                  scale={nextScale}
                  isActive={false}
                  onClick={goNext}
                  readOnly
                  showWatermark={isFreeUser}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[100px] text-white/20 text-sm">
                End of presentation
              </div>
            )}
          </div>

          {/* Speaker Notes */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Speaker Notes</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setNotesFontSize(s => Math.max(12, s - 2))}
                  className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <Type className="w-3.5 h-3.5 text-white/30" />
                <button
                  onClick={() => setNotesFontSize(s => Math.min(28, s + 2))}
                  className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <p
                className="text-white/70 leading-relaxed whitespace-pre-wrap"
                style={{ fontSize: notesFontSize }}
              >
                {slide.speakerNotes || 'No speaker notes for this slide.'}
              </p>
            </div>
          </div>

          {/* Navigation controls */}
          <div className="p-3 border-t border-white/10 flex items-center justify-center gap-3">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-1">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white w-5' : 'bg-white/30 hover:bg-white/50 w-2'}`}
                />
              ))}
            </div>
            <button
              onClick={goNext}
              disabled={currentIndex === slides.length - 1}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom filmstrip */}
      <div className="h-[70px] bg-zinc-900 border-t border-white/10 flex items-center px-4 gap-2 overflow-x-auto shrink-0">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentIndex(i)}
            className={`shrink-0 rounded overflow-hidden border-2 transition-all ${
              i === currentIndex ? 'border-white' : 'border-transparent hover:border-white/30'
            }`}
            style={{ width: 80 * (1920 / 1080), height: 54 }}
          >
            <div style={{ transform: `scale(${filmstripScale})`, transformOrigin: 'top left', width: 1920, height: 1080 }}>
              <SlideRenderer
                slide={s}
                tokens={tokens}
                scale={1}
                isActive={false}
                onClick={() => {}}
                readOnly
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

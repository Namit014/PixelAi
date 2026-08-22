import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SlideRenderer } from '@/components/presentation/SlideRenderer';
import type { Slide, DesignTokens } from '@/types/presentation';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import watermarkBadge from '@/assets/made_with_colab_badge.svg';

export default function PresentationView() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHints, setShowHints] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!shareToken) { setError('Invalid link'); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from('presentations')
        .select('title, slides, design_tokens')
        .eq('share_token', shareToken)
        .eq('is_public', true)
        .single();

      if (err || !data) { setError('Presentation not found or not public'); setLoading(false); return; }
      setTitle(data.title);
      setSlides(data.slides as any as Slide[]);
      setTokens(data.design_tokens as any as DesignTokens);
      setLoading(false);
    };
    load();
  }, [shareToken]);

  // Set document title for shared links
  useEffect(() => {
    if (title) document.title = `${title} — Colab`;
    return () => { document.title = 'Colab'; };
  }, [title]);

  // Hide hints after 4s
  useEffect(() => {
    if (showHints) {
      const t = setTimeout(() => setShowHints(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showHints]);

  const goNext = useCallback(() => setCurrentIndex((i) => Math.min(i + 1, slides.length - 1)), [slides.length]);
  const goPrev = useCallback(() => setCurrentIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (error || !tokens) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-lg font-medium text-foreground mb-2">{error || 'Error loading'}</p>
        <p className="text-sm text-muted-foreground">This presentation may have been removed or is not public.</p>
      </div>
    </div>
  );

  const slide = slides[currentIndex];
  if (!slide) return null;

  const scale = Math.min((window.innerWidth - 120) / 1920, (window.innerHeight - 120) / 1080);
  const progressPct = slides.length > 1 ? (currentIndex / (slides.length - 1)) * 100 : 100;

  return (
    <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-4 left-4 text-white/50 text-sm font-medium">{title}</div>
      <div className="absolute top-4 right-4 text-white/50 text-sm font-mono">{currentIndex + 1} / {slides.length}</div>

      <SlideRenderer
        slide={slide}
        tokens={tokens}
        scale={scale}
        isActive={false}
        onClick={goNext}
        readOnly
        showWatermark
      />

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-[3px] bg-white/30 transition-all duration-300" style={{ width: `${progressPct}%` }} />

      {/* Navigation */}
      <div className="absolute bottom-6 flex items-center gap-4">
        <button onClick={goPrev} disabled={currentIndex === 0} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'}`} />
          ))}
        </div>
        <button onClick={goNext} disabled={currentIndex === slides.length - 1} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 transition-all">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Keyboard hints */}
      {showHints && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg text-white/60 text-xs font-mono animate-fade-in">
          ← → Navigate  •  Space Next
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import { Sparkles, Loader2, Type, Image, BarChart3, List, Quote, Rocket, FileText, GraduationCap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Slide, DesignTokens } from '@/types/presentation';

const CATEGORY_MAP: Record<string, string> = {
  pitch: 'pitch-deck',
  report: 'report',
  proposal: 'pitch-deck',
  education: 'report',
  blank: '',
};

const templates = [
  { id: 'pitch', label: 'Pitch Deck', icon: Rocket },
  { id: 'report', label: 'Report', icon: BarChart3 },
  { id: 'proposal', label: 'Proposal', icon: FileText },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'blank', label: 'Blank', icon: Plus },
];

export function EmptyDeckPrompt() {
  const [topic, setTopic] = useState('');
  const setSlides = usePresentationStore((s) => s.setSlides);
  const setTitle = usePresentationStore((s) => s.setTitle);
  const setIsGenerating = usePresentationStore((s) => s.setIsGenerating);
  const isGenerating = usePresentationStore((s) => s.isGenerating);
  const setDesignTokens = usePresentationStore((s) => s.setDesignTokens);
  const addSlide = usePresentationStore((s) => s.addSlide);
  const { toast } = useToast();
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

  const handleTemplateClick = async (templateId: string) => {
    if (templateId === 'blank') {
      addSlide({
        id: crypto.randomUUID(),
        layout: 'blank' as any,
        contentBlocks: [],
        background: {},
      } as any);
      return;
    }

    const category = CATEGORY_MAP[templateId];
    if (!category) return;

    setLoadingTemplate(templateId);
    try {
      const { data, error } = await supabase
        .from('cosmo_templates')
        .select('*')
        .eq('category', category)
        .eq('is_featured', true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.slides && Array.isArray(data.slides) && data.slides.length > 0) {
        setSlides(data.slides as unknown as Slide[]);
        if (data.design_tokens) {
          setDesignTokens(data.design_tokens as unknown as DesignTokens);
        }
        setTitle(data.title || 'Untitled Presentation');
        toast({ title: 'Template loaded', description: `"${data.title}" applied with ${data.slides.length} slides` });
      } else {
        // Fallback to blank if no templates exist
        addSlide({
          id: crypto.randomUUID(),
          layout: 'blank' as any,
          contentBlocks: [],
          background: {},
        } as any);
      }
    } catch (err) {
      console.error('Template load error:', err);
      addSlide({
        id: crypto.randomUUID(),
        layout: 'blank' as any,
        contentBlocks: [],
        background: {},
      } as any);
    } finally {
      setLoadingTemplate(null);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-presentation', {
        body: { topic: topic.trim() },
      });
      if (error) throw error;
      if (data?.slides) {
        setSlides(data.slides);
        if (data.title) setTitle(data.title);
        toast({ title: 'Presentation generated', description: `${data.slides.length} slides created` });
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      toast({ title: 'Generation failed', description: err.message || 'Please try again', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col items-center py-12 px-6 gap-6 max-w-3xl mx-auto">

        {/* Card 1: Project header */}
        <div className="w-full rounded-2xl border border-border bg-background p-6">
          <h2 className="text-lg font-light text-foreground">Untitled</h2>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Type className="h-3.5 w-3.5" />
              <Image className="h-3.5 w-3.5" />
              <BarChart3 className="h-3.5 w-3.5" />
              <List className="h-3.5 w-3.5" />
              <Quote className="h-3.5 w-3.5" />
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-muted" />
              <span className="text-[11px] text-muted-foreground">by Author</span>
            </div>
            <span className="text-[11px] text-muted-foreground">· last edited just now</span>
          </div>
        </div>

        {/* Card 2: Purple gradient generation card */}
        <div
          className="w-full rounded-2xl p-8 flex flex-col items-center gap-6"
          style={{
            background: 'linear-gradient(135deg, hsl(260 60% 55%), hsl(280 70% 50%))',
          }}
        >
          <h3 className="text-2xl font-light text-white/90">Untitled Card</h3>

          <div className="w-full max-w-md flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Describe what you want to present..."
                className="flex-1 h-10 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-4 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/40 transition-colors duration-150"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerate();
                }}
              />
              <Button
                onClick={handleGenerate}
                disabled={!topic.trim() || isGenerating}
                size="sm"
                className="h-10 px-5 rounded-lg bg-white text-foreground hover:bg-white/90 text-xs font-medium gap-1.5 transition-colors duration-150"
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    Generate
                    <Sparkles className="h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Template row */}
          <div className="w-full max-w-md flex flex-col gap-2">
            <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider text-center">Or choose a template</span>
            <div className="grid grid-cols-5 gap-2">
              {templates.map((t) => {
                const Icon = t.icon;
                const isLoading = loadingTemplate === t.id;
                return (
                <button
                  key={t.id}
                  onClick={() => handleTemplateClick(t.id)}
                  disabled={!!loadingTemplate}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white/10 border border-white/10 hover:bg-white/20 transition-colors duration-150 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 text-white/80 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 text-white/80" />
                  )}
                  <span className="text-[9px] text-white/60 font-medium">{t.label}</span>
                </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 3: Next card hint (partially visible) */}
        <div className="w-full rounded-2xl border border-border bg-background p-6 opacity-40">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-48 bg-muted rounded mt-2" />
        </div>

      </div>
    </div>
  );
}

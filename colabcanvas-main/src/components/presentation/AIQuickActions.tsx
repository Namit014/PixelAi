import React, { useState, useCallback } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import {
  Sparkles, FileText, Lightbulb, ImagePlus, List,
  Minimize2, Maximize2, StickyNote, Wand2, Palette,
  LayoutGrid, PenLine, Zap, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AIAction } from '@/types/presentation';

const COSMO_AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cosmo-agent`;

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  prompt: string;
  category: 'content' | 'design' | 'structure';
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'rewrite', label: 'Rewrite', icon: PenLine, prompt: 'Rewrite the current slide to be more impactful and compelling.', category: 'content' },
  { id: 'shorten', label: 'Shorten', icon: Minimize2, prompt: 'Shorten and condense the current slide content while keeping key points.', category: 'content' },
  { id: 'expand', label: 'Expand', icon: Maximize2, prompt: 'Expand the current slide with more detail, examples, and supporting points.', category: 'content' },
  { id: 'bullets', label: 'To Bullets', icon: List, prompt: 'Convert the current slide content into clear bullet points.', category: 'content' },
  { id: 'clarity', label: 'Clarify', icon: Lightbulb, prompt: 'Improve the clarity and readability of the current slide.', category: 'content' },
  { id: 'notes', label: 'Speaker Notes', icon: StickyNote, prompt: 'Generate speaker notes for the current slide.', category: 'content' },
  { id: 'visual', label: 'Add Visual', icon: ImagePlus, prompt: 'Add a relevant visual element (chart, icon-grid, or image) to this slide.', category: 'design' },
  { id: 'restyle', label: 'Restyle', icon: Palette, prompt: 'Restyle this slide with better colors, spacing, and visual hierarchy.', category: 'design' },
  { id: 'add-section', label: 'Add Section', icon: LayoutGrid, prompt: 'Add a new section of 2-3 slides expanding on the current topic.', category: 'structure' },
  { id: 'generate', label: 'New Deck', icon: Sparkles, prompt: 'Generate a full presentation deck. What topic should I create?', category: 'structure' },
];

export function AIQuickActions() {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'content' | 'design' | 'structure'>('content');
  const activeSlideId = usePresentationStore((s) => s.activeSlideId);
  const slides = usePresentationStore((s) => s.slides);
  const designTokens = usePresentationStore((s) => s.designTokens);
  const addChatMessage = usePresentationStore((s) => s.addChatMessage);
  const activeBrandContext = usePresentationStore((s) => s.activeBrandContext);

  const executeAction = useCallback(async (action: QuickAction) => {
    if (runningId) return;
    setRunningId(action.id);

    const slide = slides.find((s) => s.id === activeSlideId);
    const context: any = {
      totalSlides: slides.length,
      currentSlideIndex: slides.findIndex((s) => s.id === activeSlideId) + 1,
      designTokens,
    };
    if (slide) {
      context.currentSlide = {
        layoutId: slide.layoutId,
        blocks: slide.contentBlocks.map((b) => ({ type: b.type, ...(b as any) })),
      };
    }

    addChatMessage({ id: crypto.randomUUID(), role: 'user', content: `⚡ ${action.label}`, timestamp: Date.now() });

    try {
      const resp = await fetch(COSMO_AGENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: action.prompt }],
          action: action.id,
          context,
          brandContext: activeBrandContext,
        }),
      });

      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const result = await resp.json();

      if (result.tool_calls?.length) {
        // Process tool calls (reuse existing logic from SlideAIPanel)
        for (const tc of result.tool_calls) {
          if (tc.name === 'create_slides' && tc.arguments?.slides) {
            const mapped = tc.arguments.slides.map((s: any) => ({
              id: crypto.randomUUID(),
              layoutId: s.layoutId,
              speakerNotes: s.speakerNotes || '',
              animationConfig: { transition: 'fade', elementAnimations: [] },
              background: s.background || undefined,
              decorations: s.decorations || undefined,
              contentBlocks: (s.contentBlocks || []).map((block: any) => ({
                id: crypto.randomUUID(),
                regionId: block.regionId,
                type: block.type,
                ...block,
              })),
            }));
            usePresentationStore.getState().setSlides(mapped);
            toast.success(`Generated ${mapped.length} slides`);
          }
          if (tc.name === 'set_theme' && tc.arguments) {
            usePresentationStore.getState().setDesignTokens(tc.arguments);
            toast.success('Theme updated');
          }
        }
      }

      const text = result.content || 'Done!';
      addChatMessage({ id: crypto.randomUUID(), role: 'assistant', content: text, timestamp: Date.now() });
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    }
    setRunningId(null);
  }, [runningId, slides, activeSlideId, designTokens, addChatMessage, activeBrandContext]);

  const categories = [
    { id: 'content' as const, label: 'Content' },
    { id: 'design' as const, label: 'Design' },
    { id: 'structure' as const, label: 'Structure' },
  ];

  const filtered = QUICK_ACTIONS.filter((a) => a.category === activeCategory);

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex gap-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'flex-1 py-1.5 text-[10px] font-medium rounded-lg transition-colors',
              activeCategory === cat.id
                ? 'bg-foreground text-background'
                : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Action grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map((action) => {
          const Icon = action.icon;
          const isRunning = runningId === action.id;
          return (
            <button
              key={action.id}
              onClick={() => executeAction(action)}
              disabled={!!runningId}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border text-left transition-all',
                'hover:bg-muted/50 hover:border-foreground/20',
                isRunning && 'bg-primary/10 border-primary/30',
                runningId && !isRunning && 'opacity-40 pointer-events-none'
              )}
            >
              {isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
              ) : (
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="text-[10px] font-medium text-foreground">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

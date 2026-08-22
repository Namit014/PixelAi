import { usePresentationStore } from '@/stores/presentationStore';
import { SlideRenderer } from './SlideRenderer';
import { Plus, ChevronDown, X, Copy, Trash2, MoreHorizontal, PanelRight } from 'lucide-react';
import { slideLayouts } from './LayoutRegistry';
import type { Slide } from '@/types/presentation';
import { useState, useEffect } from 'react';
import GridViewIcon from '@/assets/icons/grid-view.svg?react';
import ThumbnailViewIcon from '@/assets/icons/thumbnail-view.svg?react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function createEmptySlide(layoutId: string): Slide {
  const layout = slideLayouts.find((l) => l.id === layoutId) ?? slideLayouts[0];
  return {
    id: crypto.randomUUID(),
    layoutId,
    contentBlocks: layout.regions.map((r) => {
      const base = { id: crypto.randomUUID(), regionId: r.id };
      if (r.accepts.includes('title')) return { ...base, type: 'title' as const, text: '', level: 1 as const };
      if (r.accepts.includes('subtitle')) return { ...base, type: 'subtitle' as const, text: '' };
      if (r.accepts.includes('bullets')) return { ...base, type: 'bullets' as const, items: [''] };
      return { ...base, type: 'subtitle' as const, text: '' };
    }),
    speakerNotes: '',
    animationConfig: { transition: 'fade', elementAnimations: [] },
  };
}

export function SlideThumbnailPanel() {
  const slides = usePresentationStore((s) => s.slides);
  const tokens = usePresentationStore((s) => s.designTokens);
  const activeSlideId = usePresentationStore((s) => s.activeSlideId);
  const setActiveSlide = usePresentationStore((s) => s.setActiveSlide);
  const addSlide = usePresentationStore((s) => s.addSlide);
  const removeSlide = usePresentationStore((s) => s.removeSlide);
  const duplicateSlide = usePresentationStore((s) => s.duplicateSlide);
  const [visible, setVisible] = useState(true);
  const [listView, setListView] = useState(false);

  // Keyboard shortcut to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleAddSlide = (layoutId?: string) => {
    const newSlide = createEmptySlide(layoutId || 'content-left');
    addSlide(newSlide);
  };

  // Collapsed state — show small expand button
  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="absolute right-[420px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg border border-border bg-background flex items-center justify-center z-20 hover:bg-muted transition-colors"
        title="Show slides (T)"
      >
        <PanelRight className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="absolute right-[420px] top-1/2 -translate-y-1/2 w-[150px] max-h-[50vh] rounded-xl border border-border bg-background flex flex-col z-20 min-h-0">
      {/* Header */}
      <div className="px-2.5 py-2 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setListView(false)}
            className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${!listView ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            title="Thumbnail view"
          >
            <ThumbnailViewIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setListView(true)}
            className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${listView ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            title="List view"
          >
            <GridViewIcon className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors duration-150"
          title="Hide slides (T)"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* + New button with layout dropdown */}
      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="mx-2 mt-2 flex items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg py-1.5 transition-colors duration-150 w-[calc(100%-16px)]">
              <Plus className="h-3 w-3" />
              New
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {slideLayouts.slice(0, 8).map((layout) => (
              <DropdownMenuItem key={layout.id} onClick={() => handleAddSlide(layout.id)} className="text-xs">
                {layout.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Thumbnails / List — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-1.5 p-2">
          {slides.map((slide, index) => (
            <div key={slide.id} className="relative group">
              <button
                onClick={() => setActiveSlide(slide.id)}
                className="relative text-left rounded-lg overflow-hidden transition-all duration-150 w-full"
                style={{
                  outline: activeSlideId === slide.id ? '2px solid hsl(var(--foreground))' : '1px solid hsl(var(--border))',
                  outlineOffset: 1,
                }}
              >
                {listView ? (
                  <div className="px-2 py-2 text-[10px] font-medium text-foreground">
                    <span className="text-muted-foreground mr-1.5">{index + 1}.</span>
                    Slide {index + 1}
                  </div>
                ) : (
                  <>
                    <div className="absolute top-0.5 left-1 text-[8px] font-medium text-muted-foreground z-10">
                      {index + 1}
                    </div>
                    <SlideRenderer
                      slide={slide}
                      tokens={tokens}
                      scale={0.07}
                      isActive={false}
                      onClick={() => {}}
                    />
                  </>
                )}
              </button>

              {/* Context menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="absolute top-1 right-1 h-5 w-5 rounded bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => duplicateSlide(slide.id)} className="text-xs">
                    <Copy className="h-3 w-3 mr-2" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddSlide('content-left')} className="text-xs">
                    <Plus className="h-3 w-3 mr-2" /> Add after
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => removeSlide(slide.id)} className="text-xs text-destructive">
                    <Trash2 className="h-3 w-3 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { createEmptySlide };

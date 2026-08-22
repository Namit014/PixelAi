import { useState, useCallback } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import { SlideRenderer } from './SlideRenderer';
import { Plus, Copy, Trash2, Grid3x3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { slideLayouts } from './LayoutRegistry';

export function SlideGridOverview() {
  const slides = usePresentationStore((s) => s.slides);
  const tokens = usePresentationStore((s) => s.designTokens);
  const setActiveSlide = usePresentationStore((s) => s.setActiveSlide);
  const setViewMode = usePresentationStore((s) => s.setViewMode);
  const duplicateSlide = usePresentationStore((s) => s.duplicateSlide);
  const removeSlide = usePresentationStore((s) => s.removeSlide);
  const moveSlide = usePresentationStore((s) => s.moveSlide);
  const addSlide = usePresentationStore((s) => s.addSlide);
  const activeSlideId = usePresentationStore((s) => s.activeSlideId);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleClick = useCallback((slideId: string, e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(slideId)) next.delete(slideId);
        else next.add(slideId);
        return next;
      });
    } else {
      // Double click to navigate
      setActiveSlide(slideId);
      setViewMode('page');
    }
  }, [setActiveSlide, setViewMode]);

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIdx !== null && dragIdx !== idx) {
      moveSlide(dragIdx, idx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleBulkDelete = () => {
    selected.forEach((id) => removeSlide(id));
    setSelected(new Set());
  };

  const handleAddSlide = () => {
    const layout = slideLayouts[0];
    addSlide({
      id: crypto.randomUUID(),
      layoutId: layout.id,
      contentBlocks: [],
      speakerNotes: '',
      animationConfig: { transition: 'fade', elementAnimations: [] },
      background: {},
    } as any);
  };

  const CARD_W = 320;
  const CARD_H = (CARD_W * 9) / 16; // maintain 16:9 aspect ratio
  const thumbnailScale = CARD_W / 1920;

  return (
    <div className="h-full overflow-y-auto bg-white p-6" style={{ marginLeft: 60, marginRight: 400 }}>
      {/* Toolbar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 mb-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-xl border border-border px-4 py-2">
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
          <button
            onClick={handleBulkDelete}
            className="ml-auto flex items-center gap-1 text-xs text-destructive hover:underline"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="flex flex-wrap gap-4">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            onClick={(e) => handleClick(slide.id, e)}
            style={{ width: CARD_W }}
            className={cn(
              'group relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden flex-shrink-0',
              selected.has(slide.id)
                ? 'border-primary ring-2 ring-primary/20'
                : slide.id === activeSlideId
                  ? 'border-foreground/30'
                  : 'border-border hover:border-foreground/20',
              dragOverIdx === index && 'border-primary border-dashed',
              dragIdx === index && 'opacity-50'
            )}
          >
            {/* Slide number badge */}
            <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-md bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center text-[10px] font-bold text-foreground">
              {index + 1}
            </div>

            {/* Hover actions */}
            <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); duplicateSlide(slide.id); }}
                className="w-6 h-6 rounded-md bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                className="w-6 h-6 rounded-md bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Slide thumbnail */}
            <div className="overflow-hidden" style={{ height: CARD_H, position: 'relative' }}>
              <div style={{ transform: `scale(${thumbnailScale})`, transformOrigin: 'top left', width: 1920, height: 1080 }}>
                <SlideRenderer
                  slide={slide}
                  tokens={tokens}
                  scale={1}
                  isActive={false}
                  onClick={() => {}}
                  readOnly
                />
              </div>
            </div>

            {/* Label */}
            <div className="px-2 py-1.5 bg-background border-t border-border">
              <span className="text-[9px] text-muted-foreground truncate block">
                {slide.layoutId}
              </span>
            </div>
          </div>
        ))}

        {/* Add slide card */}
        <button
          onClick={handleAddSlide}
          className="rounded-xl border-2 border-dashed border-border hover:border-foreground/30 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground flex-shrink-0"
          style={{ width: CARD_W, height: CARD_H + 36 }}
        >
          <Plus className="w-6 h-6" />
          <span className="text-[10px] font-medium">Add Slide</span>
        </button>
      </div>
    </div>
  );
}

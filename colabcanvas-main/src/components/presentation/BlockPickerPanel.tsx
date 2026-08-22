import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';
import type { ContentBlock } from '@/types/presentation';
import { usePresentationStore } from '@/stores/presentationStore';
import { cn } from '@/lib/utils';
import { blockCategories, type BlockDef } from './blockPickerData';

interface Props {
  onClose: () => void;
  filterCategories?: string[];
  onOpenDiagram?: () => void;
}

export function BlockPickerPanel({ onClose, filterCategories, onOpenDiagram }: Props) {
  const [search, setSearch] = useState('');
  const activeSlideId = usePresentationStore(s => s.activeSlideId);
  const addBlockToSlide = usePresentationStore(s => s.addBlockToSlide);

  const filtered = useMemo(() => {
    let cats = blockCategories;
    
    // Apply category filter if provided
    if (filterCategories && filterCategories.length > 0) {
      cats = cats.filter(cat => filterCategories.some(f => cat.name.startsWith(f) || cat.name === f));
    }
    
    if (!search.trim()) return cats;
    const q = search.toLowerCase();
    return cats
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.label.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q)
        ),
      }))
      .filter(cat => cat.items.length > 0);
  }, [search, filterCategories]);

  const handleInsert = (def: BlockDef) => {
    let slideId = activeSlideId;
    
    // If no active slide, create a blank one first
    if (!slideId) {
      const newSlide = {
        id: crypto.randomUUID(),
        layout: 'blank' as const,
        contentBlocks: [],
        background: {},
      };
      usePresentationStore.getState().addSlide(newSlide as any);
      slideId = newSlide.id;
    }
    
    // Special case: open diagram builder
    if (def.id === 'diagram-builder') {
      onClose();
      onOpenDiagram?.();
      return;
    }
    const blockData = def.createBlock();
    const block = {
      ...blockData,
      id: crypto.randomUUID(),
      regionId: '',
    } as ContentBlock;
    addBlockToSlide(slideId, block);
  };

  const panelTitle = filterCategories ? filterCategories[0]?.split(' › ')[0] || 'Insert Block' : 'Insert Block';

  return (
    <div className="absolute left-16 top-4 bottom-[100px] z-50 w-[320px] rounded-xl border border-border/50 bg-background/95 backdrop-blur-md flex flex-col shadow-lg pointer-events-auto">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-sm font-semibold">{panelTitle}</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-muted/50 border-0"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 pb-3">
        <div className="space-y-4">
          {filtered.map((cat) => (
            <div key={cat.name}>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                {cat.name}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {cat.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleInsert(item)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/cosmo-block', JSON.stringify({ defId: item.id }));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-lg text-center',
                        'hover:bg-muted/80 transition-colors cursor-grab active:cursor-grabbing',
                        'border border-transparent hover:border-border/50',
                        !activeSlideId && 'opacity-40 cursor-not-allowed'
                      )}
                      disabled={!activeSlideId}
                    >
                      <div className="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                      <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">No blocks found</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

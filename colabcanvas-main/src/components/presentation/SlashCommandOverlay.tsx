import { useState, useEffect, useRef, useCallback } from 'react';
import { blockCategories, type BlockDef } from './blockPickerData';
import { usePresentationStore } from '@/stores/presentationStore';
import type { ContentBlock } from '@/types/presentation';
import { Search } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
  afterBlockId?: string | null;
  onOpenDiagram?: () => void;
}

export function SlashCommandOverlay({ isOpen, onClose, position, afterBlockId, onOpenDiagram }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const addBlockToSlide = usePresentationStore((s) => s.addBlockToSlide);
  const insertBlockAfter = usePresentationStore((s) => s.insertBlockAfter);
  const activeSlideId = usePresentationStore((s) => s.activeSlideId);

  const allItems = blockCategories.flatMap(cat =>
    cat.items.map(item => ({ ...item, category: cat.name }))
  );

  const filtered = query.trim()
    ? allItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const isolatedGroupId = usePresentationStore((s) => s.isolatedGroupId);

  const insertBlock = useCallback((def: BlockDef) => {
    if (!activeSlideId) return;
    
    // Special case: open diagram builder
    if (def.id === 'diagram-builder') {
      onClose();
      onOpenDiagram?.();
      return;
    }
    
    const blockData = def.createBlock();
    const block: ContentBlock = {
      ...blockData,
      id: crypto.randomUUID(),
      regionId: '',
    } as ContentBlock;
    
    // When in isolation mode, always use addBlockToSlide which auto-sets parentId
    if (isolatedGroupId) {
      addBlockToSlide(activeSlideId, block);
    } else if (afterBlockId) {
      insertBlockAfter(activeSlideId, afterBlockId, block);
    } else {
      addBlockToSlide(activeSlideId, block);
    }
    onClose();
  }, [activeSlideId, addBlockToSlide, insertBlockAfter, afterBlockId, onClose, onOpenDiagram, isolatedGroupId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) insertBlock(filtered[selectedIndex]);
    }
  }, [filtered, selectedIndex, insertBlock, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const style: React.CSSProperties = position
    ? { position: 'fixed', left: position.x, top: position.y, zIndex: 9999 }
    : { position: 'fixed', left: '50%', top: '30%', transform: 'translate(-50%, 0)', zIndex: 9999 };

  let currentCategory = '';

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div style={style} className="w-[320px] max-h-[400px] rounded-xl border border-border bg-popover shadow-2xl flex flex-col animate-scale-in overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search blocks..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No blocks found</div>
          )}
          {filtered.map((item, i) => {
            const showCategory = item.category !== currentCategory;
            if (showCategory) currentCategory = item.category;
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {showCategory && (
                  <div className="px-2.5 pt-2 pb-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.category}
                  </div>
                )}
                <button
                  data-index={i}
                  onClick={() => insertBlock(item)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-sm transition-colors ${
                    i === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

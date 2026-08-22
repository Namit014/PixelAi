import { useState, useCallback, memo } from 'react';
import { Eye, EyeOff, Lock, Unlock, GripVertical, X, Layers, Type, Image, BarChart3, Lightbulb, Quote, Hash, List, Clock, GitCompare, ListOrdered, Gauge, LayoutGrid, Table2, CheckSquare, Minus, Code, TrendingUp, ArrowRight, RefreshCw, Circle, Workflow, GalleryHorizontalEnd, Square, Grid3x3, Globe, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown, ToggleLeft, ToggleRight, Group, Ungroup } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePresentationStore } from '@/stores/presentationStore';
import { getLayout } from './LayoutRegistry';
import type { ContentBlock, Slide } from '@/types/presentation';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Helpers ─────────────────────────────────────────────────────────

function getBlockLabel(block: ContentBlock): string {
  if ((block as any).label) return (block as any).label;
  const type = block.type.replace(/-/g, ' ');
  return type.replace(/\b\w/g, (c) => c.toUpperCase());
}

const BLOCK_ICON_MAP: Record<string, React.ComponentType<any>> = {
  title: Type, subtitle: Type, bullets: List, image: Image, chart: BarChart3,
  callout: Lightbulb, quote: Quote, metric: Hash, 'icon-list': List, timeline: Clock,
  comparison: GitCompare, 'numbered-list': ListOrdered, progress: Gauge, 'card-grid': LayoutGrid,
  table: Table2, 'todo-list': CheckSquare, divider: Minus, code: Code, stats: TrendingUp,
  steps: ArrowRight, 'cycle-diagram': RefreshCw, 'venn-diagram': Circle, 'process-flow': Workflow,
  gallery: GalleryHorizontalEnd, 'button-block': Square, 'quote-box': Quote, 'icon-grid': Grid3x3, embed: Globe,
};

function BlockIcon({ type }: { type: string }) {
  const IconComp = BLOCK_ICON_MAP[type] || Square;
  return <IconComp className="w-3 h-3" />;
}

// ── Sortable Layer Item ─────────────────────────────────────────────

interface LayerItemProps {
  block: ContentBlock;
  slideId: string;
  isSelected: boolean;
  depth?: number;
}

const SortableLayerItem = memo(function SortableLayerItem({ block, slideId, isSelected, depth = 0 }: LayerItemProps) {
  const { setSelectedBlock, updateBlock } = usePresentationStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const isHidden = block.style?.hidden === true;
  const isLocked = block.style?.locked === true;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const toggleHidden = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateBlock(slideId, block.id, {
      style: { ...block.style, hidden: !isHidden } as any,
    } as any);
  }, [slideId, block.id, block.style, isHidden, updateBlock]);

  const toggleLocked = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateBlock(slideId, block.id, {
      style: { ...block.style, locked: !isLocked } as any,
    } as any);
  }, [slideId, block.id, block.style, isLocked, updateBlock]);

  const startRename = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(getBlockLabel(block));
    setIsEditing(true);
  }, [block]);

  const commitRename = useCallback(() => {
    if (editName.trim()) {
      updateBlock(slideId, block.id, { label: editName.trim() } as any);
    }
    setIsEditing(false);
  }, [slideId, block.id, editName, updateBlock]);

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, paddingLeft: depth * 12 }}
      onClick={() => setSelectedBlock(block.id)}
      className={cn(
        'group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors text-[11px]',
        isSelected
          ? 'bg-foreground/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
        isHidden && 'opacity-40'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 transition-opacity"
      >
        <GripVertical className="w-3 h-3" />
      </div>
      <span className="w-4 text-center shrink-0">
        {block.isGroup ? <Group className="w-3 h-3" /> : <BlockIcon type={block.type} />}
      </span>

      {isEditing ? (
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setIsEditing(false); }}
          className="flex-1 bg-muted/30 rounded px-1 text-[11px] outline-none text-foreground min-w-0"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          onDoubleClick={startRename}
          className="flex-1 truncate select-none"
        >
          {getBlockLabel(block)}
        </span>
      )}

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={toggleLocked} className="p-0.5 rounded hover:bg-muted/50">
          {isLocked
            ? <Lock className="w-2.5 h-2.5 text-yellow-500" />
            : <Unlock className="w-2.5 h-2.5" />}
        </button>
        <button onClick={toggleHidden} className="p-0.5 rounded hover:bg-muted/50">
          {isHidden
            ? <EyeOff className="w-2.5 h-2.5 text-red-400" />
            : <Eye className="w-2.5 h-2.5" />}
        </button>
      </div>
    </div>
  );
});

// ── Main Panel ──────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function CosmoLayerPanel({ onClose }: Props) {
  const { slides, activeSlideId, selectedBlockId, updateSlide } = usePresentationStore();
  const [flatMode, setFlatMode] = useState(true);

  const activeSlide = slides.find((s) => s.id === activeSlideId);
  const { setSelectedBlock } = usePresentationStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeSlide) return;

    const store = usePresentationStore.getState();
    const currentSlide = store.slides.find(s => s.id === store.activeSlideId);
    if (!currentSlide) return;

    const blocks = [...currentSlide.contentBlocks];
    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const [moved] = blocks.splice(oldIndex, 1);
    blocks.splice(newIndex, 0, moved);
    updateSlide(currentSlide.id, { contentBlocks: blocks });
    setTimeout(() => setSelectedBlock(String(active.id)), 0);
  }, [activeSlide, updateSlide, setSelectedBlock]);

  if (!activeSlide) {
    return (
      <div className="absolute left-16 top-4 bottom-[100px] w-[260px] z-40 bg-white dark:bg-card rounded-xl border border-border/50 shadow-lg flex flex-col pointer-events-auto animate-in slide-in-from-left-2 duration-200">
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold">Layers</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[11px] text-muted-foreground">No slide selected</p>
        </div>
      </div>
    );
  }

  const layout = getLayout(activeSlide.layoutId);

  // Flat mode: all blocks in z-order (reversed so top-of-stack = first in list)
  const flatBlocks = [...activeSlide.contentBlocks].reverse();

  // Grouped mode: blocks by region
  const regionMap = new Map<string, ContentBlock[]>();
  for (const block of activeSlide.contentBlocks) {
    const rid = block.regionId || 'body';
    if (!regionMap.has(rid)) regionMap.set(rid, []);
    regionMap.get(rid)!.push(block);
  }

  return (
    <div className="absolute left-16 top-4 bottom-[100px] w-[260px] z-40 bg-white dark:bg-card rounded-xl border border-border/50 shadow-lg flex flex-col pointer-events-auto animate-in slide-in-from-left-2 duration-200">
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Layers</span>
          <span className="text-[9px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
            {activeSlide.contentBlocks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFlatMode(!flatMode)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title={flatMode ? 'Switch to grouped view' : 'Switch to flat view'}
          >
            {flatMode ? <ToggleRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="px-2 py-1 border-b border-border/30">
        <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-bold">
          {flatMode ? 'Z-Order (top → bottom)' : 'By Region'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {flatMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={flatBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {flatBlocks.map((block) => (
                <SortableLayerItem
                  key={block.id}
                  block={block}
                  slideId={activeSlide.id}
                  isSelected={selectedBlockId === block.id}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <>
            {layout.regions.map((region) => {
              const blocks = regionMap.get(region.id) || [];
              if (blocks.length === 0) return null;
              return (
                <div key={region.id} className="mb-1">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    {region.label}
                    <span className="text-muted-foreground/30 ml-auto">{blocks.length}</span>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                      {blocks.map((block) => (
                        <SortableLayerItem
                          key={block.id}
                          block={block}
                          slideId={activeSlide.id}
                          isSelected={selectedBlockId === block.id}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              );
            })}
            {Array.from(regionMap.entries())
              .filter(([rid]) => !layout.regions.find((r) => r.id === rid))
              .map(([rid, blocks]) => (
                <div key={rid} className="mb-1">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    {rid}
                    <span className="text-muted-foreground/30 ml-auto">{blocks.length}</span>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                      {blocks.map((block) => (
                        <SortableLayerItem
                          key={block.id}
                          block={block}
                          slideId={activeSlide.id}
                          isSelected={selectedBlockId === block.id}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}

import { memo, useMemo, useCallback, useState, useRef } from 'react';
import type { Slide, DesignTokens, SlideDecoration, ContentBlock } from '@/types/presentation';
import watermarkBadge from '@/assets/made_with_colab_badge.svg';
import { getLayout } from './LayoutRegistry';
import { blockCategories } from './blockPickerData';
import { ContentBlockRenderer } from './ContentBlockRenderer';
import { ContentBlockEditor } from './ContentBlockEditor';
import { BlockToolbar } from './BlockToolbar';
import { InlineTextToolbar } from './InlineTextToolbar';
import { usePresentationStore } from '@/stores/presentationStore';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { AlignmentGuides, computeAlignmentGuides } from './AlignmentGuides';
import { SlideMultiSelectToolbar } from './SlideMultiSelectToolbar';

// Dynamic dimensions from store - fallback to standard
const DEFAULT_W = 1920;
const DEFAULT_H = 1080;

// ── Z-Index computation ─────────────────────────────────────────────
const BASE_Z = 10; // base z for content blocks
function computeBlockZ(block: ContentBlock, arrayIndex: number, totalBlocks: number, isSelected: boolean, isEditing: boolean): number {
  if (isSelected || isEditing) return 1000;
  // Explicit override
  if (block.style?.zIndex != null) return block.style.zIndex;
  // Array order: first = back (lowest z), last = front (highest z)
  return BASE_Z + arrayIndex;
}

interface Props {
  slide: Slide;
  tokens: DesignTokens;
  scale: number;
  isActive: boolean;
  onClick: () => void;
  readOnly?: boolean;
  showWatermark?: boolean;
}

function renderDecoration(dec: SlideDecoration, tokens: DesignTokens, idx: number) {
  const color = dec.color === 'currentAccent' ? tokens.accentColor : dec.color;
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${dec.x}%`,
    top: `${dec.y}%`,
    opacity: dec.opacity,
    pointerEvents: 'none',
    transform: dec.rotation ? `rotate(${dec.rotation}deg)` : undefined
  };

  switch (dec.type) {
    case 'circle':
      return <div key={idx} style={{ ...baseStyle, width: dec.size, height: dec.size, borderRadius: '50%', background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`, transform: `translate(-50%, -50%) ${dec.rotation ? `rotate(${dec.rotation}deg)` : ''}` }} />;
    case 'ring':
      return <div key={idx} style={{ ...baseStyle, width: dec.size, height: dec.size, borderRadius: '50%', border: `2px solid ${color}`, transform: `translate(-50%, -50%)` }} />;
    case 'line':
      return <div key={idx} style={{ ...baseStyle, width: dec.size, height: 3, background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: 2 }} />;
    case 'dots':
      return <div key={idx} style={{ ...baseStyle, width: dec.size, height: dec.size, backgroundImage: `radial-gradient(circle, ${color} 1.5px, transparent 1.5px)`, backgroundSize: '20px 20px' }} />;
    case 'blob':
      return <div key={idx} style={{ ...baseStyle, width: dec.size, height: dec.size * 0.8, borderRadius: '40% 60% 55% 45% / 55% 40% 60% 45%', background: `${color}15`, filter: 'blur(2px)', transform: `translate(-50%, -50%)` }} />;
    default:
      return null;
  }
}

// ── Resize Handle Component ──────────────────────────────────────────

function ResizeHandles({ blockId, slideId, scale, parentOffset }: {blockId: string;slideId: string;scale: number;parentOffset?: {x: number; y: number};}) {
  const updateBlock = usePresentationStore((s) => s.updateBlock);
  const slides = usePresentationStore((s) => s.slides);
  const slide = slides.find((s) => s.id === slideId);
  const block = slide?.contentBlocks.find((b) => b.id === blockId);
  const startRef = useRef<{x: number;y: number;w: string;h: string;} | null>(null);
  const rafRef = useRef<number>(0);

  const handleSize = 8 / scale;
  const handleStyle = (cursor: string, extra: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: handleSize,
    height: handleSize,
    backgroundColor: '#fff',
    border: '1.5px solid hsl(var(--primary))',
    borderRadius: 2,
    cursor,
    zIndex: 30,
    ...extra
  });

  const startDrag = (e: React.MouseEvent, dir: string) => {
    e.stopPropagation();
    e.preventDefault();
    const bs = block?.style || {};
    // Measure actual element dimensions instead of parsing 'auto'
    const el = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
    const measuredW = el ? el.offsetWidth : 400;
    const measuredH = el ? el.offsetHeight : 200;
    const resolvedW = bs.width && bs.width !== 'auto' && bs.width !== '100%' ? (parseInt(bs.width) || measuredW) : measuredW;
    const resolvedH = bs.height && bs.height !== 'auto' ? (parseInt(bs.height) || measuredH) : measuredH;
    startRef.current = { x: e.clientX, y: e.clientY, w: `${resolvedW}`, h: `${resolvedH}` };

    const onMove = (ev: MouseEvent) => {
      if (!startRef.current) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!startRef.current) return;
        const dx = (ev.clientX - startRef.current.x) / scale;
        const dy = (ev.clientY - startRef.current.y) / scale;

        const patch: Record<string, string> = {};
        const startW = parseInt(startRef.current.w);
        const startH = parseInt(startRef.current.h);

        if (dir.includes('e')) patch.width = `${Math.max(50, startW + dx)}px`;
        if (dir.includes('w')) patch.width = `${Math.max(50, startW - dx)}px`;
        if (dir.includes('s')) patch.height = `${Math.max(30, startH + dy)}px`;
        if (dir.includes('n')) patch.height = `${Math.max(30, startH - dy)}px`;

        updateBlock(slideId, blockId, { style: { ...block?.style, ...patch } } as any);
      });
    };

    const onUp = () => {
      cancelAnimationFrame(rafRef.current);
      startRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const half = handleSize / 2;
  return (
    <>
      <div style={handleStyle('nwse-resize', { top: -half, left: -half })} onMouseDown={(e) => startDrag(e, 'nw')} />
      <div style={handleStyle('nesw-resize', { top: -half, right: -half })} onMouseDown={(e) => startDrag(e, 'ne')} />
      <div style={handleStyle('nesw-resize', { bottom: -half, left: -half })} onMouseDown={(e) => startDrag(e, 'sw')} />
      <div style={handleStyle('nwse-resize', { bottom: -half, right: -half })} onMouseDown={(e) => startDrag(e, 'se')} />
      <div style={handleStyle('ns-resize', { top: -half, left: '50%', transform: 'translateX(-50%)' })} onMouseDown={(e) => startDrag(e, 'n')} />
      <div style={handleStyle('ns-resize', { bottom: -half, left: '50%', transform: 'translateX(-50%)' })} onMouseDown={(e) => startDrag(e, 's')} />
      <div style={handleStyle('ew-resize', { left: -half, top: '50%', transform: 'translateY(-50%)' })} onMouseDown={(e) => startDrag(e, 'w')} />
      <div style={handleStyle('ew-resize', { right: -half, top: '50%', transform: 'translateY(-50%)' })} onMouseDown={(e) => startDrag(e, 'e')} />
    </>);
}

// ── Sortable Block Wrapper ──────────────────────────────────────────

function SortableBlock({
  block, slide, tokens, scale, isInteractive, editingBlockId, selectedBlockId, onBlockClick, setEditingBlock, arrayIndex, totalBlocks
}: {block: ContentBlock;slide: Slide;tokens: DesignTokens;scale: number;isInteractive: boolean;editingBlockId: string | null;selectedBlockId: string | null;onBlockClick: (e: React.MouseEvent, blockId: string) => void;setEditingBlock: (id: string | null) => void;arrayIndex: number;totalBlocks: number;}) {
  const isolatedGroupId = usePresentationStore((s) => s.isolatedGroupId);
  const isEditing = editingBlockId === block.id;
  const isSelected = selectedBlockId === block.id && !isEditing;
  const bs = block.style;
  const isLocked = bs?.locked === true;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: isLocked
  });

  // Hidden enforcement — after all hooks
  if (bs?.hidden) return null;

  const blockZ = computeBlockZ(block, arrayIndex, totalBlocks, isSelected, isEditing);

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  // Animation styles
  const animStyle: React.CSSProperties = {};
  if (bs?.animation?.effect && bs.animation.effect !== 'none') {
    const delay = bs.animation.delay ?? 0;
    const dur = bs.animation.duration ?? 500;
    const effects: Record<string, string> = {
      'fade-in': `fadeIn ${dur}ms ease ${delay}ms both`,
      'fade-up': `fadeUp ${dur}ms ease ${delay}ms both`,
      'scale-in': `scaleIn ${dur}ms ease ${delay}ms both`,
      'slide-in-left': `slideInLeft ${dur}ms ease ${delay}ms both`,
      'slide-in-right': `slideInRight ${dur}ms ease ${delay}ms both`,
      'bounce': `bounceIn ${dur}ms ease ${delay}ms both`
    };
    animStyle.animation = effects[bs.animation.effect] || '';
  }

  // Hover effect styles
  const hoverScale = bs?.hoverScale ?? 1;
  const hoverOpacity = bs?.hoverOpacity ?? 1;
  const hoverColor = bs?.hoverColor || '';
  const hasHoverEffects = hoverScale !== 1 || hoverOpacity !== 1 || hoverColor;
  const hoverTransition = hasHoverEffects ? 'transform 0.2s ease, opacity 0.2s ease, color 0.2s ease' : undefined;

  return (
    <div
      ref={setNodeRef}
      data-block-wrapper
      data-block-id={block.id}
      className="relative group"
      style={{
        ...sortableStyle,
        flex: bs?.height ? `0 0 ${typeof bs.height === 'string' ? bs.height : `${bs.height}px`}` : '0 0 auto',
        minHeight: bs?.height || undefined,
        overflow: 'visible',
        zIndex: blockZ,
        cursor: isLocked ? 'not-allowed' : isInteractive ? 'pointer' : 'default',
        pointerEvents: isLocked ? 'none' : undefined,
        width: bs?.width ? typeof bs.width === 'string' && !bs.width.includes('%') && !bs.width.includes('px') ? `${bs.width}px` : bs.width : undefined,
        height: bs?.height ? typeof bs.height === 'string' && !bs.height.includes('%') && !bs.height.includes('px') ? `${bs.height}px` : bs.height : undefined
      }}>

      {/* Inner wrapper for animations & hover — isolated from sortable transform */}
      <div
        style={{
          ...animStyle,
          transition: hoverTransition,
          width: '100%',
          height: '100%'
        }}
        onMouseEnter={hasHoverEffects ? (e) => {
          const el = e.currentTarget;
          if (hoverScale !== 1) el.style.transform = `scale(${hoverScale})`;
          if (hoverOpacity !== 1) el.style.opacity = String(hoverOpacity);
          if (hoverColor) el.style.color = hoverColor;
        } : undefined}
        onMouseLeave={hasHoverEffects ? (e) => {
          const el = e.currentTarget;
          el.style.transform = '';
          el.style.opacity = '';
          el.style.color = '';
        } : undefined}>

        {/* Drag handle — visible on group hover */}
        {isInteractive && !isEditing && !isLocked &&
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-[28px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-30">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        }

        {isSelected && isInteractive &&
        <div style={{
          position: 'absolute', inset: -2,
          border: `3px solid ${tokens.accentColor}`,
          borderRadius: tokens.borderRadius,
          pointerEvents: 'none', zIndex: 20,
          boxShadow: `0 0 0 1px ${tokens.accentColor}40`
        }} />
        }
        {isSelected && isInteractive &&
        <>
            <BlockToolbar blockId={block.id} slideId={slide.id} />
            <ResizeHandles blockId={block.id} slideId={slide.id} scale={scale} />
          </>
        }
        {isEditing && isInteractive &&
        <InlineTextToolbar blockId={block.id} slideId={slide.id} />
        }
        {isEditing && (block.type === 'chart' || block.type === 'code') ?
        <ContentBlockEditor
          block={block}
          slideId={slide.id}
          tokens={tokens}
          onFinish={() => setEditingBlock(null)} /> :
        <div
          onClick={(e) => {
            if (isInteractive && (block.type === 'image' && !(block as any).src || block.type === 'gallery')) {
              e.stopPropagation();
              setEditingBlock(block.id);
              return;
            }
            onBlockClick(e, block.id);
          }}
           onDoubleClick={(e) => {
            if (!isInteractive) return;
            e.stopPropagation();
            // Allow isolation on any block type for nesting
            usePresentationStore.getState().enterIsolation(block.id);
            if (!(block.isGroup || block.type === 'container' || block.type === 'stack')) {
              setEditingBlock(block.id);
            }
          }}
          style={{ width: '100%', height: '100%' }}>
            <ContentBlockRenderer
            block={block}
            tokens={tokens}
            isEditing={isEditing}
            slideId={slide.id}
            allBlocks={slide.contentBlocks}
            isIsolated={isolatedGroupId === block.id} />
          </div>
        }
      </div>
    </div>);
}

// ── Floating Block (Free-Positioned) — GPU-accelerated drag ─────────

function FloatingBlock({
  block, slide, tokens, scale, isInteractive, editingBlockId, selectedBlockId, onBlockClick, setEditingBlock, slideW, slideH, onGuidesChange, arrayIndex, totalBlocks, parentOffset
}: {block: ContentBlock;slide: Slide;tokens: DesignTokens;scale: number;isInteractive: boolean;editingBlockId: string | null;selectedBlockId: string | null;onBlockClick: (e: React.MouseEvent, blockId: string) => void;setEditingBlock: (id: string | null) => void;slideW: number;slideH: number;onGuidesChange?: (guides: {type: 'horizontal' | 'vertical';position: number;}[]) => void;arrayIndex: number;totalBlocks: number;parentOffset?: {x: number; y: number};}) {
  const updateBlock = usePresentationStore((s) => s.updateBlock);
  const isolatedGroupId = usePresentationStore((s) => s.isolatedGroupId);
  const isEditing = editingBlockId === block.id;
  const isSelected = selectedBlockId === block.id && !isEditing;
  const bs = block.style;
  const dragRef = useRef<{startX: number;startY: number;origPosX: number;origPosY: number;moved: boolean;} | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isLocked = bs?.locked === true;

  // Isolation mode: dim non-group blocks
  const isDimmed = isolatedGroupId != null && block.parentId !== isolatedGroupId && block.id !== isolatedGroupId;

  const blockZ = computeBlockZ(block, arrayIndex, totalBlocks, isSelected, isEditing);

  // Get all other floating blocks for alignment
  const getOtherFloatingBlocks = useCallback(() => {
    return slide.contentBlocks.
    filter((b) => b.style?.posX != null && b.style?.posY != null && b.id !== block.id).
    map((b) => ({
      id: b.id,
      x: b.style?.posX || 0,
      y: b.style?.posY || 0,
      w: b.style?.width ? parseInt(String(b.style.width)) : 200,
      h: b.style?.height ? parseInt(String(b.style.height)) : 100
    }));
  }, [slide.contentBlocks, block.id]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing || !isInteractive || isLocked || isDimmed) return;
    e.preventDefault();
    const origX = bs?.posX || 0;
    const origY = bs?.posY || 0;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origPosX: origX, origPosY: origY, moved: false };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!dragRef.current || !elRef.current) return;
        const dx = (ev.clientX - dragRef.current.startX) / scale;
        const dy = (ev.clientY - dragRef.current.startY) / scale;
        if (!dragRef.current.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        dragRef.current.moved = true;
        let newX = Math.max(0, Math.min(slideW - 50, dragRef.current.origPosX + dx));
        let newY = Math.max(0, Math.min(slideH - 30, dragRef.current.origPosY + dy));

        // Compute alignment guides and snap
        const dragW = bs?.width ? parseInt(String(bs.width)) : 200;
        const dragH = bs?.height ? parseInt(String(bs.height)) : 100;
        const others = getOtherFloatingBlocks();
        const { guides, snapX, snapY } = computeAlignmentGuides(
          block.id,
          { x: newX, y: newY, w: dragW, h: dragH },
          others,
          8,
          slideW,
          slideH
        );
        if (snapX !== null) newX = snapX;
        if (snapY !== null) newY = snapY;
        onGuidesChange?.(guides);

        // GPU-accelerated visual update via translate3d (no React re-render)
        elRef.current.style.transform = `translate3d(${Math.round(newX)}px, ${Math.round(newY)}px, 0)`;
        elRef.current.style.left = '0';
        elRef.current.style.top = '0';
        // Store final position for commit
        (dragRef.current as any)._lastX = Math.round(newX);
        (dragRef.current as any)._lastY = Math.round(newY);
      });
    };
    const onUp = () => {
      cancelAnimationFrame(rafRef.current);
      const wasDragged = dragRef.current?.moved;
      const lastX = (dragRef.current as any)?._lastX;
      const lastY = (dragRef.current as any)?._lastY;
      dragRef.current = null;
      onGuidesChange?.([]);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      // Commit final position to store only on mouseup
      if (wasDragged && lastX != null && lastY != null) {
        if (elRef.current) {
          elRef.current.style.transform = '';
          elRef.current.style.left = `${lastX}px`;
          elRef.current.style.top = `${lastY}px`;
        }
        // Convert back to relative coords if this is a child block
        const storeX = parentOffset ? lastX - parentOffset.x : lastX;
        const storeY = parentOffset ? lastY - parentOffset.y : lastY;
        updateBlock(slide.id, block.id, { style: { ...bs, posX: storeX, posY: storeY } } as any);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [isEditing, isInteractive, isLocked, isDimmed, bs, scale, slide.id, block.id, updateBlock, slideW, slideH, getOtherFloatingBlocks]);

  // Hidden enforcement — after all hooks
  if (bs?.hidden) return null;

  return (
    <div
      ref={elRef}
      data-block-wrapper
      data-block-id={block.id}
      className="absolute group"
      style={{
        left: bs?.posX ?? 100,
        top: bs?.posY ?? 100,
        width: bs?.width ? typeof bs.width === 'string' && !bs.width.includes('%') && !bs.width.includes('px') ? `${bs.width}px` : bs.width : 'auto',
        height: bs?.height ? typeof bs.height === 'string' && !bs.height.includes('%') && !bs.height.includes('px') ? `${bs.height}px` : bs.height : 'auto',
        zIndex: blockZ,
        cursor: isLocked ? 'not-allowed' : isEditing ? 'text' : 'move',
        pointerEvents: isLocked || isDimmed ? 'none' : undefined,
        opacity: isDimmed ? 0.2 : 1,
        minWidth: 80,
        willChange: 'transform'
      }}
      onMouseDown={handleMouseDown}>

      {isSelected && isInteractive &&
      <div style={{
        position: 'absolute', inset: -2,
        border: `3px solid ${tokens.accentColor}`,
        borderRadius: tokens.borderRadius,
        pointerEvents: 'none', zIndex: 20,
        boxShadow: `0 0 0 1px ${tokens.accentColor}40`
      }} />
      }
      {isSelected && isInteractive &&
      <>
          <BlockToolbar blockId={block.id} slideId={slide.id} className="rounded-3xl" blockY={bs?.posY ?? 100} />
          <ResizeHandles blockId={block.id} slideId={slide.id} scale={scale} parentOffset={parentOffset} />
        </>
      }
      {isEditing && isInteractive &&
      <InlineTextToolbar blockId={block.id} slideId={slide.id} />
      }
      {isEditing && (block.type === 'chart' || block.type === 'code') ?
      <ContentBlockEditor
        block={block}
        slideId={slide.id}
        tokens={tokens}
        onFinish={() => setEditingBlock(null)} /> :
      <div
        onClick={(e) => {
          if (isInteractive && (block.type === 'image' && !(block as any).src || block.type === 'gallery')) {
            e.stopPropagation();
            setEditingBlock(block.id);
            return;
          }
          onBlockClick(e, block.id);
        }}
        onDoubleClick={(e) => {
          if (!isInteractive) return;
          e.stopPropagation();
          // Allow isolation on any block type for nesting
          usePresentationStore.getState().enterIsolation(block.id);
          if (!(block.isGroup || block.type === 'container' || block.type === 'stack')) {
            setEditingBlock(block.id);
          }
        }}
        style={{ width: '100%', height: '100%' }}>
          <ContentBlockRenderer
          block={block}
          tokens={tokens}
          isEditing={isEditing}
          slideId={slide.id}
          allBlocks={slide.contentBlocks}
          isIsolated={isolatedGroupId === block.id} />
        </div>
      }
    </div>);
}

// ── Main SlideRenderer ──────────────────────────────────────────────

export const SlideRenderer = memo(function SlideRenderer({ slide, tokens, scale, isActive, onClick, readOnly, showWatermark }: Props) {
  const editingBlockId = usePresentationStore((s) => s.editingBlockId);
  const selectedBlockId = usePresentationStore((s) => s.selectedBlockId);
  const selectedBlockIds = usePresentationStore((s) => s.selectedBlockIds);
  const setEditingBlock = usePresentationStore((s) => s.setEditingBlock);
  const setSelectedBlock = usePresentationStore((s) => s.setSelectedBlock);
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const addBlockToSlide = usePresentationStore((s) => s.addBlockToSlide);
  const slideWidth = usePresentationStore((s) => s.slideWidth);
  const slideHeight = usePresentationStore((s) => s.slideHeight);
  const slideLogo = usePresentationStore((s) => s.slideLogo);
  const isolatedGroupId = usePresentationStore((s) => s.isolatedGroupId);
  const SLIDE_W = slideWidth || DEFAULT_W;
  const SLIDE_H = slideHeight || DEFAULT_H;
  const layout = useMemo(() => getLayout(slide.layoutId), [slide.layoutId]);
  const [activeGuides, setActiveGuides] = useState<{type: 'horizontal' | 'vertical';position: number;}[]>([]);
  const slideInnerRef = useRef<HTMLDivElement>(null);

  const decorations = slide.decorations || layout.defaultDecorations || [];
  const slideBg = slide.background || layout.defaultBackground;
  const isInteractive = readOnly ? false : scale > 0.2;
  const totalBlocks = slide.contentBlocks.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
  );

  const handleSlideClick = useCallback((e: React.MouseEvent) => {
    if (readOnly) {onClick();return;}
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-block-wrapper]') === null) {
      if (selectedBlockId || editingBlockId) {
        setSelectedBlock(null);
        setEditingBlock(null);
      }
      // Exit isolation only if click is outside the isolated container
      const store = usePresentationStore.getState();
      if (store.isolatedGroupId) {
        const clickedInsideIsolated = (e.target as HTMLElement).closest(`[data-block-id="${store.isolatedGroupId}"]`);
        if (!clickedInsideIsolated) store.exitIsolation();
      }
    }
    onClick();
  }, [onClick, selectedBlockId, editingBlockId, setSelectedBlock, setEditingBlock, readOnly]);

  const handleBlockClick = useCallback((e: React.MouseEvent, blockId: string) => {
    if (!isInteractive) return;
    e.stopPropagation();
    if (e.shiftKey) {
      usePresentationStore.getState().toggleBlockSelection(blockId);
    } else {
      setSelectedBlock(blockId);
    }
  }, [isInteractive, setSelectedBlock]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const blocks = [...slide.contentBlocks];
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const [moved] = blocks.splice(oldIndex, 1);
    blocks.splice(newIndex, 0, moved);
    updateSlide(slide.id, { contentBlocks: blocks });
  }, [slide, updateSlide]);

  // ── Drag-and-Drop from Block Picker ────────────────────────────────
  const handleDropFromPicker = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/cosmo-block');
    if (!raw) return;
    try {
      const { defId } = JSON.parse(raw);
      // Find the block definition
      let blockDef: any = null;
      for (const cat of blockCategories) {
        const found = cat.items.find((item) => item.id === defId);
        if (found) { blockDef = found; break; }
      }
      if (!blockDef) return;

      // Compute drop position in slide coordinates
      const rect = slideInnerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const posX = Math.round((e.clientX - rect.left) / scale);
      const posY = Math.round((e.clientY - rect.top) / scale);

      const newBlock = {
        ...blockDef.createBlock(),
        id: crypto.randomUUID(),
        regionId: 'main',
        style: { posX: Math.max(0, Math.min(SLIDE_W - 100, posX)), posY: Math.max(0, Math.min(SLIDE_H - 50, posY)), width: '400px' },
      } as ContentBlock;
      addBlockToSlide(slide.id, newBlock);
    } catch (err) {
      console.error('Drop error:', err);
    }
  }, [slide.id, addBlockToSlide, scale, SLIDE_W, SLIDE_H]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/cosmo-block')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  // Compute global array index for each block for z-index
  const blockIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    slide.contentBlocks.forEach((b, i) => map.set(b.id, i));
    return map;
  }, [slide.contentBlocks]);

  return (
    <div
      onClick={handleSlideClick}
      onDrop={handleDropFromPicker}
      onDragOver={handleDragOver}
      className="relative"
      style={{ width: SLIDE_W * scale, height: SLIDE_H * scale, flexShrink: 0 }}>

      <div
        ref={slideInnerRef}
        data-slide-inner
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          backgroundColor: tokens.backgroundColor,
          borderRadius: tokens.borderRadius,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: isActive ?
          `0 0 0 3px ${tokens.accentColor}, 0 8px 32px rgba(0,0,0,0.12)` :
          '0 4px 24px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.2s ease'
        }}>

        {/* Background layer */}
        {slideBg &&
        <div style={{
          position: 'absolute', inset: 0,
          ...(slideBg.type === 'image' && slideBg.value ?
          { backgroundImage: `url(${slideBg.value})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } :
          slideBg.type === 'pattern' ?
          { backgroundImage: slideBg.value, backgroundColor: 'transparent' } :
          { background: slideBg.value }),
          opacity: slideBg.opacity ?? 1,
          filter: slideBg.blur ? `blur(${slideBg.blur}px)` : undefined,
          pointerEvents: 'none', zIndex: 0
        }} />
        }
        {slideBg?.overlay &&
        <div style={{ position: 'absolute', inset: 0, background: slideBg.overlay, pointerEvents: 'none', zIndex: 1 }} />
        }

        {/* Decorations */}
        {decorations.map((dec, i) => renderDecoration(dec, tokens, i))}

        {/* Content regions */}
        {readOnly ?
        <>
            {layout.regions.map((region) => {
            const regionBlocks = slide.contentBlocks.filter((b) => b.regionId === region.id && b.style?.posX == null && b.style?.posY == null && !b.style?.hidden && !(b as any).parentId);
            if (regionBlocks.length === 0) return <div key={region.id} style={{ position: 'absolute', left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%`, zIndex: 2 }} />;
            return (
              <div key={region.id} style={{ position: 'absolute', left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%`, overflow: 'visible', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {regionBlocks.map((block) =>
                <div key={block.id} style={{ width: block.style?.width || undefined, height: block.style?.height || undefined, zIndex: computeBlockZ(block, blockIndexMap.get(block.id) || 0, totalBlocks, false, false) }}>
                      <ContentBlockRenderer block={block} tokens={tokens} isEditing={false} slideId={slide.id} allBlocks={slide.contentBlocks} />
                    </div>
                )}
                </div>);
          })}
          </> :

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {layout.regions.map((region) => {
            const regionBlocks = slide.contentBlocks.filter((b) => b.regionId === region.id && b.style?.posX == null && b.style?.posY == null && !(b as any).parentId);
            if (regionBlocks.length === 0) {
              return <div key={region.id} style={{ position: 'absolute', left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%`, zIndex: 2 }} />;
            }
            return (
              <div key={region.id} style={{ position: 'absolute', left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%`, overflow: 'visible', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SortableContext items={regionBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    {regionBlocks.map((block) =>
                  <SortableBlock key={block.id} block={block} slide={slide} tokens={tokens} scale={scale} isInteractive={isInteractive} editingBlockId={editingBlockId} selectedBlockId={selectedBlockId} onBlockClick={handleBlockClick} setEditingBlock={setEditingBlock} arrayIndex={blockIndexMap.get(block.id) || 0} totalBlocks={totalBlocks} />
                  )}
                  </SortableContext>
                </div>);
          })}
          </DndContext>
        }

        {/* Free-positioned floating blocks (top-level only) */}
        {slide.contentBlocks.
        filter((b) => b.style?.posX != null && b.style?.posY != null && !(b as any).parentId).
        map((block) => readOnly ?
        (block.style?.hidden ? null :
        <div key={block.id} className="absolute" style={{ left: block.style?.posX ?? 100, top: block.style?.posY ?? 100, width: block.style?.width ? typeof block.style.width === 'string' && !block.style.width.includes('%') && !block.style.width.includes('px') ? `${block.style.width}px` : block.style.width : 'auto', height: block.style?.height ? typeof block.style.height === 'string' && !block.style.height.includes('%') && !block.style.height.includes('px') ? `${block.style.height}px` : block.style.height : 'auto', zIndex: computeBlockZ(block, blockIndexMap.get(block.id) || 0, totalBlocks, false, false) }}>
              <ContentBlockRenderer block={block} tokens={tokens} isEditing={false} slideId={slide.id} allBlocks={slide.contentBlocks} />
            </div>) :

        <FloatingBlock
          key={block.id}
          block={block}
          slide={slide}
          tokens={tokens}
          scale={scale}
          isInteractive={isInteractive}
          editingBlockId={editingBlockId}
          selectedBlockId={selectedBlockId}
          onBlockClick={handleBlockClick}
          setEditingBlock={setEditingBlock}
          slideW={SLIDE_W}
          slideH={SLIDE_H}
          onGuidesChange={setActiveGuides}
          arrayIndex={blockIndexMap.get(block.id) || 0}
          totalBlocks={totalBlocks} />

        )}

        {/* Child blocks: show as static overlays when NOT isolated, or as interactive FloatingBlocks when isolated */}
        {(() => {
          const isoId = isolatedGroupId;
          // Gather all child blocks that have a parentId pointing to a floating parent
          const allChildBlocks = slide.contentBlocks.filter(b => (b as any).parentId);
          
          if (isoId && !readOnly) {
            // ISOLATION MODE: render children of isolated parent as interactive FloatingBlocks
            const parentBlock = slide.contentBlocks.find(b => b.id === isoId);
            if (!parentBlock) return null;
            const parentX = parentBlock.style?.posX || 0;
            const parentY = parentBlock.style?.posY || 0;
            const childBlocks = allChildBlocks.filter(b => (b as any).parentId === isoId);
            return childBlocks.map(child => {
              if (child.style?.hidden) return null;
              const absX = parentX + (child.style?.posX || 0);
              const absY = parentY + (child.style?.posY || 0);
              const virtualBlock = {
                ...child,
                style: { ...child.style, posX: absX, posY: absY }
              } as ContentBlock;
              return (
                <FloatingBlock
                  key={child.id}
                  block={virtualBlock}
                  slide={slide}
                  tokens={tokens}
                  scale={scale}
                  isInteractive={isInteractive}
                  editingBlockId={editingBlockId}
                  selectedBlockId={selectedBlockId}
                  onBlockClick={handleBlockClick}
                  setEditingBlock={setEditingBlock}
                  slideW={SLIDE_W}
                  slideH={SLIDE_H}
                  onGuidesChange={setActiveGuides}
                  arrayIndex={blockIndexMap.get(child.id) || 0}
                  totalBlocks={totalBlocks}
                  parentOffset={{ x: parentX, y: parentY }} />
              );
            });
          }
          
          // NORMAL MODE: render children as interactive FloatingBlocks (selectable, but drag requires isolation)
          return allChildBlocks.map(child => {
            if (child.style?.hidden) return null;
            const parentBlock = slide.contentBlocks.find(b => b.id === (child as any).parentId);
            if (!parentBlock) return null;
            const absX = (parentBlock.style?.posX || 0) + (child.style?.posX || 0);
            const absY = (parentBlock.style?.posY || 0) + (child.style?.posY || 0);
            const virtualBlock = {
              ...child,
              style: { ...child.style, posX: absX, posY: absY }
            } as ContentBlock;
            return (
              <FloatingBlock
                key={child.id}
                block={virtualBlock}
                slide={slide}
                tokens={tokens}
                scale={scale}
                isInteractive={isInteractive}
                editingBlockId={editingBlockId}
                selectedBlockId={selectedBlockId}
                onBlockClick={handleBlockClick}
                setEditingBlock={setEditingBlock}
                slideW={SLIDE_W}
                slideH={SLIDE_H}
                onGuidesChange={setActiveGuides}
                arrayIndex={blockIndexMap.get(child.id) || 0}
                totalBlocks={totalBlocks}
                parentOffset={{ x: parentBlock.style?.posX || 0, y: parentBlock.style?.posY || 0 }}
              />
            );
          });
        })()}

        {/* Multi-select toolbar */}
        {!readOnly && selectedBlockIds.length >= 2 && (
          <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
            <SlideMultiSelectToolbar slideId={slide.id} />
          </div>
        )}

        {/* Alignment Guides */}
        {!readOnly &&
        <AlignmentGuides guides={activeGuides} slideW={SLIDE_W} slideH={SLIDE_H} accentColor={tokens.accentColor} />
        }

        {/* Slide Logo */}
        {slideLogo && slideLogo.url &&
        <img
          src={slideLogo.url}
          alt="Logo"
          style={{
            position: 'absolute',
            height: 80,
            objectFit: 'contain',
            pointerEvents: 'none',
            zIndex: 20,
            ...(slideLogo.position.includes('top') ? { top: 40 } : { bottom: 40 }),
            ...(slideLogo.position.includes('left') ? { left: 40 } : slideLogo.position.includes('right') ? { right: 40 } : { left: '50%', transform: 'translateX(-50%)' })
          }} />
        }

        {/* Watermark for free users */}
        {showWatermark &&
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            right: 30,
            zIndex: 9999,
            pointerEvents: 'none'
          }}>
            <img
            src={watermarkBadge}
            alt="Made with Colab"
            style={{
              height: 56,
              width: 258,
              opacity: 1,
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))'
            }}
            onError={(e) => {(e.currentTarget as HTMLImageElement).style.display = 'none';(e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';}} />
            <div
            style={{
              display: 'none',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: 'rgba(0,0,0,0.7)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.02em'
            }}>
              ✦ Made with Colab
            </div>
          </div>
        }
      </div>
    </div>);
});

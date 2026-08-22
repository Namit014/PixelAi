import { create } from 'zustand';
import type { Slide, ContentBlock, DesignTokens, PresentationTheme } from '@/types/presentation';
import { defaultThemes } from '@/components/presentation/ThemeRegistry';
import { getLayout } from '@/components/presentation/LayoutRegistry';
import { History } from '@/lib/penTool/historyManager';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface BrandContext {
  name: string;
  industry?: string;
  voice?: string;
  targetAudience?: string;
  archetype?: string;
  brandValues?: string[];
  designStyle?: string;
  logoUrl?: string;
  colors?: {
    primary?: string;
    accent?: string;
    background?: string;
    surface?: string;
    text?: string;
    muted?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
}

interface PresentationState {
  // ── Data ───────────────────────────
  id: string | null;
  title: string;
  themeId: string;
  designTokens: DesignTokens;
  slides: Slide[];
  activeSlideId: string | null;
  editingBlockId: string | null;
  selectedBlockId: string | null;
  selectedBlockIds: string[];

  // ── Brand ─────────────────────────
  activeBrandId: string | null;
  activeBrandContext: BrandContext | null;

  // ── UI ─────────────────────────────
  zoom: number;
  slideWidth: number;
  slideHeight: number;
  isGenerating: boolean;
  isEmpty: boolean;
  activeAITab: string;
  viewMode: 'page' | 'canvas' | 'grid';
  activeTool: 'select' | 'hand';
  _tempToolOverride: 'hand' | null;
  slideLogo: { url: string; position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' } | null;
  diagramOpen: boolean;

  // ── Breakpoint ────────────────────
  activeBreakpoint: 'desktop' | 'tablet' | 'mobile';

  // ── Isolation Mode ────────────────
  isolatedGroupId: string | null;

  // ── Undo/Redo ─────────────────────
  canUndo: boolean;
  canRedo: boolean;

  // ── Chat ───────────────────────────
  chatMessages: ChatMessage[];
  isChatLoading: boolean;

  // ── Actions ────────────────────────
  setTitle: (title: string) => void;
  setTheme: (themeId: string) => void;
  setDesignTokens: (tokens: Partial<DesignTokens>) => void;
  setSlides: (slides: Slide[]) => void;
  addSlide: (slide: Slide, afterId?: string) => void;
  removeSlide: (slideId: string) => void;
  duplicateSlide: (slideId: string) => void;
  updateSlide: (slideId: string, patch: Partial<Slide>) => void;
  setActiveSlide: (slideId: string | null) => void;
  setEditingBlock: (blockId: string | null) => void;
  setSelectedBlock: (blockId: string | null) => void;
  toggleBlockSelection: (blockId: string) => void;
  clearBlockSelection: () => void;
  alignBlocks: (slideId: string, blockIds: string[], alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void;
  distributeBlocks: (slideId: string, blockIds: string[], axis: 'horizontal' | 'vertical') => void;
  updateBlock: (slideId: string, blockId: string, patch: Partial<ContentBlock>) => void;
  addBlockToSlide: (slideId: string, block: ContentBlock) => void;
  insertBlockAfter: (slideId: string, afterBlockId: string, block: ContentBlock) => void;
  removeBlock: (slideId: string, blockId: string) => void;
  duplicateBlock: (slideId: string, blockId: string) => void;
  moveSlide: (fromIndex: number, toIndex: number) => void;
  reorderBlocks: (slideId: string, fromIndex: number, toIndex: number) => void;
  groupBlocks: (slideId: string, blockIds: string[]) => void;
  ungroupBlocks: (slideId: string, groupId: string) => void;
  enterIsolation: (groupId: string) => void;
  exitIsolation: () => void;
  setZoom: (zoom: number) => void;
  setSlideSize: (w: number, h: number) => void;
  setIsGenerating: (v: boolean) => void;
  setActiveAITab: (tab: string) => void;
  setActiveBrand: (id: string | null, context: BrandContext | null) => void;
  setViewMode: (mode: 'page' | 'canvas' | 'grid') => void;
  setActiveTool: (tool: 'select' | 'hand') => void;
  setTempToolOverride: (override: 'hand' | null) => void;
  setSlideLogo: (logo: { url: string; position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' } | null) => void;
  setActiveBreakpoint: (bp: 'desktop' | 'tablet' | 'mobile') => void;
  setDiagramOpen: (open: boolean) => void;
  undo: () => void;
  redo: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsChatLoading: (v: boolean) => void;
  clearChat: () => void;
  resetPresentation: () => void;
}

const getDefaultTokens = (): DesignTokens => defaultThemes[0].tokens;

// History instance — outside store to avoid serialization
const slideHistory = new History<Slide[]>(100);
let historyDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function pushHistory(slides: Slide[], immediate = false) {
  if (immediate) {
    slideHistory.push(slides);
    return;
  }
  if (historyDebounceTimer) clearTimeout(historyDebounceTimer);
  historyDebounceTimer = setTimeout(() => {
    slideHistory.push(slides);
  }, 300);
}

function syncHistoryState(): { canUndo: boolean; canRedo: boolean } {
  return { canUndo: slideHistory.canUndo(), canRedo: slideHistory.canRedo() };
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  id: null,
  title: 'Untitled Presentation',
  themeId: 'minimal-light',
  designTokens: getDefaultTokens(),
  slides: [],
  activeSlideId: null,
  editingBlockId: null,
  selectedBlockId: null,
  selectedBlockIds: [],
  activeBrandId: null,
  activeBrandContext: null,
  zoom: 0.55,
  slideWidth: 1920,
  slideHeight: 1080,
  isGenerating: false,
  isEmpty: true,
  activeAITab: 'agent',
  viewMode: 'page',
  activeTool: 'select',
  _tempToolOverride: null,
  slideLogo: null,
  diagramOpen: false,
  activeBreakpoint: 'desktop',
  isolatedGroupId: null,
  canUndo: false,
  canRedo: false,
  chatMessages: [],
  isChatLoading: false,

  setTitle: (title) => set({ title }),

  setTheme: (themeId) => {
    const theme = defaultThemes.find((t) => t.id === themeId);
    if (theme) {
      set({ themeId, designTokens: theme.tokens, activeBrandId: null, activeBrandContext: null });
    }
  },

  setDesignTokens: (tokens) =>
    set((s) => ({ designTokens: { ...s.designTokens, ...tokens } })),

  setSlides: (slides) => {
    slideHistory.clear();
    slideHistory.push(slides);
    set({
      slides,
      isEmpty: slides.length === 0,
      activeSlideId: slides.length > 0 ? slides[0].id : null,
      ...syncHistoryState(),
    });
  },

  addSlide: (slide, afterId) => {
    const { slides } = get();
    let next: Slide[];
    if (afterId) {
      const idx = slides.findIndex((s) => s.id === afterId);
      next = [...slides];
      next.splice(idx + 1, 0, slide);
    } else {
      next = [...slides, slide];
    }
    pushHistory(next, true);
    set({ slides: next, isEmpty: false, activeSlideId: slide.id, ...syncHistoryState() });
  },

  removeSlide: (slideId) => {
    const { slides, activeSlideId } = get();
    const next = slides.filter((s) => s.id !== slideId);
    const newActive = activeSlideId === slideId ? (next.length > 0 ? next[0].id : null) : activeSlideId;
    pushHistory(next, true);
    set({ slides: next, activeSlideId: newActive, isEmpty: next.length === 0, ...syncHistoryState() });
  },

  duplicateSlide: (slideId) => {
    const { slides } = get();
    const slide = slides.find((s) => s.id === slideId);
    if (!slide) return;
    const newSlide: Slide = {
      ...JSON.parse(JSON.stringify(slide)),
      id: crypto.randomUUID(),
      contentBlocks: slide.contentBlocks.map((b) => ({ ...b, id: crypto.randomUUID() })),
    };
    const idx = slides.findIndex((s) => s.id === slideId);
    const next = [...slides];
    next.splice(idx + 1, 0, newSlide);
    pushHistory(next, true);
    set({ slides: next, activeSlideId: newSlide.id, ...syncHistoryState() });
  },

  updateSlide: (slideId, patch) => {
    const next = get().slides.map((sl) => (sl.id === slideId ? { ...sl, ...patch } : sl));
    pushHistory(next);
    set({ slides: next, ...syncHistoryState() });
  },

  setActiveSlide: (slideId) => {
    const { activeSlideId } = get();
    if (slideId === activeSlideId) return;
    set({ activeSlideId: slideId, selectedBlockId: null, editingBlockId: null });
  },
  setEditingBlock: (blockId) => set({ editingBlockId: blockId, selectedBlockId: blockId, selectedBlockIds: blockId ? [blockId] : [] }),
  setSelectedBlock: (blockId) => set({ selectedBlockId: blockId, editingBlockId: null, selectedBlockIds: blockId ? [blockId] : [] }),
  toggleBlockSelection: (blockId) => {
    const { selectedBlockIds } = get();
    const next = selectedBlockIds.includes(blockId) ? selectedBlockIds.filter(id => id !== blockId) : [...selectedBlockIds, blockId];
    set({ selectedBlockIds: next, selectedBlockId: next.length === 1 ? next[0] : null, editingBlockId: null });
  },
  clearBlockSelection: () => set({ selectedBlockIds: [], selectedBlockId: null }),
  alignBlocks: (slideId, blockIds, alignment) => {
    const { slides } = get();
    const slide = slides.find(s => s.id === slideId);
    if (!slide || blockIds.length < 2) return;
    const blocks = slide.contentBlocks.filter(b => blockIds.includes(b.id));

    // Auto-convert non-positioned blocks to free-positioned using rendered positions
    const autoPositionPatches: Record<string, { posX: number; posY: number }> = {};
    for (const b of blocks) {
      if (b.style?.posX == null || b.style?.posY == null) {
        const el = document.querySelector(`[data-block-id="${b.id}"]`) as HTMLElement | null;
        const slideEl = el?.closest('[data-slide-inner]') as HTMLElement | null;
        if (el && slideEl) {
          const elRect = el.getBoundingClientRect();
          const slideRect = slideEl.getBoundingClientRect();
          const slideScale = slideEl.offsetWidth > 0 ? 1920 / slideEl.offsetWidth : 1;
          autoPositionPatches[b.id] = {
            posX: Math.round((elRect.left - slideRect.left) * slideScale),
            posY: Math.round((elRect.top - slideRect.top) * slideScale),
          };
        } else {
          autoPositionPatches[b.id] = { posX: 100, posY: 100 + blocks.indexOf(b) * 120 };
        }
      }
    }

    // Apply auto-position first if needed
    let workingBlocks = blocks.map(b => autoPositionPatches[b.id]
      ? { ...b, style: { ...b.style, ...autoPositionPatches[b.id] } }
      : b
    );

    const positions = workingBlocks.map(b => ({
      id: b.id,
      x: b.style?.posX ?? 0, y: b.style?.posY ?? 0,
      w: parseInt(String(b.style?.width || '200')), h: parseInt(String(b.style?.height || '100')),
    }));
    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x + p.w));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y + p.h));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const patches: Record<string, { posX?: number; posY?: number }> = {};
    for (const p of positions) {
      const autoPos = autoPositionPatches[p.id] || {};
      switch (alignment) {
        case 'left': patches[p.id] = { ...autoPos, posX: minX }; break;
        case 'right': patches[p.id] = { ...autoPos, posX: maxX - p.w }; break;
        case 'center-h': patches[p.id] = { ...autoPos, posX: centerX - p.w / 2 }; break;
        case 'top': patches[p.id] = { ...autoPos, posY: minY }; break;
        case 'bottom': patches[p.id] = { ...autoPos, posY: maxY - p.h }; break;
        case 'center-v': patches[p.id] = { ...autoPos, posY: centerY - p.h / 2 }; break;
      }
    }
    const next = slides.map(sl => sl.id === slideId ? {
      ...sl,
      contentBlocks: sl.contentBlocks.map(b => patches[b.id] ? { ...b, style: { ...b.style, ...patches[b.id] } } : b),
    } : sl);
    pushHistory(next, true);
    set({ slides: next, ...syncHistoryState() });
  },
  distributeBlocks: (slideId, blockIds, axis) => {
    const { slides } = get();
    const slide = slides.find(s => s.id === slideId);
    if (!slide || blockIds.length < 3) return;
    const blocks = slide.contentBlocks.filter(b => blockIds.includes(b.id));
    const positions = blocks.map(b => ({
      id: b.id,
      x: b.style?.posX ?? 0, y: b.style?.posY ?? 0,
      w: parseInt(String(b.style?.width || '200')), h: parseInt(String(b.style?.height || '100')),
    }));
    if (axis === 'horizontal') {
      positions.sort((a, b) => a.x - b.x);
      const totalW = positions.reduce((s, p) => s + p.w, 0);
      const minX = positions[0].x;
      const maxRight = Math.max(...positions.map(p => p.x + p.w));
      const gap = (maxRight - minX - totalW) / (positions.length - 1);
      let cx = minX;
      const patches: Record<string, number> = {};
      for (const p of positions) { patches[p.id] = cx; cx += p.w + gap; }
      const next = slides.map(sl => sl.id === slideId ? {
        ...sl,
        contentBlocks: sl.contentBlocks.map(b => patches[b.id] != null ? { ...b, style: { ...b.style, posX: patches[b.id] } } : b),
      } : sl);
      pushHistory(next, true);
      set({ slides: next, ...syncHistoryState() });
    } else {
      positions.sort((a, b) => a.y - b.y);
      const totalH = positions.reduce((s, p) => s + p.h, 0);
      const minY = positions[0].y;
      const maxBottom = Math.max(...positions.map(p => p.y + p.h));
      const gap = (maxBottom - minY - totalH) / (positions.length - 1);
      let cy = minY;
      const patches: Record<string, number> = {};
      for (const p of positions) { patches[p.id] = cy; cy += p.h + gap; }
      const next = slides.map(sl => sl.id === slideId ? {
        ...sl,
        contentBlocks: sl.contentBlocks.map(b => patches[b.id] != null ? { ...b, style: { ...b.style, posY: patches[b.id] } } : b),
      } : sl);
      pushHistory(next, true);
      set({ slides: next, ...syncHistoryState() });
    }
  },

  updateBlock: (slideId, blockId, patch) => {
    const next = get().slides.map((sl) =>
      sl.id === slideId
        ? { ...sl, contentBlocks: sl.contentBlocks.map((b) => b.id === blockId ? { ...b, ...patch } as ContentBlock : b) }
        : sl
    );
    pushHistory(next);
    set({ slides: next, ...syncHistoryState() });
  },

  addBlockToSlide: (slideId, block) => {
    const { slides, isolatedGroupId } = get();
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;
    const layout = getLayout(slide.layoutId);
    const bodyRegion = layout.regions.find(r => r.id !== 'title' && r.id !== 'subtitle' && r.id !== 'image') || layout.regions[layout.regions.length - 1];

    // When in isolation mode, compute default position inside the parent block's bounds
    let childPos: { posX?: number; posY?: number } = {};
    if (isolatedGroupId) {
      const parentBlock = slide.contentBlocks.find(b => b.id === isolatedGroupId);
      if (parentBlock) {
        const pw = parseInt(String(parentBlock.style?.width || '400'));
        const ph = parseInt(String(parentBlock.style?.height || '300'));
        const bw = parseInt(String(block.style?.width || '200'));
        const bh = parseInt(String(block.style?.height || '100'));
        // Center the child inside the parent
        childPos = { posX: Math.max(0, (pw - bw) / 2), posY: Math.max(0, (ph - bh) / 2) };
      }
    }

    const finalBlock = {
      ...block,
      regionId: block.regionId || bodyRegion.id,
      ...(isolatedGroupId ? { parentId: isolatedGroupId } : {}),
      style: {
        ...block.style,
        ...(isolatedGroupId ? childPos : {}),
      },
    };
    const next = slides.map(sl => sl.id === slideId ? { ...sl, contentBlocks: [...sl.contentBlocks, finalBlock] } : sl);
    pushHistory(next, true);
    set({ slides: next, ...syncHistoryState() });
  },

  insertBlockAfter: (slideId, afterBlockId, block) => {
    const { slides, isolatedGroupId } = get();
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;
    const idx = slide.contentBlocks.findIndex(b => b.id === afterBlockId);
    const afterBlock = idx >= 0 ? slide.contentBlocks[idx] : null;
    const layout = getLayout(slide.layoutId);
    const bodyRegion = layout.regions.find(r => r.id !== 'title' && r.id !== 'subtitle' && r.id !== 'image') || layout.regions[layout.regions.length - 1];
    const finalBlock = {
      ...block,
      regionId: block.regionId || afterBlock?.regionId || bodyRegion.id,
      ...(isolatedGroupId ? { parentId: isolatedGroupId } : {}),
    };
    const newBlocks = [...slide.contentBlocks];
    newBlocks.splice(idx >= 0 ? idx + 1 : newBlocks.length, 0, finalBlock);
    const next = slides.map(sl => sl.id === slideId ? { ...sl, contentBlocks: newBlocks } : sl);
    pushHistory(next, true);
    set({ slides: next, ...syncHistoryState() });
  },

  removeBlock: (slideId, blockId) => {
    const next = get().slides.map(sl => sl.id === slideId ? { ...sl, contentBlocks: sl.contentBlocks.filter(b => b.id !== blockId) } : sl);
    pushHistory(next, true);
    set({ slides: next, ...syncHistoryState() });
  },

  duplicateBlock: (slideId, blockId) => {
    const { slides } = get();
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;
    const block = slide.contentBlocks.find(b => b.id === blockId);
    if (!block) return;
    const newBlock = { ...JSON.parse(JSON.stringify(block)), id: crypto.randomUUID() };
    const next = slides.map(sl => sl.id === slideId ? { ...sl, contentBlocks: [...sl.contentBlocks, newBlock] } : sl);
    pushHistory(next, true);
    set({ slides: next, ...syncHistoryState() });
  },

  moveSlide: (fromIndex, toIndex) => {
    const slides = [...get().slides];
    const [moved] = slides.splice(fromIndex, 1);
    slides.splice(toIndex, 0, moved);
    pushHistory(slides, true);
    set({ slides, ...syncHistoryState() });
  },

  reorderBlocks: (slideId, fromIndex, toIndex) => {
    const { slides } = get();
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;
    const blocks = [...slide.contentBlocks];
    const [moved] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, moved);
    const next = slides.map(sl => sl.id === slideId ? { ...sl, contentBlocks: blocks } : sl);
    pushHistory(next, true);
    set({ slides: next, ...syncHistoryState() });
  },

  groupBlocks: (slideId, blockIds) => {
    const { slides } = get();
    const slide = slides.find(s => s.id === slideId);
    if (!slide || blockIds.length < 2) return;

    const children = slide.contentBlocks.filter(b => blockIds.includes(b.id));
    if (children.length < 2) return;

    // Compute bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of children) {
      const x = c.style?.posX ?? 0;
      const y = c.style?.posY ?? 0;
      const w = c.style?.width ? parseInt(String(c.style.width)) : 200;
      const h = c.style?.height ? parseInt(String(c.style.height)) : 100;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    const groupId = crypto.randomUUID();
    const groupBlock: ContentBlock = {
      id: groupId,
      type: 'subtitle' as any,
      text: '',
      regionId: children[0].regionId,
      label: 'Group',
      isGroup: true,
      style: {
        posX: minX,
        posY: minY,
        width: `${maxX - minX}px`,
        height: `${maxY - minY}px`,
        opacity: 1,
      },
    } as any;

    // Update children to reference group
    const updatedBlocks = slide.contentBlocks.map(b => {
      if (blockIds.includes(b.id)) {
        return { ...b, parentId: groupId };
      }
      return b;
    });

    // Add group block at the end (front)
    updatedBlocks.push(groupBlock);

    const next = slides.map(sl => sl.id === slideId ? { ...sl, contentBlocks: updatedBlocks } : sl);
    pushHistory(next, true);
    set({ slides: next, ...syncHistoryState() });
  },

  ungroupBlocks: (slideId, groupId) => {
    const { slides } = get();
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;

    const updatedBlocks = slide.contentBlocks
      .filter(b => b.id !== groupId)
      .map(b => {
        if (b.parentId === groupId) {
          const { parentId, ...rest } = b as any;
          return rest as ContentBlock;
        }
        return b;
      });

    const next = slides.map(sl => sl.id === slideId ? { ...sl, contentBlocks: updatedBlocks } : sl);
    pushHistory(next, true);
    set({ slides: next, isolatedGroupId: null, ...syncHistoryState() });
  },

  enterIsolation: (groupId) => set({ isolatedGroupId: groupId }),
  exitIsolation: () => set({ isolatedGroupId: null }),

  setZoom: (zoom) => set({ zoom: Math.max(0.2, Math.min(1.5, zoom)) }),
  setSlideSize: (w, h) => set({ slideWidth: w, slideHeight: h }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setActiveAITab: (tab) => set({ activeAITab: tab }),
  setActiveBrand: (id, context) => set({ activeBrandId: id, activeBrandContext: context }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setTempToolOverride: (override) => set({ _tempToolOverride: override }),
  setSlideLogo: (logo) => set({ slideLogo: logo }),
  setActiveBreakpoint: (bp) => set({ activeBreakpoint: bp }),
  setDiagramOpen: (open) => set({ diagramOpen: open }),

  undo: () => {
    const restored = slideHistory.undo();
    if (restored) {
      set({ slides: restored, isEmpty: restored.length === 0, ...syncHistoryState() });
    }
  },

  redo: () => {
    const restored = slideHistory.redo();
    if (restored) {
      set({ slides: restored, isEmpty: restored.length === 0, ...syncHistoryState() });
    }
  },

  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  updateLastAssistantMessage: (content) =>
    set((s) => {
      const msgs = [...s.chatMessages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], content };
      } else {
        msgs.push({ id: crypto.randomUUID(), role: 'assistant', content, timestamp: Date.now() });
      }
      return { chatMessages: msgs };
    }),
  setIsChatLoading: (v) => set({ isChatLoading: v }),
  clearChat: () => set({ chatMessages: [] }),

  resetPresentation: () => {
    slideHistory.clear();
    set({
      id: null,
      title: 'Untitled Presentation',
      themeId: 'minimal-light',
      designTokens: getDefaultTokens(),
      slides: [],
      activeSlideId: null,
      editingBlockId: null,
      selectedBlockId: null,
      selectedBlockIds: [],
      activeBrandId: null,
      activeBrandContext: null,
      slideWidth: 1920,
      slideHeight: 1080,
      isEmpty: true,
      isGenerating: false,
      viewMode: 'page',
      activeTool: 'select',
      _tempToolOverride: null,
      isolatedGroupId: null,
      activeBreakpoint: 'desktop' as const,
      canUndo: false,
      canRedo: false,
      chatMessages: [],
      isChatLoading: false,
    });
  },
}));

// ── Global keyboard shortcuts for undo/redo ──
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      usePresentationStore.getState().undo();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      usePresentationStore.getState().redo();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
      e.preventDefault();
      usePresentationStore.getState().redo();
    }
    if (e.key === 'g' || e.key === 'G') {
      if (!e.metaKey && !e.ctrlKey) {
        const state = usePresentationStore.getState();
        state.setViewMode(state.viewMode === 'grid' ? 'page' : 'grid');
      }
    }
    // Escape exits isolation mode
    if (e.key === 'Escape') {
      const state = usePresentationStore.getState();
      if (state.isolatedGroupId) {
        state.exitIsolation();
      }
    }
  });
}

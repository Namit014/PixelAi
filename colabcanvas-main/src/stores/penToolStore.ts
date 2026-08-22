import { create } from 'zustand';
import type { PathModel, Point, Viewport, GuideInfo } from '@/lib/penTool/geometry';
import { History } from '@/lib/penTool/historyManager';
import type { StrokeConfig } from '@/lib/strokeEngine/types';

export type PenToolMode = 'idle' | 'creating' | 'editing';
export type EditSubTool = 'move' | 'bend' | 'width' | 'cut' | 'offset';

interface PenToolState {
  paths: PathModel[];
  activePath: string | null;
  selectedAnchorIndices: Set<number>;
  mode: PenToolMode;
  editSubTool: EditSubTool;
  viewport: Viewport;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  originalStrokeColor: string | null;
  originalFillColor: string | null;
  guides: GuideInfo[];
  midpointPreview: Point | null;
  midpointPathId: string | null;
  midpointSegIndex: number;
  midpointT: number;
  selectionRect: { start: Point; end: Point } | null;
  activeStrokeConfig: StrokeConfig | null;
  historyInitialized: boolean;

  // Actions
  addPath: (path: PathModel) => void;
  updatePath: (id: string, updater: (p: PathModel) => PathModel) => void;
  deletePath: (id: string) => void;
  setActivePath: (id: string | null) => void;
  setSelectedAnchor: (index: number | null) => void;
  toggleSelectedAnchor: (index: number) => void;
  setSelectedAnchorIndices: (indices: Set<number>) => void;
  setMode: (mode: PenToolMode) => void;
  setEditSubTool: (tool: EditSubTool) => void;
  setViewport: (viewport: Viewport) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFillColor: (color: string) => void;
  setOriginalColors: (stroke: string | null, fill: string | null) => void;
  setGuides: (guides: GuideInfo[]) => void;
  setMidpointPreview: (pt: Point | null, pathId: string | null, segIndex: number, t: number) => void;
  setSelectionRect: (rect: { start: Point; end: Point } | null) => void;
  setActiveStrokeConfig: (config: StrokeConfig | null) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
  initHistory: () => void;
}

const history = new History<PathModel[]>();

export const usePenToolStore = create<PenToolState>((set, get) => ({
  paths: [],
  activePath: null,
  selectedAnchorIndices: new Set<number>(),
  mode: 'idle',
  editSubTool: 'move',
  viewport: { scale: 1, offsetX: 0, offsetY: 0 },
  strokeColor: '#000000',
  strokeWidth: 2,
  fillColor: 'none',
  originalStrokeColor: null,
  originalFillColor: null,
  guides: [],
  midpointPreview: null,
  midpointPathId: null,
  midpointSegIndex: -1,
  midpointT: 0,
  selectionRect: null,
  activeStrokeConfig: null,
  historyInitialized: false,

  addPath: (path) =>
    set((state) => ({ paths: [...state.paths, path] })),

  updatePath: (id, updater) =>
    set((state) => ({
      paths: state.paths.map((p) => (p.id === id ? updater(p) : p)),
    })),

  deletePath: (id) =>
    set((state) => ({
      paths: state.paths.filter((p) => p.id !== id),
      activePath: state.activePath === id ? null : state.activePath,
    })),

  setActivePath: (id) => set({ activePath: id }),
  setSelectedAnchor: (index) => set({ selectedAnchorIndices: index !== null ? new Set([index]) : new Set() }),
  toggleSelectedAnchor: (index) => set((state) => {
    const next = new Set(state.selectedAnchorIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return { selectedAnchorIndices: next };
  }),
  setSelectedAnchorIndices: (indices) => set({ selectedAnchorIndices: indices }),
  setMode: (mode) => set({ mode, editSubTool: 'move' }),
  setEditSubTool: (tool) => set({ editSubTool: tool }),
  setViewport: (viewport) => set({ viewport }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setFillColor: (color) => set({ fillColor: color }),
  setOriginalColors: (stroke, fill) => set({ originalStrokeColor: stroke, originalFillColor: fill }),
  setGuides: (guides) => set({ guides }),
  setMidpointPreview: (pt, pathId, segIndex, t) => set({ midpointPreview: pt, midpointPathId: pathId, midpointSegIndex: segIndex, midpointT: t }),
  setSelectionRect: (rect) => set({ selectionRect: rect }),
  setActiveStrokeConfig: (config) => set({ activeStrokeConfig: config }),

  pushHistory: () => {
    history.push(get().paths);
  },

  initHistory: () => {
    if (!get().historyInitialized) {
      history.push(get().paths);
      set({ historyInitialized: true });
    }
  },

  undo: () => {
    const prev = history.undo();
    if (prev) set({ paths: prev });
  },

  redo: () => {
    const next = history.redo();
    if (next) set({ paths: next });
  },

  clearAll: () => {
    history.clear();
    set({ paths: [], activePath: null, selectedAnchorIndices: new Set(), mode: 'idle', editSubTool: 'move', originalStrokeColor: null, originalFillColor: null, guides: [], midpointPreview: null, selectionRect: null, activeStrokeConfig: null, historyInitialized: false });
  },
}));

import {
  UpscaleIcon, ExpandIcon, CropIcon, VectoriseIcon,
  EraserToolbarIcon, LayerToolbarIcon, MultiAnglesToolbarIcon,
  MoveObjectToolbarIcon, MockupToolbarIcon, AdjustToolbarIcon,
  FlipRotateToolbarIcon, MotionToolbarIcon, RemoveBgToolbarIcon,
  EditTextToolbarIcon, AnalyseToolbarIcon, DownloadToolbarIcon,
} from '@/components/icons/CustomIcons';

export interface ToolDefinition {
  id: string;
  label: string;
  icon: any;
  defaultPinned: boolean;
}

export const TOOLBAR_TOOLS: ToolDefinition[] = [
  { id: 'upscale', label: 'Upscale', icon: UpscaleIcon, defaultPinned: true },
  { id: 'remove-bg', label: 'Remove BG', icon: RemoveBgToolbarIcon, defaultPinned: true },
  { id: 'eraser', label: 'Eraser', icon: EraserToolbarIcon, defaultPinned: true },
  { id: 'edit-elements', label: 'Edit Elements', icon: LayerToolbarIcon, defaultPinned: true },
  { id: 'edit-text', label: 'Edit Text', icon: EditTextToolbarIcon, defaultPinned: true },
  { id: 'multi-angles', label: 'Multi-Angles', icon: MultiAnglesToolbarIcon, defaultPinned: true },
  { id: 'move-object', label: 'Move Object', icon: MoveObjectToolbarIcon, defaultPinned: true },
  { id: 'mockup', label: 'Mockup', icon: MockupToolbarIcon, defaultPinned: false },
  { id: 'expand', label: 'Expand', icon: ExpandIcon, defaultPinned: false },
  { id: 'adjust', label: 'Adjust', icon: AdjustToolbarIcon, defaultPinned: false },
  { id: 'crop', label: 'Crop', icon: CropIcon, defaultPinned: false },
  { id: 'vector', label: 'Vector', icon: VectoriseIcon, defaultPinned: false },
  { id: 'flip-rotate', label: 'Flip & Rotate', icon: FlipRotateToolbarIcon, defaultPinned: false },
  { id: 'analyse', label: 'Analyse', icon: AnalyseToolbarIcon, defaultPinned: false },
  { id: 'motion', label: 'Motion', icon: MotionToolbarIcon, defaultPinned: false },
];

export const DEFAULT_PINNED = TOOLBAR_TOOLS.filter(t => t.defaultPinned).map(t => t.id);

export interface ToolbarConfig {
  pinned: string[];
  showNames: boolean;
}

const STORAGE_KEY = 'canvas-toolbar-config';

export const getToolbarConfig = (): ToolbarConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.pinned && Array.isArray(parsed.pinned)) return parsed;
    }
  } catch {}
  return { pinned: [...DEFAULT_PINNED], showNames: false };
};

export const saveToolbarConfig = (config: ToolbarConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
};

import { create } from 'zustand';

export interface AnimationKeyframe {
  time: number;
  value: number;
}

export interface PathAnimationProperty {
  initial: number;
  keyframes: AnimationKeyframe[];
  enabled: boolean;
}

export interface PathLengthProperty extends PathAnimationProperty {
  direction: 'start' | 'end' | 'custom';
  offset: string;
}

export interface PathAnimationConfig {
  pathIndex: number;
  pathLength: PathLengthProperty;
  opacity: PathAnimationProperty;
  scale: PathAnimationProperty;
  scaleX: PathAnimationProperty;
  scaleY: PathAnimationProperty;
  rotate: PathAnimationProperty;
  x: PathAnimationProperty;
  y: PathAnimationProperty;
  strokeWidth: PathAnimationProperty;
}

export interface AnimationConfig {
  duration: number;
  delay: number;
  repeat: number;
  easing: string;
  transitionType: 'tween' | 'spring';
  paths: PathAnimationConfig[];
}

const createDefaultPathConfig = (pathIndex: number): PathAnimationConfig => ({
  pathIndex,
  pathLength: { initial: 0, keyframes: [{ time: 1, value: 1 }], enabled: true, direction: 'end', offset: '0' },
  opacity: { initial: 0, keyframes: [{ time: 1, value: 1 }], enabled: true },
  scale: { initial: 1, keyframes: [], enabled: false },
  scaleX: { initial: 1, keyframes: [], enabled: false },
  scaleY: { initial: 1, keyframes: [], enabled: false },
  rotate: { initial: 0, keyframes: [], enabled: false },
  x: { initial: 0, keyframes: [], enabled: false },
  y: { initial: 0, keyframes: [], enabled: false },
  strokeWidth: { initial: 1, keyframes: [], enabled: false },
});

export const createDefaultAnimationConfig = (pathCount: number): AnimationConfig => ({
  duration: 0.7,
  delay: 0,
  repeat: 0,
  easing: 'easeOut',
  transitionType: 'tween',
  paths: Array.from({ length: pathCount }, (_, i) => createDefaultPathConfig(i)),
});

interface SvgAnimationState {
  activeAnimationId: string | null;
  isPlaying: boolean;
  currentTime: number;
  animationConfigs: Map<string, AnimationConfig>;
  selectedPathIndex: number | null;
  
  // Actions
  setActiveAnimation: (id: string | null) => void;
  setConfig: (id: string, config: AnimationConfig) => void;
  updatePathProperty: (id: string, pathIndex: number, property: string, value: any) => void;
  updateTransition: (id: string, key: string, value: any) => void;
  setSelectedPathIndex: (index: number | null) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  reset: () => void;
}

export const useSvgAnimationStore = create<SvgAnimationState>((set, get) => ({
  activeAnimationId: null,
  isPlaying: false,
  currentTime: 0,
  animationConfigs: new Map(),
  selectedPathIndex: null,

  setActiveAnimation: (id) => set({ activeAnimationId: id, isPlaying: false, currentTime: 0, selectedPathIndex: null }),
  
  setConfig: (id, config) => set((state) => {
    const newConfigs = new Map(state.animationConfigs);
    newConfigs.set(id, config);
    return { animationConfigs: newConfigs };
  }),

  updatePathProperty: (id, pathIndex, property, value) => set((state) => {
    const newConfigs = new Map(state.animationConfigs);
    const config = newConfigs.get(id);
    if (!config || !config.paths[pathIndex]) return state;
    
    const newConfig = { ...config, paths: [...config.paths] };
    newConfig.paths[pathIndex] = { ...newConfig.paths[pathIndex], [property]: value };
    newConfigs.set(id, newConfig);
    return { animationConfigs: newConfigs };
  }),

  updateTransition: (id, key, value) => set((state) => {
    const newConfigs = new Map(state.animationConfigs);
    const config = newConfigs.get(id);
    if (!config) return state;
    newConfigs.set(id, { ...config, [key]: value });
    return { animationConfigs: newConfigs };
  }),

  setSelectedPathIndex: (index) => set({ selectedPathIndex: index }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  seek: (time) => set({ currentTime: time }),
  reset: () => set({ isPlaying: false, currentTime: 0 }),
}));

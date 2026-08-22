export interface GradientPreset {
  type: 'linear' | 'radial';
  angle?: number;
  stops: { color: string; offset: number }[];
  name: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { type: 'linear', angle: 45, stops: [{ color: '#00D4FF', offset: 0 }, { color: '#0051D5', offset: 1 }], name: 'Ocean Blue' },
  { type: 'linear', angle: 135, stops: [{ color: '#667eea', offset: 0 }, { color: '#764ba2', offset: 1 }], name: 'Purple Dream' },
  { type: 'linear', angle: 90, stops: [{ color: '#f093fb', offset: 0 }, { color: '#f5576c', offset: 1 }], name: 'Sunset' },
  { type: 'linear', angle: 180, stops: [{ color: '#4facfe', offset: 0 }, { color: '#00f2fe', offset: 1 }], name: 'Sky' },
  { type: 'linear', angle: 45, stops: [{ color: '#43e97b', offset: 0 }, { color: '#38f9d7', offset: 1 }], name: 'Mint' },
  { type: 'linear', angle: 90, stops: [{ color: '#fa709a', offset: 0 }, { color: '#fee140', offset: 1 }], name: 'Peach' },
  { type: 'linear', angle: 135, stops: [{ color: '#30cfd0', offset: 0 }, { color: '#330867', offset: 1 }], name: 'Deep Ocean' },
  { type: 'radial', stops: [{ color: '#a8edea', offset: 0 }, { color: '#fed6e3', offset: 1 }], name: 'Pastel' },
  { type: 'linear', angle: 90, stops: [{ color: '#FFD89B', offset: 0 }, { color: '#19547B', offset: 1 }], name: 'Beach' },
  { type: 'linear', angle: 45, stops: [{ color: '#FC466B', offset: 0 }, { color: '#3F5EFB', offset: 1 }], name: 'Fire & Ice' },
  { type: 'radial', stops: [{ color: '#FDBB2D', offset: 0 }, { color: '#22C1C3', offset: 1 }], name: 'Warm Radial' },
  { type: 'linear', angle: 180, stops: [{ color: '#00C9FF', offset: 0 }, { color: '#92FE9D', offset: 1 }], name: 'Cool Breeze' }
];

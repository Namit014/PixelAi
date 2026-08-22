import type { FilterPreset } from './types';

export const builtInPresets: FilterPreset[] = [
  {
    id: 'heatmap',
    name: 'Heatmap',
    category: 'color',
    filterStack: [
      { filterId: 'duotone', params: { shadowColor: [0.0, 0.0, 0.5], highlightColor: [1.0, 0.2, 0.0] } },
    ],
  },
  {
    id: 'vintage-film',
    name: 'Vintage Film',
    category: 'stylize',
    filterStack: [
      { filterId: 'duotone', params: { shadowColor: [0.15, 0.1, 0.05], highlightColor: [1.0, 0.95, 0.85] } },
      { filterId: 'grain', params: { intensity: 0.25, size: 1.5, colorMode: 0 } },
    ],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    category: 'stylize',
    filterStack: [
      { filterId: 'duotone', params: { shadowColor: [0.05, 0.0, 0.15], highlightColor: [0.0, 1.0, 0.9] } },
      { filterId: 'glitch', params: { rgbShift: 0.012, scanlineIntensity: 0.3, noiseIntensity: 0.1 } },
    ],
  },
  {
    id: 'lo-fi',
    name: 'Lo-Fi',
    category: 'stylize',
    filterStack: [
      { filterId: 'pixelate', params: { blockSize: 6.0, smoothEdges: 0 } },
      { filterId: 'grain', params: { intensity: 0.15, size: 1.0, colorMode: 0 } },
    ],
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    category: 'basic',
    filterStack: [
      { filterId: 'bloom', params: { threshold: 0.3, intensity: 1.5, radius: 8.0 } },
    ],
  },
  {
    id: 'retro-game',
    name: 'Retro Game',
    category: 'stylize',
    filterStack: [
      { filterId: 'pixelate', params: { blockSize: 8.0, smoothEdges: 0 } },
      { filterId: 'duotone', params: { shadowColor: [0.05, 0.2, 0.05], highlightColor: [0.4, 1.0, 0.4] } },
    ],
  },
];

export function getPresets(): FilterPreset[] {
  // Merge built-in with user presets from localStorage
  const userPresetsRaw = localStorage.getItem('__user_filter_presets');
  const userPresets: FilterPreset[] = userPresetsRaw ? JSON.parse(userPresetsRaw) : [];
  return [...builtInPresets, ...userPresets];
}

export function saveUserPreset(preset: FilterPreset): void {
  const userPresetsRaw = localStorage.getItem('__user_filter_presets');
  const userPresets: FilterPreset[] = userPresetsRaw ? JSON.parse(userPresetsRaw) : [];
  userPresets.push(preset);
  localStorage.setItem('__user_filter_presets', JSON.stringify(userPresets));
}

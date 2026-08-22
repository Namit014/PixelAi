import { create } from 'zustand';

interface RecentColorsState {
  recentColors: string[];
  addColor: (hex: string) => void;
  scanCanvas: (canvas: any) => void;
}

const STORAGE_KEY = 'lovable-recent-colors';
const MAX_COLORS = 12;

function loadFromStorage(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveToStorage(colors: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {}
}

function normalizeHex(color: string): string | null {
  if (!color || color === 'transparent' || color === '') return null;
  if (color.startsWith('#')) return color.toUpperCase();
  if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match) {
      const [r, g, b] = match.map(Number);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    }
  }
  return null;
}

export const useRecentColorsStore = create<RecentColorsState>((set) => ({
  recentColors: loadFromStorage(),

  addColor: (hex: string) => {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    set((state) => {
      const filtered = state.recentColors.filter((c) => c !== normalized);
      const updated = [normalized, ...filtered].slice(0, MAX_COLORS);
      saveToStorage(updated);
      return { recentColors: updated };
    });
  },

  scanCanvas: (canvas: any) => {
    if (!canvas) return;
    const colors = new Set<string>();
    const objects = canvas.getObjects?.() || [];
    for (const obj of objects) {
      if (obj.isArtboard) continue;
      const fill = obj.fill;
      if (typeof fill === 'string') {
        const n = normalizeHex(fill);
        if (n) colors.add(n);
      }
      const stroke = obj.stroke;
      if (typeof stroke === 'string') {
        const n = normalizeHex(stroke);
        if (n) colors.add(n);
      }
    }
    if (colors.size > 0) {
      set((state) => {
        const merged = [...new Set([...colors, ...state.recentColors])].slice(0, MAX_COLORS);
        saveToStorage(merged);
        return { recentColors: merged };
      });
    }
  },
}));

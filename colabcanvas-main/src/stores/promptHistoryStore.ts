import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PromptHistoryItem } from '@/types/promptHistory';

interface PromptHistoryStore {
  items: PromptHistoryItem[];
  addItem: (item: Omit<PromptHistoryItem, 'id' | 'timestamp'>) => string;
  updateItem: (id: string, updates: Partial<PromptHistoryItem>) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;
}

export const usePromptHistory = create<PromptHistoryStore>()(
  persist(
    (set) => ({
      items: [],
      
      addItem: (item) => {
        const id = `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newItem: PromptHistoryItem = {
          ...item,
          id,
          timestamp: new Date(),
          // CRITICAL: Don't persist image URLs - they're too large for localStorage
          imageUrls: undefined,
        };
        
        try {
          set((state) => ({
            items: [newItem, ...state.items].slice(0, 30), // Reduced from 50 to 30
          }));
        } catch (error: any) {
          if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded, clearing old history');
            set({ items: [newItem] });
          }
        }
        
        return id;
      },
      
      updateItem: (id, updates) => {
        try {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { 
                ...item, 
                ...updates,
                // CRITICAL: Never persist image URLs in localStorage
                imageUrls: undefined 
              } : item
            ),
          }));
        } catch (error: any) {
          if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded during update, clearing history');
            set((state) => ({
              items: state.items.slice(0, 10) // Keep only last 10 items
            }));
          }
        }
      },
      
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },
      
      clearHistory: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'canvas-prompt-history',
      version: 1,
    }
  )
);

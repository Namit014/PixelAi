/**
 * In-memory feed of AI completion notifications shown inside the
 * NotificationBell popover. Lightweight pub/sub — no backend storage.
 *
 * Entries are seeded from `notifyAiComplete` so every chime/toast also
 * lands as a readable item in the user's notification panel.
 */
import type { AiNotifySource, AiNotifyStatus } from './aiNotify';

export interface AiActivityItem {
  id: string;
  source: AiNotifySource;
  status: AiNotifyStatus;
  title: string;
  message?: string;
  createdAt: number;
  read: boolean;
}

type Listener = (items: AiActivityItem[]) => void;

const STORAGE_KEY = 'colab.aiActivityFeed.v1';
const MAX_ITEMS = 50;

let items: AiActivityItem[] = loadFromStorage();
const listeners = new Set<Listener>();

function loadFromStorage(): AiActivityItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota errors */
  }
}

function emit() {
  for (const l of listeners) l(items);
}

export function getAiActivity(): AiActivityItem[] {
  return items;
}

export function subscribeAiActivity(listener: Listener): () => void {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

export function pushAiActivity(item: Omit<AiActivityItem, 'id' | 'createdAt' | 'read'>) {
  const entry: AiActivityItem = {
    ...item,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    read: false,
  };
  items = [entry, ...items].slice(0, MAX_ITEMS);
  persist();
  emit();
}

export function markAiActivityRead(id: string) {
  let changed = false;
  items = items.map((it) => {
    if (it.id === id && !it.read) {
      changed = true;
      return { ...it, read: true };
    }
    return it;
  });
  if (changed) {
    persist();
    emit();
  }
}

export function markAllAiActivityRead() {
  let changed = false;
  items = items.map((it) => {
    if (!it.read) {
      changed = true;
      return { ...it, read: true };
    }
    return it;
  });
  if (changed) {
    persist();
    emit();
  }
}

export function clearAiActivity() {
  if (items.length === 0) return;
  items = [];
  persist();
  emit();
}

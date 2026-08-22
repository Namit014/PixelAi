/**
 * Global AI completion notification service.
 *
 * Plays a soft chime, shows a sonner toast, and (when the tab is hidden)
 * fires a desktop Notification. Respects a localStorage mute toggle and
 * dedupes by `dedupeKey` so realtime re-emits don't double-ping.
 */
import { toast } from 'sonner';
import { pushAiActivity } from './aiActivityFeed';

export type AiNotifySource =
  | 'canvas'
  | 'cosmo'
  | 'think'
  | 'video'
  | 'rumi'
  | 'brand-guidelines'
  | 'edit';

export type AiNotifyStatus = 'success' | 'error';

export interface AiNotifyArgs {
  source: AiNotifySource;
  status?: AiNotifyStatus;
  title?: string;
  message?: string;
  /** Used to dedupe — typically a job/action id. Optional. */
  dedupeKey?: string;
}

const STORAGE_KEY = 'colab.aiSound.enabled';
const PRESET_KEY = 'colab.aiSound.preset';
const VOLUME_KEY = 'colab.aiSound.volume';
const CUSTOM_URL_KEY = 'colab.aiSound.customUrl';

export type SoundPreset = 'chime' | 'ping' | 'bell' | 'pop' | 'classic' | 'soft' | 'custom';

export const SOUND_PRESETS: { id: SoundPreset; label: string; description: string }[] = [
  { id: 'chime',   label: 'Chime',   description: 'Two-note ascending — default' },
  { id: 'ping',    label: 'Ping',    description: 'Single high ping' },
  { id: 'bell',    label: 'Bell',    description: 'Soft bell tone' },
  { id: 'pop',     label: 'Pop',     description: 'Quick pop bubble' },
  { id: 'classic', label: 'Classic', description: 'Three-note arpeggio' },
  { id: 'soft',    label: 'Soft',    description: 'Subtle low blip' },
  { id: 'custom',  label: 'Custom',  description: 'Your uploaded sound' },
];

const SOURCE_LABELS: Record<AiNotifySource, string> = {
  canvas: 'Canvas',
  cosmo: 'Cosmo',
  think: 'Think',
  video: 'Motion Studio',
  rumi: 'RUMi',
  'brand-guidelines': 'Brand Guidelines',
  edit: 'AI Edit',
};

const seenKeys = new Set<string>();
let lastSoundAt = 0;
const MIN_SOUND_GAP_MS = 1500;

let cachedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (cachedAudioCtx) return cachedAudioCtx;
  const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctor) return null;
  try {
    cachedAudioCtx = new Ctor();
    return cachedAudioCtx;
  } catch {
    return null;
  }
}

export function isAiSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const v = window.localStorage.getItem(STORAGE_KEY);
  // Default: enabled
  return v === null ? true : v === 'true';
}

export function setAiSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('colab:ai-sound-changed', { detail: { enabled } }));
}

export function getAiSoundPreset(): SoundPreset {
  if (typeof window === 'undefined') return 'chime';
  const v = window.localStorage.getItem(PRESET_KEY) as SoundPreset | null;
  return v && SOUND_PRESETS.some((p) => p.id === v) ? v : 'chime';
}

export function setAiSoundPreset(preset: SoundPreset) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PRESET_KEY, preset);
  window.dispatchEvent(new CustomEvent('colab:ai-sound-changed', { detail: { preset } }));
}

export function getAiSoundVolume(): number {
  if (typeof window === 'undefined') return 60;
  const raw = window.localStorage.getItem(VOLUME_KEY);
  const n = raw ? Number(raw) : 60;
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 60;
}

export function setAiSoundVolume(volume: number) {
  if (typeof window === 'undefined') return;
  const v = Math.max(0, Math.min(100, Math.round(volume)));
  window.localStorage.setItem(VOLUME_KEY, String(v));
  window.dispatchEvent(new CustomEvent('colab:ai-sound-changed', { detail: { volume: v } }));
}

export function getAiCustomSoundUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CUSTOM_URL_KEY);
}

export function setAiCustomSoundUrl(url: string | null) {
  if (typeof window === 'undefined') return;
  if (url) window.localStorage.setItem(CUSTOM_URL_KEY, url);
  else window.localStorage.removeItem(CUSTOM_URL_KEY);
  window.dispatchEvent(new CustomEvent('colab:ai-sound-changed', { detail: { customUrl: url } }));
}

function playTone(notes: { freq: number; start: number; duration: number; type?: OscillatorType }[]) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = (getAiSoundVolume() / 100) * 0.25;
  master.connect(ctx.destination);
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.freq, now + n.start);
    gain.gain.setValueAtTime(0, now + n.start);
    gain.gain.linearRampToValueAtTime(1, now + n.start + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + n.start + n.duration);
    osc.connect(gain).connect(master);
    osc.start(now + n.start);
    osc.stop(now + n.start + n.duration + 0.02);
  }
}

const PRESET_NOTES: Record<Exclude<SoundPreset, 'custom'>, { success: any[]; error: any[] }> = {
  chime: {
    success: [
      { freq: 659.25, start: 0, duration: 0.09, type: 'sine' },
      { freq: 880.0, start: 0.09, duration: 0.12, type: 'sine' },
    ],
    error: [
      { freq: 440, start: 0, duration: 0.11, type: 'triangle' },
      { freq: 329.63, start: 0.11, duration: 0.13, type: 'triangle' },
    ],
  },
  ping: {
    success: [{ freq: 1320, start: 0, duration: 0.12, type: 'sine' }],
    error: [{ freq: 392, start: 0, duration: 0.16, type: 'sine' }],
  },
  bell: {
    success: [
      { freq: 988, start: 0, duration: 0.18, type: 'sine' },
      { freq: 1318, start: 0.04, duration: 0.22, type: 'sine' },
    ],
    error: [
      { freq: 523, start: 0, duration: 0.18, type: 'sine' },
      { freq: 392, start: 0.07, duration: 0.22, type: 'sine' },
    ],
  },
  pop: {
    success: [{ freq: 740, start: 0, duration: 0.06, type: 'square' }],
    error: [{ freq: 220, start: 0, duration: 0.08, type: 'square' }],
  },
  classic: {
    success: [
      { freq: 523.25, start: 0, duration: 0.07, type: 'sine' },
      { freq: 659.25, start: 0.07, duration: 0.07, type: 'sine' },
      { freq: 783.99, start: 0.14, duration: 0.1, type: 'sine' },
    ],
    error: [
      { freq: 392, start: 0, duration: 0.09, type: 'triangle' },
      { freq: 311.13, start: 0.09, duration: 0.13, type: 'triangle' },
    ],
  },
  soft: {
    success: [{ freq: 523.25, start: 0, duration: 0.14, type: 'sine' }],
    error: [{ freq: 261.63, start: 0, duration: 0.16, type: 'sine' }],
  },
};

let cachedCustomAudio: HTMLAudioElement | null = null;
let cachedCustomUrl: string | null = null;

function playCustom(status: AiNotifyStatus) {
  const url = getAiCustomSoundUrl();
  if (!url) {
    // Fallback to chime
    playTone(PRESET_NOTES.chime[status === 'error' ? 'error' : 'success']);
    return;
  }
  if (cachedCustomUrl !== url || !cachedCustomAudio) {
    cachedCustomAudio = new Audio(url);
    cachedCustomUrl = url;
  }
  try {
    cachedCustomAudio.volume = getAiSoundVolume() / 100;
    cachedCustomAudio.currentTime = 0;
    void cachedCustomAudio.play().catch(() => {
      playTone(PRESET_NOTES.chime[status === 'error' ? 'error' : 'success']);
    });
  } catch {
    playTone(PRESET_NOTES.chime[status === 'error' ? 'error' : 'success']);
  }
}

export function playPreviewSound(preset?: SoundPreset) {
  const p = preset ?? getAiSoundPreset();
  if (p === 'custom') return playCustom('success');
  playTone(PRESET_NOTES[p].success);
}

function maybePlay(status: AiNotifyStatus) {
  if (!isAiSoundEnabled()) return;
  const now = Date.now();
  if (now - lastSoundAt < MIN_SOUND_GAP_MS) return;
  lastSoundAt = now;
  const preset = getAiSoundPreset();
  if (preset === 'custom') {
    playCustom(status);
  } else {
    playTone(PRESET_NOTES[preset][status === 'error' ? 'error' : 'success']);
  }
}

function maybeDesktopNotify(title: string, body: string) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  if (!document.hidden) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/favicon.ico', tag: 'colab-ai' });
    } catch {
      /* ignore */
    }
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then((p) => {
      if (p === 'granted') {
        try {
          new Notification(title, { body, icon: '/favicon.ico', tag: 'colab-ai' });
        } catch {
          /* ignore */
        }
      }
    }).catch(() => {});
  }
}

/**
 * Main entry: fire a single completion notification.
 */
export function notifyAiComplete(args: AiNotifyArgs) {
  const status: AiNotifyStatus = args.status ?? 'success';
  const sourceLabel = SOURCE_LABELS[args.source] ?? args.source;
  const title = args.title ?? (status === 'success' ? 'Ready' : 'Failed');

  if (args.dedupeKey) {
    const key = `${args.source}:${status}:${args.dedupeKey}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    // Cap memory growth
    if (seenKeys.size > 500) {
      const first = seenKeys.values().next().value;
      if (first) seenKeys.delete(first);
    }
  }

  maybePlay(status);

  const fullTitle = `${sourceLabel} · ${title}`;
  if (status === 'error') {
    toast.error(fullTitle, { description: args.message });
  } else {
    toast.success(fullTitle, { description: args.message });
  }

  // Push into the in-app notification feed (visible inside the bell popover)
  pushAiActivity({
    source: args.source,
    status,
    title: fullTitle,
    message: args.message,
  });

  maybeDesktopNotify(fullTitle, args.message ?? '');
}

/** Pre-warm the audio context on the first user gesture. Call once at app boot. */
export function primeAiNotifyAudio() {
  if (typeof window === 'undefined') return;
  const handler = () => {
    getAudioCtx();
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
  };
  window.addEventListener('pointerdown', handler, { once: true });
  window.addEventListener('keydown', handler, { once: true });
}

import { useCallback, useEffect, useState } from 'react';
import { isAiSoundEnabled, setAiSoundEnabled } from '@/lib/notifications/aiNotify';

/**
 * Reactive wrapper around the AI sound mute toggle (persisted in localStorage).
 */
export function useAiSoundToggle() {
  const [enabled, setEnabledState] = useState<boolean>(() => isAiSoundEnabled());

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled: boolean }>).detail;
      if (detail) setEnabledState(detail.enabled);
    };
    window.addEventListener('colab:ai-sound-changed', onChange);
    return () => window.removeEventListener('colab:ai-sound-changed', onChange);
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    setAiSoundEnabled(next);
    setEnabledState(next);
  }, [enabled]);

  const setEnabled = useCallback((next: boolean) => {
    setAiSoundEnabled(next);
    setEnabledState(next);
  }, []);

  return { enabled, toggle, setEnabled };
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Polls credits.talent_balance until it reaches `targetMin` (or maxMs elapses).
 * Returns the latest balance and a `done` flag.
 */
export function useTalentBalancePolling(
  userId: string | undefined,
  targetMin: number,
  enabled: boolean,
  maxMs = 20000,
  intervalMs = 2000
) {
  const [balance, setBalance] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    const start = Date.now();

    const tick = async () => {
      const { data } = await supabase
        .from('credits')
        .select('talent_balance')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      const b = (data as any)?.talent_balance ?? 0;
      setBalance(b);
      if (b >= targetMin) {
        setDone(true);
        return;
      }
      if (Date.now() - start >= maxMs) {
        setDone(true);
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
    return () => { cancelled = true; };
  }, [userId, targetMin, enabled, maxMs, intervalMs]);

  return { balance, done };
}

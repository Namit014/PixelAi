import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to postgres_changes on one or more public tables and runs
 * `onChange` (debounced) whenever any row changes. Used to keep admin
 * dashboards live without manual refresh.
 */
export function useRealtimeSubscription(
  tables: string | string[],
  onChange: () => void,
  options: { debounceMs?: number; enabled?: boolean } = {}
) {
  const { debounceMs = 400, enabled = true } = options;
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    const list = Array.isArray(tables) ? tables : [tables];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cbRef.current(), debounceMs);
    };

    const channels = list.map((table) =>
      supabase
        .channel(`rt-${table}-${Math.random().toString(36).slice(2, 8)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          fire
        )
        .subscribe()
    );

    return () => {
      if (timer) clearTimeout(timer);
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [Array.isArray(tables) ? tables.join(',') : tables, enabled, debounceMs]);
}

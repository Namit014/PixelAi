import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseAdminTableOptions {
  /** Optional select string passed to PostgREST (default '*') */
  select?: string;
  /** Optional column to order by (default 'created_at') */
  orderBy?: string;
  /** Ascending order? (default false) */
  ascending?: boolean;
  /** Optional limit on returned rows */
  limit?: number;
  /** Disable realtime subscription (still fetches once). */
  disableRealtime?: boolean;
  /** Debounce window in ms for burst inserts (default 400ms) */
  debounceMs?: number;
}

/**
 * Subscribes to postgres_changes on a public table and returns rows
 * that automatically refetch on INSERT/UPDATE/DELETE bursts.
 *
 * Used across admin tabs so dashboards reflect live data without
 * manual refreshes.
 */
export function useAdminTable<T = any>(table: string, opts: UseAdminTableOptions = {}) {
  const {
    select = '*',
    orderBy = 'created_at',
    ascending = false,
    limit,
    disableRealtime = false,
    debounceMs = 400,
  } = opts;

  const [rows, setRows] = useState<T[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      let query = supabase.from(table as any).select(select, { count: 'exact' });
      if (orderBy) query = query.order(orderBy, { ascending });
      if (limit) query = query.limit(limit);

      const { data, error: err, count: total } = await query;
      if (err) throw err;
      setRows((data ?? []) as T[]);
      setCount(total ?? null);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, orderBy, ascending, limit]);

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchRows(), debounceMs);
  }, [fetchRows, debounceMs]);

  useEffect(() => {
    fetchRows();
    if (disableRealtime) return;

    const channel = supabase
      .channel(`admin-rt-${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => scheduleRefetch()
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [table, disableRealtime, fetchRows, scheduleRefetch]);

  return { rows, count, loading, error, refetch: fetchRows };
}

/**
 * Lightweight count-only realtime hook for stat cards.
 */
export function useAdminCount(table: string, filter?: { column: string; value: any }) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      let q = supabase.from(table as any).select('*', { count: 'exact', head: true });
      if (filter) q = q.eq(filter.column, filter.value);
      const { count: c } = await q;
      setCount(c ?? 0);
    } finally {
      setLoading(false);
    }
  }, [table, filter?.column, filter?.value]);

  useEffect(() => {
    fetchCount();
    const channel = supabase
      .channel(`admin-count-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchCount(), 400);
      })
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [table, fetchCount]);

  return { count, loading, refetch: fetchCount };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AgentAction {
  id: string;
  job_id: string;
  user_id: string;
  action_type: string;
  action_data: Record<string, unknown>;
  status: 'pending' | 'executing' | 'done' | 'failed';
  result_data: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Subscribes to rumi_agent_actions via Realtime and exposes live actions
 * for a given job. This makes the AI's tool-use steps transparent in the UI.
 */
export function useAgentActionExecutor(jobId: string | null) {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch existing actions for this job
  const fetchActions = useCallback(async () => {
    if (!jobId) { setActions([]); return; }
    setIsLoading(true);
    const { data } = await supabase
      .from('rumi_agent_actions')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });
    if (data) setActions(data as unknown as AgentAction[]);
    setIsLoading(false);
  }, [jobId]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`agent-actions-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rumi_agent_actions',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const updated = payload.new as unknown as AgentAction;
          if (payload.eventType === 'INSERT') {
            setActions(prev => [...prev, updated]);
          } else if (payload.eventType === 'UPDATE') {
            setActions(prev => prev.map(a => a.id === updated.id ? updated : a));
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as any;
            setActions(prev => prev.filter(a => a.id !== deleted.id));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  // Get the currently executing action
  const currentAction = actions.find(a => a.status === 'executing');
  const completedActions = actions.filter(a => a.status === 'done');
  const totalActions = actions.length;

  return {
    actions,
    currentAction,
    completedActions,
    totalActions,
    isLoading,
  };
}

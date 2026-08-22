import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notifyAiComplete } from '@/lib/notifications/aiNotify';

export const JOB_STATES = [
  'QUEUED',
  'BRAND_RESOLUTION',
  'MARKET_RESEARCH',
  'COMPETITIVE_ANALYSIS',
  'STRATEGY_BUILD',
  'ASSET_PLANNING',
  'WEBSITE_GENERATION',
  'PROJECT_CREATION',
  'ASSET_GENERATION',
  'VALIDATION',
  'SCORING',
  'COMPLETE',
] as const;

export type JobState = typeof JOB_STATES[number] | 'FAILED' | 'CANCELLED';

export interface AutonomousJob {
  id: string;
  user_id: string;
  brand_id: string | null;
  project_id: string | null;
  objective: Record<string, unknown>;
  asset_matrix: unknown[];
  state: JobState;
  checkpoint: Record<string, unknown>;
  strategy_output: Record<string, unknown>;
  scoring_output: Record<string, unknown>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobLog {
  id: string;
  job_id: string;
  agent_name: string;
  status: string;
  input_summary: string | null;
  output_summary: string | null;
  confidence: number | null;
  duration_ms: number | null;
  created_at: string;
}

export function getStateProgress(state: JobState): number {
  const idx = JOB_STATES.indexOf(state as any);
  if (state === 'COMPLETE') return 100;
  if (state === 'FAILED' || idx === -1) return 0;
  return Math.round(((idx) / (JOB_STATES.length - 1)) * 100);
}

export function getStateLabel(state: JobState): string {
  const labels: Record<string, string> = {
    QUEUED: 'Queued',
    BRAND_RESOLUTION: 'Resolving Brand DNA',
    MARKET_RESEARCH: 'Researching Market & Competitors',
    COMPETITIVE_ANALYSIS: 'Analyzing Competitors & SWOT',
    STRATEGY_BUILD: 'Building Strategy',
    ASSET_PLANNING: 'Planning Assets',
    WEBSITE_GENERATION: 'Building Website',
    PROJECT_CREATION: 'Creating Project',
    ASSET_GENERATION: 'Generating Assets',
    VALIDATION: 'Validating Brand Compliance',
    SCORING: 'Scoring Performance',
    COMPLETE: 'Complete',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
  };
  return labels[state] || state;
}

export function useAutonomousJobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<AutonomousJob[]>([]);
  const [activeJob, setActiveJob] = useState<AutonomousJob | null>(null);
  const [jobLogs, setJobLogs] = useState<JobLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Guard: when false, don't auto-select running jobs (e.g. after New Chat)
  const autoAttachRef = useRef(true);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('rumi_autonomous_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) {
      setJobs(data as unknown as AutonomousJob[]);
      // Auto-select active job only if autoAttach is enabled
      if (autoAttachRef.current) {
        const running = data.find((j: any) => j.state !== 'COMPLETE' && j.state !== 'FAILED' && j.state !== 'CANCELLED');
        if (running) setActiveJob(running as unknown as AutonomousJob);
      }
    }
  }, [user]);

  // Fetch logs for active job
  const fetchLogs = useCallback(async (jobId: string) => {
    const { data } = await supabase
      .from('rumi_job_logs')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });
    if (data) setJobLogs(data as unknown as JobLog[]);
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;
    fetchJobs();

    const channel = supabase
      .channel('rumi-autonomous-jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rumi_autonomous_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as unknown as AutonomousJob;
          setJobs(prev => {
            const idx = prev.findIndex(j => j.id === updated.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [updated, ...prev];
          });

          // Update active job only if it's the same job OR autoAttach is on
          if (activeJob?.id === updated.id) {
            setActiveJob(updated);
          } else if (autoAttachRef.current && !activeJob && updated.state !== 'COMPLETE' && updated.state !== 'FAILED' && updated.state !== 'CANCELLED') {
            setActiveJob(updated);
          }

          // Refresh logs
          if (updated.id) fetchLogs(updated.id);

          // Notify on completion
          if (updated.state === 'COMPLETE') {
            toast({
              title: '🎉 Campaign Complete',
              description: 'Your autonomous creative campaign is ready to view.',
            });
            notifyAiComplete({
              source: 'think',
              status: 'success',
              title: 'Campaign ready',
              message: 'Your autonomous creative campaign is complete.',
              dedupeKey: updated.id,
            });
          }
          if (updated.state === 'FAILED') {
            toast({
              title: 'Job Failed',
              description: updated.error_message || 'An error occurred during execution.',
              variant: 'destructive',
            });
            notifyAiComplete({
              source: 'think',
              status: 'error',
              title: 'Campaign failed',
              message: updated.error_message || 'An error occurred during execution.',
              dedupeKey: updated.id,
            });
          }
          if (updated.state === 'CANCELLED') {
            toast({
              title: 'Job cancelled',
              description: 'Automation stopped and your chat history was kept.',
            });
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchJobs, fetchLogs, activeJob?.id, toast]);

  // Load logs when active job changes
  useEffect(() => {
    if (activeJob?.id) fetchLogs(activeJob.id);
  }, [activeJob?.id, fetchLogs]);

  // Submit new job — uses fetch with streaming to keep edge function alive
  const submitJob = useCallback(async (objective: Record<string, unknown>, brandId?: string) => {
    if (!user) return null;
    setIsSubmitting(true);
    // Re-enable autoAttach when submitting a new job
    autoAttachRef.current = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/rumi-autonomous-execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ objective, brandId }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(errBody || `HTTP ${response.status}`);
      }

      // Read the first line to get jobId, then drain the stream in background.
      // If the browser stops reading, the edge runtime can stop the long-running job.
      const reader = response.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        if (value) {
          try {
            const firstLine = JSON.parse(new TextDecoder().decode(value).split('\n')[0]);
            await fetchJobs();
            void (async () => {
              try {
                while (true) {
                  const { done } = await reader.read();
                  if (done) break;
                }
              } catch {
                if (firstLine?.jobId) await supabase.functions.invoke('rumi-autonomous-resume', { body: { jobId: firstLine.jobId } });
              } finally {
                try { reader.releaseLock(); } catch { /* noop */ }
              }
            })();
            return firstLine.jobId;
          } catch {
            reader.releaseLock();
          }
        }
      }

      await fetchJobs();
      return null;
    } catch (err: any) {
      toast({ title: 'Failed to start job', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, fetchJobs, toast]);

  // Resume job
  const resumeJob = useCallback(async (jobId: string) => {
    try {
      await supabase.functions.invoke('rumi-autonomous-resume', { body: { jobId } });
      toast({ title: 'Job resumed' });
    } catch (err: any) {
      toast({ title: 'Resume failed', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  // Cancel job
  const cancelJob = useCallback(async (jobId: string) => {
    await supabase
      .from('rumi_autonomous_jobs')
      .update({ state: 'CANCELLED', error_message: null } as any)
      .eq('id', jobId);
    toast({ title: 'Job cancelled', description: 'Execution stopped without clearing your messages.' });
  }, [activeJob, toast]);

  // Delete job and its logs
  const deleteJob = useCallback(async (jobId: string) => {
    // Delete agent actions first (cascades via FK but be explicit)
    await supabase.from('rumi_agent_actions').delete().eq('job_id', jobId);
    // Delete logs
    await supabase.from('rumi_job_logs').delete().eq('job_id', jobId);
    // Delete job
    await supabase.from('rumi_autonomous_jobs').delete().eq('id', jobId);
    
    setJobs(prev => prev.filter(j => j.id !== jobId));
    if (activeJob?.id === jobId) {
      setActiveJob(null);
      setJobLogs([]);
    }
    toast({ title: 'Job deleted' });
  }, [activeJob, toast]);

  // Select job (manual click — re-enables autoAttach for that job)
  const selectJob = useCallback((job: AutonomousJob | null) => {
    if (job) {
      autoAttachRef.current = true;
    }
    setActiveJob(job);
  }, []);

  // Detach from active job without disabling future auto-attach
  const detachJob = useCallback(() => {
    autoAttachRef.current = false;
    setActiveJob(null);
    setJobLogs([]);
  }, []);

  return {
    jobs,
    activeJob,
    jobLogs,
    isLoading,
    isSubmitting,
    submitJob,
    resumeJob,
    cancelJob,
    deleteJob,
    selectJob,
    detachJob,
    fetchJobs,
  };
}

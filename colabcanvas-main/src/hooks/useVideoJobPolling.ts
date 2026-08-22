import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyAiComplete } from '@/lib/notifications/aiNotify';

interface VideoJob {
  id: string;
  prediction_id: string;
  status: string;
  progress: number;
  output_video_url: string | null;
  prompt: string | null;
  project_id: string;
}

interface UseVideoJobPollingOptions {
  projectId: string;
  onVideoComplete?: (videoUrl: string, jobId: string) => void;
  enabled?: boolean;
}

export function useVideoJobPolling({
  projectId,
  onVideoComplete,
  enabled = true
}: UseVideoJobPollingOptions) {
  const [pendingJobs, setPendingJobs] = useState<VideoJob[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch pending jobs for current project
  const fetchPendingJobs = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('video_generation_jobs')
        .select('id, prediction_id, status, progress, output_video_url, prompt, project_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .in('status', ['pending', 'starting', 'processing'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching video jobs:', error);
        return;
      }

      setPendingJobs(data || []);
    } catch (err) {
      console.error('Error in fetchPendingJobs:', err);
    }
  }, [projectId]);

  // Poll status for a single job
  const pollJobStatus = useCallback(async (job: VideoJob) => {
    try {
      const { data, error } = await supabase.functions.invoke('luma-generate', {
        body: { action: 'status', predictionId: job.prediction_id }
      });

      if (error) {
        console.error('Error polling job status:', error);
        return;
      }

      // Update job in database
      const newStatus = data.status;
      const isCompleted = newStatus === 'completed' || newStatus === 'succeeded';
      const isFailed = newStatus === 'failed' || newStatus === 'canceled';

      if (isCompleted || isFailed) {
        const updateData: Record<string, any> = {
          status: isCompleted ? 'completed' : 'failed',
          progress: isCompleted ? 100 : data.progress || 0,
          completed_at: new Date().toISOString()
        };

        if (isCompleted && data.output_video_url) {
          updateData.output_video_url = data.output_video_url;
        }
        if (isFailed && data.error) {
          updateData.error = data.error;
        }

        await supabase
          .from('video_generation_jobs')
          .update(updateData)
          .eq('id', job.id);

        if (isCompleted && data.output_video_url) {
          toast.success('Video generation completed!');
          notifyAiComplete({
            source: 'video',
            status: 'success',
            title: 'Video ready',
            message: 'Your AI video has finished rendering.',
            dedupeKey: job.id,
          });
          onVideoComplete?.(data.output_video_url, job.id);
        } else if (isFailed) {
          toast.error('Video generation failed: ' + (data.error || 'Unknown error'));
          notifyAiComplete({
            source: 'video',
            status: 'error',
            title: 'Video failed',
            message: data.error || 'Video generation failed.',
            dedupeKey: job.id,
          });
        }

        // Remove from pending jobs
        setPendingJobs(prev => prev.filter(j => j.id !== job.id));
      } else {
        // Update progress
        await supabase
          .from('video_generation_jobs')
          .update({
            status: newStatus,
            progress: data.progress || job.progress
          })
          .eq('id', job.id);

        // Update local state
        setPendingJobs(prev =>
          prev.map(j =>
            j.id === job.id
              ? { ...j, status: newStatus, progress: data.progress || j.progress }
              : j
          )
        );
      }
    } catch (err) {
      console.error('Error in pollJobStatus:', err);
    }
  }, [onVideoComplete]);

  // Main polling loop
  useEffect(() => {
    if (!enabled || !projectId) return;

    // Initial fetch
    fetchPendingJobs();

    // Set up polling interval
    const startPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      pollingIntervalRef.current = setInterval(async () => {
        if (pendingJobs.length === 0) {
          setIsPolling(false);
          return;
        }

        setIsPolling(true);

        // Poll all pending jobs
        await Promise.all(pendingJobs.map(job => pollJobStatus(job)));
      }, 5000);
    };

    if (pendingJobs.length > 0) {
      startPolling();
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [enabled, projectId, pendingJobs.length, fetchPendingJobs, pollJobStatus]);

  // Refetch when pendingJobs becomes empty to check for new jobs
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (pendingJobs.length === 0) {
        fetchPendingJobs();
      }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [pendingJobs.length, fetchPendingJobs]);

  return {
    pendingJobs,
    isPolling,
    refetchJobs: fetchPendingJobs
  };
}

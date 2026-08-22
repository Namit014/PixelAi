
-- Agent actions table for transparent tool-use
CREATE TABLE public.rumi_agent_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.rumi_autonomous_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  result_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.rumi_agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agent actions"
  ON public.rumi_agent_actions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own agent actions"
  ON public.rumi_agent_actions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role needs insert (from edge function)
CREATE POLICY "Service can insert agent actions"
  ON public.rumi_agent_actions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow delete for cleanup
CREATE POLICY "Users can delete their own agent actions"
  ON public.rumi_agent_actions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rumi_agent_actions;

-- Add delete policy for job logs (needed for deletion feature)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own job logs' AND tablename = 'rumi_job_logs'
  ) THEN
    CREATE POLICY "Users can delete their own job logs"
      ON public.rumi_job_logs FOR DELETE
      TO authenticated
      USING (job_id IN (SELECT id FROM public.rumi_autonomous_jobs WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Add delete policy for autonomous jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own autonomous jobs' AND tablename = 'rumi_autonomous_jobs'
  ) THEN
    CREATE POLICY "Users can delete their own autonomous jobs"
      ON public.rumi_autonomous_jobs FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

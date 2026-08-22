
-- Autonomous Jobs table
CREATE TABLE public.rumi_autonomous_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  objective jsonb NOT NULL,
  asset_matrix jsonb DEFAULT '[]'::jsonb,
  state text NOT NULL DEFAULT 'QUEUED',
  checkpoint jsonb DEFAULT '{}'::jsonb,
  strategy_output jsonb DEFAULT '{}'::jsonb,
  scoring_output jsonb DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Job Logs table
CREATE TABLE public.rumi_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.rumi_autonomous_jobs(id) ON DELETE CASCADE NOT NULL,
  agent_name text NOT NULL,
  status text NOT NULL,
  input_summary text,
  output_summary text,
  confidence numeric,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.rumi_autonomous_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rumi_job_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own jobs" ON public.rumi_autonomous_jobs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own logs" ON public.rumi_job_logs
  FOR SELECT TO authenticated
  USING (job_id IN (SELECT id FROM public.rumi_autonomous_jobs WHERE user_id = auth.uid()));

-- Service role insert policy for edge functions to write logs
CREATE POLICY "Service role inserts logs" ON public.rumi_job_logs
  FOR INSERT TO authenticated
  WITH CHECK (job_id IN (SELECT id FROM public.rumi_autonomous_jobs WHERE user_id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_rumi_autonomous_jobs_updated_at
  BEFORE UPDATE ON public.rumi_autonomous_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rumi_autonomous_jobs;

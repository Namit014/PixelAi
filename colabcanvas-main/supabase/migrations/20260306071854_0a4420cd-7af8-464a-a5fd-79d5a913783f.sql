
CREATE TABLE public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'processing',
  design_type TEXT,
  prompt TEXT,
  total_variations INTEGER DEFAULT 1,
  completed_variations INTEGER DEFAULT 0,
  results JSONB DEFAULT '[]'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_generation_jobs_user_status ON public.generation_jobs(user_id, status);

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON public.generation_jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own jobs"
  ON public.generation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own jobs"
  ON public.generation_jobs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

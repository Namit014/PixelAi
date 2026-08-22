-- Create canvas_workflow_exports table for tracking image exports between canvas and workflow
CREATE TABLE IF NOT EXISTS public.canvas_workflow_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('canvas', 'workflow')),
  source_id UUID NOT NULL,
  destination_type TEXT NOT NULL CHECK (destination_type IN ('canvas', 'workflow')),
  destination_id UUID,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.canvas_workflow_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own exports"
  ON public.canvas_workflow_exports
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exports"
  ON public.canvas_workflow_exports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_canvas_workflow_exports_user_id ON public.canvas_workflow_exports(user_id);
CREATE INDEX idx_canvas_workflow_exports_source ON public.canvas_workflow_exports(source_type, source_id);
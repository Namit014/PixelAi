
CREATE TABLE public.design_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  grid_type TEXT,
  focal_position TEXT,
  text_placement TEXT,
  image_proportion TEXT,
  alignment_style TEXT,
  whitespace_ratio NUMERIC,
  style_mode TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.design_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fingerprints"
ON public.design_fingerprints FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fingerprints"
ON public.design_fingerprints FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_design_fingerprints_user_id ON public.design_fingerprints(user_id);
CREATE INDEX idx_design_fingerprints_created_at ON public.design_fingerprints(created_at DESC);

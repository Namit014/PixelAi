-- Create uploaded_assets table for tracking user uploads
CREATE TABLE IF NOT EXISTS public.uploaded_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  storage_url text NOT NULL,
  thumbnail_url text,
  width integer,
  height integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.uploaded_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own uploads"
  ON public.uploaded_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploads"
  ON public.uploaded_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads"
  ON public.uploaded_assets FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS uploaded_assets_project_user_idx ON public.uploaded_assets(project_id, user_id);
CREATE INDEX IF NOT EXISTS uploaded_assets_created_at_idx ON public.uploaded_assets(created_at DESC);
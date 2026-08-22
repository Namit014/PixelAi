-- Create reference_images table for user's own image references
CREATE TABLE IF NOT EXISTS public.reference_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT NOT NULL,
  title TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  source TEXT, -- 'google_drive', 'upload', etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reference_images ENABLE ROW LEVEL SECURITY;

-- Users can view their own reference images
CREATE POLICY "Users can view own reference images"
  ON public.reference_images
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own reference images
CREATE POLICY "Users can insert own reference images"
  ON public.reference_images
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reference images
CREATE POLICY "Users can update own reference images"
  ON public.reference_images
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reference images
CREATE POLICY "Users can delete own reference images"
  ON public.reference_images
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_reference_images_user_id ON public.reference_images(user_id);
CREATE INDEX idx_reference_images_project_id ON public.reference_images(project_id);
CREATE INDEX idx_reference_images_created_at ON public.reference_images(created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_reference_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reference_images_updated_at
  BEFORE UPDATE ON public.reference_images
  FOR EACH ROW
  EXECUTE FUNCTION update_reference_images_updated_at();

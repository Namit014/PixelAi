
-- Create presentations table for persistence + sharing
CREATE TABLE public.presentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Presentation',
  theme_id TEXT NOT NULL DEFAULT 'minimal-light',
  design_tokens JSONB NOT NULL DEFAULT '{}'::jsonb,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  share_token TEXT UNIQUE DEFAULT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Users can view their own presentations"
  ON public.presentations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presentations"
  ON public.presentations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presentations"
  ON public.presentations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presentations"
  ON public.presentations FOR DELETE
  USING (auth.uid() = user_id);

-- Public presentations can be viewed by anyone via share_token
CREATE POLICY "Public presentations are viewable by share token"
  ON public.presentations FOR SELECT
  USING (is_public = true AND share_token IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_presentations_updated_at
  BEFORE UPDATE ON public.presentations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for share token lookups
CREATE INDEX idx_presentations_share_token ON public.presentations(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_presentations_user_id ON public.presentations(user_id);

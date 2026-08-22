
-- Create storage bucket for proposal images
INSERT INTO storage.buckets (id, name, public) VALUES ('rumi-proposals', 'rumi-proposals', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for rumi-proposals bucket
CREATE POLICY "Proposal images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'rumi-proposals');

CREATE POLICY "Users can upload proposal images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rumi-proposals' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their proposal images"
ON storage.objects FOR DELETE
USING (bucket_id = 'rumi-proposals' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create content proposals table
CREATE TABLE public.rumi_content_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.rumi_creative_sessions(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL,
  title TEXT NOT NULL,
  copy_text TEXT,
  hashtags TEXT[],
  image_url TEXT,
  image_prompt TEXT,
  platform_specs JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  user_feedback TEXT,
  iteration_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_proposal_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'accepted', 'rejected', 'iterating') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_proposal_status_trigger
BEFORE INSERT OR UPDATE ON public.rumi_content_proposals
FOR EACH ROW EXECUTE FUNCTION public.validate_proposal_status();

-- Enable RLS
ALTER TABLE public.rumi_content_proposals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own proposals"
ON public.rumi_content_proposals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own proposals"
ON public.rumi_content_proposals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proposals"
ON public.rumi_content_proposals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proposals"
ON public.rumi_content_proposals FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_rumi_content_proposals_user_id ON public.rumi_content_proposals(user_id);
CREATE INDEX idx_rumi_content_proposals_session_id ON public.rumi_content_proposals(session_id);

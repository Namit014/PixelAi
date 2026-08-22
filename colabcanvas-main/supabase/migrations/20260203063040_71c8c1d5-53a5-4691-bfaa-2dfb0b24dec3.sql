-- Create video_generation_jobs table to persist video generation state
CREATE TABLE public.video_generation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  prediction_id TEXT NOT NULL,
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  output_video_url TEXT,
  error TEXT,
  credits_charged INTEGER NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 4,
  aspect_ratio TEXT DEFAULT '16:9',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.video_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view their own video jobs"
ON public.video_generation_jobs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own jobs
CREATE POLICY "Users can insert their own video jobs"
ON public.video_generation_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own jobs
CREATE POLICY "Users can update their own video jobs"
ON public.video_generation_jobs
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_video_generation_jobs_user_status ON public.video_generation_jobs(user_id, status);
CREATE INDEX idx_video_generation_jobs_prediction_id ON public.video_generation_jobs(prediction_id);

-- Add trigger for updated_at
CREATE TRIGGER update_video_generation_jobs_updated_at
BEFORE UPDATE ON public.video_generation_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
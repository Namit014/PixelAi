-- Create analytics/usage tracking table
CREATE TABLE public.design_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  model_used TEXT NOT NULL,
  design_type TEXT,
  prompt TEXT NOT NULL,
  generation_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on design_generations
ALTER TABLE public.design_generations ENABLE ROW LEVEL SECURITY;

-- Users can view their own generations
CREATE POLICY "Users can view their own generations"
ON public.design_generations
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all generations
CREATE POLICY "Admins can view all generations"
ON public.design_generations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert generations
CREATE POLICY "System can insert generations"
ON public.design_generations
FOR INSERT
WITH CHECK (true);

-- Add model preference to conversations
ALTER TABLE public.conversations 
ADD COLUMN preferred_model TEXT DEFAULT 'google/gemini-2.5-flash';
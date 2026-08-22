-- =============================================
-- COSMO ACCESS CONTROL
-- =============================================

-- Create table to track Cosmo access
CREATE TABLE public.cosmo_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.cosmo_access ENABLE ROW LEVEL SECURITY;

-- Users can check their own access
CREATE POLICY "Users can check their own cosmo access"
ON public.cosmo_access FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all cosmo access
CREATE POLICY "Admins can manage cosmo access"
ON public.cosmo_access FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- AI TRAINING SYSTEM
-- =============================================

-- Training materials table
CREATE TABLE public.ai_training_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  material_type TEXT NOT NULL CHECK (material_type IN ('article', 'blog', 'image', 'document', 'guideline')),
  content_url TEXT,
  content_text TEXT,
  extracted_knowledge JSONB DEFAULT '{}',
  target_agents TEXT[] DEFAULT '{}',
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training sessions log
CREATE TABLE public.ai_training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES public.ai_training_materials(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  training_result JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (admin only)
ALTER TABLE public.ai_training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_training_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage training materials
CREATE POLICY "Admins can manage training materials"
ON public.ai_training_materials FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can manage training sessions
CREATE POLICY "Admins can manage training sessions"
ON public.ai_training_sessions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger for training materials
CREATE TRIGGER update_ai_training_materials_updated_at
BEFORE UPDATE ON public.ai_training_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
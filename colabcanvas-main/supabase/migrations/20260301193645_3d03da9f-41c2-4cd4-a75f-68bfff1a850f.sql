
-- ========================================
-- Round 1: cosmo_templates + cosmo_components + presentations update
-- ========================================

-- 1. cosmo_templates — system + user presentation templates
CREATE TABLE public.cosmo_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID, -- null for system templates
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'pitch-deck',
  subcategory TEXT,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  design_tokens JSONB,
  thumbnail_url TEXT,
  format TEXT NOT NULL DEFAULT '16:9',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cosmo_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view system templates (user_id IS NULL) and featured ones
CREATE POLICY "Anyone can view system templates"
  ON public.cosmo_templates FOR SELECT
  USING (user_id IS NULL OR is_featured = true OR user_id = auth.uid());

-- Users can create their own templates
CREATE POLICY "Users can create own templates"
  ON public.cosmo_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON public.cosmo_templates FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON public.cosmo_templates FOR DELETE
  USING (auth.uid() = user_id);

-- 2. cosmo_components — reusable block components
CREATE TABLE public.cosmo_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  block_data JSONB NOT NULL,
  variants JSONB DEFAULT '[]'::jsonb,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'custom',
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cosmo_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own components"
  ON public.cosmo_components FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own components"
  ON public.cosmo_components FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own components"
  ON public.cosmo_components FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own components"
  ON public.cosmo_components FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Add publish/SEO fields to presentations
ALTER TABLE public.presentations
  ADD COLUMN IF NOT EXISTS publish_mode TEXT DEFAULT 'presentation',
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- Triggers for updated_at
CREATE TRIGGER update_cosmo_templates_updated_at
  BEFORE UPDATE ON public.cosmo_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cosmo_components_updated_at
  BEFORE UPDATE ON public.cosmo_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

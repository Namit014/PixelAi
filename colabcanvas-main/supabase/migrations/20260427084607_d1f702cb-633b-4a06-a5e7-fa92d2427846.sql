-- Reusable canvas components library (per-user)
CREATE TABLE public.canvas_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  tags TEXT[] NOT NULL DEFAULT '{}',
  fabric_json JSONB NOT NULL,
  thumbnail_url TEXT,
  width NUMERIC,
  height NUMERIC,
  version INTEGER NOT NULL DEFAULT 1,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.canvas_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own canvas components"
  ON public.canvas_components FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own canvas components"
  ON public.canvas_components FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own canvas components"
  ON public.canvas_components FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own canvas components"
  ON public.canvas_components FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_canvas_components_user ON public.canvas_components(user_id);
CREATE INDEX idx_canvas_components_category ON public.canvas_components(user_id, category);

CREATE TRIGGER update_canvas_components_updated_at
  BEFORE UPDATE ON public.canvas_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- AI font generator presets (per-user)
CREATE TABLE public.canvas_fonts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  reference_image_url TEXT,
  preview_url TEXT,
  style_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.canvas_fonts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own canvas fonts"
  ON public.canvas_fonts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own canvas fonts"
  ON public.canvas_fonts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own canvas fonts"
  ON public.canvas_fonts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own canvas fonts"
  ON public.canvas_fonts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_canvas_fonts_user ON public.canvas_fonts(user_id);
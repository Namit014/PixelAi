
-- Create design_showcase table
CREATE TABLE public.design_showcase (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  creator_name TEXT NOT NULL DEFAULT 'Anonymous',
  creator_avatar_url TEXT,
  tags TEXT[] DEFAULT '{}',
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.design_showcase ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view visible showcase items"
ON public.design_showcase
FOR SELECT
USING (is_visible = true);

-- Admin-only write access using has_role function
CREATE POLICY "Admins can insert showcase items"
ON public.design_showcase
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update showcase items"
ON public.design_showcase
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete showcase items"
ON public.design_showcase
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Index for tag filtering
CREATE INDEX idx_design_showcase_tags ON public.design_showcase USING GIN(tags);
CREATE INDEX idx_design_showcase_visible ON public.design_showcase(is_visible, sort_order);

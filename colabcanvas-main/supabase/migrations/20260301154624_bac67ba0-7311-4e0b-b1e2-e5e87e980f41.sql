
-- Cosmo Asset Library: admin-uploaded icons, illustrations, stickers, badges
CREATE TABLE public.cosmo_asset_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'icon', 'illustration', 'sticker', 'badge'
  tags TEXT[] DEFAULT '{}',
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_type TEXT DEFAULT 'svg',
  uploaded_by UUID REFERENCES public.profiles(id),
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cosmo_asset_library ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can view cosmo assets"
ON public.cosmo_asset_library
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert cosmo assets"
ON public.cosmo_asset_library
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update cosmo assets"
ON public.cosmo_asset_library
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete cosmo assets"
ON public.cosmo_asset_library
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast category filtering
CREATE INDEX idx_cosmo_asset_library_category ON public.cosmo_asset_library(category);

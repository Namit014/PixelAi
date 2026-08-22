
-- ═══════════════════════════════════════════════════════════════
-- Round 3: Publishing + CMS tables
-- ═══════════════════════════════════════════════════════════════

-- 1. Add publishing & SEO fields to presentations
ALTER TABLE public.presentations 
  ADD COLUMN IF NOT EXISTS publish_mode text NOT NULL DEFAULT 'presentation',
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS og_image_url text;

-- 2. CMS Collections table
CREATE TABLE IF NOT EXISTS public.cosmo_collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  presentation_id uuid REFERENCES public.presentations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cosmo_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collections"
  ON public.cosmo_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own collections"
  ON public.cosmo_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON public.cosmo_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON public.cosmo_collections FOR DELETE
  USING (auth.uid() = user_id);

-- 3. CMS Collection Items table
CREATE TABLE IF NOT EXISTS public.cosmo_collection_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES public.cosmo_collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cosmo_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collection items"
  ON public.cosmo_collection_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own collection items"
  ON public.cosmo_collection_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collection items"
  ON public.cosmo_collection_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collection items"
  ON public.cosmo_collection_items FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_cosmo_collections_updated_at
  BEFORE UPDATE ON public.cosmo_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cosmo_collection_items_updated_at
  BEFORE UPDATE ON public.cosmo_collection_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

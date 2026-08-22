-- ─── PUBLISHING / LEADS / VERSIONING SCHEMA ────────────────────────

-- 1. Extend published_landing_pages with publishing metadata
ALTER TABLE public.published_landing_pages
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS integrations jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_code jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS analytics jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unpublished_at timestamptz;

-- 2. Lead submissions
CREATE TABLE IF NOT EXISTS public.landing_page_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.published_landing_pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  form_id text,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  email text,
  name text,
  source_url text,
  utm jsonb DEFAULT '{}'::jsonb,
  user_agent text,
  ip_hash text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpl_page ON public.landing_page_leads(page_id);
CREATE INDEX IF NOT EXISTS idx_lpl_user ON public.landing_page_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_lpl_created ON public.landing_page_leads(created_at DESC);

ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit leads on active pages" ON public.landing_page_leads;
CREATE POLICY "Anyone can submit leads on active pages"
  ON public.landing_page_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.published_landing_pages p
      WHERE p.id = page_id AND p.is_active = true AND p.user_id = landing_page_leads.user_id
    )
  );

DROP POLICY IF EXISTS "Owners view their leads" ON public.landing_page_leads;
CREATE POLICY "Owners view their leads"
  ON public.landing_page_leads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Owners update their leads" ON public.landing_page_leads;
CREATE POLICY "Owners update their leads"
  ON public.landing_page_leads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Owners delete their leads" ON public.landing_page_leads;
CREATE POLICY "Owners delete their leads"
  ON public.landing_page_leads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Website element edit audit
CREATE TABLE IF NOT EXISTS public.website_element_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.rumi_autonomous_jobs(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.published_landing_pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  section_index int,
  field_path text,
  previous_value jsonb,
  new_value jsonb,
  edit_source text NOT NULL DEFAULT 'manual',
  instruction text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wee_job ON public.website_element_edits(job_id);
CREATE INDEX IF NOT EXISTS idx_wee_page ON public.website_element_edits(page_id);
CREATE INDEX IF NOT EXISTS idx_wee_user ON public.website_element_edits(user_id);

ALTER TABLE public.website_element_edits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their element edits" ON public.website_element_edits;
CREATE POLICY "Owners manage their element edits"
  ON public.website_element_edits FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id);

-- 4. Realtime for leads + edits + published pages
ALTER PUBLICATION supabase_realtime ADD TABLE public.landing_page_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_element_edits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.published_landing_pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.landing_page_visits;

-- 5. Visit increment helper (atomic)
CREATE OR REPLACE FUNCTION public.increment_landing_visit(_page_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.published_landing_pages
  SET visit_count = visit_count + 1
  WHERE id = _page_id AND is_active = true;
END;
$$;
-- Helper function to generate a short, URL-safe slug
CREATE OR REPLACE FUNCTION public.generate_landing_slug()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  alphabet text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i int;
  candidate text;
  exists_already boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    candidate := result;
    SELECT EXISTS (SELECT 1 FROM public.published_landing_pages WHERE slug = candidate) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Main published pages table
CREATE TABLE public.published_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid REFERENCES public.rumi_autonomous_jobs(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  custom_domain text UNIQUE,
  domain_verified boolean NOT NULL DEFAULT false,
  domain_verification_token text,
  site_data jsonb NOT NULL,
  title text,
  is_active boolean NOT NULL DEFAULT true,
  visit_count bigint NOT NULL DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_published_landing_pages_user_id ON public.published_landing_pages(user_id);
CREATE INDEX idx_published_landing_pages_slug ON public.published_landing_pages(slug);
CREATE INDEX idx_published_landing_pages_custom_domain ON public.published_landing_pages(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_published_landing_pages_job_id ON public.published_landing_pages(job_id);

ALTER TABLE public.published_landing_pages ENABLE ROW LEVEL SECURITY;

-- Owner full access
CREATE POLICY "Owners can view their published pages"
  ON public.published_landing_pages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can create published pages"
  ON public.published_landing_pages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their published pages"
  ON public.published_landing_pages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete their published pages"
  ON public.published_landing_pages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public read of active pages (anon + auth)
CREATE POLICY "Anyone can view active published pages"
  ON public.published_landing_pages FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Updated-at trigger
CREATE TRIGGER published_landing_pages_set_updated_at
  BEFORE UPDATE ON public.published_landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Visits table
CREATE TABLE public.landing_page_visits (
  id bigserial PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.published_landing_pages(id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now(),
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  user_agent text,
  device text,
  country text
);

CREATE INDEX idx_landing_page_visits_page_id ON public.landing_page_visits(page_id);
CREATE INDEX idx_landing_page_visits_visited_at ON public.landing_page_visits(visited_at DESC);

ALTER TABLE public.landing_page_visits ENABLE ROW LEVEL SECURITY;

-- Anyone can record a visit on an active page
CREATE POLICY "Anyone can record visits"
  ON public.landing_page_visits FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.published_landing_pages p
      WHERE p.id = page_id AND p.is_active = true
    )
  );

-- Page owner can read their visits
CREATE POLICY "Owner can read their visits"
  ON public.landing_page_visits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.published_landing_pages p
      WHERE p.id = page_id AND p.user_id = auth.uid()
    )
  );
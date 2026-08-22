-- =========================================================
-- Announcement popups (admin-managed, page-scoped)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.announcement_popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  cta_label TEXT,
  cta_url TEXT,
  image_url TEXT,
  secondary_image_url TEXT,
  pages TEXT[] NOT NULL DEFAULT ARRAY['*']::text[],
  audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  dismissible BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'once' CHECK (frequency IN ('once','session','always')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcement_popups_active_idx
  ON public.announcement_popups (is_active, priority DESC, created_at DESC);

ALTER TABLE public.announcement_popups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active popups" ON public.announcement_popups;
CREATE POLICY "Authenticated users can read active popups"
  ON public.announcement_popups
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
  );

DROP POLICY IF EXISTS "Admins manage popups" ON public.announcement_popups;
CREATE POLICY "Admins manage popups"
  ON public.announcement_popups
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER announcement_popups_updated_at
  BEFORE UPDATE ON public.announcement_popups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Per-user view / dismiss / click tracking
-- =========================================================
CREATE TABLE IF NOT EXISTS public.announcement_popup_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id UUID NOT NULL REFERENCES public.announcement_popups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed BOOLEAN NOT NULL DEFAULT false,
  cta_clicked BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (popup_id, user_id)
);

CREATE INDEX IF NOT EXISTS announcement_popup_views_popup_idx
  ON public.announcement_popup_views (popup_id);
CREATE INDEX IF NOT EXISTS announcement_popup_views_user_idx
  ON public.announcement_popup_views (user_id);

ALTER TABLE public.announcement_popup_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own popup views" ON public.announcement_popup_views;
CREATE POLICY "Users read own popup views"
  ON public.announcement_popup_views
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users insert own popup views" ON public.announcement_popup_views;
CREATE POLICY "Users insert own popup views"
  ON public.announcement_popup_views
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own popup views" ON public.announcement_popup_views;
CREATE POLICY "Users update own popup views"
  ON public.announcement_popup_views
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all popup views" ON public.announcement_popup_views;
CREATE POLICY "Admins manage all popup views"
  ON public.announcement_popup_views
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER announcement_popup_views_updated_at
  BEFORE UPDATE ON public.announcement_popup_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Realtime publication
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'announcement_popups'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_popups';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'announcement_popup_views'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_popup_views';
  END IF;
END $$;
-- ============================================================
-- 1) BANK ACCOUNT VERIFICATION COLUMNS
-- ============================================================
ALTER TABLE public.talent_payout_accounts
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','failed')),
  ADD COLUMN IF NOT EXISTS verification_method text,
  ADD COLUMN IF NOT EXISTS verification_details jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_verification_at timestamptz;

-- Backfill: keep legacy `verified` column in sync
UPDATE public.talent_payout_accounts
   SET verification_status = 'verified'
 WHERE verified = true AND verification_status = 'unverified';

-- ============================================================
-- 2) KYC TABLE + STORAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.talent_kyc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'unverified'
    CHECK (status IN ('unverified','submitted','verified','rejected')),
  id_type text CHECK (id_type IN ('passport','driver_license','national_id')),
  id_country text,
  id_number_last4 text,
  id_front_path text,
  id_back_path text,
  selfie_path text,
  ai_confidence numeric,
  ai_reasons jsonb DEFAULT '{}'::jsonb,
  reviewed_by uuid,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.talent_kyc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc owner select" ON public.talent_kyc;
CREATE POLICY "kyc owner select" ON public.talent_kyc
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "kyc owner upsert" ON public.talent_kyc;
CREATE POLICY "kyc owner upsert" ON public.talent_kyc
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "kyc owner update" ON public.talent_kyc;
CREATE POLICY "kyc owner update" ON public.talent_kyc
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_talent_kyc_updated
  BEFORE UPDATE ON public.talent_kyc
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mirror status onto credits for cheap RPC checks
ALTER TABLE public.credits
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS bank_status text NOT NULL DEFAULT 'unverified';

-- Storage bucket for KYC documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('talent-kyc', 'talent-kyc', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "kyc files self select" ON storage.objects;
CREATE POLICY "kyc files self select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'talent-kyc'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

DROP POLICY IF EXISTS "kyc files self insert" ON storage.objects;
CREATE POLICY "kyc files self insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'talent-kyc'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "kyc files self update" ON storage.objects;
CREATE POLICY "kyc files self update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'talent-kyc'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public bucket for custom notification sounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('notification-assets', 'notification-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "notif sounds public read" ON storage.objects;
CREATE POLICY "notif sounds public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'notification-assets');

DROP POLICY IF EXISTS "notif sounds owner write" ON storage.objects;
CREATE POLICY "notif sounds owner write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'notification-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 3) TIGHTEN request_talent_payout: require verified bank + KYC
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_talent_payout(
  _payout_account_id uuid,
  _amount integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available integer;
  pending integer;
  acct record;
  new_id uuid;
  kyc text;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT * INTO acct FROM public.talent_payout_accounts WHERE id = _payout_account_id;
  IF acct IS NULL OR acct.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Bank account not found';
  END IF;

  IF acct.verification_status <> 'verified' THEN
    RAISE EXCEPTION 'BANK_NOT_VERIFIED';
  END IF;

  SELECT kyc_status INTO kyc FROM public.credits WHERE user_id = auth.uid();
  IF kyc IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'KYC_NOT_VERIFIED';
  END IF;

  SELECT COALESCE(talent_balance, 0) INTO available FROM public.credits
   WHERE user_id = auth.uid() FOR UPDATE;
  IF available IS NULL THEN RAISE EXCEPTION 'No wallet found'; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO pending FROM public.talent_payouts
   WHERE user_id = auth.uid() AND status IN ('pending','processing');

  IF (available - pending) < _amount THEN
    RAISE EXCEPTION 'Amount exceeds available balance';
  END IF;

  INSERT INTO public.talent_payouts (user_id, payout_account_id, amount, currency, status)
  VALUES (auth.uid(), _payout_account_id, _amount, acct.currency, 'pending')
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- ============================================================
-- 4) AGENCY LANE
-- ============================================================
ALTER TABLE public.user_intent DROP CONSTRAINT IF EXISTS user_intent_intent_check;
ALTER TABLE public.user_intent
  ADD CONSTRAINT user_intent_intent_check
  CHECK (intent IN ('client','freelancer','agency','undecided'));

CREATE TABLE IF NOT EXISTS public.agency_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  agency_name text NOT NULL DEFAULT '',
  team_size int,
  domains text[] DEFAULT '{}',
  tools text[] DEFAULT '{}',
  case_studies jsonb DEFAULT '[]'::jsonb,
  hourly_blended_rate numeric,
  min_engagement_usd integer,
  availability text DEFAULT 'available',
  vetting_status text NOT NULL DEFAULT 'pending'
    CHECK (vetting_status IN ('pending','approved','rejected')),
  logo_url text,
  website_url text,
  country text,
  currency text DEFAULT 'USD',
  completion_state text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency self all" ON public.agency_profiles;
CREATE POLICY "agency self all" ON public.agency_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "agency approved public read" ON public.agency_profiles;
CREATE POLICY "agency approved public read" ON public.agency_profiles
  FOR SELECT TO authenticated
  USING (vetting_status = 'approved');

CREATE TRIGGER trg_agency_profiles_updated
  BEFORE UPDATE ON public.agency_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.talent_projects
  ADD COLUMN IF NOT EXISTS provider_preference text NOT NULL DEFAULT 'either'
    CHECK (provider_preference IN ('freelancer','agency','either')),
  ADD COLUMN IF NOT EXISTS assigned_agency_id uuid;

-- Extend participant check
CREATE OR REPLACE FUNCTION public.is_talent_project_participant(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.talent_projects p
    WHERE p.id = _project_id
      AND (
        p.user_id = _user_id
        OR (p.assigned_freelancer_id = _user_id AND p.freelancer_visible = true)
        OR p.assigned_agency_id = _user_id
      )
  ) OR public.has_role(_user_id, 'admin'::app_role)
$$;

-- ============================================================
-- 5) USER PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY,
  notification_enabled boolean NOT NULL DEFAULT true,
  notification_sound text NOT NULL DEFAULT 'chime',
  notification_volume int NOT NULL DEFAULT 60 CHECK (notification_volume BETWEEN 0 AND 100),
  custom_sound_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prefs self all" ON public.user_preferences;
CREATE POLICY "prefs self all" ON public.user_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_preferences_updated
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
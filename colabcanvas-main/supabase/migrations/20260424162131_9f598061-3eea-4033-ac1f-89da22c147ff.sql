-- 1. Extend credits with tiered balances
ALTER TABLE public.credits
  ADD COLUMN IF NOT EXISTS ai_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS talent_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escrow_balance integer NOT NULL DEFAULT 0;

-- Backfill ai_balance from existing balance (one time, idempotent)
UPDATE public.credits SET ai_balance = balance WHERE ai_balance = 0 AND balance > 0;

-- 2. Extend talent_projects with new columns
ALTER TABLE public.talent_projects
  ADD COLUMN IF NOT EXISTS reference_attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scope_md text,
  ADD COLUMN IF NOT EXISTS contract_md text,
  ADD COLUMN IF NOT EXISTS client_signature_url text,
  ADD COLUMN IF NOT EXISTS client_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS freelancer_signature_url text,
  ADD COLUMN IF NOT EXISTS freelancer_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS compiled_brief_md text,
  ADD COLUMN IF NOT EXISTS compiled_brief_json jsonb,
  ADD COLUMN IF NOT EXISTS payment_plan jsonb,
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- Update status check constraint to include new states
ALTER TABLE public.talent_projects DROP CONSTRAINT IF EXISTS talent_projects_status_check;
ALTER TABLE public.talent_projects ADD CONSTRAINT talent_projects_status_check
  CHECK (status = ANY (ARRAY['intake','proposal','scoped','contracted','locked','paid','active','completed','cancelled']));

-- 3. Escrow table
CREATE TABLE IF NOT EXISTS public.talent_escrow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.talent_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  freelancer_id uuid,
  amount integer NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'locked' CHECK (status IN ('scheduled','locked','released','refunded','cancelled')),
  milestone_label text,
  scheduled_for timestamptz,
  locked_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_talent_escrow_project ON public.talent_escrow(project_id);
CREATE INDEX IF NOT EXISTS idx_talent_escrow_user ON public.talent_escrow(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_escrow_freelancer ON public.talent_escrow(freelancer_id) WHERE freelancer_id IS NOT NULL;

ALTER TABLE public.talent_escrow ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "talent_escrow client read" ON public.talent_escrow;
CREATE POLICY "talent_escrow client read" ON public.talent_escrow FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = freelancer_id OR has_role(auth.uid(), 'admin'::app_role));

-- No insert/update/delete from clients - only edge functions via service role

-- 4. Promo codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo_codes public read active" ON public.promo_codes;
CREATE POLICY "promo_codes public read active" ON public.promo_codes FOR SELECT
  TO authenticated USING (active = true);

CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.talent_projects(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, user_id)
);
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo_redemptions own read" ON public.promo_code_redemptions;
CREATE POLICY "promo_redemptions own read" ON public.promo_code_redemptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- 5. RPCs for talent credit + escrow management
CREATE OR REPLACE FUNCTION public.deduct_talent_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Talent deduction')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_bal integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000000 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  IF auth.uid() != _user_id AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT talent_balance INTO current_bal FROM credits WHERE user_id = _user_id FOR UPDATE;
  IF current_bal IS NULL THEN RAISE EXCEPTION 'No credit record'; END IF;
  IF current_bal < _amount THEN RETURN false; END IF;
  UPDATE credits SET talent_balance = talent_balance - _amount, updated_at = now() WHERE user_id = _user_id;
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (_user_id, _amount, 'talent_deduction', _description);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_escrow_credits(_user_id uuid, _project_id uuid, _amount integer, _milestone text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_bal integer;
  new_id uuid;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF auth.uid() != _user_id AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT talent_balance INTO current_bal FROM credits WHERE user_id = _user_id FOR UPDATE;
  IF current_bal IS NULL OR current_bal < _amount THEN
    RAISE EXCEPTION 'Insufficient talent credits';
  END IF;
  UPDATE credits SET
    talent_balance = talent_balance - _amount,
    escrow_balance = escrow_balance + _amount,
    updated_at = now()
  WHERE user_id = _user_id;
  INSERT INTO talent_escrow (project_id, user_id, amount, status, milestone_label, locked_at)
  VALUES (_project_id, _user_id, _amount, 'locked', _milestone, now())
  RETURNING id INTO new_id;
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (_user_id, _amount, 'escrow_lock', COALESCE(_milestone, 'Escrow lock'));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_escrow_credits(_escrow_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  esc record;
BEGIN
  SELECT * INTO esc FROM talent_escrow WHERE id = _escrow_id FOR UPDATE;
  IF esc IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF esc.status != 'locked' THEN RAISE EXCEPTION 'Escrow not in locked state'; END IF;
  -- Authorization: only project owner or admin can release
  IF NOT (auth.uid() = esc.user_id OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE credits SET escrow_balance = escrow_balance - esc.amount, updated_at = now() WHERE user_id = esc.user_id;
  -- Credit freelancer if assigned
  IF esc.freelancer_id IS NOT NULL THEN
    UPDATE credits SET talent_balance = talent_balance + esc.amount, updated_at = now() WHERE user_id = esc.freelancer_id;
    INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
    VALUES (esc.freelancer_id, esc.amount, 'talent_payout', COALESCE(esc.milestone_label, 'Milestone payout'));
  END IF;
  UPDATE talent_escrow SET status = 'released', released_at = now() WHERE id = _escrow_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_escrow_credits(_escrow_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  esc record;
BEGIN
  SELECT * INTO esc FROM talent_escrow WHERE id = _escrow_id FOR UPDATE;
  IF esc IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF esc.status != 'locked' THEN RAISE EXCEPTION 'Escrow not refundable'; END IF;
  IF NOT (auth.uid() = esc.user_id OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE credits SET
    escrow_balance = escrow_balance - esc.amount,
    talent_balance = talent_balance + esc.amount,
    updated_at = now()
  WHERE user_id = esc.user_id;
  UPDATE talent_escrow SET status = 'refunded', refunded_at = now() WHERE id = _escrow_id;
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (esc.user_id, esc.amount, 'escrow_refund', COALESCE(esc.milestone_label, 'Refund'));
  RETURN true;
END;
$$;

-- 6. Seed a few demo promo codes
INSERT INTO public.promo_codes (code, discount_type, discount_value, max_uses, expires_at, active)
VALUES
  ('LAUNCH20', 'percent', 20, 1000, now() + interval '90 days', true),
  ('FIRST100', 'flat', 100, 500, now() + interval '60 days', true),
  ('COLAB10', 'percent', 10, NULL, NULL, true)
ON CONFLICT (code) DO NOTHING;
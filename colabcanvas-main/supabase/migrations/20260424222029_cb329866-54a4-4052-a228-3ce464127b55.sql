-- ============================================
-- talent_payout_accounts: freelancer bank details
-- ============================================
CREATE TABLE IF NOT EXISTS public.talent_payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  country text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  account_holder text NOT NULL,
  bank_name text NOT NULL,
  account_number_last4 text NOT NULL,
  account_number_encrypted text NOT NULL,
  routing_or_ifsc text,
  swift text,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_payout_accounts_user
  ON public.talent_payout_accounts(user_id);

ALTER TABLE public.talent_payout_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payout_accounts_owner_select" ON public.talent_payout_accounts;
CREATE POLICY "payout_accounts_owner_select"
ON public.talent_payout_accounts
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "payout_accounts_owner_insert" ON public.talent_payout_accounts;
CREATE POLICY "payout_accounts_owner_insert"
ON public.talent_payout_accounts
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "payout_accounts_owner_update" ON public.talent_payout_accounts;
CREATE POLICY "payout_accounts_owner_update"
ON public.talent_payout_accounts
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_talent_payout_accounts_updated_at
BEFORE UPDATE ON public.talent_payout_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- talent_payouts: withdrawal requests
-- ============================================
CREATE TABLE IF NOT EXISTS public.talent_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payout_account_id uuid NOT NULL REFERENCES public.talent_payout_accounts(id) ON DELETE RESTRICT,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  provider_ref text,
  notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_payouts_user
  ON public.talent_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_payouts_status
  ON public.talent_payouts(status);

ALTER TABLE public.talent_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payouts_owner_select" ON public.talent_payouts;
CREATE POLICY "payouts_owner_select"
ON public.talent_payouts
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- No INSERT/UPDATE/DELETE policies for users — only service role (edge functions) writes here.
-- Admin updates also go through service role via admin edge function for auditability.

-- ============================================
-- get_project_payouts_total: client-facing aggregate
-- ============================================
CREATE OR REPLACE FUNCTION public.get_project_payouts_total(_project_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(p.amount), 0)::integer
  FROM public.talent_payouts p
  WHERE p.user_id IN (
    SELECT freelancer_id FROM public.talent_escrow
    WHERE project_id = _project_id AND freelancer_id IS NOT NULL
  )
  AND p.status = 'paid';
$$;

REVOKE ALL ON FUNCTION public.get_project_payouts_total(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project_payouts_total(uuid) TO authenticated;

-- ============================================
-- request_talent_payout: validated withdrawal RPC
-- ============================================
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
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT * INTO acct FROM public.talent_payout_accounts WHERE id = _payout_account_id;
  IF acct IS NULL OR acct.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Bank account not found';
  END IF;

  -- Available = released talent_balance minus pending/processing payouts
  SELECT COALESCE(talent_balance, 0) INTO available FROM public.credits
  WHERE user_id = auth.uid() FOR UPDATE;
  IF available IS NULL THEN
    RAISE EXCEPTION 'No wallet found';
  END IF;

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

REVOKE ALL ON FUNCTION public.request_talent_payout(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_talent_payout(uuid, integer) TO authenticated;

-- ============================================
-- mark_payout_paid: admin only
-- ============================================
CREATE OR REPLACE FUNCTION public.mark_payout_paid(
  _payout_id uuid,
  _provider_ref text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payout record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO payout FROM public.talent_payouts WHERE id = _payout_id FOR UPDATE;
  IF payout IS NULL THEN RAISE EXCEPTION 'Payout not found'; END IF;
  IF payout.status NOT IN ('pending','processing') THEN
    RAISE EXCEPTION 'Payout not in payable state';
  END IF;

  -- Deduct from freelancer's talent_balance
  UPDATE public.credits
  SET talent_balance = GREATEST(0, talent_balance - payout.amount), updated_at = now()
  WHERE user_id = payout.user_id;

  UPDATE public.talent_payouts
  SET status = 'paid', provider_ref = COALESCE(_provider_ref, provider_ref), processed_at = now()
  WHERE id = _payout_id;

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
  VALUES (payout.user_id, payout.amount, 'talent_withdrawal', COALESCE('Withdrawal ' || _provider_ref, 'Withdrawal to bank'));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_payout_paid(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_payout_paid(uuid, text) TO authenticated;
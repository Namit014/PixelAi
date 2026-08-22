
-- 1. New signups start with 0 credits and locked plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  INSERT INTO public.credits (
    user_id, balance, subscription_tier, monthly_credit_allocation,
    video_feature_access, welcome_bonus_claimed, last_credit_refill,
    credit_rollover_limit, plan_status,
    cogent_runs_used, cogent_runs_limit, cogent_runs_reset_at
  )
  VALUES (NEW.id, 0, 'free', 0, false, false, now(), 0, 'inactive', 0, 0, now());

  INSERT INTO public.referral_codes (user_id, code) VALUES (NEW.id, public.generate_referral_code());
  INSERT INTO public.referral_earnings (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$function$;

-- 2. Authenticated invite-code redemption (called AFTER signup/login so single-use codes
--    don't get burned on the pre-auth check).
CREATE OR REPLACE FUNCTION public.redeem_invite_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  rec public.invite_codes%ROWTYPE;
  normalized text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _code IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Please enter an invite code');
  END IF;

  normalized := upper(regexp_replace(trim(_code), '\s+', '', 'g'));
  -- normalize en-dash / em-dash to ascii hyphen
  normalized := replace(replace(normalized, '–', '-'), '—', '-');

  SELECT * INTO rec FROM public.invite_codes
   WHERE code = normalized AND is_active = true
   FOR UPDATE;

  IF rec.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid invite code');
  END IF;

  IF rec.expires_at IS NOT NULL AND rec.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This invite code has expired');
  END IF;

  -- already used by this user → idempotent success
  IF EXISTS (SELECT 1 FROM public.invite_code_usage WHERE code_id = rec.id AND user_id = uid) THEN
    RETURN jsonb_build_object('valid', true, 'codeId', rec.id, 'alreadyRedeemed', true);
  END IF;

  IF rec.max_uses IS NOT NULL AND rec.max_uses > 0 AND rec.current_uses >= rec.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This code has already been used the maximum number of times');
  END IF;

  UPDATE public.invite_codes SET current_uses = current_uses + 1 WHERE id = rec.id;

  INSERT INTO public.invite_code_usage (code_id, user_id, email)
  VALUES (rec.id, uid, (SELECT email FROM auth.users WHERE id = uid));

  RETURN jsonb_build_object('valid', true, 'codeId', rec.id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.redeem_invite_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(text) TO authenticated;

-- 3. Idempotent subscription payment completion
CREATE OR REPLACE FUNCTION public.record_payment_completion(_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pay public.payments%ROWTYPE;
  plan public.subscription_plans%ROWTYPE;
  end_at timestamptz := now() + interval '30 days';
BEGIN
  SELECT * INTO pay FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF pay.id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF pay.status = 'completed' THEN
    RETURN jsonb_build_object('alreadyCompleted', true);
  END IF;

  IF pay.plan_id IS NULL THEN
    RAISE EXCEPTION 'Payment has no plan_id; use record_topup_completion';
  END IF;

  SELECT * INTO plan FROM public.subscription_plans WHERE id = pay.plan_id;
  IF plan.id IS NULL THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;

  UPDATE public.payments
     SET status = 'completed', updated_at = now()
   WHERE id = pay.id;

  INSERT INTO public.user_subscriptions (user_id, plan_id, payment_id, status, start_date, end_date)
  VALUES (pay.user_id, pay.plan_id, pay.id, 'active', now(), end_at)
  ON CONFLICT (user_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        payment_id = EXCLUDED.payment_id,
        status = 'active',
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        updated_at = now();

  UPDATE public.credits
     SET balance = balance + COALESCE(plan.credits_monthly, 0),
         subscription_tier = lower(plan.name),
         monthly_credit_allocation = COALESCE(plan.credits_monthly, 0),
         credit_rollover_limit = COALESCE(plan.credits_monthly, 0),
         subscription_expires_at = end_at,
         plan_status = 'active',
         cogent_runs_used = 0,
         cogent_runs_limit = COALESCE(plan.cogent_runs_monthly, 0),
         cogent_runs_reset_at = now(),
         last_credit_refill = now(),
         updated_at = now()
   WHERE user_id = pay.user_id;

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, balance_after)
  SELECT pay.user_id,
         COALESCE(plan.credits_monthly, 0),
         'subscription_credit',
         'Subscription credits for ' || plan.name,
         balance
    FROM public.credits WHERE user_id = pay.user_id;

  RETURN jsonb_build_object('completed', true, 'plan', plan.name, 'credits', plan.credits_monthly);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.record_payment_completion(uuid) FROM anon, authenticated;

-- 4. Idempotent top-up payment completion (credit pack)
CREATE OR REPLACE FUNCTION public.record_topup_completion(_payment_id uuid, _credits integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pay public.payments%ROWTYPE;
  new_balance integer;
BEGIN
  IF _credits IS NULL OR _credits <= 0 OR _credits > 1000000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  SELECT * INTO pay FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF pay.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF pay.status = 'completed' THEN
    RETURN jsonb_build_object('alreadyCompleted', true);
  END IF;

  UPDATE public.payments SET status = 'completed', updated_at = now() WHERE id = pay.id;

  UPDATE public.credits
     SET balance = balance + _credits, updated_at = now()
   WHERE user_id = pay.user_id
   RETURNING balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Credits row missing for user';
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, balance_after)
  VALUES (pay.user_id, _credits, 'topup', 'Credit top-up purchase', new_balance);

  RETURN jsonb_build_object('completed', true, 'credits', _credits, 'newBalance', new_balance);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.record_topup_completion(uuid, integer) FROM anon, authenticated;

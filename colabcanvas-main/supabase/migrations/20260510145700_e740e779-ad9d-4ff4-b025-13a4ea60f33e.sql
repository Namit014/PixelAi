-- Fresh accounts must not inherit historical free-credit defaults.
ALTER TABLE public.credits ALTER COLUMN balance SET DEFAULT 0;
ALTER TABLE public.credits ALTER COLUMN monthly_credit_allocation SET DEFAULT 0;
ALTER TABLE public.credits ALTER COLUMN credit_rollover_limit SET DEFAULT 0;
ALTER TABLE public.credits ALTER COLUMN plan_status SET DEFAULT 'inactive';

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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: % (%)', NEW.id, SQLERRM, SQLSTATE;
  RAISE;
END;
$function$;

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
  new_balance integer;
BEGIN
  SELECT * INTO pay FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF pay.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF pay.status = 'completed' THEN RETURN jsonb_build_object('alreadyCompleted', true); END IF;
  IF pay.plan_id IS NULL THEN RAISE EXCEPTION 'Payment has no plan_id; use record_topup_completion'; END IF;

  SELECT * INTO plan FROM public.subscription_plans WHERE id = pay.plan_id;
  IF plan.id IS NULL THEN RAISE EXCEPTION 'Plan not found'; END IF;

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

  INSERT INTO public.credits (
    user_id, balance, subscription_tier, monthly_credit_allocation,
    video_feature_access, welcome_bonus_claimed, last_credit_refill,
    credit_rollover_limit, plan_status, cogent_runs_used,
    cogent_runs_limit, cogent_runs_reset_at, subscription_expires_at
  ) VALUES (
    pay.user_id, COALESCE(plan.credits_monthly, 0), lower(plan.name)::subscription_tier, COALESCE(plan.credits_monthly, 0),
    lower(plan.name) IN ('creator','pro','business','enterprise'), false, now(),
    COALESCE(plan.credits_monthly, 0), 'active', 0,
    COALESCE(plan.cogent_runs_monthly, 0), now(), end_at
  )
  ON CONFLICT (user_id) DO UPDATE
     SET balance = COALESCE(plan.credits_monthly, 0),
         subscription_tier = lower(plan.name)::subscription_tier,
         monthly_credit_allocation = COALESCE(plan.credits_monthly, 0),
         credit_rollover_limit = COALESCE(plan.credits_monthly, 0),
         video_feature_access = lower(plan.name) IN ('creator','pro','business','enterprise'),
         subscription_expires_at = end_at,
         plan_status = 'active',
         cogent_runs_used = 0,
         cogent_runs_limit = COALESCE(plan.cogent_runs_monthly, 0),
         cogent_runs_reset_at = now(),
         last_credit_refill = now(),
         updated_at = now()
   RETURNING balance INTO new_balance;

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, balance_after)
  VALUES (pay.user_id, COALESCE(plan.credits_monthly, 0), 'subscription_credit', 'Subscription credits for ' || plan.name, new_balance);

  RETURN jsonb_build_object('completed', true, 'plan', plan.name, 'credits', plan.credits_monthly, 'newBalance', new_balance);
END;
$function$;

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
  IF _credits IS NULL OR _credits <= 0 OR _credits > 1000000 THEN RAISE EXCEPTION 'Invalid credit amount'; END IF;

  SELECT * INTO pay FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF pay.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF pay.status = 'completed' THEN RETURN jsonb_build_object('alreadyCompleted', true); END IF;

  UPDATE public.payments SET status = 'completed', updated_at = now() WHERE id = pay.id;

  INSERT INTO public.credits (user_id, balance, subscription_tier, monthly_credit_allocation, credit_rollover_limit, plan_status)
  VALUES (pay.user_id, _credits, 'free', 0, 0, 'inactive')
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.credits.balance + _credits, updated_at = now()
  RETURNING balance INTO new_balance;

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, balance_after)
  VALUES (pay.user_id, _credits, 'topup', 'Credit top-up purchase', new_balance);

  RETURN jsonb_build_object('completed', true, 'credits', _credits, 'newBalance', new_balance);
END;
$function$;

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'subscription_plans','payments','user_subscriptions','credits','profiles',
    'design_generations','feedback','support_tickets','discount_codes','discount_code_usage','invite_codes',
    'user_roles','promo_codes','promo_code_redemptions','talent_projects','talent_escrow',
    'projects','workflows','brands'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END IF;
  END LOOP;
END $$;
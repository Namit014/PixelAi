-- Ensure enum supports the canonical tiers used by pricing and fulfillment.
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'creator';
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'business';

-- Canonical plan catalog and uniqueness for plan-name based self-healing.
CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_name_unique_idx ON public.subscription_plans (name);

INSERT INTO public.subscription_plans (
  name, description, price_inr, price_usd, credits_monthly, features,
  is_active, display_order, video_access, video_cost_multiplier,
  base_credits, plan_tier, cogent_runs_monthly, tool_access
)
VALUES
  ('Starter', 'Try Colab and ship a few designs.', 1245, 15, 300, '[]'::jsonb, true, 1, false, 1.0, 300, 'starter', 0, '{"canvas":"basic","cosmo":"limited","covex":false,"cogent":false}'::jsonb),
  ('Creator', 'Run a full creative pipeline solo.', 2407, 29, 1000, '[]'::jsonb, true, 2, true, 1.0, 1000, 'creator', 0, '{"canvas":"full","cosmo":"full","covex":"basic","cogent":false}'::jsonb),
  ('Pro', 'Replace your design + video team.', 4897, 59, 2500, '[]'::jsonb, true, 3, true, 2.0, 2500, 'pro', 5, '{"canvas":"full","cosmo":"full","covex":"full","cogent":"limited"}'::jsonb),
  ('Business', 'Operate a full creative agency.', 9960, 120, 6000, '[]'::jsonb, true, 4, true, 1.5, 6000, 'business', 25, '{"canvas":"full","cosmo":"full","covex":"full","cogent":"high"}'::jsonb),
  ('Enterprise', 'Unlimited creative infrastructure.', 0, 0, 15000, '[]'::jsonb, true, 5, true, 1.0, 15000, 'enterprise', -1, '{"canvas":"full","cosmo":"full","covex":"full","cogent":"unlimited"}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_inr = EXCLUDED.price_inr,
  price_usd = EXCLUDED.price_usd,
  credits_monthly = EXCLUDED.credits_monthly,
  features = EXCLUDED.features,
  is_active = true,
  display_order = EXCLUDED.display_order,
  video_access = EXCLUDED.video_access,
  video_cost_multiplier = EXCLUDED.video_cost_multiplier,
  base_credits = EXCLUDED.base_credits,
  plan_tier = EXCLUDED.plan_tier,
  cogent_runs_monthly = EXCLUDED.cogent_runs_monthly,
  tool_access = EXCLUDED.tool_access,
  updated_at = now();

-- Free/new user credit records must be truly zero, not old 100-credit active defaults.
ALTER TABLE public.credits ALTER COLUMN balance SET DEFAULT 0;
ALTER TABLE public.credits ALTER COLUMN monthly_credit_allocation SET DEFAULT 0;
ALTER TABLE public.credits ALTER COLUMN credit_rollover_limit SET DEFAULT 0;
ALTER TABLE public.credits ALTER COLUMN plan_status SET DEFAULT 'inactive';
ALTER TABLE public.credits ALTER COLUMN cogent_runs_limit SET DEFAULT 0;
ALTER TABLE public.credits ALTER COLUMN cogent_runs_used SET DEFAULT 0;

UPDATE public.credits c
SET balance = 0,
    monthly_credit_allocation = 0,
    credit_rollover_limit = 0,
    plan_status = 'inactive',
    cogent_runs_used = 0,
    cogent_runs_limit = 0,
    updated_at = now()
WHERE c.subscription_tier = 'free'::public.subscription_tier
  AND COALESCE(c.balance, 0) <= 100
  AND COALESCE(c.monthly_credit_allocation, 0) <= 100
  AND NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions us
    WHERE us.user_id = c.user_id AND us.status = 'active' AND us.end_date > now()
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.credits (
    user_id, balance, subscription_tier, monthly_credit_allocation,
    video_feature_access, welcome_bonus_claimed, last_credit_refill,
    credit_rollover_limit, plan_status, cogent_runs_used,
    cogent_runs_limit, cogent_runs_reset_at
  )
  VALUES (NEW.id, 0, 'free', 0, false, false, now(), 0, 'inactive', 0, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, public.generate_referral_code())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.referral_earnings (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Normalize coupon codes so case-insensitive user input works with exact lookups.
UPDATE public.discount_codes SET code = upper(trim(code));
UPDATE public.promo_codes SET code = upper(trim(code));

-- Payment completion is authoritative, idempotent, and records discount usage only after success.
CREATE OR REPLACE FUNCTION public.record_payment_completion(_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pay public.payments%ROWTYPE;
  plan public.subscription_plans%ROWTYPE;
  end_at timestamptz := now() + interval '30 days';
  new_balance integer;
  tier public.subscription_tier;
BEGIN
  SELECT * INTO pay FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF pay.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF pay.status = 'completed' THEN RETURN jsonb_build_object('alreadyCompleted', true); END IF;
  IF pay.plan_id IS NULL THEN RAISE EXCEPTION 'Payment has no plan_id; use record_topup_completion'; END IF;

  SELECT * INTO plan FROM public.subscription_plans WHERE id = pay.plan_id;
  IF plan.id IS NULL THEN RAISE EXCEPTION 'Plan not found'; END IF;

  tier := lower(plan.name)::public.subscription_tier;

  UPDATE public.payments
     SET status = 'completed', updated_at = now()
   WHERE id = pay.id;

  INSERT INTO public.user_subscriptions (user_id, plan_id, payment_id, status, start_date, end_date)
  VALUES (pay.user_id, plan.id, pay.id, 'active', now(), end_at)
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
    pay.user_id, COALESCE(plan.credits_monthly, 0), tier, COALESCE(plan.credits_monthly, 0),
    lower(plan.name) IN ('creator','pro','business','enterprise'), false, now(),
    COALESCE(plan.credits_monthly, 0), 'active', 0,
    COALESCE(plan.cogent_runs_monthly, 0), now(), end_at
  )
  ON CONFLICT (user_id) DO UPDATE
     SET balance = COALESCE(plan.credits_monthly, 0),
         subscription_tier = tier,
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

  IF pay.discount_code_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.discount_code_usage WHERE payment_id = pay.id
  ) THEN
    INSERT INTO public.discount_code_usage (code_id, user_id, payment_id, original_amount, discount_amount, final_amount)
    VALUES (pay.discount_code_id, pay.user_id, pay.id, COALESCE(pay.original_amount, pay.amount), COALESCE(pay.discount_amount, 0), pay.amount);

    UPDATE public.discount_codes
      SET current_uses = COALESCE(current_uses, 0) + 1, updated_at = now()
      WHERE id = pay.discount_code_id;
  END IF;

  RETURN jsonb_build_object('completed', true, 'plan', plan.name, 'credits', plan.credits_monthly, 'newBalance', new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_topup_completion(_payment_id uuid, _credits integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    SET balance = public.credits.balance + _credits,
        updated_at = now()
  RETURNING balance INTO new_balance;

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, balance_after)
  VALUES (pay.user_id, _credits, 'topup', 'Credit top-up purchase', new_balance);

  RETURN jsonb_build_object('completed', true, 'credits', _credits, 'newBalance', new_balance);
END;
$$;

-- Realtime admin coverage.
DO $$
DECLARE
  tbl text;
  realtime_tables text[] := ARRAY[
    'payments','credits','user_subscriptions','subscription_plans','discount_codes','discount_code_usage',
    'promo_codes','promo_code_redemptions','profiles','projects','design_generations','feedback',
    'support_tickets','talent_projects','talent_escrow','talent_payouts','talent_messages',
    'referral_earnings','referrals','notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY realtime_tables LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;

-- Provide an active talent coupon so talent coupon flow has a real working row.
INSERT INTO public.promo_codes (code, discount_type, discount_value, max_uses, used_count, expires_at, active, scope, description)
VALUES ('COLAB10', 'percent', 10, NULL, 0, NULL, true, 'talent', 'Default 10% talent coupon')
ON CONFLICT (code) DO UPDATE SET
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  active = true,
  scope = 'talent',
  description = EXCLUDED.description;
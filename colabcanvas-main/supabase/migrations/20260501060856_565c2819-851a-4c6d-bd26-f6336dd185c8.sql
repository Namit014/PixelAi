
-- Add unique on name first (skip if duplicates already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_name_key') THEN
    BEGIN
      ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_name_key UNIQUE (name);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS cogent_runs_monthly integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tool_access jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.credits
  ADD COLUMN IF NOT EXISTS cogent_runs_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cogent_runs_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cogent_runs_reset_at timestamptz NOT NULL DEFAULT now();

UPDATE public.subscription_plans
SET price_usd = 15, price_inr = 1245.00, credits_monthly = 300,
    cogent_runs_monthly = 0,
    tool_access = '{"canvas":"basic","cosmo":"limited","covex":false,"cogent":false}'::jsonb,
    description = 'Try AI design',
    features = '["300 credits/month","Canvas (basic generation)","Cosmo (limited slides & docs)","Standard processing speed","Community support","No Covex","No Cogent autonomous runs"]'::jsonb,
    display_order = 1
WHERE name = 'Starter';

INSERT INTO public.subscription_plans (name, description, price_inr, price_usd, credits_monthly, features, is_active, display_order, cogent_runs_monthly, tool_access)
VALUES (
  'Creator', 'Serious creation without automation', 2407.00, 29, 1000,
  '["1,000 credits/month","Full Canvas (branding, visual systems, mockups)","Full Cosmo access","Covex (basic workflows, limited nodes)","Faster processing speed","Export in all formats","No Cogent autonomous runs"]'::jsonb,
  true, 2, 0,
  '{"canvas":"full","cosmo":"full","covex":"basic","cogent":false}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_inr = EXCLUDED.price_inr,
  price_usd = EXCLUDED.price_usd,
  credits_monthly = EXCLUDED.credits_monthly,
  features = EXCLUDED.features,
  is_active = true,
  display_order = EXCLUDED.display_order,
  cogent_runs_monthly = EXCLUDED.cogent_runs_monthly,
  tool_access = EXCLUDED.tool_access;

UPDATE public.subscription_plans
SET price_usd = 59, price_inr = 4897.00, credits_monthly = 2500,
    cogent_runs_monthly = 5,
    tool_access = '{"canvas":"full","cosmo":"full","covex":"full","cogent":"limited"}'::jsonb,
    description = 'AI that starts thinking for you',
    features = '["2,500 credits/month","Full Canvas + Cosmo + Covex","Cogent: 5 autonomous runs/month","Multi-agent workflows (basic orchestration)","Priority processing","Version history & iterations"]'::jsonb,
    display_order = 3
WHERE name = 'Pro';

UPDATE public.subscription_plans
SET price_usd = 120, price_inr = 9960.00, credits_monthly = 6000,
    cogent_runs_monthly = 25,
    tool_access = '{"canvas":"full","cosmo":"full","covex":"full","cogent":"high"}'::jsonb,
    description = 'Replace parts of your creative team',
    features = '["6,000 credits/month","Full product access","Cogent: 25 autonomous runs/month","Advanced agent stack (strategist, art director, copy, QC)","Workflow memory (brand + past work)","Team collaboration (3–5 seats)","API + integrations (limited)"]'::jsonb,
    display_order = 4
WHERE name = 'Business';

UPDATE public.subscription_plans
SET price_usd = 0, price_inr = 0.00, credits_monthly = 15000,
    cogent_runs_monthly = -1,
    tool_access = '{"canvas":"full","cosmo":"full","covex":"full","cogent":"unlimited"}'::jsonb,
    description = 'Creative operations, fully automated',
    features = '["Custom credits (15,000+)","Unlimited Cogent executions (fair use)","Dedicated infra (faster compute)","Full agent customization","White labeling","Private model tuning on brand data","Dedicated success manager"]'::jsonb,
    display_order = 5
WHERE name = 'Enterprise';

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
  VALUES (NEW.id, 25, 'free', 25, false, true, now(), 25, 'active', 0, 0, now());

  INSERT INTO public.referral_codes (user_id, code) VALUES (NEW.id, public.generate_referral_code());
  INSERT INTO public.referral_earnings (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_cogent_run(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  used_now integer;
  limit_now integer;
  reset_at timestamptz;
BEGIN
  IF auth.uid() IS DISTINCT FROM _user_id AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT cogent_runs_used, cogent_runs_limit, cogent_runs_reset_at
    INTO used_now, limit_now, reset_at
  FROM public.credits WHERE user_id = _user_id FOR UPDATE;

  IF used_now IS NULL THEN
    RAISE EXCEPTION 'No credit record';
  END IF;

  IF reset_at < now() - interval '30 days' THEN
    used_now := 0;
    UPDATE public.credits
       SET cogent_runs_used = 0, cogent_runs_reset_at = now()
     WHERE user_id = _user_id;
  END IF;

  IF limit_now <> -1 AND used_now >= limit_now THEN
    RETURN false;
  END IF;

  UPDATE public.credits
     SET cogent_runs_used = cogent_runs_used + 1, updated_at = now()
   WHERE user_id = _user_id;

  RETURN true;
END;
$function$;

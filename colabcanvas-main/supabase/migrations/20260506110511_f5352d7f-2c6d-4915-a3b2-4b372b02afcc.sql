
UPDATE public.subscription_plans
   SET is_active = false, updated_at = now()
 WHERE lower(name) NOT IN ('starter','creator','pro','business','enterprise');

UPDATE public.subscription_plans
   SET price_usd=15, price_inr=1245, credits_monthly=300,
       cogent_runs_monthly=0, display_order=1, is_active=true, updated_at=now()
 WHERE lower(name)='starter';
INSERT INTO public.subscription_plans (name, price_usd, price_inr, credits_monthly, cogent_runs_monthly, display_order, is_active)
SELECT 'Starter', 15, 1245, 300, 0, 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE lower(name)='starter');

UPDATE public.subscription_plans
   SET price_usd=29, price_inr=2407, credits_monthly=1000,
       cogent_runs_monthly=0, display_order=2, is_active=true, updated_at=now()
 WHERE lower(name)='creator';
INSERT INTO public.subscription_plans (name, price_usd, price_inr, credits_monthly, cogent_runs_monthly, display_order, is_active)
SELECT 'Creator', 29, 2407, 1000, 0, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE lower(name)='creator');

UPDATE public.subscription_plans
   SET price_usd=59, price_inr=4897, credits_monthly=2500,
       cogent_runs_monthly=5, display_order=3, is_active=true, updated_at=now()
 WHERE lower(name)='pro';
INSERT INTO public.subscription_plans (name, price_usd, price_inr, credits_monthly, cogent_runs_monthly, display_order, is_active)
SELECT 'Pro', 59, 4897, 2500, 5, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE lower(name)='pro');

UPDATE public.subscription_plans
   SET price_usd=120, price_inr=9960, credits_monthly=6000,
       cogent_runs_monthly=25, display_order=4, is_active=true, updated_at=now()
 WHERE lower(name)='business';
INSERT INTO public.subscription_plans (name, price_usd, price_inr, credits_monthly, cogent_runs_monthly, display_order, is_active)
SELECT 'Business', 120, 9960, 6000, 25, 4, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE lower(name)='business');

UPDATE public.subscription_plans
   SET price_usd=0, price_inr=0, credits_monthly=15000,
       cogent_runs_monthly=-1, display_order=5, is_active=true, updated_at=now()
 WHERE lower(name)='enterprise';
INSERT INTO public.subscription_plans (name, price_usd, price_inr, credits_monthly, cogent_runs_monthly, display_order, is_active)
SELECT 'Enterprise', 0, 0, 15000, -1, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE lower(name)='enterprise');

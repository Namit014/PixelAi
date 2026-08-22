
UPDATE public.credits c
SET cogent_runs_limit = COALESCE(sp.cogent_runs_monthly, 0)
FROM public.subscription_plans sp
WHERE LOWER(sp.name) = LOWER(c.subscription_tier::text);

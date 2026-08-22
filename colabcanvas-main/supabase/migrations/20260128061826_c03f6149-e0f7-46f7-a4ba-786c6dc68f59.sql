-- Add USD pricing column to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_usd numeric DEFAULT 0;

-- Set USD prices based on plan names
UPDATE public.subscription_plans SET price_usd = 
  CASE name
    WHEN 'Starter' THEN 3
    WHEN 'Pro' THEN 6
    WHEN 'Business' THEN 12
    WHEN 'Enterprise' THEN 36
    ELSE 0
  END;
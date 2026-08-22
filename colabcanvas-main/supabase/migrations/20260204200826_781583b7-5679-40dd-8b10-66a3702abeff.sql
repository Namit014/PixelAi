-- Fix Issue 1: Update subscription_plans.price_usd to match displayed USD prices
-- This ensures PayU charges match what users see in the UI

UPDATE public.subscription_plans SET price_usd = 18 WHERE name = 'Starter';
UPDATE public.subscription_plans SET price_usd = 30 WHERE name = 'Pro';
UPDATE public.subscription_plans SET price_usd = 60 WHERE name = 'Business';
UPDATE public.subscription_plans SET price_usd = 140 WHERE name = 'Enterprise';
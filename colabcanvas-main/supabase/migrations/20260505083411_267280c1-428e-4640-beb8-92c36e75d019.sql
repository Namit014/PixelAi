-- 1. Allow 'inactive' plan_status (was failing signup)
ALTER TABLE public.credits DROP CONSTRAINT IF EXISTS credits_plan_status_check;
ALTER TABLE public.credits ADD CONSTRAINT credits_plan_status_check
  CHECK (plan_status = ANY (ARRAY['active'::text,'expired'::text,'trial'::text,'inactive'::text]));

-- 2. Add missing 'creator' tier to enum so Creator payments work
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
                 WHERE t.typname='subscription_tier' AND e.enumlabel='creator') THEN
    ALTER TYPE public.subscription_tier ADD VALUE 'creator';
  END IF;
END $$;

-- 3. Re-create handle_new_user (defensive: same logic, valid status)
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

-- 4. Reassert trigger on auth.users (no-op if already there)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

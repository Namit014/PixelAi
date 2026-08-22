-- 1. Recreate the missing on_auth_user_created trigger so new signups get a profile, role, credits, etc.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill any existing users who are missing bootstrap rows
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'user'::public.app_role
WHERE ur.user_id IS NULL;

INSERT INTO public.credits (
  user_id, balance, subscription_tier, monthly_credit_allocation,
  video_feature_access, welcome_bonus_claimed, last_credit_refill,
  credit_rollover_limit, plan_status
)
SELECT u.id, 200, 'free'::public.subscription_tier, 100, false, true, now(), 100, 'active'
FROM auth.users u
LEFT JOIN public.credits c ON c.user_id = u.id
WHERE c.user_id IS NULL;

INSERT INTO public.referral_codes (user_id, code)
SELECT u.id, public.generate_referral_code()
FROM auth.users u
LEFT JOIN public.referral_codes rc ON rc.user_id = u.id
WHERE rc.user_id IS NULL;

INSERT INTO public.referral_earnings (user_id)
SELECT u.id
FROM auth.users u
LEFT JOIN public.referral_earnings re ON re.user_id = u.id
WHERE re.user_id IS NULL;

-- 3. Add optional description column to promo_codes so admin coupon UI can store an internal note
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS description text;
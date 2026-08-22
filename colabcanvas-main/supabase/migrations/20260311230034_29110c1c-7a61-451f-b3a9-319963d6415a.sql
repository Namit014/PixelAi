
-- Seed referral_codes and referral_earnings for existing users who don't have them yet
INSERT INTO public.referral_codes (user_id, code)
SELECT p.id, public.generate_referral_code()
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.user_id = p.id);

INSERT INTO public.referral_earnings (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.referral_earnings re WHERE re.user_id = p.id);

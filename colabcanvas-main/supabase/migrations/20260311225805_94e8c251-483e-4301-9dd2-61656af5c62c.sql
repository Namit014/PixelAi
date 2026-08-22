
-- 1. referral_codes table
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Users can read their own codes
CREATE POLICY "Users can read own referral codes"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Public lookup of active codes (for signup flow)
CREATE POLICY "Anyone can lookup active referral codes"
  ON public.referral_codes FOR SELECT
  TO anon
  USING (is_active = true);

-- 2. referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_code_id uuid NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  credited_amount integer NOT NULL DEFAULT 0,
  revenue_share_amount numeric(10,2) NOT NULL DEFAULT 0,
  revenue_share_percent numeric(5,2) NOT NULL DEFAULT 10,
  plan_purchased text,
  signed_up_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid());

-- 3. referral_earnings table
CREATE TABLE public.referral_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_credits_earned integer NOT NULL DEFAULT 0,
  total_revenue_earned numeric(10,2) NOT NULL DEFAULT 0,
  pending_payout numeric(10,2) NOT NULL DEFAULT 0,
  paid_out numeric(10,2) NOT NULL DEFAULT 0,
  total_referrals integer NOT NULL DEFAULT 0,
  successful_conversions integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referral earnings"
  ON public.referral_earnings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := 'COLAB-' || upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS (SELECT 1 FROM referral_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- 5. Update handle_new_user to also create referral_codes and referral_earnings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Create credits with welcome bonus
  INSERT INTO public.credits (
    user_id, balance, subscription_tier, monthly_credit_allocation,
    video_feature_access, welcome_bonus_claimed, last_credit_refill,
    credit_rollover_limit, plan_status
  )
  VALUES (NEW.id, 200, 'free', 100, false, true, now(), 100, 'active');
  
  -- Create referral code
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, public.generate_referral_code());
  
  -- Create referral earnings record
  INSERT INTO public.referral_earnings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- 6. Enable realtime for referrals table
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_earnings;

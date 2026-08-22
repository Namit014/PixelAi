-- Phase 1: Database Schema Updates for Credit System & App Tours

-- ============================================
-- PART 1: Extend credits table with new columns
-- ============================================

ALTER TABLE public.credits 
ADD COLUMN IF NOT EXISTS monthly_credit_allocation INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS video_feature_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS welcome_bonus_claimed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_credit_refill TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS credit_rollover_limit INTEGER DEFAULT 100;

-- Add check constraint for plan_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credits_plan_status_check'
  ) THEN
    ALTER TABLE public.credits ADD CONSTRAINT credits_plan_status_check 
    CHECK (plan_status IN ('active', 'expired', 'trial'));
  END IF;
END $$;

-- ============================================
-- PART 2: Extend subscription_plans table
-- ============================================

ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS video_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_cost_multiplier NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS base_credits INTEGER,
ADD COLUMN IF NOT EXISTS plan_tier TEXT;

-- Update existing plans with new credit structure
UPDATE public.subscription_plans SET 
  base_credits = 100,
  video_access = false,
  video_cost_multiplier = 1.0,
  plan_tier = 'free_exploration'
WHERE LOWER(name) = 'starter';

UPDATE public.subscription_plans SET 
  base_credits = 1200,
  credits_monthly = 1200,
  video_access = true,
  video_cost_multiplier = 2.0,
  plan_tier = 'pro'
WHERE LOWER(name) = 'pro';

UPDATE public.subscription_plans SET 
  base_credits = 4000,
  credits_monthly = 4000,
  video_access = true,
  video_cost_multiplier = 1.5,
  plan_tier = 'business'
WHERE LOWER(name) = 'business';

UPDATE public.subscription_plans SET 
  base_credits = 15000,
  credits_monthly = 15000,
  video_access = true,
  video_cost_multiplier = 1.0,
  plan_tier = 'enterprise'
WHERE LOWER(name) = 'enterprise';

-- ============================================
-- PART 3: Create App Tours Tables
-- ============================================

-- App tours configuration table
CREATE TABLE IF NOT EXISTS public.app_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  target_plan_types TEXT[] DEFAULT '{}',
  target_user_cohorts TEXT[] DEFAULT '{}',
  trigger_type TEXT NOT NULL,
  trigger_feature TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add check constraint for trigger_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_tours_trigger_type_check'
  ) THEN
    ALTER TABLE public.app_tours ADD CONSTRAINT app_tours_trigger_type_check 
    CHECK (trigger_type IN ('first_login', 'feature_open', 'manual', 'behavior'));
  END IF;
END $$;

-- Tour steps table
CREATE TABLE IF NOT EXISTS public.app_tour_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES public.app_tours(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ui_target_selector TEXT,
  media_url TEXT,
  cta_text TEXT DEFAULT 'Next',
  cta_action TEXT DEFAULT 'next',
  navigate_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add check constraint for cta_action
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_tour_steps_cta_action_check'
  ) THEN
    ALTER TABLE public.app_tour_steps ADD CONSTRAINT app_tour_steps_cta_action_check 
    CHECK (cta_action IN ('next', 'complete', 'navigate'));
  END IF;
END $$;

-- User tour progress table
CREATE TABLE IF NOT EXISTS public.user_tour_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES public.app_tours(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  dropped_at_step INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tour_id)
);

-- ============================================
-- PART 4: Enable RLS on new tables
-- ============================================

ALTER TABLE public.app_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_tour_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tour_progress ENABLE ROW LEVEL SECURITY;

-- App tours policies
CREATE POLICY "Users can view active tours" 
ON public.app_tours FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage tours" 
ON public.app_tours FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Tour steps policies
CREATE POLICY "Users can view tour steps" 
ON public.app_tour_steps FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage tour steps" 
ON public.app_tour_steps FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- User tour progress policies
CREATE POLICY "Users manage own tour progress" 
ON public.user_tour_progress FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all tour progress" 
ON public.user_tour_progress FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- PART 5: Update handle_new_user() function
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Create credits with welcome bonus (100 base + 100 welcome bonus = 200)
  INSERT INTO public.credits (
    user_id, 
    balance, 
    subscription_tier,
    monthly_credit_allocation,
    video_feature_access,
    welcome_bonus_claimed,
    last_credit_refill,
    credit_rollover_limit,
    plan_status
  )
  VALUES (
    NEW.id, 
    200,  -- 100 base + 100 welcome bonus
    'free',
    100,
    false,
    true,
    now(),
    100,
    'active'
  );
  
  RETURN NEW;
END;
$function$;

-- ============================================
-- PART 6: Create updated_at trigger for app_tours
-- ============================================

CREATE TRIGGER update_app_tours_updated_at
BEFORE UPDATE ON public.app_tours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PART 7: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_app_tours_active ON public.app_tours(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_app_tours_trigger ON public.app_tours(trigger_type, trigger_feature);
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_user ON public.user_tour_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_app_tour_steps_tour ON public.app_tour_steps(tour_id, step_order);
CREATE INDEX IF NOT EXISTS idx_credits_video_access ON public.credits(video_feature_access);
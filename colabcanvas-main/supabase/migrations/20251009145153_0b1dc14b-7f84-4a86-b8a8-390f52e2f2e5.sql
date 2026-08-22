-- Add new fields to profiles table for advanced onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_challenges text,
ADD COLUMN IF NOT EXISTS referral_source text,
ADD COLUMN IF NOT EXISTS design_experience text,
ADD COLUMN IF NOT EXISTS team_collaboration boolean DEFAULT false;
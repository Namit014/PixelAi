-- Add onboarding_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Add onboarding data to store user preferences
ALTER TABLE public.profiles
ADD COLUMN company_size TEXT,
ADD COLUMN industry TEXT,
ADD COLUMN use_case TEXT;
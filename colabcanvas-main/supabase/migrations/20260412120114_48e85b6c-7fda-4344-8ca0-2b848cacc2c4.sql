
-- Add OAuth token columns to social_connectors
ALTER TABLE public.social_connectors
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS platform_user_id text,
  ADD COLUMN IF NOT EXISTS platform_username text;

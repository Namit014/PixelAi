
-- Table to store DigiLocker OAuth state nonces (CSRF protection)
CREATE TABLE IF NOT EXISTS public.digilocker_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  return_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes')
);

CREATE INDEX IF NOT EXISTS digilocker_states_user_idx ON public.digilocker_states(user_id);
CREATE INDEX IF NOT EXISTS digilocker_states_expires_idx ON public.digilocker_states(expires_at);

ALTER TABLE public.digilocker_states ENABLE ROW LEVEL SECURITY;

-- Only the owning user can read their own state row (edge function uses service role)
CREATE POLICY "Users can view own digilocker state"
  ON public.digilocker_states FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Add column to talent_kyc for storing verified DigiLocker payload
ALTER TABLE public.talent_kyc
  ADD COLUMN IF NOT EXISTS digilocker_data JSONB;

-- Create email verifications table
CREATE TABLE public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Create indexes for performance
CREATE INDEX idx_email_verifications_token ON public.email_verifications(token);
CREATE INDEX idx_email_verifications_user_id ON public.email_verifications(user_id);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification status
CREATE POLICY "Users can view their own verification status"
  ON public.email_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all verifications
CREATE POLICY "Service role can manage verifications"
  ON public.email_verifications FOR ALL
  USING (auth.role() = 'service_role');
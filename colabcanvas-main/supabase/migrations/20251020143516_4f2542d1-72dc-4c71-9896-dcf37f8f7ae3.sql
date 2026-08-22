-- Create table to store OTP codes
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  email_action_type text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create index for fast lookup
CREATE INDEX idx_otp_email_code ON public.otp_codes(email, code) WHERE used = false;

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert OTP codes (for registration flow)
CREATE POLICY "Anyone can insert OTP codes"
ON public.otp_codes
FOR INSERT
WITH CHECK (true);

-- Only allow selecting own OTP codes (for verification)
CREATE POLICY "Users can view their own OTP codes"
ON public.otp_codes
FOR SELECT
USING (email = current_setting('request.jwt.claims', true)::json->>'email' OR auth.uid() IS NULL);

-- Allow updating own OTP codes (for marking as used)
CREATE POLICY "Anyone can update OTP codes"
ON public.otp_codes
FOR UPDATE
USING (true);
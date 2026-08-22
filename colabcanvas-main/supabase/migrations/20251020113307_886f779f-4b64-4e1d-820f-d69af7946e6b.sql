-- Create otp_attempts table for tracking OTP verification attempts
CREATE TABLE IF NOT EXISTS public.otp_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on otp_attempts table
ALTER TABLE public.otp_attempts ENABLE ROW LEVEL SECURITY;

-- No policies needed - this table is only accessed via edge function using service role

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_otp_attempts_email ON public.otp_attempts(email);

-- Create index for cleanup of old locked accounts
CREATE INDEX IF NOT EXISTS idx_otp_attempts_locked_until ON public.otp_attempts(locked_until) WHERE locked_until IS NOT NULL;

-- Function to clean up old expired locks (runs daily)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_attempts
  WHERE locked_until IS NOT NULL 
    AND locked_until < NOW() - INTERVAL '24 hours';
END;
$$;
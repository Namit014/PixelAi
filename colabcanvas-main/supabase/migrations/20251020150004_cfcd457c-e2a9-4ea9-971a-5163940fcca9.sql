-- Drop the custom OTP tables as we're reverting to native Supabase magic links
DROP TABLE IF EXISTS public.otp_attempts CASCADE;
DROP TABLE IF EXISTS public.otp_codes CASCADE;

-- Drop the cleanup function
DROP FUNCTION IF EXISTS public.cleanup_expired_otp_locks() CASCADE;
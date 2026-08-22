-- Fix: Prevent token exposure in email_verifications table
-- Users should only see their verification status, not the actual token

-- Step 1: Drop the existing policy that exposes all columns including token
DROP POLICY IF EXISTS "Users can view their own verification status" ON public.email_verifications;

-- Step 2: Create a secure view that excludes the token column
CREATE OR REPLACE VIEW public.user_verification_status 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  verified,
  created_at,
  expires_at
FROM public.email_verifications;

-- Step 3: Grant access to the view for authenticated users
GRANT SELECT ON public.user_verification_status TO authenticated;

-- Step 4: Create a security definer function to safely check verification status
CREATE OR REPLACE FUNCTION public.get_user_verification_status(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  verified boolean,
  created_at timestamp with time zone,
  expires_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ev.id,
    ev.verified,
    ev.created_at,
    ev.expires_at
  FROM public.email_verifications ev
  WHERE ev.user_id = p_user_id
  ORDER BY ev.created_at DESC
  LIMIT 1;
$$;

-- Step 5: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_user_verification_status(uuid) TO authenticated;
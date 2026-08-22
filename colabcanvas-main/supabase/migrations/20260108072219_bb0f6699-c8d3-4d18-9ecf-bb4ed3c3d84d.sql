-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "System can insert usage" ON public.discount_code_usage;

-- Create a more restrictive policy - only authenticated users can insert their own usage records
CREATE POLICY "Authenticated users can insert own usage"
ON public.discount_code_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);
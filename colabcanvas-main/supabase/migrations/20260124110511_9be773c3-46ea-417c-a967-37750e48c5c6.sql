-- Remove the public SELECT policy on discount_codes
-- This policy allows anyone to read all active codes which is a security risk
DROP POLICY IF EXISTS "Anyone can read active discount codes" ON public.discount_codes;

-- Add a restrictive policy that only allows admins to read discount codes directly
-- All validation will now go through the validate-discount-code edge function
CREATE POLICY "Only admins can read discount codes"
ON public.discount_codes FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
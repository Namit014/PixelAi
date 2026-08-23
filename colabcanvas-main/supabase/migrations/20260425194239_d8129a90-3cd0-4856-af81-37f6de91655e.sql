
-- Fix 1: Remove anonymous SELECT on referral_codes (prevents enumerating user IDs)
DROP POLICY IF EXISTS "Anyone can lookup active referral codes" ON public.referral_codes;

-- Provide a security-definer lookup that does NOT expose user_id to the caller's response shape
-- (returns only minimal fields needed by signup/redeem flow).
CREATE OR REPLACE FUNCTION public.lookup_active_referral_code(_code text)
RETURNS TABLE (id uuid, code text, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rc.id, rc.code, rc.is_active
  FROM public.referral_codes rc
  WHERE rc.code = _code AND rc.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_active_referral_code(text) TO anon, authenticated;

-- Fix 2: Restrict talent-contracts storage writes to the owning user folder or admins
DROP POLICY IF EXISTS "talent-contracts service write" ON storage.objects;
DROP POLICY IF EXISTS "talent-contracts service update" ON storage.objects;

CREATE POLICY "talent-contracts owner write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'talent-contracts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "talent-contracts owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'talent-contracts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'talent-contracts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "talent-contracts owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'talent-contracts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);



-- Fix Critical Security Issues

-- 1. Fix brand-assets storage policies to enforce ownership
-- Drop overpermissive policies
DROP POLICY IF EXISTS "Authenticated users can upload brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete brand assets" ON storage.objects;

-- Create ownership-based policies
CREATE POLICY "Users can upload to own brands"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets' AND
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id::text = (storage.foldername(name))[1]
    AND brands.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own brand assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id::text = (storage.foldername(name))[1]
      AND brands.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM brand_shares
      WHERE brand_shares.brand_id::text = (storage.foldername(name))[1]
      AND brand_shares.is_active = true
      AND (brand_shares.expires_at IS NULL OR brand_shares.expires_at > now())
    )
  )
);

CREATE POLICY "Users can update own brand assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id::text = (storage.foldername(name))[1]
    AND brands.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own brand assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id::text = (storage.foldername(name))[1]
    AND brands.user_id = auth.uid()
  )
);

-- 2. Add rate limit constraints to prevent bypass
ALTER TABLE brand_mcp_configs
ADD CONSTRAINT rate_limit_max 
CHECK (rate_limit_per_hour > 0 AND rate_limit_per_hour <= 10000);
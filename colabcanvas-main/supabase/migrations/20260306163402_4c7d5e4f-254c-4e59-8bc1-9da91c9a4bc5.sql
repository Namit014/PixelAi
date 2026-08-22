
-- Drop the broken policies that reference brands.name instead of objects.name
DROP POLICY IF EXISTS "Users upload own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users upload to own brands" ON storage.objects;
DROP POLICY IF EXISTS "Users view own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users update own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own brands" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own brand assets" ON storage.objects;

-- Recreate with correct reference to the file object name
CREATE POLICY "brand_assets_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets' AND
  EXISTS (
    SELECT 1 FROM public.brands
    WHERE brands.id::text = (storage.foldername(name))[1]
    AND brands.user_id = auth.uid()
  )
);

CREATE POLICY "brand_assets_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id::text = (storage.foldername(name))[1]
      AND brands.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.brand_shares
      WHERE brand_shares.brand_id::text = (storage.foldername(name))[1]
      AND brand_shares.is_active = true
      AND (brand_shares.expires_at IS NULL OR brand_shares.expires_at > now())
    )
  )
);

CREATE POLICY "brand_assets_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  EXISTS (
    SELECT 1 FROM public.brands
    WHERE brands.id::text = (storage.foldername(name))[1]
    AND brands.user_id = auth.uid()
  )
);

CREATE POLICY "brand_assets_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  EXISTS (
    SELECT 1 FROM public.brands
    WHERE brands.id::text = (storage.foldername(name))[1]
    AND brands.user_id = auth.uid()
  )
);


-- Drop broken policies
DROP POLICY IF EXISTS "brand_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "brand_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "brand_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "brand_assets_delete" ON storage.objects;

-- Recreate with correct reference to objects.name (NOT brands.name)
CREATE POLICY "brand_assets_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets' AND
  EXISTS (
    SELECT 1 FROM public.brands
    WHERE brands.id::text = (storage.foldername(objects.name))[1]
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
      WHERE brands.id::text = (storage.foldername(objects.name))[1]
      AND brands.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.brand_shares
      WHERE brand_shares.brand_id::text = (storage.foldername(objects.name))[1]
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
    WHERE brands.id::text = (storage.foldername(objects.name))[1]
    AND brands.user_id = auth.uid()
  )
);

CREATE POLICY "brand_assets_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  EXISTS (
    SELECT 1 FROM public.brands
    WHERE brands.id::text = (storage.foldername(objects.name))[1]
    AND brands.user_id = auth.uid()
  )
);

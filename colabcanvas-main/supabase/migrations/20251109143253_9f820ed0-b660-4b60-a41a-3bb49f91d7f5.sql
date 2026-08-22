-- Fix critical storage policy bug - use storage object's 'name' column, not brands.name
-- The previous migration incorrectly referenced brands.name instead of the storage object's path

DROP POLICY IF EXISTS "Users can upload to own brands" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own brand assets" ON storage.objects;

CREATE POLICY "Users can upload to own brands" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'brand-assets' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM brands 
      WHERE id = ((storage.foldername(name))[1])::uuid
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own brand assets" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'brand-assets' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM brands 
      WHERE id = ((storage.foldername(name))[1])::uuid
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own brand assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'brand-assets' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM brands 
      WHERE id = ((storage.foldername(name))[1])::uuid
      AND user_id = auth.uid()
    )
  );
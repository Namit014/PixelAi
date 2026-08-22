-- Drop all existing brand-assets policies
DROP POLICY IF EXISTS "Users can upload to own brand folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own brands" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own brand assets" ON storage.objects;

-- Create simple authentication-only policies
CREATE POLICY "Authenticated users can upload brand assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated users can view brand assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated users can delete brand assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'brand-assets');
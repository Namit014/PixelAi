-- Drop existing broken policies for brand-assets bucket
DROP POLICY IF EXISTS "Users can upload to own brand folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own brand assets" ON storage.objects;

-- Create corrected policies
-- IMPORTANT: 'name' in storage.objects refers to the file path (e.g., 'brand-id/file.jpg')
-- We extract the brand-id from the path and verify the user owns that brand

CREATE POLICY "Users can upload to own brand folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets' 
  AND auth.uid() IN (
    SELECT user_id FROM brands 
    WHERE id = ((storage.foldername(name))[1])::uuid
  )
);

CREATE POLICY "Users can view own brand assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'brand-assets' 
  AND auth.uid() IN (
    SELECT user_id FROM brands 
    WHERE id = ((storage.foldername(name))[1])::uuid
  )
);

CREATE POLICY "Users can delete own brand assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-assets' 
  AND auth.uid() IN (
    SELECT user_id FROM brands 
    WHERE id = ((storage.foldername(name))[1])::uuid
  )
);
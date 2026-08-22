-- Make design-assets bucket private for user privacy
UPDATE storage.buckets 
SET public = false 
WHERE id = 'design-assets';

-- Drop any existing public read policies
DROP POLICY IF EXISTS "Anyone can view public design assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to design assets" ON storage.objects;

-- Create user-scoped read policy (users can only read their own files)
CREATE POLICY "Users can read their own design assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'design-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to read all design assets (for support/moderation)
CREATE POLICY "Admins can read all design assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'design-assets' AND
  has_role(auth.uid(), 'admin'::app_role)
);
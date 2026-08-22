-- Add RLS policies for design-assets storage bucket
-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload to design-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files
CREATE POLICY "Users can update their design-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'design-assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their design-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'design-assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
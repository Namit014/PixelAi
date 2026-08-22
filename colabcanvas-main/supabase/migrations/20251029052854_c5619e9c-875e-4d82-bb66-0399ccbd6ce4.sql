-- Create reference-images storage bucket with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reference-images',
  'reference-images',
  true,
  52428800, -- 50MB per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Admin can upload reference images
CREATE POLICY "Admins can upload reference images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reference-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Anyone can view reference images (needed for AI Designer)
CREATE POLICY "Anyone can view reference images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reference-images');

-- Admins can delete reference images
CREATE POLICY "Admins can delete reference images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reference-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
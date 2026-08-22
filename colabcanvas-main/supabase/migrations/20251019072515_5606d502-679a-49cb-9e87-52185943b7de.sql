-- Create storage bucket for design assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-assets',
  'design-assets',
  true,
  10485760,  -- 10MB limit
  ARRAY['image/*']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for design-assets bucket
CREATE POLICY "Users can upload their own design assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'design-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view public design assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'design-assets');

CREATE POLICY "Users can update their own design assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'design-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own design assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'design-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
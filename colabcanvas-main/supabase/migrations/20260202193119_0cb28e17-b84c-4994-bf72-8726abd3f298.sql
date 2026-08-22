-- Create storage bucket for admin notifications if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-notifications', 'admin-notifications', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (admins) to upload to admin-notifications bucket
CREATE POLICY "Admins can upload notification images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'admin-notifications' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access to notification images
CREATE POLICY "Public can view notification images"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-notifications');
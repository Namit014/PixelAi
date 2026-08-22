
-- Create tour-assets storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('tour-assets', 'tour-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload to tour-assets
CREATE POLICY "Admins can upload tour assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tour-assets' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update tour assets
CREATE POLICY "Admins can update tour assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tour-assets' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete tour assets
CREATE POLICY "Admins can delete tour assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'tour-assets' AND public.has_role(auth.uid(), 'admin'));

-- Allow public read access for tour assets
CREATE POLICY "Tour assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-assets');

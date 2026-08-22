-- Create email-assets bucket for hosting email images
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to email assets
CREATE POLICY "Public can view email assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');
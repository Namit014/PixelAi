-- Create storage bucket for design tool uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-tool-uploads', 'design-tool-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for design-tool-uploads bucket
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-tool-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'design-tool-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'design-tool-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'design-tool-uploads');
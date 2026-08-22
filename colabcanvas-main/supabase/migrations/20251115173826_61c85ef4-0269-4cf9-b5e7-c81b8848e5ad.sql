-- Create workflow-uploads storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('workflow-uploads', 'workflow-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for users to upload their own files
CREATE POLICY "Users can upload their own workflow files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workflow-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for anyone to view workflow uploads
CREATE POLICY "Anyone can view workflow uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'workflow-uploads');
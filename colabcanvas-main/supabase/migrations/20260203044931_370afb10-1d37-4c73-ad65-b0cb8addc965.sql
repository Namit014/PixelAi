-- Update design-assets bucket to allow video MIME types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/*', 'video/*']
WHERE id = 'design-assets';
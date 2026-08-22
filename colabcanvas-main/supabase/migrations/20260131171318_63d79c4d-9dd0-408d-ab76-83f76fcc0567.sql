-- Fix critical storage exposure: Make buckets private and remove public read policies

-- Step 1: Make workflow-uploads bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'workflow-uploads';

-- Step 2: Make design-tool-uploads bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'design-tool-uploads';

-- Step 3: Remove public read policy from workflow-uploads
DROP POLICY IF EXISTS "Anyone can view workflow uploads" ON storage.objects;

-- Step 4: Remove public read policy from design-tool-uploads
DROP POLICY IF EXISTS "Public can view files" ON storage.objects;

-- Verified: Authenticated user policies already exist and will continue to work:
-- workflow-uploads: "Users can upload their own workflow files", "Authenticated users can read workflow uploads"
-- design-tool-uploads: "Users can upload own files", "Users can view own files", "Users can delete own files"
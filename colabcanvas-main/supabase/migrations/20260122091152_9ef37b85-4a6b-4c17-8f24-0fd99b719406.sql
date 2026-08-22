-- Update storage policies for design-tool-uploads to allow both
-- 1) {uid}/... (existing)
-- 2) think/{uid}/... (Think page uploads)

DO $$
BEGIN
  -- Drop existing policies (if present)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload own files'
  ) THEN
    EXECUTE 'DROP POLICY "Users can upload own files" ON storage.objects';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can view own files'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view own files" ON storage.objects';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can delete own files'
  ) THEN
    EXECUTE 'DROP POLICY "Users can delete own files" ON storage.objects';
  END IF;
END $$;

-- INSERT
CREATE POLICY "Users can upload own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-tool-uploads'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'think'
      AND auth.uid()::text = (storage.foldername(name))[2]
    )
  )
);

-- SELECT
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'design-tool-uploads'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'think'
      AND auth.uid()::text = (storage.foldername(name))[2]
    )
  )
);

-- DELETE
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'design-tool-uploads'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'think'
      AND auth.uid()::text = (storage.foldername(name))[2]
    )
  )
);

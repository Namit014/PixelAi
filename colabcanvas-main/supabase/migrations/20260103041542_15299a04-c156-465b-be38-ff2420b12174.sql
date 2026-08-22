-- Fix brand-assets storage bucket policies for proper user isolation
-- Drop existing insecure policies that allow cross-user access
DROP POLICY IF EXISTS "Authenticated users can upload brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete brand assets" ON storage.objects;

-- Create secure policies that check brand ownership via brand_id in file path
-- File paths should be structured as: {brand_id}/{filename}

CREATE POLICY "Users upload own brand assets" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'brand-assets' AND
  EXISTS (
    SELECT 1 FROM public.brands 
    WHERE brands.id::text = split_part(name, '/', 1) 
    AND brands.user_id = auth.uid()
  )
);

CREATE POLICY "Users view own brand assets" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'brand-assets' AND
  EXISTS (
    SELECT 1 FROM public.brands 
    WHERE brands.id::text = split_part(name, '/', 1) 
    AND brands.user_id = auth.uid()
  )
);

CREATE POLICY "Users update own brand assets" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'brand-assets' AND
  EXISTS (
    SELECT 1 FROM public.brands 
    WHERE brands.id::text = split_part(name, '/', 1) 
    AND brands.user_id = auth.uid()
  )
);

CREATE POLICY "Users delete own brand assets" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'brand-assets' AND
  EXISTS (
    SELECT 1 FROM public.brands 
    WHERE brands.id::text = split_part(name, '/', 1) 
    AND brands.user_id = auth.uid()
  )
);
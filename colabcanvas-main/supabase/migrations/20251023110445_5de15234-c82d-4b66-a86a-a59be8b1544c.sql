-- Increase design-assets bucket limit to 100MB
UPDATE storage.buckets 
SET file_size_limit = 104857600
WHERE name = 'design-assets';

-- Backfill null object_ids with generated values
UPDATE public.canvas_objects 
SET object_id = 'obj_' || extract(epoch from created_at)::bigint || '_' || substr(md5(random()::text), 1, 8)
WHERE object_id IS NULL;

-- Make object_id NOT NULL to prevent future nulls
ALTER TABLE public.canvas_objects 
ALTER COLUMN object_id SET NOT NULL;

-- Add default value for new inserts
ALTER TABLE public.canvas_objects 
ALTER COLUMN object_id SET DEFAULT 'obj_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
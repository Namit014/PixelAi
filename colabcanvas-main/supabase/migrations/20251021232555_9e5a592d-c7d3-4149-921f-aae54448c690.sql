-- Add image_url column to canvas_objects table to store image URLs from Supabase Storage
-- This moves image data out of object_data JSONB to fix load timeout issues

ALTER TABLE canvas_objects 
ADD COLUMN image_url TEXT;

-- Create index for faster lookups of image objects
CREATE INDEX idx_canvas_objects_image_url 
ON canvas_objects(image_url) 
WHERE image_url IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN canvas_objects.image_url IS 'URL to image file in Supabase Storage (design-assets bucket). NULL for non-image objects.';
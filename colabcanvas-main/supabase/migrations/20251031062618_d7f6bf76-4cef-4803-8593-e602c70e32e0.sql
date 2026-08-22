-- Add AI-generated metadata columns to reference_images table
ALTER TABLE reference_images 
ADD COLUMN IF NOT EXISTS alt_text TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS semantic_tags TEXT[],
ADD COLUMN IF NOT EXISTS style_keywords TEXT[];

-- Create index for semantic search
CREATE INDEX IF NOT EXISTS idx_reference_images_semantic_tags ON reference_images USING GIN(semantic_tags);
CREATE INDEX IF NOT EXISTS idx_reference_images_style_keywords ON reference_images USING GIN(style_keywords);

-- Add comment explaining the new columns
COMMENT ON COLUMN reference_images.alt_text IS 'AI-generated alt text (50 chars) for accessibility';
COMMENT ON COLUMN reference_images.description IS 'AI-generated description (150 chars) of the design';
COMMENT ON COLUMN reference_images.semantic_tags IS 'AI-generated semantic tags for better search matching';
COMMENT ON COLUMN reference_images.style_keywords IS 'AI-generated style descriptors (minimalist, bold, vintage, etc.)';
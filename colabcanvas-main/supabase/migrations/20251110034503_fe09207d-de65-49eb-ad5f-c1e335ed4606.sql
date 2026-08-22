-- Add new columns to brands table for website extraction
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS logo_primary_url TEXT,
ADD COLUMN IF NOT EXISTS extraction_metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for faster logo lookups from brand_content_blocks  
CREATE INDEX IF NOT EXISTS idx_brand_blocks_logo 
ON brand_content_blocks(section_id, block_type) 
WHERE block_type = 'logo_variant';

-- Add comment for documentation
COMMENT ON COLUMN brands.website_url IS 'Original website URL used for brand extraction';
COMMENT ON COLUMN brands.logo_primary_url IS 'Primary logo URL extracted or uploaded';
COMMENT ON COLUMN brands.extraction_metadata IS 'Metadata about automatic extraction process';
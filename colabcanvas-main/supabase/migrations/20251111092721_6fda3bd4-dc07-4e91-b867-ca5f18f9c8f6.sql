-- Enhanced brand version snapshot function to capture complete brand structure
CREATE OR REPLACE FUNCTION create_brand_version_snapshot()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_version INTEGER;
  sections_data JSONB;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM brand_versions WHERE brand_id = NEW.id;
  
  -- Capture full brand structure including sections and blocks
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', bs.id,
      'section_name', bs.section_name,
      'section_type', bs.section_type,
      'icon_name', bs.icon_name,
      'display_order', bs.display_order,
      'is_default', bs.is_default,
      'ai_context', bs.ai_context,
      'brand_content_blocks', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', bcb.id,
            'block_type', bcb.block_type,
            'content', bcb.content,
            'display_order', bcb.display_order,
            'ai_metadata', bcb.ai_metadata
          ) ORDER BY bcb.display_order
        )
        FROM brand_content_blocks bcb
        WHERE bcb.section_id = bs.id
      )
    ) ORDER BY bs.display_order
  ) INTO sections_data
  FROM brand_sections bs
  WHERE bs.brand_id = NEW.id;
  
  -- Create version with complete snapshot
  INSERT INTO brand_versions (brand_id, version_number, snapshot, changed_by)
  VALUES (
    NEW.id,
    next_version,
    jsonb_build_object(
      'name', NEW.name,
      'description', NEW.description,
      'brand_system_snapshot', NEW.brand_system_snapshot,
      'logo_primary_url', NEW.logo_primary_url,
      'logo_secondary_url', NEW.logo_secondary_url,
      'website_url', NEW.website_url,
      'industry', NEW.industry,
      'target_audience', NEW.target_audience,
      'brand_voice', NEW.brand_voice,
      'brand_sections', sections_data,
      'extraction_metadata', NEW.extraction_metadata
    ),
    auth.uid()
  );
  
  RETURN NEW;
END;
$$;

-- Ensure trigger is set up
DROP TRIGGER IF EXISTS create_brand_version_on_update ON brands;
CREATE TRIGGER create_brand_version_on_update
  AFTER UPDATE ON brands
  FOR EACH ROW
  WHEN (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.brand_system_snapshot IS DISTINCT FROM NEW.brand_system_snapshot OR
    OLD.logo_primary_url IS DISTINCT FROM NEW.logo_primary_url OR
    OLD.logo_secondary_url IS DISTINCT FROM NEW.logo_secondary_url OR
    OLD.brand_voice IS DISTINCT FROM NEW.brand_voice
  )
  EXECUTE FUNCTION create_brand_version_snapshot();
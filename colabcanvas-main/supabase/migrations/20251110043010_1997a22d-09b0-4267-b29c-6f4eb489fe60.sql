-- Fix function search path security issue
CREATE OR REPLACE FUNCTION create_brand_version_snapshot()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM brand_versions WHERE brand_id = NEW.id;
  
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
      'brand_voice', NEW.brand_voice
    ),
    auth.uid()
  );
  
  RETURN NEW;
END;
$$;
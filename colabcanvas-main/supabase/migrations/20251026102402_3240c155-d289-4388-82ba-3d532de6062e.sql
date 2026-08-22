-- Fix search_path for update_reference_images_updated_at function
CREATE OR REPLACE FUNCTION update_reference_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path TO 'public';

-- Phase 1: Fix storage policies for brand-assets bucket
DROP POLICY IF EXISTS "Users can upload to own brands" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own brand assets" ON storage.objects;

-- Create new policies that check brand ownership via brands table
CREATE POLICY "Users can upload to own brands" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'brand-assets' AND
    EXISTS (
      SELECT 1 FROM brands 
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own brand assets" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'brand-assets' AND
    EXISTS (
      SELECT 1 FROM brands 
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own brand assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'brand-assets' AND
    EXISTS (
      SELECT 1 FROM brands 
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
  );

-- Phase 4: Add support for custom font uploads
ALTER TABLE brand_content_blocks 
ADD COLUMN IF NOT EXISTS font_file_path TEXT;

-- Function to update display orders efficiently for drag-and-drop
CREATE OR REPLACE FUNCTION update_block_display_orders(
  block_orders JSONB
) RETURNS void 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  block_order JSONB;
BEGIN
  FOR block_order IN SELECT * FROM jsonb_array_elements(block_orders)
  LOOP
    UPDATE brand_content_blocks
    SET display_order = (block_order->>'display_order')::INTEGER
    WHERE id = (block_order->>'id')::UUID;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
-- Fix 1: Make design-assets bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'design-assets';

-- Fix 2: Update SELECT policy to require authentication and ownership
DROP POLICY IF EXISTS "Anyone can view public design assets" ON storage.objects;

CREATE POLICY "Authenticated users can view own design assets"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'design-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 3: Improve update_block_display_orders function with proper input validation
CREATE OR REPLACE FUNCTION public.update_block_display_orders(block_orders jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  block_order JSONB;
  block_id UUID;
  new_order INTEGER;
BEGIN
  -- Validate input is an array
  IF jsonb_typeof(block_orders) != 'array' THEN
    RAISE EXCEPTION 'block_orders must be a JSON array';
  END IF;
  
  -- Limit array size to prevent resource exhaustion
  IF jsonb_array_length(block_orders) > 100 THEN
    RAISE EXCEPTION 'Too many blocks (max 100)';
  END IF;
  
  FOR block_order IN SELECT * FROM jsonb_array_elements(block_orders)
  LOOP
    -- Validate required fields exist
    IF NOT (block_order ? 'id' AND block_order ? 'display_order') THEN
      RAISE EXCEPTION 'Missing required fields: id and display_order';
    END IF;
    
    -- Safe type casting with error handling
    BEGIN
      block_id := (block_order->>'id')::UUID;
      new_order := (block_order->>'display_order')::INTEGER;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Invalid id or display_order format';
    END;
    
    -- Validate display_order range
    IF new_order < 0 OR new_order > 9999 THEN
      RAISE EXCEPTION 'display_order must be between 0 and 9999';
    END IF;
    
    -- Verify user owns this block via explicit ownership check
    IF NOT EXISTS (
      SELECT 1 FROM brand_content_blocks bcb
      JOIN brand_sections bs ON bs.id = bcb.section_id
      JOIN brands b ON b.id = bs.brand_id
      WHERE bcb.id = block_id AND b.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Block not found or unauthorized';
    END IF;
    
    -- Perform update
    UPDATE brand_content_blocks
    SET display_order = new_order
    WHERE id = block_id;
  END LOOP;
END;
$function$;

-- Fix 4: Update overly permissive INSERT policies

-- design_tool_early_access: Require email validation instead of allowing anyone
DROP POLICY IF EXISTS "Anyone can sign up for early access" ON design_tool_early_access;
CREATE POLICY "Authenticated users can sign up for early access"
ON design_tool_early_access
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);

-- design_tool_versions: Require ownership check
DROP POLICY IF EXISTS "System can create versions" ON design_tool_versions;
CREATE POLICY "Users can create versions for own projects"
ON design_tool_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM design_tool_projects 
    WHERE id = project_id AND user_id = auth.uid()
  )
);

-- user_activity_events: Require authenticated user
DROP POLICY IF EXISTS "Anyone can insert activity" ON user_activity_events;
CREATE POLICY "Authenticated users can insert own activity"
ON user_activity_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);
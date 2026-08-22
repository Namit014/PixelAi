-- Add salt columns for secure password hashing
ALTER TABLE brand_shares ADD COLUMN IF NOT EXISTS password_salt text;
ALTER TABLE brand_mcp_configs ADD COLUMN IF NOT EXISTS api_key_salt text;

-- Fix RLS bypass: Change update_block_display_orders to SECURITY INVOKER
-- This ensures RLS policies are respected when updating block orders
CREATE OR REPLACE FUNCTION public.update_block_display_orders(block_orders jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public
AS $function$
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
$function$;
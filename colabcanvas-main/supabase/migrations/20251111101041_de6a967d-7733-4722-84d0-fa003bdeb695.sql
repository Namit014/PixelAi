-- Backfill all existing version snapshots with complete brand structure
UPDATE brand_versions bv
SET snapshot = (
  SELECT jsonb_build_object(
    'name', b.name,
    'description', b.description,
    'brand_system_snapshot', b.brand_system_snapshot,
    'logo_primary_url', b.logo_primary_url,
    'logo_secondary_url', b.logo_secondary_url,
    'website_url', b.website_url,
    'industry', b.industry,
    'target_audience', b.target_audience,
    'brand_voice', b.brand_voice,
    'brand_sections', (
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
      )
      FROM brand_sections bs
      WHERE bs.brand_id = b.id
    ),
    'extraction_metadata', b.extraction_metadata
  )
  FROM brands b
  WHERE b.id = bv.brand_id
)
WHERE bv.snapshot->>'brand_sections' IS NULL OR bv.snapshot->'brand_sections' = 'null'::jsonb;
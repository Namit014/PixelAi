import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: req.headers.get('Authorization')!,
          },
        },
      }
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      throw new Error('Unauthorized');
    }
    const user = { id: claimsData.claims.sub as string };

    const url = new URL(req.url);
    const brandId = url.searchParams.get('brand_id');

    if (!brandId) {
      throw new Error('Brand ID is required');
    }

    // Get brand with all related data
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      throw new Error('Brand not found');
    }

    // Get sections and content blocks
    const { data: sections, error: sectionsError } = await supabase
      .from('brand_sections')
      .select('*, brand_content_blocks(*)')
      .eq('brand_id', brandId)
      .order('display_order', { ascending: true });

    if (sectionsError) throw sectionsError;

    // Get assets
    const { data: assets, error: assetsError } = await supabase
      .from('brand_assets')
      .select('*')
      .eq('brand_id', brandId);

    if (assetsError) throw assetsError;

    // Build AI-consumable format
    const aiData: Record<string, any> = {
      brand_name: brand.name,
      brand_voice: brand.brand_voice,
      target_audience: brand.target_audience,
      industry: brand.industry,
      description: brand.description,
      colors: {} as Record<string, any>,
      typography: {} as Record<string, any>,
      logo_variants: [] as any[],
      imagery_style: {} as Record<string, any>,
      guidelines: [] as any[],
    };

    // Process sections and blocks
    sections?.forEach(section => {
      section.brand_content_blocks?.forEach((block: any) => {
        if (block.block_type === 'colours' && block.content.colors) {
          block.content.colors.forEach((color: any) => {
            (aiData.colors as Record<string, any>)[color.name] = {
              hex: color.hex,
              usage: color.usage || '',
            };
          });
        }
        
        if (block.block_type === 'typography_specimen' && block.content.font_family) {
          (aiData.typography as Record<string, any>)[block.content.font_family] = {
            weights: block.content.font_weights || [],
            usage: block.content.usage || '',
          };
        }
        
        if (block.block_type === 'logo_variant' && block.content.variant_name) {
          (aiData.logo_variants as any[]).push({
            name: block.content.variant_name,
            url: block.content.storage_url,
            min_size: block.content.min_size,
          });
        }

        // Add text blocks as guidelines
        if (block.block_type === 'text' && block.content.text) {
          aiData.guidelines.push({
            section: section.section_name,
            text: block.content.text,
          });
        }
      });
    });

    // Add semantic tags from assets
    if (assets) {
      const imageryKeywords = new Set<string>();
      assets.forEach(asset => {
        if (asset.semantic_tags) {
          asset.semantic_tags.forEach((tag: string) => imageryKeywords.add(tag));
        }
      });
      aiData.imagery_style = {
        keywords: Array.from(imageryKeywords),
      };
    }

    // Update brand_system_snapshot
    await supabase
      .from('brands')
      .update({ brand_system_snapshot: aiData })
      .eq('id', brandId);

    // Log export for analytics
    await supabase
      .from('brand_export_history')
      .insert({
        brand_id: brandId,
        export_type: 'ai_design_generation',
        export_data: { timestamp: new Date().toISOString() },
        exported_by: user.id,
      });

    console.log('Brand data retrieved for AI:', { brandId, userId: user.id });

    return new Response(
      JSON.stringify({ brand_data: aiData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting brand for AI:', error);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
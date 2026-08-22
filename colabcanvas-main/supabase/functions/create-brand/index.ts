import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
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

    const { name, description, industry, brand_voice, target_audience, logo_url, website_url, extraction_metadata, useAI } = await req.json();

    if (!name) {
      throw new Error('Brand name is required');
    }

    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .insert({
        user_id: user.id,
        name,
        description,
        industry,
        brand_voice,
        target_audience,
        logo_primary_url: logo_url,
        website_url,
        extraction_metadata,
      })
      .select()
      .single();

    if (brandError) throw brandError;

    console.log('Brand created:', { brandId: brand.id, userId: user.id });

    // If AI template generation is requested, populate the brand with AI-generated content
    if (useAI) {
      try {
        console.log('Generating AI template for brand:', brand.id);
        
        // Call the generate-brand-template function
        const templateResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-brand-template`,
          {
            method: 'POST',
            headers: {
              'Authorization': req.headers.get('Authorization')!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              brandName: name,
              industry: industry || 'general',
              style: 'modern'
            })
          }
        );

        if (!templateResponse.ok) {
          throw new Error('Failed to generate brand template');
        }

        const { template } = await templateResponse.json();
        console.log('Template generated successfully');

        // Get the default sections that were created by the trigger
        const { data: sections } = await supabase
          .from('brand_sections')
          .select('id, section_type')
          .eq('brand_id', brand.id)
          .order('display_order');

        if (sections) {
          // Find the Overview, Colours, Typography sections
          const overviewSection = sections.find(s => s.section_type === 'default' && s.id === sections[0]?.id);
          const coloursSection = sections.find(s => s.section_type === 'default' && s.id === sections[2]?.id);
          const typographySection = sections.find(s => s.section_type === 'default' && s.id === sections[3]?.id);

          const blocksToInsert = [];

          // Add Overview content (Heading + Text)
          if (overviewSection && template.overview) {
            blocksToInsert.push({
              section_id: overviewSection.id,
              block_type: 'heading',
              content: { text: 'Brand Overview', level: 2 },
              display_order: 0
            });
            blocksToInsert.push({
              section_id: overviewSection.id,
              block_type: 'text',
              content: { text: template.overview },
              display_order: 1
            });
          }

          // Add Colors
          if (coloursSection && template.colors && template.colors.length > 0) {
            blocksToInsert.push({
              section_id: coloursSection.id,
              block_type: 'colours',
              content: { colors: template.colors },
              display_order: 0
            });
          }

          // Add Typography
          if (typographySection && template.typography) {
            blocksToInsert.push({
              section_id: typographySection.id,
              block_type: 'typography',
              content: template.typography,
              display_order: 0
            });
          }

          // Insert all blocks
          if (blocksToInsert.length > 0) {
            const { error: blocksError } = await supabase
              .from('brand_content_blocks')
              .insert(blocksToInsert);

            if (blocksError) {
              console.error('Error creating AI blocks:', blocksError);
            } else {
              console.log(`Created ${blocksToInsert.length} AI-generated blocks`);
            }
          }

          // Add Guidelines section if available
          if (template.guidelines) {
            const { data: guidelinesSection } = await supabase
              .from('brand_sections')
              .insert({
                brand_id: brand.id,
                section_name: 'Guidelines',
                section_type: 'custom',
                icon_name: 'BookOpen',
                display_order: 10
              })
              .select()
              .single();

            if (guidelinesSection) {
              await supabase
                .from('brand_content_blocks')
                .insert({
                  section_id: guidelinesSection.id,
                  block_type: 'text',
                  content: { text: template.guidelines },
                  display_order: 0
                });
            }
          }
        }
      } catch (error) {
        console.error('Error generating AI template:', error);
        // Don't fail the brand creation if AI generation fails
      }
    }

    return new Response(
      JSON.stringify({ brand }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating brand:', error);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
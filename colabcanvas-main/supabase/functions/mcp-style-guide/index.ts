import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(jwt);

    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    const { action, project_id, format, expires_in_days } = await req.json();

    // Handle export action
    if (action === 'export') {
      if (!project_id || !format) {
        return new Response(
          JSON.stringify({ error: 'project_id and format are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch project data
      const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .select('title, brand_system, canvas_data')
        .eq('id', project_id)
        .eq('user_id', user.id)
        .single();

      if (projectError || !project) {
        return new Response(
          JSON.stringify({ error: 'Project not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const brandSystem = project.brand_system || {};
      
      // Generate export based on format
      let exportData: any = {};
      let contentType = 'application/json';
      let fileName = `${project.title || 'style-guide'}`;

      switch (format) {
        case 'json':
          exportData = {
            version: '1.0',
            brand: {
              name: project.title,
            },
            ...brandSystem
          };
          fileName += '.json';
          break;

        case 'css':
          const colors = brandSystem.colors || {};
          const typography = brandSystem.typography || {};
          exportData = `:root {
  /* Colors */
  --color-primary: ${colors.primary?.hex || '#000000'};
  --color-secondary: ${colors.secondary?.hex || '#ffffff'};
  --color-accent: ${colors.accent?.hex || '#cccccc'};
  
  /* Typography */
  --font-heading: '${typography.primary_font || 'Arial'}', sans-serif;
  --font-body: '${typography.secondary_font || 'Arial'}', sans-serif;
}`;
          contentType = 'text/css';
          fileName += '.css';
          break;

        case 'tailwind':
          const tailwindColors = brandSystem.colors || {};
          exportData = `module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '${tailwindColors.primary?.hex || '#000000'}',
        secondary: '${tailwindColors.secondary?.hex || '#ffffff'}',
        accent: '${tailwindColors.accent?.hex || '#cccccc'}'
      },
      fontFamily: {
        heading: ['${brandSystem.typography?.primary_font || 'Arial'}', 'sans-serif'],
        body: ['${brandSystem.typography?.secondary_font || 'Arial'}', 'sans-serif']
      }
    }
  }
}`;
          contentType = 'application/javascript';
          fileName += '.config.js';
          break;

        case 'figma':
          exportData = {
            pluginData: {
              type: 'style-guide-import',
              colors: Object.entries(brandSystem.colors || {}).map(([key, value]: [string, any]) => ({
                name: value.name || key,
                hex: value.hex,
                type: 'SOLID'
              })),
              textStyles: [
                {
                  name: 'Heading',
                  fontName: { family: brandSystem.typography?.primary_font || 'Arial', style: 'Bold' },
                  fontSize: 48
                }
              ]
            }
          };
          fileName += '-figma.json';
          break;

        case 'wix':
          exportData = {
            theme: {
              colors: {
                color_1: brandSystem.colors?.primary?.hex || '#000000',
                color_2: brandSystem.colors?.secondary?.hex || '#ffffff',
                color_3: brandSystem.colors?.accent?.hex || '#cccccc'
              }
            }
          };
          fileName += '-wix.json';
          break;

        case 'framer':
          exportData = `export function StyleGuide(Component): ComponentType {
  return (props) => (
    <Component
      {...props}
      style={{
        ...props.style,
        "--primary-color": "${brandSystem.colors?.primary?.hex || '#000000'}",
        "--heading-font": "${brandSystem.typography?.primary_font || 'Arial'}",
      }}
    />
  );
}`;
          contentType = 'application/javascript';
          fileName += '-framer.tsx';
          break;

        case 'lovable':
          exportData = {
            lovable: {
              project: project.title,
              theme: {
                colors: brandSystem.colors || {},
                fonts: brandSystem.typography || {}
              }
            }
          };
          fileName += '-lovable.json';
          break;

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }

      // Save export to database
      const { data: exportRecord, error: exportError } = await supabaseClient
        .from('style_guide_exports')
        .insert({
          project_id,
          user_id: user.id,
          export_format: format,
          export_data: typeof exportData === 'string' ? { content: exportData } : exportData
        })
        .select()
        .single();

      if (exportError) {
        console.error('Error saving export:', exportError);
      }

      return new Response(
        contentType === 'application/json' ? JSON.stringify(exportData) : exportData,
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${fileName}"`
          } 
        }
      );
    }

    // Handle share action
    if (action === 'share') {
      if (!project_id) {
        return new Response(
          JSON.stringify({ error: 'project_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const shareId = crypto.randomUUID();
      const shareUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mcp-style-guide/share/${shareId}`;
      
      let expiresAt = null;
      if (expires_in_days) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expires_in_days);
      }

      // Update export with share URL
      const { error: updateError } = await supabaseClient
        .from('style_guide_exports')
        .update({
          export_url: shareUrl,
          expires_at: expiresAt
        })
        .eq('project_id', project_id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error creating share link:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to create share link' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ shareUrl, expiresAt }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mcp-style-guide function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

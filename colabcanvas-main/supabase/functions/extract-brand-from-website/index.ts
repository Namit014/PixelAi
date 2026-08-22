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
        auth: { persistSession: false },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      throw new Error('Unauthorized');
    }
    const user = { id: claimsData.claims.sub as string };

    const { websiteUrl } = await req.json();
    if (!websiteUrl) {
      throw new Error('Website URL is required');
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(websiteUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new Error('Invalid URL format');
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Extracting brand from:', websiteUrl);

    let screenshotBase64: string | null = null;
    let firecrawlBranding: any = null;

    // Step 1: Use Firecrawl for screenshot + branding extraction
    if (FIRECRAWL_API_KEY) {
      try {
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: websiteUrl,
            formats: ['screenshot', 'branding'],
            waitFor: 3000,
          }),
        });

        if (firecrawlResponse.ok) {
          const fcData = await firecrawlResponse.json();
          screenshotBase64 = fcData.data?.screenshot || fcData.screenshot || null;
          firecrawlBranding = fcData.data?.branding || fcData.branding || null;
          console.log('Firecrawl extraction successful', {
            hasScreenshot: !!screenshotBase64,
            hasBranding: !!firecrawlBranding,
          });
        } else {
          console.warn('Firecrawl returned error:', firecrawlResponse.status);
        }
      } catch (e) {
        console.warn('Firecrawl call failed, falling back to AI-only:', e);
      }
    }

    // Step 2: Build brand data from Firecrawl branding or AI vision
    let extractedData: any;

    if (firecrawlBranding) {
      // Map Firecrawl branding to our format
      const colors: { name: string; hex: string; usage: string }[] = [];
      const brandColors = firecrawlBranding.colors || {};

      if (brandColors.primary) colors.push({ name: 'Primary', hex: brandColors.primary, usage: 'primary' });
      if (brandColors.secondary) colors.push({ name: 'Secondary', hex: brandColors.secondary, usage: 'secondary' });
      if (brandColors.accent) colors.push({ name: 'Accent', hex: brandColors.accent, usage: 'accent' });
      if (brandColors.background) colors.push({ name: 'Background', hex: brandColors.background, usage: 'background' });
      if (brandColors.textPrimary) colors.push({ name: 'Text Primary', hex: brandColors.textPrimary, usage: 'text' });
      if (brandColors.textSecondary) colors.push({ name: 'Text Secondary', hex: brandColors.textSecondary, usage: 'text-secondary' });

      const typography = firecrawlBranding.typography || {};
      const fonts = firecrawlBranding.fonts || [];

      extractedData = {
        colors,
        description: `Brand extracted from ${websiteUrl}. Color scheme: ${firecrawlBranding.colorScheme || 'unknown'}.`,
        industry: 'general',
        aesthetic: firecrawlBranding.colorScheme || 'modern',
        typography: {
          heading: typography.fontFamilies?.heading || fonts[0]?.family || 'Sans-serif',
          body: typography.fontFamilies?.primary || fonts[1]?.family || fonts[0]?.family || 'Sans-serif',
        },
        styleKeywords: [firecrawlBranding.colorScheme || 'modern', 'web', 'digital'],
      };

      // Enhance with AI if we have a screenshot
      if (screenshotBase64) {
        try {
          const enhanced = await enhanceWithAI(LOVABLE_API_KEY, screenshotBase64, extractedData);
          if (enhanced) {
            extractedData.description = enhanced.description || extractedData.description;
            extractedData.industry = enhanced.industry || extractedData.industry;
            extractedData.aesthetic = enhanced.aesthetic || extractedData.aesthetic;
            extractedData.styleKeywords = enhanced.styleKeywords || extractedData.styleKeywords;
            // Merge any additional colors from AI
            if (enhanced.colors?.length) {
              const existingHexes = new Set(extractedData.colors.map((c: any) => c.hex.toLowerCase()));
              for (const c of enhanced.colors) {
                if (!existingHexes.has(c.hex.toLowerCase())) {
                  extractedData.colors.push(c);
                }
              }
            }
          }
        } catch (e) {
          console.warn('AI enhancement failed, using Firecrawl data only:', e);
        }
      }
    } else if (screenshotBase64) {
      // No branding data, use AI vision on screenshot
      const aiResult = await enhanceWithAI(LOVABLE_API_KEY, screenshotBase64, null);
      if (!aiResult) throw new Error('No analysis generated');
      extractedData = aiResult;
    } else {
      // No Firecrawl at all, generate basic template
      throw new Error('Unable to extract brand data. Please check the URL and try again.');
    }

    console.log('Extraction complete:', {
      userId: user.id,
      websiteUrl,
      colorsCount: extractedData.colors?.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...extractedData,
          screenshot: screenshotBase64 ? (screenshotBase64.startsWith('data:') ? screenshotBase64 : `data:image/png;base64,${screenshotBase64}`) : null,
          websiteUrl,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error extracting brand:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: getSafeErrorMessage(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function enhanceWithAI(
  apiKey: string,
  screenshotBase64: string,
  existingData: any | null
): Promise<any | null> {
  const imageUrl = screenshotBase64.startsWith('data:')
    ? screenshotBase64
    : `data:image/png;base64,${screenshotBase64}`;

  const analysisPrompt = existingData
    ? `Analyze this website screenshot to enhance the existing brand data. Current data: ${JSON.stringify(existingData)}. Provide a better brand description, identify the industry, aesthetic style, and any additional colors not already captured.`
    : `Analyze this website homepage and extract brand assets:
1. PRIMARY COLOR PALETTE: 5-7 main brand colors with names, hex codes, and usage
2. BRAND DESCRIPTION: 2-3 sentence overview
3. INDUSTRY: The brand's apparent industry/sector
4. TYPOGRAPHY: Font styles visible
5. DESIGN STYLE: 3-5 style keywords`;

  const visionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: analysisPrompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }],
      tools: [{
        type: 'function',
        function: {
          name: 'extract_brand_assets',
          description: 'Extract brand assets from website',
          parameters: {
            type: 'object',
            properties: {
              colors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    hex: { type: 'string' },
                    usage: { type: 'string' },
                  },
                  required: ['name', 'hex', 'usage'],
                },
              },
              description: { type: 'string' },
              industry: { type: 'string' },
              aesthetic: { type: 'string' },
              typography: {
                type: 'object',
                properties: {
                  heading: { type: 'string' },
                  body: { type: 'string' },
                },
              },
              styleKeywords: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['colors', 'description', 'industry'],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'extract_brand_assets' } },
    }),
  });

  if (!visionResponse.ok) {
    console.error('Vision API error:', await visionResponse.text());
    return null;
  }

  const visionData = await visionResponse.json();
  const toolCall = visionData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  return JSON.parse(toolCall.function.arguments);
}

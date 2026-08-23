// @ts-nocheck
// Analyze Product Image - Deep product analysis for smart briefing
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Credentials': 'true',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { imageUrl, designType } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Analyzing product image:', imageUrl.substring(0, 80));

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

    // Build the analysis prompt
    const analysisPrompt = `You are an expert visual analyst and creative director. Analyze this image in detail. It could be anything: a product photo, illustration, UI mockup, logo, character design, landscape, screenshot, or any other visual.

Return a JSON object with this EXACT structure:
{
  "design": {
    "composition": "overall layout, structure, form factor of the subject",
    "color_zones": "description of color areas and their arrangement",
    "layout_elements": "key visual elements and their placement"
  },
  "colors": [
    { "color": "specific color name", "hex_estimate": "#hex", "purpose": "where/how this color is used" }
  ],
  "branding": {
    "brand_name": "detected brand name or 'Not detected'",
    "subject_name": "what the main subject is (product name, character, scene, object, etc.)",
    "identity_elements": "any logos, typography, distinctive visual marks"
  },
  "details": [
    { "label": "Type", "value": "product photo / illustration / UI / logo / photo / character / etc." },
    { "label": "Category", "value": "..." },
    { "label": "Style", "value": "photorealistic / flat / 3D / watercolor / minimalist / etc." },
    { "label": "Mood", "value": "..." },
    { "label": "Key Elements", "value": "comma-separated list of notable visual elements" },
    { "label": "Text Content", "value": "any visible text, taglines, labels" },
    { "label": "Notable Features", "value": "anything distinctive worth preserving in new designs" }
  ],
  "summary": "A concise 2-3 sentence summary of what this image shows and its visual style"
}

Be extremely specific. If something is not visible, say "Not visible" rather than guessing.
Respond with ONLY the JSON, no markdown fencing.`;

    // Use Lovable AI Gateway with vision via Gemini 2.5 Pro
    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI analysis failed:', aiResponse.status, errText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';
    console.log('📦 Raw analysis response length:', rawContent.length);

    // Parse the JSON response
    let analysis;
    try {
      // Strip markdown code fences if present
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse analysis JSON:', parseErr);
      // Return a basic structure if parsing fails
      analysis = {
        design: { composition: 'Unable to analyze', color_zones: '', layout_elements: '' },
        colors: [],
        branding: { brand_name: 'Not detected', subject_name: 'Unknown', identity_elements: '' },
        details: [{ label: 'Note', value: 'Image analysis returned non-structured data' }],
        summary: rawContent.substring(0, 300)
      };
    }

    // Generate execution plan based on design type
    const executionPlan = generateExecutionPlan(designType || 'ecommerce', analysis);

    return new Response(
      JSON.stringify({ analysis, executionPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('analyze-product-image error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateExecutionPlan(designType: string, analysis: any): Array<{ imageNumber: number; title: string; description: string; model: string }> {
  const brandName = analysis?.branding?.brand_name || 'Subject';
  const subjectName = analysis?.branding?.subject_name || '';
  const fullName = subjectName ? `${brandName} ${subjectName}` : brandName;

  if (designType === 'ecommerce') {
    return [
      { imageNumber: 1, title: 'Hero Shot', description: `${fullName} on pure white background, product fills 85% of frame. No text, no distractions.`, model: 'Nano Banana' },
      { imageNumber: 2, title: 'Infographic Layout', description: `${fullName} with 3-4 feature callout icons highlighting key benefits. Clean grid layout on white.`, model: 'Nano Banana' },
      { imageNumber: 3, title: 'Lifestyle Shot', description: `${fullName} in elegant real-world usage context. Natural lighting, premium setting.`, model: 'Nano Banana' },
      { imageNumber: 4, title: 'Feature Detail', description: `${fullName} close-up highlighting key feature or texture. Single feature callout.`, model: 'Nano Banana' },
      { imageNumber: 5, title: 'Size & Scale', description: `${fullName} with size reference or dimensional info. Clean white background.`, model: 'Nano Banana' },
      { imageNumber: 6, title: 'Bundle/Package View', description: `${fullName} showing package contents. All components laid out cleanly on white.`, model: 'Nano Banana' },
      { imageNumber: 7, title: 'Comparison/Benefit', description: `${fullName} with before/after or competitive advantage visual. Clean layout.`, model: 'Nano Banana' },
    ];
  }

  if (designType === 'social_media') {
    return [
      { imageNumber: 1, title: 'Feed Post - Bold', description: `${fullName} hero social post. Bold typography, attention-grabbing composition.`, model: 'Nano Banana' },
      { imageNumber: 2, title: 'Feed Post - Minimal', description: `${fullName} minimal version. Maximum whitespace, single focal point.`, model: 'Nano Banana' },
      { imageNumber: 3, title: 'Story Format', description: `${fullName} optimized for Instagram Stories (9:16). Engaging vertical layout.`, model: 'Nano Banana' },
      { imageNumber: 4, title: 'Carousel Slide', description: `${fullName} carousel-style layout with key message and CTA.`, model: 'Nano Banana' },
      { imageNumber: 5, title: 'Banner/Cover', description: `${fullName} wide format for Facebook cover or Twitter header.`, model: 'Nano Banana' },
    ];
  }

  // Default plan for other types
  return [
    { imageNumber: 1, title: 'Primary Design', description: `Main ${designType} concept for ${fullName}.`, model: 'Nano Banana' },
    { imageNumber: 2, title: 'Variation A', description: `Alternative composition with different layout structure.`, model: 'Nano Banana' },
    { imageNumber: 3, title: 'Variation B', description: `Alternative treatment with different texture/material feel.`, model: 'Nano Banana' },
    { imageNumber: 4, title: 'Variation C', description: `Alternative approach with different lighting/mood.`, model: 'Nano Banana' },
    { imageNumber: 5, title: 'Variation D', description: `Alternative density with more minimalist or layered approach.`, model: 'Nano Banana' },
  ];
}

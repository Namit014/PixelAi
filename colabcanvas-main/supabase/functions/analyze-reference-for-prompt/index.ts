import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation
const RequestSchema = z.object({
  image_url: z.string().url('Valid image URL required')
});

Deno.serve(async (req) => {
  console.log('🔍 analyze-reference-for-prompt invoked');

  console.log('🔍 analyze-reference-for-prompt invoked');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image_url } = RequestSchema.parse(body);
    
    console.log('📸 Analyzing reference image:', image_url.substring(0, 80) + '...');

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Use Lovable AI's vision model to deeply analyze the reference - EXTRACT EXACT SPECIFICATIONS
    const analysisPrompt = `You are extracting EXACT STYLE SPECIFICATIONS from this reference image that the AI MUST replicate precisely.

OUTPUT FORMAT - Provide EXACT VALUES that can be directly applied:

1. COLOR SPECIFICATIONS (be exact):
   - Primary color: [exact hex code or precise description like "deep navy blue #1a1a3a"]
   - Secondary color: [exact hex code]
   - Accent color: [exact hex code]
   - Background: [solid color with hex / gradient with direction and colors / textured with description]
   - Overall saturation: [percentage like "75% saturated" or "muted 30% saturation"]
   - Color harmony: [complementary/analogous/triadic/monochromatic with specifics]

2. TYPOGRAPHY SPECIFICATIONS (be exact):
   - Font style: [precise classification like "geometric sans-serif similar to Futura/Montserrat" or "modern slab serif like Roboto Slab"]
   - Title weight: [exact like "bold 700" or "black 900"]
   - Body weight: [exact like "regular 400" or "medium 500"]
   - Letter spacing: [tight -2% / normal 0% / wide +5%]
   - Line height: [tight 1.1 / normal 1.4 / loose 1.8]
   - Size hierarchy: [exact like "title 3x body size, subhead 1.5x body"]

3. COMPOSITION SPECIFICATIONS (be exact):
   - Layout: [centered with X% margins / left-aligned / asymmetric with focal point at X]
   - Grid: [rule of thirds / golden ratio / centered / modular 4-column]
   - White space: [percentage like "40% empty space" or "dense 15% margins"]
   - Visual weight distribution: [top-heavy / bottom-heavy / balanced / right-weighted]
   - Element alignment: [strict grid / organic flow / mixed]

4. VISUAL STYLE SPECIFICATIONS (be exact):
   - Illustration style: [flat vector / 3D render / photographic / hand-drawn / geometric abstract]
   - Edge treatment: [sharp geometric / soft blurred / mixed sharp and soft]
   - Shape language: [rounded corners 8-12px / sharp 0px / organic curves]
   - Texture: [clean smooth / subtle noise 5% / heavy grain / paper texture]
   - Depth: [flat 2D / subtle shadows / strong depth with layering]

5. QUALITY MARKERS (be exact):
   - Polish level: [agency-premium / polished-professional / casual-startup]
   - Detail density: [minimal focused / moderate / dense complex]
   - Craft precision: [pixel-perfect alignment / intentionally loose / hand-crafted imperfect]
   - Industry vibe: [luxury / tech / editorial / playful / corporate]

CRITICAL: Output these as DIRECT REPLICATION INSTRUCTIONS.
Do NOT describe what the image shows - only extract STYLE ATTRIBUTES that force the AI to create visually matching (not copied) designs.
The AI reading this must be able to create a NEW design that looks like it's from the SAME DESIGN SYSTEM.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro', // Use Pro for detailed vision analysis
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: analysisPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: image_url
              }
            }
          ]
        }],
        max_completion_tokens: 2000 // Allow detailed analysis
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ AI analysis failed:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const enhancedPrompt = aiData.choices?.[0]?.message?.content;

    if (!enhancedPrompt) {
      console.error('❌ No analysis returned from AI');
      throw new Error('No analysis generated');
    }

    console.log('✅ Reference analysis complete, length:', enhancedPrompt.length);
    console.log('📋 First 200 chars:', enhancedPrompt.substring(0, 200));

    return new Response(
      JSON.stringify({ 
        success: true,
        enhanced_prompt: enhancedPrompt 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in analyze-reference-for-prompt:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Analysis failed',
        details: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

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

    const { brandName, industry, style } = await req.json();

    if (!brandName) {
      throw new Error('Brand name is required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const systemPrompt = `You are a professional brand strategist. Generate comprehensive brand guidelines including overview, color palette, typography recommendations, and usage guidelines.`;

    const userPrompt = `Create a brand template for "${brandName}" in the ${industry || 'general'} industry with a ${style || 'modern'} style. Include:
1. Brand overview and story (2-3 paragraphs)
2. Suggested color palette (5-6 colors with names and usage)
3. Typography recommendations (heading and body font suggestions)
4. Usage guidelines and best practices`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_brand_template",
            description: "Generate brand template",
            parameters: {
              type: "object",
              properties: {
                overview: { type: "string" },
                colors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      hex: { type: "string" },
                      usage: { type: "string" }
                    },
                    required: ["name", "hex", "usage"]
                  }
                },
                typography: {
                  type: "object",
                  properties: {
                    headingFont: { type: "string" },
                    bodyFont: { type: "string" },
                    recommendations: { type: "string" }
                  },
                  required: ["headingFont", "bodyFont"]
                },
                guidelines: { type: "string" }
              },
              required: ["overview", "colors", "typography", "guidelines"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_brand_template" } }
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate brand template');
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No template generated');
    }

    const template = JSON.parse(toolCall.function.arguments);

    console.log('Generated template:', { userId: user.id, brandName });

    return new Response(
      JSON.stringify({ template }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating template:', error);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

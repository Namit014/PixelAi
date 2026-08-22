import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
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

    const { style, mood } = await req.json();

    if (!style) {
      throw new Error('Style/mood is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a professional color palette designer with deep knowledge of color theory. Generate harmonious color palettes based on the given style and mood.

Return ONLY a JSON array with 5-8 colors in this exact format (no other text):
[
  {
    "name": "Color name",
    "hex": "#RRGGBB",
    "rgb": "rgb(r, g, b)",
    "usage": "Brief usage suggestion"
  }
]

Consider:
- Color harmony (complementary, analogous, triadic, etc.)
- Psychological impact of colors
- Accessibility and contrast
- Brand applications (primary, secondary, accent colors)`;

    const userPrompt = `Generate a professional color palette for a brand with style: "${style}" and mood: "${mood}". Include primary brand color, secondary colors, accent colors, and neutral colors.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_palette",
            description: "Generate a color palette",
            parameters: {
              type: "object",
              properties: {
                colors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      hex: { type: "string" },
                      rgb: { type: "string" },
                      usage: { type: "string" }
                    },
                    required: ["name", "hex", "rgb", "usage"],
                    additionalProperties: false
                  }
                }
              },
              required: ["colors"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_palette" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate color palette');
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No palette generated');
    }

    const palette = JSON.parse(toolCall.function.arguments);

    console.log('Generated palette:', { userId: user.id, colorsCount: palette.colors.length });

    return new Response(
      JSON.stringify({ colors: palette.colors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating palette:', error);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

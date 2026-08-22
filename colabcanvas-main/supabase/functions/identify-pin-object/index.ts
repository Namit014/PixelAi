import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IdentifyRequest {
  imageUrl: string;
  normalizedX: number;
  normalizedY: number;
  cropDataUrl: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('❌ Auth error: Invalid token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    const body: IdentifyRequest = await req.json();
    const { imageUrl, normalizedX, normalizedY, cropDataUrl } = body;

    console.log('📍 Identifying object at position:', {
      x: `${Math.round(normalizedX * 100)}%`,
      y: `${Math.round(normalizedY * 100)}%`,
      hasImage: !!imageUrl,
      hasCrop: !!cropDataUrl
    });

    // Validate inputs
    if (!cropDataUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing crop data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('❌ LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build a concise prompt for fast object identification
    const prompt = `Identify the object at the center of this cropped image. Return ONLY JSON: {"primary":"label","alternatives":["alt1","alt2"]}`;

    // Build message content
    const messageContent: any[] = [
      { type: "text", text: prompt },
      { 
        type: "image_url", 
        image_url: { 
          url: cropDataUrl,
          detail: "high"
        } 
      }
    ];

    // Optionally include full image for context
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:'))) {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: imageUrl,
          detail: "low"
        }
      });
    }

    console.log('🤖 Calling AI for object identification...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Fastest model for simple object identification
        messages: [{
          role: "user",
          content: messageContent
        }],
        max_tokens: 100, // Reduced - we only need a few words
        temperature: 0.1, // More deterministic
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI API error:', response.status, errorText);
      
      // Return fallback response instead of error
      return new Response(
        JSON.stringify({
          primary: "object",
          alternatives: ["element", "area", "selection"]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('🤖 AI response:', content);

    // Parse JSON from response
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      } else {
        // Try to find raw JSON object
        const rawMatch = content.match(/\{[\s\S]*\}/);
        if (rawMatch) {
          jsonStr = rawMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr);
      
      console.log('✅ Identified object:', parsed);
      
      return new Response(
        JSON.stringify({
          primary: parsed.primary || 'object',
          alternatives: parsed.alternatives || ['element', 'area']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('⚠️ Failed to parse AI response:', parseError);
      
      // Extract any reasonable text as label
      const words = content.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/).slice(0, 3);
      const fallbackLabel = words.length > 0 ? words.join(' ').toLowerCase() : 'object';
      
      return new Response(
        JSON.stringify({
          primary: fallbackLabel,
          alternatives: ['element', 'selection', 'area']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Error in identify-pin-object:', error);
    return new Response(
      JSON.stringify({ 
        primary: 'object',
        alternatives: ['element', 'selection']
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

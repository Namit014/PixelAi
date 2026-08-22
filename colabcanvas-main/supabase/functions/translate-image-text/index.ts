import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrl, targetLanguage, targetLanguageName, isCreative, originalWidth, originalHeight } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetLanguage || !targetLanguageName) {
      return new Response(
        JSON.stringify({ error: 'Target language is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format dimensions instruction if provided
    const dimensionInstruction = originalWidth && originalHeight 
      ? `\n\nIMPORTANT: The output image MUST be exactly ${originalWidth}x${originalHeight} pixels to match the original.`
      : '';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`🌐 Translating image text to ${targetLanguageName}${isCreative ? ' (Creative/Hinglish mode)' : ''}`);

    // Use different prompts based on creative mode (Hinglish)
    // IMPORTANT: Keep prompts concise and direct for better AI compliance
    let prompt: string;
    
    if (isCreative && targetLanguage === 'hi-colloquial') {
      // HINGLISH MODE: Creative copywriter-style translation
      prompt = `GENERATE A NEW IMAGE with the text translated to creative Hinglish (Roman Hindi mixed with English).

Style guide - catchy brand slogans like:
- "Paytm Karo" 
- "Thanda Matlab Coca-Cola"
- "Yehi hai right choice baby"

Keep the exact same visual design, layout, and colors. Only replace text with punchy, memorable Hinglish phrases.${dimensionInstruction}

OUTPUT: Generate the modified image.`;
    } else {
      // STANDARD MODE: Literal translation  
      prompt = `GENERATE A NEW IMAGE with all text translated to ${targetLanguageName}.

Keep the exact same visual design, layout, colors, and styling. Only replace the text content with the ${targetLanguageName} translation using appropriate script/font.${dimensionInstruction}

OUTPUT: Generate the modified image with translated text.`;
    }

    // Use gemini-3-pro-image-preview for reliable image generation
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ['image'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Insufficient credits' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('AI Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
    
    // Extract the generated image - try multiple paths
    let imageResult = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Try alternative paths
    if (!imageResult) {
      imageResult = data.choices?.[0]?.message?.images?.[0]?.url;
    }
    if (!imageResult) {
      // Try direct image string (base64)
      const imageData = data.choices?.[0]?.message?.images?.[0];
      if (imageData && typeof imageData === 'string') {
        if (imageData.startsWith('data:')) {
          imageResult = imageData;
        } else if (imageData.startsWith('http')) {
          imageResult = imageData;
        }
      }
    }
    if (!imageResult) {
      // Try image_url directly as string
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url;
      if (typeof imageUrl === 'string') {
        imageResult = imageUrl;
      }
    }
    
    if (!imageResult) {
      // If no image was generated, log full response and try text response
      const textResponse = data.choices?.[0]?.message?.content;
      console.log('No image generated. Full response:', JSON.stringify(data));
      console.log('Text response:', textResponse?.substring(0, 500));
      throw new Error('Failed to generate translated image - no image in response');
    }

    console.log(`✅ Image text translated to ${targetLanguageName}`);

    return new Response(
      JSON.stringify({ 
        translatedImageUrl: imageResult,
        message: `Image text translated to ${targetLanguageName}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Image translation error:', error);
    const message = error instanceof Error ? error.message : 'Image translation failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

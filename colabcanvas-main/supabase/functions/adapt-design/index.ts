import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const BACKEND_TIMEOUT_MS = 60000; // 60s hard timeout

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

    const { imageUrl, targetWidth, targetHeight, formatName, maintainOriginalSize, originalWidth, originalHeight, qualityMode } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If maintainOriginalSize is true, use original dimensions
    const finalWidth = maintainOriginalSize && originalWidth ? originalWidth : targetWidth;
    const finalHeight = maintainOriginalSize && originalHeight ? originalHeight : targetHeight;

    if (!finalWidth || !finalHeight) {
      return new Response(
        JSON.stringify({ error: 'Target dimensions are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log(`📐 Adapting design to ${finalWidth}x${finalHeight} (${formatName || 'Custom'})${maintainOriginalSize ? ' - maintaining original size' : ''}`);

    // Calculate aspect ratio for the prompt
    const aspectRatio = finalWidth / finalHeight;
    let aspectDescription = '';
    if (aspectRatio > 1.5) aspectDescription = 'wide horizontal';
    else if (aspectRatio > 1.1) aspectDescription = 'slightly horizontal';
    else if (aspectRatio > 0.9) aspectDescription = 'square';
    else if (aspectRatio > 0.6) aspectDescription = 'slightly vertical';
    else aspectDescription = 'tall vertical';

    // FIX: Enhanced prompt with strict dimension requirements
    const prompt = maintainOriginalSize 
      ? `IMPORTANT: Generate a modified version of this image while keeping the EXACT SAME dimensions (${finalWidth}x${finalHeight} pixels).

Do NOT resize, crop, or change the aspect ratio. The output MUST be exactly ${finalWidth}x${finalHeight} pixels.

Apply the requested changes while preserving:
- The exact same dimensions
- Layout and composition
- Brand elements and styling
- Text positioning and readability

Generate the modified image now at exactly ${finalWidth}x${finalHeight} pixels.`
      : `IMPORTANT: You are a professional graphic designer. REGENERATE this design for a ${aspectDescription} format (${finalWidth}x${finalHeight} pixels) for ${formatName || 'custom use'}.

CRITICAL - DO NOT SIMPLY STRETCH OR SCALE THE IMAGE. You MUST:
1. ANALYZE the original design's visual elements (text, logos, images, graphics, colors)
2. INTELLIGENTLY RECOMPOSE and REARRANGE all elements to fit the new aspect ratio
3. Maintain the same visual style, brand colors, and typography
4. Preserve ALL text content with the same fonts and styling
5. Keep logos and brand elements intact and properly positioned
6. Adjust layout: If target is narrower, STACK elements vertically. If wider, SPREAD horizontally.
7. Maintain proper margins, padding, and visual balance
8. Ensure text remains readable at the new dimensions
9. Keep the design's message and hierarchy intact

OUTPUT REQUIREMENTS:
- Generate a COMPLETE, PRINT-READY design at exactly ${finalWidth}x${finalHeight} pixels
- This is a NEW composition, NOT a resize or crop
- Every element should be thoughtfully repositioned for the new format

Generate the adapted design now.`;

    // Use fast model by default, quality model only when explicitly requested
    const model = qualityMode === 'quality' ? 'google/gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    console.log(`🎨 Using model: ${model} (mode: ${qualityMode || 'fast'})`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ['image', 'text'],
        max_tokens: 8192,
      }),
    });

    clearTimeout(timeoutId);

    console.log('📤 AI request sent, waiting for response...');

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
    console.log('📥 AI response received, extracting image...');
    
    // FIX: Multiple fallback paths for image extraction (Gemini returns in various formats)
    let imageResult: string | null = null;
    
    // Path 1: Standard Lovable gateway format
    imageResult = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Path 2: Direct image_url string
    if (!imageResult) {
      const imgUrlObj = data.choices?.[0]?.message?.images?.[0]?.image_url;
      if (typeof imgUrlObj === 'string' && imgUrlObj.startsWith('data:')) {
        imageResult = imgUrlObj;
      }
    }
    
    // Path 3: Direct url property
    if (!imageResult) {
      imageResult = data.choices?.[0]?.message?.images?.[0]?.url;
    }
    
    // Path 4: Check if images is an array of strings (base64)
    if (!imageResult) {
      const firstImage = data.choices?.[0]?.message?.images?.[0];
      if (typeof firstImage === 'string' && firstImage.startsWith('data:')) {
        imageResult = firstImage;
      }
    }
    
    // Path 5: Gemini native format
    if (!imageResult) {
      imageResult = data.choices?.[0]?.message?.content?.images?.[0]?.url;
    }
    
    if (!imageResult) {
      const textResponse = data.choices?.[0]?.message?.content;
      console.log('No image generated. Response structure:', JSON.stringify(data.choices?.[0]?.message, null, 2).substring(0, 500));
      console.log('Text response:', typeof textResponse === 'string' ? textResponse.substring(0, 200) : 'N/A');
      throw new Error('Failed to generate adapted design - no image in response');
    }

    console.log(`✅ Design adapted to ${finalWidth}x${finalHeight}`);

    return new Response(
      JSON.stringify({ 
        adaptedImageUrl: imageResult,
        width: finalWidth,
        height: finalHeight,
        formatName: formatName || 'Custom'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Design adaptation error:', error);
    const isTimeout = error instanceof DOMException && error.name === 'AbortError';
    const message = isTimeout ? 'Design adaptation timed out. Please try again or use a simpler design.' : (error instanceof Error ? error.message : 'Design adaptation failed');
    return new Response(
      JSON.stringify({ error: message, timeout: isTimeout }),
      { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

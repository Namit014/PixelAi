import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Authenticate user locally (no network call)
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Authentication error: Invalid token');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = { id: claimsData.claims.sub as string };

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Image URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Security: Validate image URL to prevent SSRF attacks
    // Data URLs are safe (no external request) so we allow them
    const isDataUrl = imageUrl.startsWith('data:image/');
    
    if (!isDataUrl) {
      let validatedUrl: URL;
      try {
        validatedUrl = new URL(imageUrl);
        
        // Only allow HTTPS protocol for external URLs
        if (validatedUrl.protocol !== 'https:') {
          console.warn('SECURITY: Non-HTTPS URL rejected', {
            userId: user.id.substring(0, 8),
            timestamp: new Date().toISOString(),
          });
          return new Response(JSON.stringify({ error: 'Only HTTPS URLs are allowed' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Block internal/private IP ranges to prevent SSRF
        const hostname = validatedUrl.hostname;
        const blockedPatterns = [
          /^localhost$/i,
          /^127\./,
          /^10\./,
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
          /^192\.168\./,
          /^169\.254\./,
          /^::1$/,
          /^fe80:/i,
        ];

        if (blockedPatterns.some(pattern => pattern.test(hostname))) {
          console.warn('SECURITY: Internal IP address rejected', {
            userId: user.id.substring(0, 8),
            timestamp: new Date().toISOString(),
          });
          return new Response(JSON.stringify({ error: 'Invalid image URL' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.warn('SECURITY: Invalid URL format', {
          userId: user.id.substring(0, 8),
          timestamp: new Date().toISOString(),
        });
        return new Response(JSON.stringify({ error: 'Invalid image URL format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    console.log('Image URL validated:', isDataUrl ? 'data URL' : 'HTTPS URL');

    // Security: Deduct credits BEFORE calling external API to prevent race conditions
    console.log('Deducting credits for user:', user.id);
    const { error: deductError } = await supabaseClient.rpc('deduct_credits', {
      _user_id: user.id,
      _amount: 10,
    });

    if (deductError) {
      console.error('Failed to deduct credits:', deductError);
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Credits deducted successfully, proceeding with background removal');

    // Use Lovable AI gateway with Gemini for background removal
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      // Refund credits since service is not configured
      await supabaseClient.rpc('add_credits', {
        _user_id: user.id,
        _amount: 10,
      });
      return new Response(JSON.stringify({ error: 'Service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting background removal with Lovable AI gateway...');
    
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
                {
                  type: 'text',
                  text: 'Remove the background completely from this image. Return ONLY the subject on a 100% transparent background. The output MUST be a PNG with actual alpha channel transparency. DO NOT render any checkerboard pattern, grid pattern, or any visual representation of transparency - the background pixels must have zero opacity (alpha = 0). Return a clean cutout with NO visible background whatsoever.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI gateway error:', response.status, errorText);
      // Refund credits since operation failed
      await supabaseClient.rpc('add_credits', {
        _user_id: user.id,
        _amount: 10,
      });
      
      // Provide more specific error messages
      let errorMessage = 'Background removal failed';
      if (response.status === 402) {
        errorMessage = 'AI service temporarily unavailable. Please try again later.';
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log('AI response received');

    // Extract the generated image from the response
    const generatedImage = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImage) {
      console.error('No image in response:', JSON.stringify(result).substring(0, 500));
      // Refund credits since no image was generated
      await supabaseClient.rpc('add_credits', {
        _user_id: user.id,
        _amount: 10,
      });
      return new Response(JSON.stringify({ error: 'Background removal failed - no image generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Background removal succeeded');

    return new Response(
      JSON.stringify({ imageUrl: generatedImage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Service temporarily unavailable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

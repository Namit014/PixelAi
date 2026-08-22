import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

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

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      throw new Error('Unauthorized');
    }
    const user = { id: claimsData.claims.sub as string };

    const { prompt, duration = 4, aspectRatio = '16:9', referenceImageUrl, action = 'generate', jobId } = await req.json();

    const AZURE_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const AZURE_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY');

    if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
      throw new Error('Azure credentials not configured');
    }

    // Calculate credits needed (10 credits per second)
    const creditsNeeded = duration * 10;

    // Check if user has enough credits
    const { data: creditData, error: creditError } = await supabaseClient
      .from('credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (creditError || !creditData || creditData.balance < creditsNeeded) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits', 
          required: creditsNeeded, 
          available: creditData?.balance || 0 
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sora 2 uses OpenAI v1 API format WITHOUT api-version query parameter
    // Base URL format: https://YOUR-RESOURCE-NAME.openai.azure.com/openai/v1/
    // Or for AI Foundry: https://YOUR-PROJECT.services.ai.azure.com/openai/v1/
    
    // Extract base endpoint and construct OpenAI v1 URL
    let baseUrl = AZURE_ENDPOINT.replace(/\/+$/, ''); // Remove trailing slashes
    
    // If endpoint contains /api/projects/, we need to construct properly
    if (baseUrl.includes('/api/projects/')) {
      // For AI Foundry, append openai/v1
      if (!baseUrl.endsWith('/openai/v1')) {
        baseUrl = baseUrl + '/openai/v1';
      }
    } else if (!baseUrl.includes('/openai/v1')) {
      baseUrl = baseUrl + '/openai/v1';
    }

    console.log('Using base URL:', baseUrl);

    // If checking status of existing job
    if (action === 'status' && jobId) {
      // Sora 2 v1 API: GET /videos/{video_id}
      const statusUrl = `${baseUrl}/videos/${jobId}`;
      console.log('Checking video status:', statusUrl);
      
      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'api-key': AZURE_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Azure status check error:', statusResponse.status, errorText);
        throw new Error(`Azure API error: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      console.log('Status response:', statusData);
      
      // Map Sora 2 response to our expected format
      // Sora 2 status can be: pending, running, succeeded, failed
      const result: Record<string, any> = {
        status: statusData.status,
        progress: statusData.progress || 0,
      };

      // If completed, construct video download URL
      if (statusData.status === 'succeeded') {
        // Video download endpoint: GET /videos/{video_id}/content
        result.output_video_url = `${baseUrl}/videos/${jobId}/content`;
      }
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate video using Sora 2 API
    // Sora 2 v1 API: POST /videos
    // Supported sizes: 720x1280 (portrait), 1280x720 (landscape)
    // Supported durations: 4, 8, 12 seconds
    const size = aspectRatio === '16:9' ? '1280x720' : '720x1280';

    // Validate duration (must be 4, 8, or 12)
    const validDuration = [4, 8, 12].includes(duration) ? duration : 4;

    const generateUrl = `${baseUrl}/videos`;
    
    const requestBody: Record<string, any> = {
      model: 'sora-2', // Model name for Sora 2
      prompt: prompt || 'A beautiful cinematic scene',
      size: size,
      n_seconds: validDuration,
    };

    console.log('Sending request to Azure Sora 2:', { url: generateUrl, body: requestBody });

    const generateResponse = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'api-key': AZURE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('Azure generation error:', generateResponse.status, errorText);
      
      if (generateResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a few moments.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Azure API error: ${generateResponse.status} - ${errorText}`);
    }

    const generateData = await generateResponse.json();
    console.log('Azure Sora 2 response:', generateData);

    // Deduct credits after successful job creation
    const { error: deductError } = await supabaseClient.rpc('deduct_credits', {
      _user_id: user.id,
      _amount: creditsNeeded,
    });

    if (deductError) {
      console.error('Credit deduction error:', deductError);
    }

    return new Response(
      JSON.stringify({ 
        jobId: generateData.id,
        status: generateData.status,
        progress: generateData.progress || 0,
        creditsDeducted: creditsNeeded
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sora-generate function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

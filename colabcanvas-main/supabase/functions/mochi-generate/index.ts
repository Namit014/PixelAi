import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

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

    const { prompt, duration = 4, aspectRatio = '16:9', action = 'generate', predictionId, projectId } = await req.json();

    const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');

    if (!REPLICATE_API_TOKEN) {
      throw new Error('Replicate API token not configured');
    }

    // Calculate credits needed (10 credits per second)
    const creditsNeeded = duration * 10;

    // If checking status of existing prediction
    if (action === 'status' && predictionId) {
      console.log('Checking Mochi prediction status:', predictionId);
      
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Replicate status check error:', statusResponse.status, errorText);
        throw new Error(`Replicate API error: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      console.log('Mochi status response:', JSON.stringify(statusData));
      
      // Map Replicate status to our expected format
      let mappedStatus = statusData.status;
      if (statusData.status === 'succeeded') {
        mappedStatus = 'completed';
      }
      
      // Mochi returns output as a single URL string when completed
      let outputUrl = null;
      if (statusData.output) {
        // Handle both array and string output formats
        if (Array.isArray(statusData.output)) {
          outputUrl = statusData.output[0];
        } else if (typeof statusData.output === 'string') {
          outputUrl = statusData.output;
        }
      }
      
      return new Response(JSON.stringify({
        status: mappedStatus,
        progress: statusData.status === 'processing' ? 50 : (statusData.status === 'succeeded' ? 100 : 0),
        output_video_url: outputUrl,
        error: statusData.error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Generate video using Mochi via Replicate
    console.log('Creating Mochi video prediction with prompt:', prompt);
    
    // Mochi-1 version hash (from https://replicate.com/genmoai/mochi-1/versions)
    const MOCHI_VERSION = '1944af04d098ef69bed7f9d335d102e652203f268ec4aaa2d836f6217217e460';
    
    const generateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: MOCHI_VERSION,
        input: {
          prompt: prompt || 'A beautiful cinematic scene with smooth motion',
        }
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('Replicate generation error:', generateResponse.status, errorText);
      
      if (generateResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a few moments.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Replicate API error: ${generateResponse.status} - ${errorText}`);
    }

    const generateData = await generateResponse.json();
    console.log('Mochi prediction created:', JSON.stringify(generateData));

    // Deduct credits after successful prediction creation
    const { error: deductError } = await supabaseClient.rpc('deduct_credits', {
      _user_id: user.id,
      _amount: creditsNeeded,
    });

    if (deductError) {
      console.error('Credit deduction error:', deductError);
    }

    // Save job to database for persistence
    if (projectId) {
      const { error: insertError } = await supabaseClient
        .from('video_generation_jobs')
        .insert({
          user_id: user.id,
          project_id: projectId,
          prediction_id: generateData.id,
          prompt: prompt || 'A beautiful cinematic scene with smooth motion',
          status: generateData.status || 'pending',
          credits_charged: creditsNeeded,
          duration: duration,
          aspect_ratio: aspectRatio
        });

      if (insertError) {
        console.error('Error saving video job:', insertError);
      } else {
        console.log('Video job saved to database');
      }
    }

    return new Response(
      JSON.stringify({ 
        jobId: generateData.id,
        status: generateData.status,
        progress: 0,
        creditsDeducted: creditsNeeded
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mochi-generate function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

    const { videoUrl, projectId } = await req.json();

    if (!videoUrl) {
      throw new Error('Video URL is required');
    }

    console.log('📹 Downloading video from:', videoUrl);

    // Download video from external URL (bypassing CORS)
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      console.error('Failed to fetch video:', videoResponse.status, videoResponse.statusText);
      throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoArrayBuffer = await videoBlob.arrayBuffer();
    const videoData = new Uint8Array(videoArrayBuffer);

    console.log('📹 Video downloaded, size:', videoData.length, 'bytes');

    // Upload to Supabase Storage
    // RLS policy requires user ID as FIRST folder: (storage.foldername(name))[1] = auth.uid()
    const videoFilePath = `${user.id}/videos/${projectId || 'default'}/${Date.now()}.mp4`;
    
    const { error: uploadError } = await supabaseClient.storage
      .from('design-assets')
      .upload(videoFilePath, videoData, { 
        contentType: 'video/mp4',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload video: ${uploadError.message}`);
    }

    console.log('📹 Video uploaded to:', videoFilePath);

    // Get signed URL for the uploaded video
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from('design-assets')
      .createSignedUrl(videoFilePath, 86400 * 7); // 7 days

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
    }

    console.log('📹 Video ready, signed URL created');

    return new Response(
      JSON.stringify({
        success: true,
        filePath: videoFilePath,
        signedUrl: signedUrlData.signedUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in download-video function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

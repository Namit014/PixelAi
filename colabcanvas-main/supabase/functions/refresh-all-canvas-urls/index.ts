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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔄 Starting bulk canvas URL refresh...');

    // Get all canvas objects with image URLs
    const { data: objects, error } = await supabaseAdmin
      .from('canvas_objects')
      .select('id, file_path, image_url')
      .not('file_path', 'is', null);

    if (error) {
      console.error('❌ Failed to fetch canvas objects:', error);
      throw error;
    }

    console.log(`📦 Found ${objects.length} canvas objects to refresh`);

    let refreshed = 0;
    let failed = 0;

    for (const obj of objects) {
      try {
        // Generate new 24-hour signed URL
        const { data: urlData, error: urlError } = await supabaseAdmin.storage
          .from('design-assets')
          .createSignedUrl(obj.file_path, 86400); // 24 hours

        if (urlError || !urlData?.signedUrl) {
          console.error(`❌ Failed to generate URL for ${obj.id}:`, urlError);
          failed++;
          continue;
        }

        // Update database with new URL
        const { error: updateError } = await supabaseAdmin
          .from('canvas_objects')
          .update({ image_url: urlData.signedUrl })
          .eq('id', obj.id);

        if (updateError) {
          console.error(`❌ Failed to update ${obj.id}:`, updateError);
          failed++;
          continue;
        }

        refreshed++;
        if (refreshed % 10 === 0) {
          console.log(`✅ Refreshed ${refreshed}/${objects.length}...`);
        }
      } catch (err) {
        console.error(`❌ Exception refreshing ${obj.id}:`, err);
        failed++;
      }
    }

    const result = {
      success: true,
      total: objects.length,
      refreshed,
      failed,
      message: `Refreshed ${refreshed}/${objects.length} canvas URLs (${failed} failed)`
    };

    console.log('✅ Bulk refresh complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Bulk refresh failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

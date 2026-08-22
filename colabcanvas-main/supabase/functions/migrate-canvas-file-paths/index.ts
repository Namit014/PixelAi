import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting canvas file path migration...');

    // Fetch all canvas objects with NULL file_path
    const { data: objects, error: fetchError } = await supabase
      .from('canvas_objects')
      .select('id, image_url')
      .eq('object_type', 'image')
      .is('file_path', null);

    if (fetchError) {
      throw new Error(`Failed to fetch objects: ${fetchError.message}`);
    }

    console.log(`Found ${objects?.length || 0} objects to migrate`);

    const results = {
      total: objects?.length || 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each object
    for (const obj of objects || []) {
      try {
        if (!obj.image_url) {
          results.failed++;
          results.errors.push(`Object ${obj.id}: No image_url`);
          continue;
        }

        // Extract file path from signed URL
        // Format: https://PROJECT.supabase.co/storage/v1/object/sign/design-assets/{FILE_PATH}?token=...
        const url = new URL(obj.image_url);
        const pathParts = url.pathname.split('/');
        
        // Find the index of 'design-assets' and get everything after it
        const bucketIndex = pathParts.indexOf('design-assets');
        if (bucketIndex === -1 || bucketIndex === pathParts.length - 1) {
          results.failed++;
          results.errors.push(`Object ${obj.id}: Could not parse file path from URL`);
          continue;
        }

        const filePath = pathParts.slice(bucketIndex + 1).join('/');
        
        if (!filePath) {
          results.failed++;
          results.errors.push(`Object ${obj.id}: Empty file path extracted`);
          continue;
        }

        // Update the object with the extracted file_path
        const { error: updateError } = await supabase
          .from('canvas_objects')
          .update({ file_path: filePath })
          .eq('id', obj.id);

        if (updateError) {
          results.failed++;
          results.errors.push(`Object ${obj.id}: Update failed - ${updateError.message}`);
        } else {
          results.successful++;
          console.log(`✓ Updated object ${obj.id} with file_path: ${filePath}`);
        }
      } catch (err) {
        results.failed++;
        const error = err instanceof Error ? err : new Error('Unknown error');
        results.errors.push(`Object ${obj.id}: ${error.message}`);
      }
    }

    console.log('Migration complete:', results);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Migration error:', error);
    const err = error instanceof Error ? error : new Error('Unknown error');
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

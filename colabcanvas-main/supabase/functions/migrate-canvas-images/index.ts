import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('Starting canvas images migration...');

    // Fetch object IDs only first (no large data)
    const { data: objectIds, error: fetchError } = await supabaseClient
      .from('canvas_objects')
      .select('id')
      .is('image_url', null)
      .eq('object_type', 'image')
      .limit(10); // Process only 10 at a time to avoid timeout

    if (fetchError) {
      throw new Error(`Failed to fetch object IDs: ${fetchError.message}`);
    }

    if (!objectIds || objectIds.length === 0) {
      console.log('No objects to migrate');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No objects to migrate',
          migrated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${objectIds.length} objects to migrate`);
    
    let migrated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each object individually to avoid loading all at once
    for (const { id } of objectIds) {
      try {
        // Fetch single object
        const { data: obj, error: objError } = await supabaseClient
          .from('canvas_objects')
          .select('id, user_id, object_data')
          .eq('id', id)
          .single();

        if (objError || !obj) {
          throw new Error(`Failed to fetch object: ${objError?.message}`);
        }

        const objData = obj.object_data as any;
        const base64Src = objData?.src;

        if (!base64Src || !base64Src.startsWith('data:image/')) {
          console.log(`Skipping object ${obj.id} - no valid base64 image`);
          continue;
        }

        // Extract base64 data
        const matches = base64Src.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          console.log(`Skipping object ${obj.id} - invalid base64 format`);
          continue;
        }

        const [, imageType, base64Data] = matches;
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const blob = new Blob([buffer], { type: `image/${imageType}` });

        // Upload to storage
        const fileName = `${obj.user_id}/${obj.id}.${imageType}`;
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('design-assets')
          .upload(fileName, blob, {
            contentType: `image/${imageType}`,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from('design-assets')
          .getPublicUrl(fileName);

        // Clean object_data by removing src
        const cleanedObjectData = { ...objData };
        delete cleanedObjectData.src;

        // Update database record
        const { error: updateError } = await supabaseClient
          .from('canvas_objects')
          .update({
            image_url: publicUrl,
            object_data: cleanedObjectData,
          })
          .eq('id', obj.id);

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }

        migrated++;
        console.log(`Migrated object ${obj.id}`);
      } catch (error) {
        failed++;
        const errorMsg = `Failed to migrate object ${id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Migration complete. Migrated: ${migrated}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        migrated,
        failed,
        total: objectIds.length,
        errors: errors.length > 0 ? errors : undefined,
        message: objectIds.length === 10 ? 'Processed batch of 10. Run again to continue.' : 'Migration complete.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

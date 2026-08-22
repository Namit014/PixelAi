import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🧹 Starting orphaned image cleanup...');

    // Get all files in storage
    const { data: files, error: listError } = await supabase.storage
      .from('design-assets')
      .list('canvas-images');

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`);
    }

    console.log(`📁 Found ${files?.length || 0} files in storage`);

    // Get all image_urls from database
    const { data: dbImages, error: dbError } = await supabase
      .from('canvas_objects')
      .select('image_url')
      .eq('object_type', 'image');

    if (dbError) {
      throw new Error(`Failed to query database: ${dbError.message}`);
    }

    console.log(`💾 Found ${dbImages?.length || 0} image references in database`);

    // Create set of URLs that should exist
    const dbUrls = new Set(dbImages?.map(img => img.image_url) || []);

    let deletedCount = 0;
    const filesToDelete: string[] = [];

    // Find orphaned files
    for (const file of files || []) {
      const fullPath = `canvas-images/${file.name}`;
      const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/design-assets/${fullPath}`;

      if (!dbUrls.has(publicUrl)) {
        filesToDelete.push(fullPath);
      }
    }

    console.log(`🗑️  Found ${filesToDelete.length} orphaned files`);

    // Delete orphaned files in batches
    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('design-assets')
        .remove(filesToDelete);

      if (deleteError) {
        console.error('❌ Error deleting files:', deleteError);
      } else {
        deletedCount = filesToDelete.length;
        console.log(`✅ Deleted ${deletedCount} orphaned files`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalFiles: files?.length || 0,
        dbReferences: dbImages?.length || 0,
        orphanedFiles: filesToDelete.length,
        deletedFiles: deletedCount,
        message: `Cleanup complete. Deleted ${deletedCount} orphaned files.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({
        success: false,
        error: getSafeErrorMessage(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

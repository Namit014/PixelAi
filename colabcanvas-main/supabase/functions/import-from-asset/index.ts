import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { assetId, targetType, targetId } = await req.json();

    console.log('📥 Import from asset:', { assetId, targetType, targetId });

    // Fetch asset data
    const { data: asset, error: assetError } = await supabase
      .from('design_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single();

    if (assetError || !asset) {
      throw new Error('Asset not found or unauthorized');
    }

    // Check if signed URL is expired and regenerate if needed
    let signedUrl = asset.signed_url;
    const now = new Date();
    const expiresAt = asset.signed_url_expires_at ? new Date(asset.signed_url_expires_at) : null;

    if (!signedUrl || !expiresAt || expiresAt < now) {
      console.log('🔄 Regenerating expired signed URL');
      
      // Determine bucket based on source
      let bucket = 'design-assets';
      if (asset.source === 'brand') bucket = 'brand-assets';
      else if (asset.source === 'cosmo') bucket = 'workflow-uploads';

      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(asset.file_path, 31536000); // 1 year

      if (urlError) {
        console.error('❌ URL generation error:', urlError);
        throw new Error('Failed to generate signed URL');
      }

      signedUrl = urlData.signedUrl;

      // Update asset with new signed URL
      await supabase
        .from('design_assets')
        .update({
          signed_url: signedUrl,
          signed_url_expires_at: new Date(Date.now() + 31536000 * 1000).toISOString()
        })
        .eq('id', assetId);
    }

    // Create asset reference if target provided
    if (targetType && targetId) {
      const { error: refError } = await supabase
        .from('asset_references')
        .insert({
          asset_id: assetId,
          referenced_in_type: targetType,
          referenced_in_id: targetId,
          usage_context: { importedAt: new Date().toISOString() }
        });

      if (refError) {
        console.error('⚠️ Asset reference error:', refError);
      }
    }

    console.log('✅ Successfully imported asset');

    return new Response(
      JSON.stringify({ 
        success: true,
        asset: {
          id: asset.id,
          type: asset.asset_type,
          source: asset.source,
          url: signedUrl,
          thumbnailUrl: asset.thumbnail_url || signedUrl,
          width: asset.width,
          height: asset.height,
          metadata: asset.metadata
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Import from asset error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
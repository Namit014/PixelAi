import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      throw new Error('Unauthorized');
    }
    const user = { id: claimsData.claims.sub as string };

    const { 
      workflowId,
      assetFile, 
      assetType, 
      metadata,
      sourceId,
      sourceType 
    } = await req.json();

    console.log('📤 Export to Cosmo:', { workflowId, assetType, sourceType });

    // Upload asset to workflow-uploads bucket
    const fileExt = assetFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    // Convert base64 to file if needed
    let fileToUpload = assetFile;
    if (assetFile.data && assetFile.data.startsWith('data:')) {
      const base64Data = assetFile.data.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      fileToUpload = new File([byteArray], assetFile.name, { type: assetFile.type });
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('workflow-uploads')
      .upload(fileName, fileToUpload);

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Generate signed URL
    const { data: urlData } = await supabase.storage
      .from('workflow-uploads')
      .createSignedUrl(fileName, 31536000); // 1 year

    // Create design_assets record
    const { data: designAsset, error: designAssetError } = await supabase
      .from('design_assets')
      .insert({
        user_id: user.id,
        asset_type: assetType,
        source: sourceType,
        file_path: fileName,
        signed_url: urlData?.signedUrl,
        signed_url_expires_at: new Date(Date.now() + 31536000 * 1000).toISOString(),
        thumbnail_url: urlData?.signedUrl,
        width: metadata?.width,
        height: metadata?.height,
        file_size: assetFile.size,
        mime_type: assetFile.type,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (designAssetError) {
      console.error('❌ Design asset error:', designAssetError);
      throw new Error(`Failed to create design asset: ${designAssetError.message}`);
    }

    // Track export
    const { error: exportError } = await supabase
      .from('asset_exports')
      .insert({
        asset_id: designAsset.id,
        exported_from: sourceType,
        exported_to: 'cosmo',
        export_metadata: { workflowId, sourceId }
      });

    if (exportError) {
      console.error('⚠️ Export tracking error:', exportError);
    }

    // Create asset reference for workflow
    if (workflowId) {
      const { error: refError } = await supabase
        .from('asset_references')
        .insert({
          asset_id: designAsset.id,
          referenced_in_type: 'workflow',
          referenced_in_id: workflowId,
          usage_context: { nodeType: 'upload', sourceId }
        });

      if (refError) {
        console.error('⚠️ Asset reference error:', refError);
      }
    }

    console.log('✅ Successfully exported to Cosmo');

    return new Response(
      JSON.stringify({ 
        success: true, 
        assetId: designAsset.id,
        signedUrl: urlData?.signedUrl,
        filePath: fileName,
        nodeConfig: {
          type: 'upload',
          label: assetFile.name,
          config: {
            url: urlData?.signedUrl,
            filePath: fileName,
            assetId: designAsset.id
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Export to Cosmo error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
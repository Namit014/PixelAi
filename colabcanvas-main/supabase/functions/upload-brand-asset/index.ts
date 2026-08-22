import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: req.headers.get('Authorization')!,
          },
        },
      }
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      throw new Error('Unauthorized');
    }
    const user = { id: claimsData.claims.sub as string };

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const brandId = formData.get('brand_id') as string;
    const sectionId = formData.get('section_id') as string | null;
    const blockId = formData.get('block_id') as string | null;
    const assetType = formData.get('asset_type') as string;
    const assetCategory = formData.get('asset_category') as string | null;

    if (!file || !brandId || !assetType) {
      throw new Error('Missing required fields');
    }

    // Upload to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${brandId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('brand-assets')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('brand-assets')
      .getPublicUrl(filePath);

    // Create asset record
    const { data: asset, error: assetError } = await supabase
      .from('brand_assets')
      .insert({
        user_id: user.id,
        brand_id: brandId,
        section_id: sectionId,
        block_id: blockId,
        file_name: file.name,
        file_path: filePath,
        storage_url: publicUrl,
        mime_type: file.type,
        file_size: file.size,
        asset_type: assetType,
        asset_category: assetCategory,
      })
      .select()
      .single();

    if (assetError) throw assetError;

    console.log('Asset uploaded:', { assetId: asset.id, brandId, userId: user.id });

    return new Response(
      JSON.stringify({ asset }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error uploading asset:', error);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
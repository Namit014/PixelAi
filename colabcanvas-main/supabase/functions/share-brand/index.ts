import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';
import { hashPasswordSecure } from '../_shared/passwordUtils.ts';

function generateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader?.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      throw new Error('Unauthorized');
    }
    const user = { id: claimsData.claims.sub as string };

    const { 
      brand_id, 
      share_name, 
      password, 
      expires_at, 
      allowed_sections,
      download_enabled 
    } = await req.json();

    if (!brand_id) {
      throw new Error('Brand ID is required');
    }

    // Verify user owns the brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brand_id)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      throw new Error('Brand not found or unauthorized');
    }

    const shareToken = generateShareToken();
    
    // Use secure PBKDF2 hashing with salt
    let passwordHash = null;
    let passwordSalt = null;
    if (password) {
      const { hash, salt } = await hashPasswordSecure(password);
      passwordHash = hash;
      passwordSalt = salt;
    }

    const { data: share, error: shareError } = await supabase
      .from('brand_shares')
      .insert({
        brand_id,
        share_token: shareToken,
        share_name,
        password_hash: passwordHash,
        password_salt: passwordSalt,
        expires_at,
        allowed_sections,
        download_enabled: download_enabled ?? true,
        created_by: user.id,
      })
      .select()
      .single();

    if (shareError) throw shareError;

    const shareUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/brands/shared/${shareToken}`;

    console.log('Brand shared:', { shareId: share.id, brandId: brand_id, userId: user.id });

    return new Response(
      JSON.stringify({ 
        share, 
        share_url: shareUrl,
        share_token: shareToken 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sharing brand:', error);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

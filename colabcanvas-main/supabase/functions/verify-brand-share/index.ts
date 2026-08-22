import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';
import { verifyPasswordSecure, hashPasswordLegacy, constantTimeEqual } from '../_shared/passwordUtils.ts';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { share_token, password } = await req.json();

    if (!share_token) {
      throw new Error('Share token is required');
    }

    // Get share details
    const { data: share, error: shareError } = await supabase
      .from('brand_shares')
      .select('*, brands(*)')
      .eq('share_token', share_token)
      .eq('is_active', true)
      .single();

    if (shareError || !share) {
      throw new Error('Invalid or inactive share link');
    }

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      throw new Error('Share link has expired');
    }

    // Verify password if required
    if (share.password_hash) {
      if (!password) {
        return new Response(
          JSON.stringify({ requires_password: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let isValidPassword = false;
      
      // Check if using new secure hashing (has salt) or legacy
      if (share.password_salt) {
        // Use secure PBKDF2 verification
        isValidPassword = await verifyPasswordSecure(password, share.password_hash, share.password_salt);
      } else {
        // Legacy: use old SHA-256 hash for backward compatibility
        const inputHash = await hashPasswordLegacy(password);
        isValidPassword = constantTimeEqual(inputHash, share.password_hash);
      }

      if (!isValidPassword) {
        throw new Error('Incorrect password');
      }
    }

    // Increment views count
    await supabase
      .from('brand_shares')
      .update({ 
        views_count: share.views_count + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', share.id);

    // Get brand sections and content
    const { data: sections, error: sectionsError } = await supabase
      .from('brand_sections')
      .select('*, brand_content_blocks(*)')
      .eq('brand_id', share.brand_id)
      .order('display_order', { ascending: true });

    if (sectionsError) throw sectionsError;

    // Filter sections if restricted
    const filteredSections = share.allowed_sections && share.allowed_sections.length > 0
      ? sections?.filter(s => share.allowed_sections.includes(s.section_name))
      : sections;

    // Get brand assets
    const { data: assets, error: assetsError } = await supabase
      .from('brand_assets')
      .select('*')
      .eq('brand_id', share.brand_id);

    if (assetsError) throw assetsError;

    console.log('Brand share accessed:', { shareId: share.id, brandId: share.brand_id });

    return new Response(
      JSON.stringify({
        brand: share.brands,
        sections: filteredSections,
        assets,
        download_enabled: share.download_enabled,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying brand share:', error);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

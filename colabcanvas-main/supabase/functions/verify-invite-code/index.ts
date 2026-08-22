import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limiting: 10 attempts per 5 minutes per IP (relaxed for debugging)
    const identifier = getRateLimitIdentifier(req);
    console.log('🔍 Verification attempt from:', identifier);
    
    if (!checkRateLimit(identifier, { requests: 10, window: 300000 })) {
      console.warn('⚠️ Rate limit exceeded for:', identifier);
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Too many attempts. Please wait a few minutes before trying again.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code, email } = await req.json();
    console.log('📥 Received verification request:', { 
      codeProvided: !!code, 
      codeLength: code?.length,
      emailProvided: !!email 
    });

    if (!code || typeof code !== 'string') {
      console.error('❌ Invalid code format:', typeof code);
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Please enter a valid invite code' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize code (uppercase, trim, strip spaces, normalize dashes)
    const normalizedCode = code
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[\u2013\u2014]/g, '-');
    console.log('🔄 Normalized code:', normalizedCode.substring(0, 4) + '...');

    // Create service role client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if code exists and is valid
    console.log('🔍 Querying database for code...');
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('invite_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .maybeSingle();

    // Handle real database errors (not PGRST116 which is "no rows found")
    if (codeError && codeError.code !== 'PGRST116') {
      console.error('❌ Database error:', codeError.message, codeError.details);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Unable to verify code. Please try again.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Code not found or inactive - proper handling with maybeSingle()
    if (!codeData) {
      console.log('❌ Code not found or inactive:', normalizedCode);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid invite code. Please check and try again.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Code found:', { 
      id: codeData.id, 
      uses: `${codeData.current_uses}/${codeData.max_uses || '∞'}`,
      expires: codeData.expires_at ? new Date(codeData.expires_at).toISOString() : 'never'
    });

    // Check expiration
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      console.log('❌ Code expired:', normalizedCode, 'at', codeData.expires_at);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'This invite code has expired' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check usage limit (max_uses null OR 0 = unlimited)
    if (codeData.max_uses !== null && codeData.max_uses > 0 && codeData.current_uses >= codeData.max_uses) {
      console.log('❌ Usage limit reached:', normalizedCode, `(${codeData.current_uses}/${codeData.max_uses})`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'This code has already been used the maximum number of times' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // NOTE: Do NOT increment current_uses or insert into invite_code_usage here.
    // This endpoint only validates that a code CAN be used. Actual redemption
    // happens via the SECURITY DEFINER `redeem_invite_code` RPC after the user
    // has signed up / logged in. This prevents single-use codes from getting
    // burned on a pre-auth check (which is what was causing "Failed to verify
    // the code" loops for users who refreshed or hit the modal twice).
    console.log('✅ Code valid (pre-auth check):', normalizedCode);

    return new Response(
      JSON.stringify({ 
        valid: true,
        message: 'Code verified successfully',
        codeId: codeData.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Unexpected error verifying invite code:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: 'An unexpected error occurred. Please try again.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

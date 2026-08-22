import { createClient } from 'npm:@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };

const ALLOWED_ORIGINS = [
  'https://app.letscolab.tech',
  'https://letscolab.in',
  'http://localhost:5173',
  'http://localhost:3000',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = user.id;

    const { platform, origin } = await req.json();
    if (!platform) {
      return new Response(JSON.stringify({ error: 'platform is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Determine redirect origin — validate it's allowed or fallback to primary
    let redirectOrigin = ALLOWED_ORIGINS[0]; // default to app.letscolab.tech
    if (origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
      redirectOrigin = origin;
    }

    const callbackUrl = `${redirectOrigin}/oauth/social/callback`;

    console.log(`[social-oauth-initiate] platform=${platform} redirectOrigin=${redirectOrigin} callbackUrl=${callbackUrl}`);

    // Generate secure state token and store it
    const stateToken = crypto.randomUUID();
    let codeVerifier: string | null = null;

    // For Twitter PKCE, generate code_verifier
    if (platform === 'twitter') {
      codeVerifier = crypto.randomUUID() + crypto.randomUUID();
    }

    // Use service role to write state
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: stateError } = await supabaseService
      .from('social_oauth_states')
      .insert({
        state_token: stateToken,
        user_id: userId,
        platform,
        redirect_origin: redirectOrigin,
        code_verifier: codeVerifier,
      });

    if (stateError) {
      console.error('State insert error:', stateError);
      return new Response(JSON.stringify({ error: 'Failed to initiate OAuth' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let authUrl = '';

    if (platform === 'linkedin') {
      const clientId = Deno.env.get('LINKEDIN_CLIENT_ID');
      if (!clientId) {
        return new Response(JSON.stringify({ error: 'LinkedIn is not configured. Please add LINKEDIN_CLIENT_ID secret.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const scopes = 'openid profile email';
      authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${stateToken}&scope=${encodeURIComponent(scopes)}`;
      console.log(`[social-oauth-initiate] LinkedIn scopes="${scopes}"`);

    } else if (platform === 'facebook' || platform === 'instagram') {
      const appId = Deno.env.get('FACEBOOK_APP_ID');
      if (!appId) {
        return new Response(JSON.stringify({ error: 'Facebook/Instagram is not configured. Please add FACEBOOK_APP_ID secret.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Dev-mode safe scopes ONLY — no email, no publishing scopes
      // After Meta App Review: add pages_manage_posts, pages_read_engagement, instagram_content_publish
      const scopes = platform === 'instagram'
        ? 'instagram_basic,pages_show_list'
        : 'public_profile,pages_show_list';
      authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${stateToken}&scope=${encodeURIComponent(scopes)}`;
      console.log(`[social-oauth-initiate] ${platform} scopes="${scopes}"`);

    } else if (platform === 'twitter') {
      const clientId = Deno.env.get('TWITTER_CLIENT_ID');
      if (!clientId) {
        return new Response(JSON.stringify({ error: 'Twitter/X is not configured. Please add TWITTER_CLIENT_ID secret.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const scopes = 'tweet.read tweet.write users.read offline.access';

      // Generate PKCE code_challenge from stored code_verifier
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier!);
      const digest = await crypto.subtle.digest('SHA-256', data);
      const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scopes)}&state=${stateToken}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      console.log(`[social-oauth-initiate] Twitter scopes="${scopes}" clientId=${clientId.substring(0, 8)}...`);

    } else if (platform === 'pinterest') {
      const appId = Deno.env.get('PINTEREST_APP_ID');
      if (!appId) {
        return new Response(JSON.stringify({ error: 'Pinterest is not configured. Please add PINTEREST_APP_ID secret.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const scopes = 'boards:read,pins:read,pins:write';
      authUrl = `https://www.pinterest.com/oauth/?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${stateToken}`;

    } else {
      return new Response(JSON.stringify({ error: `Unsupported platform: ${platform}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[social-oauth-initiate] Generated authUrl for ${platform} (length=${authUrl.length})`);

    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('social-oauth-initiate error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate auth URL' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

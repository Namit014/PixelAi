import { createClient } from 'npm:@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, state, error: oauthError } = await req.json();

    console.log(`[social-oauth-callback] Received: code=${code ? 'present' : 'missing'} state=${state ? 'present' : 'missing'} error=${oauthError || 'none'}`);

    if (oauthError || !code || !state) {
      return new Response(JSON.stringify({ error: oauthError || 'Missing code or state' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Look up and validate stored state
    const { data: stateRow, error: stateError } = await supabase
      .from('social_oauth_states')
      .select('*')
      .eq('state_token', state)
      .single();

    if (stateError || !stateRow) {
      console.error('[social-oauth-callback] State lookup failed:', stateError);
      return new Response(JSON.stringify({ error: 'Invalid or expired state' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (new Date(stateRow.expires_at) < new Date()) {
      await supabase.from('social_oauth_states').delete().eq('id', stateRow.id);
      return new Response(JSON.stringify({ error: 'OAuth state expired. Please try again.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete used state immediately
    await supabase.from('social_oauth_states').delete().eq('id', stateRow.id);

    const { user_id: userId, platform, redirect_origin, code_verifier: codeVerifier } = stateRow;
    const callbackUrl = `${redirect_origin}/oauth/social/callback`;

    console.log(`[social-oauth-callback] platform=${platform} callbackUrl=${callbackUrl}`);

    let accessToken = '';
    let refreshToken = '';
    let expiresAt: Date | null = null;
    let platformUserId = '';
    let platformUsername = '';

    // ── LinkedIn ──
    if (platform === 'linkedin') {
      const clientId = Deno.env.get('LINKEDIN_CLIENT_ID')!;
      const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET')!;

      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error('[social-oauth-callback] LinkedIn token error:', JSON.stringify(tokenData));
        return new Response(JSON.stringify({ error: tokenData.error_description || 'LinkedIn token exchange failed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || '';
      expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;

      const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        platformUserId = profile.sub || '';
        platformUsername = profile.name || profile.email || '';
      }
      console.log(`[social-oauth-callback] LinkedIn connected: ${platformUsername}`);

    // ── Facebook / Instagram ──
    } else if (platform === 'facebook' || platform === 'instagram') {
      const appId = Deno.env.get('FACEBOOK_APP_ID')!;
      const appSecret = Deno.env.get('FACEBOOK_APP_SECRET')!;

      const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&client_secret=${appSecret}&code=${code}`);
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error) {
        console.error('[social-oauth-callback] Facebook token error:', JSON.stringify(tokenData));
        return new Response(JSON.stringify({ error: tokenData.error?.message || 'Facebook token exchange failed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const longTokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`);
      const longTokenData = await longTokenRes.json();
      accessToken = longTokenData.access_token || tokenData.access_token;
      expiresAt = longTokenData.expires_in ? new Date(Date.now() + longTokenData.expires_in * 1000) : null;

      const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`);
      if (meRes.ok) {
        const me = await meRes.json();
        platformUserId = me.id;
        platformUsername = me.name || '';
      }

      if (platform === 'instagram') {
        try {
          const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
          const pagesData = await pagesRes.json();
          if (pagesData.data?.[0]) {
            const pageId = pagesData.data[0].id;
            const pageToken = pagesData.data[0].access_token;
            const igRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`);
            const igData = await igRes.json();
            if (igData.instagram_business_account?.id) {
              platformUserId = igData.instagram_business_account.id;
              accessToken = pageToken;
            }
          }
        } catch (e) {
          console.error('[social-oauth-callback] Instagram account lookup failed:', e);
        }
      }
      console.log(`[social-oauth-callback] ${platform} connected: ${platformUsername}`);

    // ── Twitter/X OAuth 2.0 ──
    } else if (platform === 'twitter') {
      const clientId = Deno.env.get('TWITTER_CLIENT_ID')!;
      const clientSecret = Deno.env.get('TWITTER_CLIENT_SECRET')!;

      console.log(`[social-oauth-callback] Twitter exchange: clientId=${clientId.substring(0, 8)}... codeVerifier=${codeVerifier ? 'present' : 'missing'}`);

      const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: callbackUrl,
          code_verifier: codeVerifier || '',
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error('[social-oauth-callback] Twitter token error:', JSON.stringify(tokenData));
        return new Response(JSON.stringify({ error: tokenData.error_description || tokenData.error || 'Twitter token exchange failed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || '';
      expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;

      const userRes = await fetch('https://api.x.com/2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        platformUserId = userData.data?.id || '';
        platformUsername = userData.data?.username ? `@${userData.data.username}` : '';
      }
      console.log(`[social-oauth-callback] Twitter connected: ${platformUsername}`);

    // ── Pinterest ──
    } else if (platform === 'pinterest') {
      const appId = Deno.env.get('PINTEREST_APP_ID')!;
      const appSecret = Deno.env.get('PINTEREST_APP_SECRET')!;

      const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${appId}:${appSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error('[social-oauth-callback] Pinterest token error:', JSON.stringify(tokenData));
        return new Response(JSON.stringify({ error: 'Pinterest token exchange failed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || '';
      expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;

      const userRes = await fetch('https://api.pinterest.com/v5/user_account', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        platformUserId = userData.username || '';
        platformUsername = userData.username || '';
      }
    } else {
      return new Response(JSON.stringify({ error: `Unsupported platform: ${platform}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert into social_connectors
    const { error: upsertError } = await supabase
      .from('social_connectors')
      .upsert({
        user_id: userId,
        platform,
        status: 'connected',
        connected_at: new Date().toISOString(),
        access_token: accessToken,
        refresh_token: refreshToken || null,
        token_expires_at: expiresAt?.toISOString() || null,
        platform_user_id: platformUserId || null,
        platform_username: platformUsername || null,
        metadata: {},
      }, { onConflict: 'user_id,platform' });

    if (upsertError) {
      console.error('[social-oauth-callback] Upsert error:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to save connection' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[social-oauth-callback] ✅ ${platform} saved for user ${userId.substring(0, 8)}...`);

    return new Response(JSON.stringify({ success: true, platform, platform_username: platformUsername }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[social-oauth-callback] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Server error during token exchange' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

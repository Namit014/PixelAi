import { createClient } from 'npm:@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    // Use service role to read tokens
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { platform, content_text, media_urls, brand_id, scheduled_at, post_id } = body;

    if (!platform || !content_text) {
      return new Response(JSON.stringify({ error: 'platform and content_text are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If scheduled_at is in the future, just save as scheduled
    const scheduledTime = scheduled_at ? new Date(scheduled_at) : null;
    const isScheduled = scheduledTime && scheduledTime > new Date();

    if (isScheduled) {
      const postData = {
        user_id: userId,
        brand_id: brand_id || null,
        platform,
        content_text,
        media_urls: media_urls || [],
        status: 'scheduled',
        scheduled_at: scheduledTime.toISOString(),
      };

      if (post_id) {
        const { data, error } = await supabase.from('social_posts').update(postData).eq('id', post_id).eq('user_id', userId).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, post: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } else {
        const { data, error } = await supabase.from('social_posts').insert(postData).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, post: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Get user's stored OAuth tokens for this platform
    const { data: connector } = await supabase
      .from('social_connectors')
      .select('access_token, refresh_token, token_expires_at, platform_user_id, platform_username')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('status', 'connected')
      .single();

    if (!connector?.access_token) {
      // Save as draft — no connection
      const postData = {
        user_id: userId,
        brand_id: brand_id || null,
        platform,
        content_text,
        media_urls: media_urls || [],
        status: 'failed' as const,
        error_message: `${platform} is not connected. Please connect your ${platform} account first.`,
      };
      const { data, error } = post_id
        ? await supabase.from('social_posts').update(postData).eq('id', post_id).eq('user_id', userId).select().single()
        : await supabase.from('social_posts').insert(postData).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: false, post: data, error: postData.error_message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const accessToken = connector.access_token;
    let postUrl = '';
    let publishError = '';

    // Scope-awareness: check if the connection has publishing permissions
    // Connections made with basic scopes cannot publish
    const basicOnlyPlatforms: Record<string, string> = {
      facebook: 'Your Facebook connection has basic access only. Publishing requires Meta App Review approval for the pages_manage_posts scope.',
      instagram: 'Your Instagram connection has basic access only. Publishing requires Meta App Review approval for the instagram_content_publish scope.',
      linkedin: 'Your LinkedIn connection may have basic access only. Publishing requires Community Management API approval for the w_member_social scope.',
    };

    try {
      if (platform === 'twitter') {
        const res = await fetch('https://api.x.com/2/tweets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: content_text }),
        });
        const data = await res.json();
        if (res.ok && data?.data?.id) {
          postUrl = `https://x.com/i/status/${data.data.id}`;
        } else {
          publishError = `Twitter API error: ${JSON.stringify(data)}`;
        }

      } else if (platform === 'linkedin') {
        // LinkedIn UGC Post API
        const personUrn = connector.platform_user_id ? `urn:li:person:${connector.platform_user_id}` : 'urn:li:person:me';
        const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author: personUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: content_text },
                shareMediaCategory: 'NONE',
              },
            },
            visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          postUrl = data?.id ? `https://linkedin.com/feed/update/${data.id}` : 'https://linkedin.com/feed/';
        } else {
          const errData = await res.text();
          publishError = `LinkedIn API error [${res.status}]: ${errData}`;
        }

      } else if (platform === 'facebook') {
        // Post to first managed page
        // First get pages
        const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
        const pagesData = await pagesRes.json();
        if (pagesData.data?.[0]) {
          const page = pagesData.data[0];
          const postRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: content_text,
              access_token: page.access_token,
            }),
          });
          const postData = await postRes.json();
          if (postRes.ok && postData.id) {
            postUrl = `https://facebook.com/${postData.id}`;
          } else {
            publishError = `Facebook API error: ${JSON.stringify(postData)}`;
          }
        } else {
          publishError = 'No Facebook Pages found. Make sure your account manages at least one Page.';
        }

      } else if (platform === 'instagram') {
        // Instagram Content Publishing API (requires image)
        if (!media_urls?.length) {
          publishError = 'Instagram requires at least one image to publish.';
        } else {
          const igUserId = connector.platform_user_id;
          // Create media container
          const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: media_urls[0],
              caption: content_text,
              access_token: accessToken,
            }),
          });
          const containerData = await containerRes.json();
          if (containerData.id) {
            // Publish the container
            const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                creation_id: containerData.id,
                access_token: accessToken,
              }),
            });
            const publishData = await publishRes.json();
            if (publishData.id) {
              postUrl = `https://instagram.com/p/${publishData.id}`;
            } else {
              publishError = `Instagram publish error: ${JSON.stringify(publishData)}`;
            }
          } else {
            publishError = `Instagram media error: ${JSON.stringify(containerData)}`;
          }
        }

      } else if (platform === 'pinterest') {
        const res = await fetch('https://api.pinterest.com/v5/pins', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: content_text.substring(0, 100),
            description: content_text,
            ...(media_urls?.length ? { media_source: { source_type: 'image_url', url: media_urls[0] } } : {}),
          }),
        });
        const data = await res.json();
        if (res.ok && data.id) {
          postUrl = `https://pinterest.com/pin/${data.id}`;
        } else {
          publishError = `Pinterest API error: ${JSON.stringify(data)}`;
        }

      } else {
        publishError = `Unsupported platform: ${platform}`;
      }
    } catch (e) {
      publishError = e instanceof Error ? e.message : 'Publishing failed';
    }

    const finalStatus = postUrl ? 'published' : 'failed';
    const postData = {
      user_id: userId,
      brand_id: brand_id || null,
      platform,
      content_text,
      media_urls: media_urls || [],
      status: finalStatus,
      published_at: postUrl ? new Date().toISOString() : null,
      post_url: postUrl || null,
      error_message: publishError || null,
    };

    if (post_id) {
      const { data, error } = await supabase.from('social_posts').update(postData).eq('id', post_id).eq('user_id', userId).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: !publishError, post: data, error: publishError || undefined }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
      const { data, error } = await supabase.from('social_posts').insert(postData).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: !publishError, post: data, error: publishError || undefined }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    console.error('social-publish error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

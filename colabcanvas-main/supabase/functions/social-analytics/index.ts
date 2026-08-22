import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    // Fetch all published posts with their analytics
    const { data: posts, error: postsError } = await supabase
      .from('social_posts')
      .select('id, platform, content_text, status, published_at, post_url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (postsError) throw postsError;

    // Fetch analytics for published posts
    const publishedIds = (posts || []).filter(p => p.status === 'published').map(p => p.id);
    let analytics: any[] = [];
    if (publishedIds.length > 0) {
      const { data } = await supabase
        .from('social_post_analytics')
        .select('*')
        .in('post_id', publishedIds)
        .order('fetched_at', { ascending: false });
      analytics = data || [];
    }

    // Build summary
    const platformStats: Record<string, { posts: number; impressions: number; likes: number; comments: number; shares: number; clicks: number }> = {};
    for (const post of (posts || [])) {
      if (!platformStats[post.platform]) {
        platformStats[post.platform] = { posts: 0, impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
      }
      platformStats[post.platform].posts++;
    }

    for (const a of analytics) {
      const post = (posts || []).find(p => p.id === a.post_id);
      if (post && platformStats[post.platform]) {
        platformStats[post.platform].impressions += a.impressions || 0;
        platformStats[post.platform].likes += a.likes || 0;
        platformStats[post.platform].comments += a.comments || 0;
        platformStats[post.platform].shares += a.shares || 0;
        platformStats[post.platform].clicks += a.clicks || 0;
      }
    }

    const totalPosts = (posts || []).length;
    const publishedPosts = (posts || []).filter(p => p.status === 'published').length;
    const totalEngagement = analytics.reduce((sum, a) => sum + (a.likes || 0) + (a.comments || 0) + (a.shares || 0), 0);

    // Generate AI growth suggestions
    let suggestions: string[] = [];
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY && totalPosts > 0) {
      try {
        const analyticsContext = JSON.stringify({ totalPosts, publishedPosts, totalEngagement, platformStats });
        const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a social media growth strategist. Given analytics data, provide 3-5 concise, actionable growth suggestions. Return only a JSON array of strings.' },
              { role: 'user', content: `Here is my social media analytics: ${analyticsContext}. Give me growth suggestions.` },
            ],
            temperature: 0.7,
            max_tokens: 512,
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const content = aiData?.choices?.[0]?.message?.content || '';
          try {
            const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim());
            if (Array.isArray(parsed)) suggestions = parsed;
          } catch {
            suggestions = content.split('\n').filter((l: string) => l.trim().length > 10).slice(0, 5);
          }
        }
      } catch (e) {
        console.error('AI suggestions error:', e);
      }
    }

    if (suggestions.length === 0) {
      suggestions = [
        'Post consistently — aim for at least 3-5 posts per week per platform.',
        'Use high-quality visuals aligned with your brand colors and typography.',
        'Engage with your audience — respond to comments within the first hour.',
        'Analyze your best-performing content and create more of what works.',
        'Experiment with different content formats: carousels, videos, stories.',
      ];
    }

    return new Response(JSON.stringify({
      summary: { totalPosts, publishedPosts, totalEngagement, platformStats },
      suggestions,
      recentPosts: (posts || []).slice(0, 10),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('social-analytics error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

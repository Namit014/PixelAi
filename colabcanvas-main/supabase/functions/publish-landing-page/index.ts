import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PublishBody {
  jobId?: string;
  pageId?: string;
  action: 'publish' | 'update' | 'unpublish' | 'delete';
  title?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  faviconUrl?: string;
  customDomain?: string | null;
  settings?: Record<string, unknown>;
  integrations?: Record<string, unknown>;
  customCode?: { head?: string; bodyEnd?: string; css?: string };
  siteData?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const anon = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsError } = await anon.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);

    const userId = claims.claims.sub as string;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = (await req.json()) as PublishBody;

    if (body.action === 'unpublish' || body.action === 'delete') {
      const target = body.pageId
        ? supabase.from('published_landing_pages').update(body.action === 'delete' ? {} : { is_active: false, unpublished_at: new Date().toISOString() }).eq('id', body.pageId)
        : null;
      if (!target) return json({ error: 'pageId required' }, 400);
      if (body.action === 'delete') {
        const { error } = await supabase.from('published_landing_pages').delete().eq('id', body.pageId).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await target.eq('user_id', userId);
        if (error) throw error;
      }
      return json({ success: true });
    }

    // publish or update — need site data
    let siteData = body.siteData || null;
    let title = body.title || null;

    if (!siteData && body.jobId) {
      const { data: job } = await supabase
        .from('rumi_autonomous_jobs')
        .select('checkpoint, objective, user_id')
        .eq('id', body.jobId)
        .single();
      if (!job || job.user_id !== userId) return json({ error: 'Job not found' }, 404);
      const cp = (job.checkpoint || {}) as any;
      siteData = cp?.websiteResult?.siteData || null;
      title = title || (siteData as any)?.siteTitle || (job.objective as any)?.goal || 'Landing Page';
    }

    if (!siteData) return json({ error: 'No site data to publish' }, 400);

    const meta = {
      title,
      meta_description: body.metaDescription ?? (siteData as any)?.metaDescription ?? null,
      og_image_url: body.ogImageUrl ?? null,
      favicon_url: body.faviconUrl ?? null,
      custom_domain: body.customDomain ?? null,
      settings: body.settings ?? {},
      integrations: body.integrations ?? {},
      custom_code: body.customCode ?? {},
      site_data: siteData,
      is_active: true,
      unpublished_at: null,
    };

    if (body.pageId) {
      const { data, error } = await supabase
        .from('published_landing_pages')
        .update(meta)
        .eq('id', body.pageId)
        .eq('user_id', userId)
        .select('id, slug, custom_domain')
        .single();
      if (error) throw error;
      return json({ success: true, page: data });
    }

    // New publish — generate slug
    const { data: slugRow } = await supabase.rpc('generate_landing_slug');
    const slug = slugRow as unknown as string;

    const { data, error } = await supabase
      .from('published_landing_pages')
      .insert({
        user_id: userId,
        job_id: body.jobId || null,
        slug,
        ...meta,
      })
      .select('id, slug, custom_domain')
      .single();
    if (error) throw error;

    return json({ success: true, page: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('[publish-landing-page]', msg);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

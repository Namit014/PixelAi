import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Public — no JWT required. Returns the active site_data for a slug or domain.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const domain = url.searchParams.get('domain');
    if (!slug && !domain) return json({ error: 'slug or domain required' }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const query = supabase
      .from('published_landing_pages')
      .select('id, slug, custom_domain, title, meta_description, og_image_url, favicon_url, site_data, custom_code, settings, integrations, analytics, is_active')
      .eq('is_active', true)
      .limit(1);

    const { data, error } = slug
      ? await query.eq('slug', slug).maybeSingle()
      : await query.eq('custom_domain', domain).eq('domain_verified', true).maybeSingle();

    if (error) throw error;
    if (!data) return json({ error: 'Not found' }, 404);

    // Fire-and-forget visit increment + record
    try {
      await supabase.rpc('increment_landing_visit', { _page_id: (data as any).id });
      const referrer = req.headers.get('referer') || null;
      const ua = req.headers.get('user-agent') || null;
      const utm = {
        utm_source: url.searchParams.get('utm_source'),
        utm_medium: url.searchParams.get('utm_medium'),
        utm_campaign: url.searchParams.get('utm_campaign'),
        utm_content: url.searchParams.get('utm_content'),
        utm_term: url.searchParams.get('utm_term'),
      };
      await supabase.from('landing_page_visits').insert({
        page_id: (data as any).id,
        referrer,
        user_agent: ua,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
        utm_term: utm.utm_term,
      });
    } catch (e) {
      console.warn('[get-published-page] visit log failed', e);
    }

    return json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

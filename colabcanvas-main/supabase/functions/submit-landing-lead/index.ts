import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Public lead submission. No JWT required.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { pageId, formId, fields, sourceUrl, utm } = body || {};
    if (!pageId || !fields || typeof fields !== 'object') {
      return json({ error: 'pageId and fields required' }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: page } = await supabase
      .from('published_landing_pages')
      .select('id, user_id, is_active, integrations')
      .eq('id', pageId)
      .maybeSingle();
    if (!page || !(page as any).is_active) return json({ error: 'Page not active' }, 404);

    const email = typeof fields.email === 'string' ? fields.email : null;
    const name = typeof fields.name === 'string' ? fields.name : null;
    const ua = req.headers.get('user-agent') || null;

    const { data: lead, error } = await supabase.from('landing_page_leads').insert({
      page_id: pageId,
      user_id: (page as any).user_id,
      form_id: formId || null,
      fields,
      email,
      name,
      source_url: sourceUrl || null,
      utm: utm || {},
      user_agent: ua,
    }).select('id').single();

    if (error) throw error;

    // Optional webhook integration (fire-and-forget)
    const webhookUrl = (page as any)?.integrations?.webhookUrl;
    if (webhookUrl && typeof webhookUrl === 'string') {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, pageId, fields, utm, sourceUrl }),
      }).catch((e) => console.warn('[submit-landing-lead] webhook failed', e));
    }

    return json({ success: true, leadId: lead.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('[submit-landing-lead]', msg);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

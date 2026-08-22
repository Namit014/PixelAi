import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * admin-export-table
 * Streams a chosen public.* table to NDJSON in the admin-notifications
 * bucket under backups/{table}/{ISO}.ndjson and returns a 24h signed URL.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims } = await supabase.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) return json({ error: 'Forbidden' }, 403);

    const { table } = await req.json();
    if (!/^[a-z_][a-z0-9_]*$/i.test(table)) return json({ error: 'Invalid table' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Page through rows and build NDJSON
    const PAGE = 1000;
    let from = 0;
    const lines: string[] = [];
    let total = 0;
    while (true) {
      const { data, error } = await admin.from(table).select('*').range(from, from + PAGE - 1);
      if (error) return json({ error: error.message }, 400);
      if (!data || data.length === 0) break;
      for (const row of data) lines.push(JSON.stringify(row));
      total += data.length;
      if (data.length < PAGE) break;
      from += PAGE;
      if (total > 200_000) break; // safety cap
    }

    const ndjson = lines.join('\n');
    const path = `backups/${table}/${new Date().toISOString()}.ndjson`;
    const { error: upErr } = await admin.storage
      .from('admin-notifications')
      .upload(path, new Blob([ndjson], { type: 'application/x-ndjson' }), {
        contentType: 'application/x-ndjson',
        upsert: false,
      });
    if (upErr) return json({ error: upErr.message }, 400);

    const { data: signed, error: sErr } = await admin.storage
      .from('admin-notifications')
      .createSignedUrl(path, 60 * 60 * 24);
    if (sErr) return json({ error: sErr.message }, 400);

    await admin.from('admin_actions').insert({
      admin_id: userId,
      action_type: 'resource.export',
      details: { table, path, rows: total },
    });

    return json({ ok: true, path, signedUrl: signed.signedUrl, rows: total });
  } catch (e: any) {
    console.error('admin-export-table error:', e?.message);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

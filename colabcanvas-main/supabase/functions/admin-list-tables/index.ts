import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * admin-list-tables
 * Returns metadata about every public.* table for the Resource Explorer.
 * Admin-only.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }

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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch tables and their primary key columns from information_schema via RPC-equivalent
    // We use a raw select via rest by leveraging the supabase client's `rpc` is unavailable,
    // so instead we read pg_tables / pg_views through PostgREST views aren't exposed.
    // Solution: read information_schema via the special supabase pg meta endpoint not available — fallback to a hardcoded discovery via RPC.
    // Instead, we expose the list via a SELECT against a tiny helper view: we just list known table names from PostgREST's OpenAPI spec.
    const url = `${Deno.env.get('SUPABASE_URL')}/rest/v1/?apikey=${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
    const specRes = await fetch(url, {
      headers: { Accept: 'application/openapi+json' },
    });
    const spec = await specRes.json();

    const definitions = spec.definitions ?? {};
    const tables: Array<{ name: string; columns: string[]; primary_key: string | null }> = [];

    for (const [name, def] of Object.entries<any>(definitions)) {
      if (!def?.properties) continue;
      const columns = Object.keys(def.properties);
      // Heuristic: 'id' is the most common PK
      const primary_key = columns.includes('id') ? 'id' : columns[0] ?? null;
      tables.push({ name, columns, primary_key });
    }

    tables.sort((a, b) => a.name.localeCompare(b.name));

    return json({ tables });
  } catch (e: any) {
    console.error('admin-list-tables error:', e?.message);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * admin-table-query
 * Paginated SELECT against any public table. Admin-only.
 *
 * Body: { table: string, page?: number, pageSize?: number, orderBy?: string, ascending?: boolean, search?: { column: string, value: string } }
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

    const body = await req.json();
    const table = String(body.table ?? '').trim();
    if (!/^[a-z_][a-z0-9_]*$/i.test(table)) {
      return json({ error: 'Invalid table name' }, 400);
    }

    const page = Math.max(0, Number(body.page ?? 0));
    const pageSize = Math.min(200, Math.max(1, Number(body.pageSize ?? 50)));
    const orderBy = body.orderBy && /^[a-z_][a-z0-9_]*$/i.test(body.orderBy) ? body.orderBy : null;
    const ascending = body.ascending === true;
    const search = body.search ?? null;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let q = admin.from(table).select('*', { count: 'exact' });
    if (orderBy) q = q.order(orderBy, { ascending });
    if (search?.column && search?.value && /^[a-z_][a-z0-9_]*$/i.test(search.column)) {
      q = q.ilike(search.column, `%${search.value}%`);
    }
    q = q.range(page * pageSize, page * pageSize + pageSize - 1);

    const { data, count, error } = await q;
    if (error) {
      return json({ error: error.message }, 400);
    }

    return json({ rows: data ?? [], count: count ?? 0 });
  } catch (e: any) {
    console.error('admin-table-query error:', e?.message);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

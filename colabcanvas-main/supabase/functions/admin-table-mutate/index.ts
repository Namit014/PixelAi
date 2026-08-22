import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * admin-table-mutate
 * INSERT / UPDATE / DELETE on any public table. Admin-only.
 * Logs every mutation to admin_actions.
 *
 * Body shapes:
 *   { table, op: 'insert', values: object }
 *   { table, op: 'update', match: { column, value }, values: object }
 *   { table, op: 'delete', match: { column, value } }
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
    const op = String(body.op ?? '');
    if (!/^[a-z_][a-z0-9_]*$/i.test(table)) return json({ error: 'Invalid table' }, 400);
    if (!['insert', 'update', 'delete'].includes(op)) return json({ error: 'Invalid op' }, 400);

    // Hard-block writes to sensitive tables for safety
    const BLOCKED = new Set(['user_roles', 'admin_actions']);
    if (BLOCKED.has(table) && op !== 'insert') {
      return json({ error: `Mutations on ${table} are blocked for safety` }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let result: any = null;
    if (op === 'insert') {
      const { data, error } = await admin.from(table).insert(body.values ?? {}).select();
      if (error) return json({ error: error.message }, 400);
      result = data;
    } else if (op === 'update') {
      const m = body.match ?? {};
      if (!m.column || !/^[a-z_][a-z0-9_]*$/i.test(m.column)) return json({ error: 'Invalid match' }, 400);
      const { data, error } = await admin
        .from(table)
        .update(body.values ?? {})
        .eq(m.column, m.value)
        .select();
      if (error) return json({ error: error.message }, 400);
      result = data;
    } else if (op === 'delete') {
      const m = body.match ?? {};
      if (!m.column || !/^[a-z_][a-z0-9_]*$/i.test(m.column)) return json({ error: 'Invalid match' }, 400);
      const { data, error } = await admin
        .from(table)
        .delete()
        .eq(m.column, m.value)
        .select();
      if (error) return json({ error: error.message }, 400);
      result = data;
    }

    // Audit log
    await admin.from('admin_actions').insert({
      admin_id: userId,
      action_type: `resource.${op}`,
      target_user_id: null,
      details: { table, match: body.match ?? null, values_keys: body.values ? Object.keys(body.values) : null },
    });

    return json({ ok: true, rows: result });
  } catch (e: any) {
    console.error('admin-table-mutate error:', e?.message);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

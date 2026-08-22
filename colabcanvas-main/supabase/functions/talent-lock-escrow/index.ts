import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { project_id, payment_plan, promo_id, idempotency_key } = await req.json();
    if (!project_id || !payment_plan) return json({ error: 'Missing project_id or payment_plan' }, 400);
    if (!idempotency_key || typeof idempotency_key !== 'string' || idempotency_key.length > 64) {
      return json({ error: 'Missing or invalid idempotency_key' }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: 'Unauthorized' }, 401);

    // ---- Idempotency replay: if any escrow row exists for this (project, key), return early
    const { data: existingRows } = await service
      .from('talent_escrow')
      .select('id')
      .eq('project_id', project_id)
      .like('idempotency_key', `${idempotency_key}%`);
    if (existingRows && existingRows.length > 0) {
      const { data: proj } = await service
        .from('talent_projects')
        .select('payment_plan, status, discount_amount')
        .eq('id', project_id)
        .maybeSingle();
      const installments = (proj?.payment_plan as any)?.installments ?? [];
      const totalDue = installments.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
      return json({
        success: true,
        replayed: true,
        escrow_ids: existingRows.map(r => r.id),
        total_due: totalDue,
        status: proj?.status,
      });
    }

    // Verify project ownership + signed contract
    const { data: project, error: pErr } = await service
      .from('talent_projects')
      .select('id, user_id, pricing, client_signed_at, status')
      .eq('id', project_id)
      .single();
    if (pErr || !project) return json({ error: 'Project not found' }, 404);
    if (project.user_id !== user.id) return json({ error: 'Forbidden' }, 403);
    if (!project.client_signed_at) return json({ error: 'Contract must be signed before payment' }, 400);

    const subtotal = Math.max(0, Number(project.pricing?.total ?? 0));

    // Re-validate promo on the server, compute authoritative discount
    let discount = 0;
    let promo: any = null;
    if (promo_id) {
      const { data: p } = await service.from('promo_codes').select('*').eq('id', promo_id).maybeSingle();
      if (!p) return json({ error: 'Promo code not found' }, 400);
      if (!p.active) return json({ error: 'Promo code is no longer active' }, 400);
      if (p.scope && p.scope !== 'talent' && p.scope !== 'all') {
        return json({ error: 'This code is not valid for talent payments' }, 400);
      }
      if (p.expires_at && new Date(p.expires_at) < new Date()) {
        return json({ error: 'Promo code expired' }, 400);
      }
      if (p.max_uses && p.used_count >= p.max_uses) {
        return json({ error: 'Promo code fully redeemed' }, 400);
      }
      const { data: adminCheck } = await service
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (!adminCheck) {
        const { data: existing } = await service
          .from('promo_code_redemptions')
          .select('id')
          .eq('promo_code_id', p.id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (existing) return json({ error: 'You have already used this code' }, 400);
      }

      discount = p.discount_type === 'percent'
        ? Math.round(subtotal * (Number(p.discount_value) / 100))
        : Math.min(Number(p.discount_value), subtotal);
      promo = p;
    }

    const totalDue = Math.max(0, subtotal - discount);

    // Validate payment plan against authoritative total
    const installments: Array<{ label: string; amount: number; due_at?: string }> = payment_plan.installments ?? [];
    if (installments.length === 0) return json({ error: 'Payment plan must have at least one installment' }, 400);
    const sum = installments.reduce((s, i) => s + Number(i.amount || 0), 0);
    if (Math.abs(sum - totalDue) > 1) {
      return json({ error: `Installments sum (${sum}) must equal total (${totalDue})` }, 400);
    }

    const escrowIds: string[] = [];

    if (totalDue === 0) {
      // Fully covered by promo — record installments as auto-released, status active.
      for (let idx = 0; idx < installments.length; idx++) {
        const inst = installments[idx];
        const { data: row, error: insErr } = await service.from('talent_escrow').insert({
          project_id,
          user_id: user.id,
          amount: 0,
          status: 'released',
          milestone_label: inst.label,
          released_at: new Date().toISOString(),
          idempotency_key: `${idempotency_key}:${idx}`,
        }).select('id').single();
        if (insErr) {
          // Conflict on idempotency → safe replay
          if ((insErr as any).code === '23505') continue;
          return json({ error: insErr.message }, 400);
        }
        if (row) escrowIds.push(row.id);
      }
    } else {
      // Check first installment is funded
      const firstAmount = installments[0].amount;
      const { data: credits } = await service.from('credits').select('talent_balance').eq('user_id', user.id).maybeSingle();
      if (!credits || credits.talent_balance < firstAmount) {
        return json({ error: 'Insufficient talent credits. Please top up.', code: 'INSUFFICIENT_FUNDS' }, 402);
      }

      for (let idx = 0; idx < installments.length; idx++) {
        const inst = installments[idx];
        if (idx === 0) {
          const { data: escrowId, error: rpcErr } = await userClient.rpc('lock_escrow_credits', {
            _user_id: user.id,
            _project_id: project_id,
            _amount: inst.amount,
            _milestone: inst.label,
          });
          if (rpcErr) return json({ error: rpcErr.message || 'Could not lock escrow' }, 400);
          // Tag the just-created escrow row with the idempotency key
          if (escrowId) {
            await service.from('talent_escrow')
              .update({ idempotency_key: `${idempotency_key}:0` })
              .eq('id', escrowId as string);
            escrowIds.push(escrowId as string);
          }
        } else {
          const { data: scheduled, error: insErr } = await service.from('talent_escrow').insert({
            project_id,
            user_id: user.id,
            amount: inst.amount,
            status: 'scheduled',
            milestone_label: inst.label,
            scheduled_for: inst.due_at,
            idempotency_key: `${idempotency_key}:${idx}`,
          }).select('id').single();
          if (insErr && (insErr as any).code !== '23505') {
            return json({ error: insErr.message }, 400);
          }
          if (scheduled) escrowIds.push(scheduled.id);
        }
      }
    }

    // Record promo redemption (idempotent — ignore conflict on replay)
    if (promo) {
      const { error: redErr } = await service.from('promo_code_redemptions').insert({
        promo_code_id: promo.id,
        user_id: user.id,
        project_id,
      });
      if (!redErr) {
        await service.from('promo_codes').update({ used_count: (promo.used_count ?? 0) + 1 }).eq('id', promo.id);
      }
    }

    // Persist plan + status + discount in one place
    await service.from('talent_projects').update({
      payment_plan,
      promo_code: promo?.code ?? null,
      discount_amount: discount,
      status: totalDue === 0 ? 'active' : 'paid',
    }).eq('id', project_id);

    return json({ success: true, escrow_ids: escrowIds, total_due: totalDue });
  } catch (e) {
    console.error('[talent-lock-escrow] error', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown' }, 500);
  }
});

// deploy: v1
// Locks the additional delta from the user's existing wallet (talent_balance)
// into project escrow. If the user has insufficient wallet balance, returns the
// shortfall so the client UI can route to /pricing top-up flow.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { project_id } = await req.json();
    if (!project_id) return json({ error: "project_id required" }, 400);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: tp } = await service.from("talent_projects")
      .select("id, user_id, pricing")
      .eq("id", project_id).maybeSingle();
    if (!tp) return json({ error: "Project not found" }, 404);
    if (tp.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    const newTotal = Number(tp.pricing?.total ?? 0);

    const { data: escrows } = await service.from("talent_escrow")
      .select("amount, status")
      .eq("project_id", project_id);

    const paidToDate = (escrows ?? [])
      .filter((e: any) => e.status === "locked" || e.status === "released")
      .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

    const delta = newTotal - paidToDate;
    if (delta <= 0) return json({ success: true, locked: 0, message: "Nothing to top up" });

    const { data: wallet } = await service.from("credits")
      .select("talent_balance, escrow_balance")
      .eq("user_id", user.id).single();
    const available = Number(wallet?.talent_balance ?? 0);

    if (available < delta) {
      // Tell the client how much extra they need to top up via /pricing
      return json({
        success: false,
        needs_topup: true,
        shortfall: delta - available,
        delta,
        available,
      });
    }

    // Lock the delta in escrow
    await service.from("credits")
      .update({
        talent_balance: available - delta,
        escrow_balance: Number(wallet?.escrow_balance ?? 0) + delta,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    await service.from("talent_escrow").insert({
      project_id,
      user_id: user.id,
      amount: delta,
      status: "locked",
      milestone_label: "Budget increase",
      locked_at: new Date().toISOString(),
    });

    await service.from("credit_transactions").insert({
      user_id: user.id,
      amount: delta,
      transaction_type: "escrow_lock",
      description: "Budget increase top-up",
    });

    await service.from("talent_messages").insert({
      project_id,
      user_id: user.id,
      role: "ai",
      kind: "system_link",
      content: `Top-up locked: $${delta.toLocaleString()} added to project escrow.`,
      metadata: { topped_up: delta },
    });

    return json({ success: true, locked: delta });
  } catch (e) {
    console.error("[talent-budget-topup]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

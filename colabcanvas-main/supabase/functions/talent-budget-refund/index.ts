// deploy: v1
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
      .select("id, amount, status")
      .eq("project_id", project_id)
      .order("created_at", { ascending: false });

    const lockedRows = (escrows ?? []).filter((e: any) => e.status === "locked");
    const releasedRows = (escrows ?? []).filter((e: any) => e.status === "released");
    const lockedTotal = lockedRows.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const releasedTotal = releasedRows.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const paidToDate = lockedTotal + releasedTotal;

    const refundAmount = Math.max(0, paidToDate - newTotal);
    if (refundAmount <= 0) return json({ error: "Nothing to refund" }, 400);

    // Refund from locked escrow first (we cannot refund already released funds — those went to talent).
    // If the cut exceeds locked funds, only refund what is still in escrow.
    const refundable = Math.min(refundAmount, lockedTotal);
    if (refundable <= 0) {
      return json({ error: "All escrow already released — cannot refund automatically" }, 400);
    }

    // Move the refundable amount back from escrow_balance to talent_balance (wallet),
    // then create a refunded escrow row for audit.
    const { error: e1 } = await service.from("credits")
      .update({
        escrow_balance: (await service.from("credits").select("escrow_balance").eq("user_id", user.id).single()).data?.escrow_balance - refundable,
        talent_balance: (await service.from("credits").select("talent_balance").eq("user_id", user.id).single()).data?.talent_balance + refundable,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (e1) return json({ error: "Wallet update failed: " + e1.message }, 500);

    // Mark the most recent locked rows as refunded up to refundable amount.
    let remaining = refundable;
    for (const row of lockedRows) {
      if (remaining <= 0) break;
      const amt = Number(row.amount);
      if (amt <= remaining) {
        await service.from("talent_escrow")
          .update({ status: "refunded", refunded_at: new Date().toISOString() })
          .eq("id", row.id);
        remaining -= amt;
      } else {
        // Split row: shrink original, insert refunded delta row
        await service.from("talent_escrow").update({ amount: amt - remaining }).eq("id", row.id);
        await service.from("talent_escrow").insert({
          project_id,
          user_id: user.id,
          amount: remaining,
          status: "refunded",
          milestone_label: "Budget reduction",
          refunded_at: new Date().toISOString(),
        });
        remaining = 0;
      }
    }

    await service.from("credit_transactions").insert({
      user_id: user.id,
      amount: refundable,
      transaction_type: "escrow_refund",
      description: "Budget reduction refund",
    });

    await service.from("talent_messages").insert({
      project_id,
      user_id: user.id,
      role: "ai",
      kind: "system_link",
      content: `Refund processed: $${refundable.toLocaleString()} returned to your wallet.`,
      metadata: { refunded: refundable },
    });

    return json({ success: true, refunded: refundable });
  } catch (e) {
    console.error("[talent-budget-refund]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

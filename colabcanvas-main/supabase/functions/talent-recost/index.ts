import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lightweight, deterministic re-cost based on slider deltas.
// Avoids an AI round trip so sliders feel instant.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { team_composition, timeline, pricing, controls } = await req.json();

    const timelineMultiplier = controls?.timeline_factor ?? 1; // 0.7 (rush) - 1.4 (relaxed)
    const scopeMultiplier = controls?.scope_factor ?? 1; // 0.6 (lite) - 1.3 (full)

    const newRoles = (team_composition?.roles ?? []).map((r: any) => ({
      ...r,
      hours: Math.max(8, Math.round(r.hours * scopeMultiplier)),
    }));

    const newPhases = (timeline?.phases ?? []).map((p: any) => ({
      ...p,
      duration_weeks: Math.max(0.5, +(p.duration_weeks * timelineMultiplier).toFixed(1)),
    }));

    const lineItems = newRoles.map((r: any) => ({
      label: `${r.seniority} ${r.role} — ${r.count}× ${r.hours}h`,
      amount: r.count * r.hours * r.hourly_rate,
    }));
    const rushFee = timelineMultiplier < 0.85 ? Math.round(lineItems.reduce((s: number, l: any) => s + l.amount, 0) * 0.15) : 0;
    if (rushFee > 0) lineItems.push({ label: "Rush delivery surcharge", amount: rushFee });

    const subtotal = lineItems.reduce((s: number, l: any) => s + l.amount, 0);
    const managementFee = Math.round(subtotal * 0.12);
    const total = subtotal + managementFee;

    return new Response(JSON.stringify({
      team_composition: { ...team_composition, roles: newRoles },
      timeline: { ...timeline, total_weeks: +newPhases.reduce((s: number, p: any) => s + p.duration_weeks, 0).toFixed(1), phases: newPhases },
      pricing: { currency: pricing?.currency ?? "USD", line_items: lineItems, subtotal, management_fee: managementFee, total },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

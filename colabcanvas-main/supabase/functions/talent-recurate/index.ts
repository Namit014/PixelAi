// deploy: v2
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM = `You are the lead producer at a top creative studio.
The client has a target budget. Re-curate the team, timeline and pricing to land at-or-under the target — no minimum cap.
- If the target is much lower than the original, switch some seniors to mid/junior, reduce hours, or trim phases.
- If the target is higher, you may add seniority, dedicated roles, or polish phases.
- Always preserve the must-have outcome; if you must drop scope, be explicit in 'why_team' and 'why_cost'.
- Be honest about tradeoffs. No hidden fees.
Use industry-standard hourly rates: Junior $40/h, Mid $75/h, Senior $120/h, Lead $160/h. USD only.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { project_id, target_budget_usd, notes } = await req.json();
    if (!project_id) return json({ error: "project_id is required" }, 400);
    const target = Number(target_budget_usd);
    if (!Number.isFinite(target) || target <= 0) return json({ error: "target_budget_usd must be a positive number" }, 400);

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
      .select("id, user_id, brief, extracted, team_composition, timeline, pricing")
      .eq("id", project_id).maybeSingle();
    if (!tp) return json({ error: "Project not found" }, 404);
    if (tp.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY not configured" }, 500);

    const userMsg = `BRIEF:\n${JSON.stringify(tp.brief ?? {})}

EXTRACTED:\n${JSON.stringify(tp.extracted ?? {})}

CURRENT TEAM:\n${JSON.stringify(tp.team_composition ?? {})}

CURRENT TIMELINE:\n${JSON.stringify(tp.timeline ?? {})}

CURRENT PRICING:\n${JSON.stringify(tp.pricing ?? {})}

TARGET BUDGET: $${target} USD
CLIENT NOTES: ${notes || "(none)"}

Re-curate to land at-or-under the target budget. Total in pricing.total must be <= ${target} (within $5 tolerance).`;

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        tools: [{
          type: "function",
          function: {
            name: "recurated_plan",
            parameters: {
              type: "object",
              properties: {
                team_composition: {
                  type: "object",
                  properties: {
                    roles: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          role: { type: "string" },
                          seniority: { type: "string", enum: ["Junior","Mid","Senior","Lead"] },
                          count: { type: "number" },
                          hours: { type: "number" },
                          hourly_rate: { type: "number" },
                          rationale: { type: "string" },
                        },
                        required: ["role","seniority","count","hours","hourly_rate","rationale"],
                      },
                    },
                  },
                  required: ["roles"],
                },
                timeline: {
                  type: "object",
                  properties: {
                    total_weeks: { type: "number" },
                    phases: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          duration_weeks: { type: "number" },
                          deliverables: { type: "array", items: { type: "string" } },
                        },
                        required: ["name","duration_weeks","deliverables"],
                      },
                    },
                  },
                  required: ["total_weeks","phases"],
                },
                pricing: {
                  type: "object",
                  properties: {
                    currency: { type: "string" },
                    line_items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { label: { type: "string" }, amount: { type: "number" } },
                        required: ["label","amount"],
                      },
                    },
                    subtotal: { type: "number" },
                    management_fee: { type: "number" },
                    total: { type: "number" },
                  },
                  required: ["currency","line_items","subtotal","total"],
                },
                explanation: {
                  type: "object",
                  properties: {
                    why_team: { type: "string" },
                    why_timeline: { type: "string" },
                    why_cost: { type: "string" },
                    tradeoffs: { type: "string" },
                  },
                  required: ["why_team","why_timeline","why_cost","tradeoffs"],
                },
              },
              required: ["team_composition","timeline","pricing","explanation"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "recurated_plan" } },
      }),
    });

    if (resp.status === 429) return json({ error: "Rate limited" }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[talent-recurate] AI error", resp.status, t);
      return json({ error: "AI gateway error" }, 502);
    }
    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;
    if (!parsed) return json({ error: "AI returned no plan" }, 500);

    const oldTotal = Number(tp.pricing?.total ?? 0);
    const newTotal = Number(parsed.pricing?.total ?? 0);
    const delta = newTotal - oldTotal;

    // Compute paid-to-date (locked + released escrow for this project)
    const { data: esc } = await service.from("talent_escrow")
      .select("amount, status")
      .eq("project_id", project_id);
    const paidToDate = (esc ?? [])
      .filter((e: any) => e.status === "locked" || e.status === "released")
      .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

    let action_required: "refund" | "top_up" | "none" = "none";
    let action_amount = 0;
    if (paidToDate > 0) {
      if (newTotal < paidToDate) {
        action_required = "refund";
        action_amount = paidToDate - newTotal;
      } else if (newTotal > paidToDate) {
        action_required = "top_up";
        action_amount = newTotal - paidToDate;
      }
    }

    await service.from("talent_projects").update({
      team_composition: parsed.team_composition,
      timeline: parsed.timeline,
      pricing: parsed.pricing,
      explanation: parsed.explanation,
      status: "reproposing",
    }).eq("id", project_id);

    const teamSummary = (parsed.team_composition?.roles ?? []).map((r: any) => ({
      role: r.role, seniority: r.seniority, count: r.count,
    }));

    await service.from("talent_messages").insert({
      project_id,
      user_id: user.id,
      role: "ai",
      kind: "budget_change",
      content: `Plan updated to $${newTotal.toLocaleString()} (was $${oldTotal.toLocaleString()}).`,
      metadata: {
        old_total: oldTotal,
        new_total: newTotal,
        delta,
        paid_to_date: paidToDate,
        action_required,
        action_amount,
        currency: parsed.pricing?.currency || "USD",
        team: teamSummary,
        timeline_weeks: parsed.timeline?.total_weeks ?? null,
        tradeoffs: parsed.explanation?.tradeoffs ?? "",
        why_cost: parsed.explanation?.why_cost ?? "",
        target_budget_usd: target,
      },
    });

    return json({ success: true, plan: parsed });
  } catch (e) {
    console.error("[talent-recurate]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

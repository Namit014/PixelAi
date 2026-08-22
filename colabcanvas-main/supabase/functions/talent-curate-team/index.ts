import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map seniority + role → domain tags used by freelancer_profiles.domain (text[]).
const roleToDomain = (role: string): string[] => {
  const r = role.toLowerCase();
  const buckets: string[] = [];
  if (/(brand|identity|logo)/.test(r)) buckets.push("Brand Design");
  if (/(ui|ux|product|web|app)/.test(r)) buckets.push("UI/UX");
  if (/(illustr)/.test(r)) buckets.push("Illustration");
  if (/(motion|video|anim)/.test(r)) buckets.push("Motion");
  if (/(graphic|print|packag)/.test(r)) buckets.push("Brand Design");
  if (/(copy|writ|content)/.test(r)) buckets.push("Copywriting");
  if (/(strategy|research|direction)/.test(r)) buckets.push("Brand Design");
  return buckets.length ? buckets : ["Brand Design"];
};

// Map AI seniority → freelancer_profiles.role_level prefix.
const seniorityPrefix = (s: string): string => {
  const v = (s || "").toLowerCase();
  if (v.startsWith("lead")) return "Lead";
  if (v.startsWith("senior")) return "Senior";
  if (v.startsWith("mid")) return "Mid";
  return "Junior";
};


const SYSTEM = `You are the lead producer at a top-tier creative studio. Given a structured creative brief, you assemble:
- The right team (roles only, never names) with seniority + estimated hours
- A realistic phased timeline (discovery → design → review → delivery)
- A transparent pricing breakdown (per role, per phase) with a final total
- A clear "why" explanation for team, timeline, and cost

Use industry-standard hourly rates: Junior $40/h, Mid $75/h, Senior $120/h, Lead $160/h.
Keep teams lean (2-6 roles typical). Prefer fewer senior people over many junior ones for high-quality work.
Pricing must be in USD. Be realistic — no underselling, no overselling.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { brief, extracted, controls, provider_preference } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const providerPref: 'freelancer' | 'agency' | 'either' =
      provider_preference === 'agency' || provider_preference === 'freelancer' ? provider_preference : 'either';

    const providerHint = providerPref === 'agency'
      ? `\n\nPROVIDER PREFERENCE: AGENCY — Recommend a single agency (multi-disciplinary studio) to deliver the entire scope. Roles still describe the agency's contributing skills.`
      : providerPref === 'freelancer'
      ? `\n\nPROVIDER PREFERENCE: FREELANCERS — Assemble a team of independent freelancers (each role = one person).`
      : `\n\nPROVIDER PREFERENCE: BEST MATCH — Pick whichever (agency or freelance team) delivers best.`;

    const userMsg = `BRIEF:\n${JSON.stringify(brief)}\n\nEXTRACTED:\n${JSON.stringify(extracted)}\n\nUSER ADJUSTMENTS (if any):\n${JSON.stringify(controls ?? {})}${providerHint}\n\nReturn the curated plan via the tool call.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userMsg }],
        tools: [{
          type: "function",
          function: {
            name: "curated_plan",
            parameters: {
              type: "object",
              properties: {
                project_title: { type: "string" },
                team_composition: {
                  type: "object",
                  properties: {
                    roles: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          role: { type: "string" },
                          seniority: { type: "string", enum: ["Junior", "Mid", "Senior", "Lead"] },
                          count: { type: "number" },
                          hours: { type: "number" },
                          rationale: { type: "string" },
                          hourly_rate: { type: "number" },
                        },
                        required: ["role", "seniority", "count", "hours", "rationale", "hourly_rate"],
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
                        required: ["name", "duration_weeks", "deliverables"],
                      },
                    },
                  },
                  required: ["total_weeks", "phases"],
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
                        required: ["label", "amount"],
                      },
                    },
                    subtotal: { type: "number" },
                    management_fee: { type: "number" },
                    total: { type: "number" },
                  },
                  required: ["currency", "line_items", "subtotal", "total"],
                },
                explanation: {
                  type: "object",
                  properties: {
                    why_team: { type: "string" },
                    why_timeline: { type: "string" },
                    why_cost: { type: "string" },
                  },
                  required: ["why_team", "why_timeline", "why_cost"],
                },
              },
              required: ["project_title", "team_composition", "timeline", "pricing", "explanation"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "curated_plan" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;

    // Enrich with real assignees with tier fallback (agency or freelancer pool).
    if (parsed?.team_composition?.roles?.length) {
      try {
        const service = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        // ---------- Agency branch ----------
        if (providerPref === 'agency') {
          const { data: agencies } = await service
            .from("agency_profiles")
            .select("user_id, agency_name, logo_url, domains, team_size, hourly_blended_rate, vetting_status, availability, country");

          const allUserIds = (agencies ?? []).map((a) => a.user_id);
          const { data: profs } = allUserIds.length
            ? await service.from("profiles").select("id, full_name, avatar_url").in("id", allUserIds)
            : { data: [] as any[] };
          const profById = new Map((profs ?? []).map((p: any) => [p.id, p]));

          // Aggregate desired domains across all roles
          const wantDomains = new Set<string>();
          for (const r of parsed.team_composition.roles) {
            for (const d of roleToDomain(r.role || "")) wantDomains.add(d);
          }
          const tierRank = (s: string) => (s === "approved" ? 3 : s === "pending" ? 2 : 1);
          const availRank = (a: string) => (a === "available" ? 2 : a === "limited" ? 1 : 0);

          const ranked = (agencies ?? [])
            .map((a) => {
              const dom = (a.domains ?? []) as string[];
              const overlap = dom.filter((d) => wantDomains.has(d)).length;
              return {
                a,
                score:
                  overlap * 5 +
                  tierRank(a.vetting_status ?? "") * 2 +
                  availRank(a.availability ?? "") +
                  (a.team_size ? Math.min(5, Math.floor(a.team_size / 5)) : 0),
              };
            })
            .sort((x, y) => y.score - x.score);

          const bestAgency = ranked[0]?.a;
          if (bestAgency) {
            const prof = profById.get(bestAgency.user_id) as any;
            const agencyAssignee = {
              user_id: bestAgency.user_id,
              name: bestAgency.agency_name || prof?.full_name || 'Agency',
              avatar_url: bestAgency.logo_url || prof?.avatar_url || null,
              role_level: 'Agency',
              vetting_status: bestAgency.vetting_status,
              availability: bestAgency.availability,
              is_agency: true,
              team_size: bestAgency.team_size ?? null,
              hourly_blended_rate: bestAgency.hourly_blended_rate ?? null,
              country: bestAgency.country ?? null,
              domains: bestAgency.domains ?? [],
            };
            // Attach the same agency assignee to every role (single agency delivers all)
            parsed.team_composition.roles = parsed.team_composition.roles.map((r: any) => ({
              ...r,
              assignee: agencyAssignee,
            }));
            parsed.assigned_agency = agencyAssignee;
          }
        } else {
          // ---------- Freelancer branch (original) ----------
          const { data: pool } = await service
            .from("freelancer_profiles")
            .select("user_id, domain, role_level, quality_score, vetting_status, availability");

          const allUserIds = (pool ?? []).map((p) => p.user_id);
          const { data: profs } = allUserIds.length
            ? await service.from("profiles").select("id, full_name, avatar_url").in("id", allUserIds)
            : { data: [] as any[] };
          const profById = new Map((profs ?? []).map((p: any) => [p.id, p]));

          const used = new Set<string>();
          const tierRank = (s: string) => (s === "approved" ? 3 : s === "pending" ? 2 : 1);
          const availRank = (a: string) => (a === "available" ? 2 : a === "limited" ? 1 : 0);

          parsed.team_composition.roles = parsed.team_composition.roles.map((r: any) => {
            const wantDomains = roleToDomain(r.role || "");
            const wantSeniority = seniorityPrefix(r.seniority || "");

            const scoreFor = (tierFilter: (p: any) => boolean) =>
              (pool ?? [])
                .filter((p) => !used.has(p.user_id) && tierFilter(p))
                .map((p) => {
                  const dom = (p.domain ?? []) as string[];
                  const overlap = dom.filter((d) => wantDomains.includes(d)).length;
                  const senMatch = (p.role_level ?? "").startsWith(wantSeniority) ? 2 : 0;
                  return {
                    p,
                    score:
                      overlap * 4 +
                      senMatch +
                      tierRank(p.vetting_status ?? "") +
                      availRank(p.availability ?? "") +
                      Number(p.quality_score ?? 0),
                  };
                })
                .sort((a, b) => b.score - a.score);

            let candidates = scoreFor(
              (p) =>
                p.vetting_status === "approved" &&
                ((p.domain ?? []) as string[]).some((d) => wantDomains.includes(d)),
            );
            if (candidates.length === 0) {
              candidates = scoreFor(
                (p) =>
                  ["approved", "pending"].includes(p.vetting_status ?? "") &&
                  ((p.domain ?? []) as string[]).some((d) => wantDomains.includes(d)),
              );
            }
            if (candidates.length === 0) {
              candidates = scoreFor(
                (p) => ((p.domain ?? []) as string[]).some((d) => wantDomains.includes(d)),
              );
            }
            if (candidates.length === 0) {
              candidates = scoreFor(() => true);
            }

            const best = candidates[0]?.p;
            if (best) {
              used.add(best.user_id);
              const prof = profById.get(best.user_id) as any;
              return {
                ...r,
                assignee: {
                  user_id: best.user_id,
                  name: prof?.full_name || `${best.role_level || "Vetted"} ${r.role || "designer"}`,
                  avatar_url: prof?.avatar_url ?? null,
                  role_level: best.role_level,
                  vetting_status: best.vetting_status,
                  availability: best.availability,
                  is_agency: false,
                },
              };
            }
            return r;
          });
        }
      } catch (err) {
        console.error("[talent-curate-team] assignee enrichment failed", err);
      }
    }

    return new Response(JSON.stringify(parsed ?? { error: "no_plan" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

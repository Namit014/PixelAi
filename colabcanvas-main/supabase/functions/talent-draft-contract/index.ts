import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are an India-based legal contract drafter for Cohyve Tech Private Limited (operating the brand "Colab"). Generate a clear, plain-English Statement of Work + Services Agreement in markdown. The contract is between:

- COHYVE TECH PRIVATE LIMITED ("Colab", "Service Provider"), a company incorporated under the Companies Act, 2013, having its registered office in India.
- The CLIENT named in the proposal.

Use these sections:

# Statement of Work & Services Agreement

## 1. Parties
(Cohyve Tech Pvt Ltd as service provider; the named client.)

## 2. Engagement & Project Scope
## 3. Deliverables
## 4. Timeline & Milestones
## 5. Fees & Payment Terms
(Reference the agreed total in INR/USD; payment is held in Colab's escrow until milestone acceptance.)
## 6. Revisions Policy
## 7. Intellectual Property
(All final approved deliverables vest with the Client upon full payment. Colab retains rights to use anonymized process artifacts in portfolio.)
## 8. Confidentiality
## 9. Cancellation & Refunds
## 10. Limitation of Liability
## 11. Governing Law & Jurisdiction
(Laws of India; courts at Mumbai, Maharashtra have exclusive jurisdiction.)
## 12. Acceptance & Signatures

Be concise but complete. Use bullet lists where appropriate. Reference the actual team, deliverables, timeline, and total cost provided. Do NOT include placeholder signature blocks — those are added by the renderer.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { project, scope_md, client_name } = body;
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const userPrompt = `Project: ${project.title || 'Untitled'}
Client: ${client_name || 'Client'}
Scope of work:
${scope_md || 'See deliverables below.'}

Team: ${JSON.stringify(project.team_composition?.roles ?? [])}
Timeline: ${project.timeline?.total_weeks ?? '—'} weeks, phases: ${JSON.stringify(project.timeline?.phases ?? [])}
Total: ${project.pricing?.currency || 'INR'} ${project.pricing?.total ?? 0}
Deliverables: ${(project.extracted?.deliverables ?? []).join(', ')}
Audience: ${project.extracted?.audience || '—'}
Goals: ${(project.extracted?.goals ?? []).join(', ')}

Draft the SOW + Services Agreement.`;

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      throw new Error(`AI gateway error ${resp.status}`);
    }

    const data = await resp.json();
    const contract_md = data?.choices?.[0]?.message?.content ?? '';
    const contract_meta = {
      provider: "Cohyve Tech Private Limited",
      brand: "Colab",
      client_name: client_name || null,
      project_title: project.title || null,
      generated_at: new Date().toISOString(),
      currency: project.pricing?.currency || 'INR',
      total: project.pricing?.total ?? 0,
      governing_law: "India",
      jurisdiction: "Mumbai, Maharashtra",
    };
    return new Response(JSON.stringify({ contract_md, contract_meta }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("talent-draft-contract error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

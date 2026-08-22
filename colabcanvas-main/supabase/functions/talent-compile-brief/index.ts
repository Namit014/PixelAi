import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are a Creative Director compiling a final creative brief for the assigned freelancer team. Output MUST be markdown structured as:

# Creative Brief — {project_title}

## 1. Executive Summary
## 2. Creative Direction
## 3. Audience & Tone
## 4. References & Inspiration
## 5. Constraints & Requirements
## 6. Success Metrics
## 7. Deliverable Specs
## 8. Milestones & Timeline
## 9. Stakeholder Notes

Make it actionable, opinionated, and clear. Reference the attached materials specifically.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { project, conversation } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Compile final creative brief.

Project: ${project.title}
Extracted: ${JSON.stringify(project.extracted ?? {})}
Scope:
${project.scope_md || '—'}

Team: ${JSON.stringify(project.team_composition?.roles ?? [])}
Timeline: ${JSON.stringify(project.timeline ?? {})}
References: ${JSON.stringify(project.reference_attachments ?? [])}

Recent conversation highlights:
${(conversation ?? []).slice(-10).map((m: any) => `${m.role}: ${m.content}`).join('\n')}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "compiled_brief",
            parameters: {
              type: "object",
              properties: {
                brief_md: { type: "string", description: "Full markdown brief" },
                brief_json: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    direction: { type: "string" },
                    audience: { type: "string" },
                    tone: { type: "string" },
                    references: { type: "array", items: { type: "string" } },
                    constraints: { type: "array", items: { type: "string" } },
                    success_metrics: { type: "array", items: { type: "string" } },
                    deliverable_specs: { type: "array", items: { type: "object", properties: { name: { type: "string" }, spec: { type: "string" } } } },
                    milestones: { type: "array", items: { type: "object", properties: { name: { type: "string" }, due_week: { type: "number" } } } },
                  },
                },
              },
              required: ["brief_md", "brief_json"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "compiled_brief" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) throw new Error(`AI gateway ${resp.status}`);

    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { brief_md: '', brief_json: {} };
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

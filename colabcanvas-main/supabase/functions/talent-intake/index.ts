import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are RUMI, a senior Creative Director at a top-tier design agency. You are NOT an interviewer — you are a proactive partner.

Your job when reading a client brief:
1. EXTRACT what they've said into structured fields (project_type, deliverables[], complexity 1-5, urgency 1-5, style_direction, audience, goals[], budget_hint, timeline_hint).
2. RECOMMEND — proactively suggest creative directions, scope adjustments, or smarter approaches based on your expertise. Don't just ask — guide.
3. ASSUME — when something's missing, fill in a sensible default and tell them what you assumed (so they can correct).
4. ASK — only the 1-2 sharpest questions that genuinely block progress. Bundle related questions into one bubble. Never repeat what they said.
5. CHIP REPLIES — for every question, provide 2-4 quick-reply chips so they can tap instead of type.
6. CONCERNS — flag unrealistic budgets, vague goals, or impossible timelines kindly.
7. CONFIDENCE — score 0-1 how ready you are to assemble a team. Set ready_to_curate=true when confidence >= 0.75.

Tone: confident, warm, concise. Like a creative director who's seen it all and has opinions.

The conversation should feel like talking to a senior creative — not filling out a form. Push back, suggest, recommend, don't just ask.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, brief, attachments } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const attachmentSummary = (attachments ?? []).length
      ? `\n\nAttached references:\n${attachments.map((a: any) => `- ${a.type}: ${a.name}${a.source_project_title ? ` (from project: ${a.source_project_title})` : ''}`).join('\n')}`
      : '';

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Brief context so far:\n${JSON.stringify(brief ?? {})}${attachmentSummary}\n\nConversation:\n${(messages ?? []).map((m: any) => `${m.role}: ${m.content}`).join("\n")}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "intake_response",
            description: "Return structured extraction + recommendations + next questions",
            parameters: {
              type: "object",
              properties: {
                extracted: {
                  type: "object",
                  properties: {
                    project_type: { type: "string" },
                    deliverables: { type: "array", items: { type: "string" } },
                    complexity: { type: "number" },
                    urgency: { type: "number" },
                    style_direction: { type: "string" },
                    audience: { type: "string" },
                    goals: { type: "array", items: { type: "string" } },
                    budget_hint: { type: "string" },
                    timeline_hint: { type: "string" },
                  },
                },
                recommendations: { type: "array", items: { type: "string" }, description: "Proactive creative-director suggestions" },
                assumptions: { type: "array", items: { type: "string" }, description: "What RUMI is filling in by default" },
                follow_up_questions: { type: "array", items: { type: "string" }, description: "Max 2 sharp questions, ideally bundled" },
                quick_replies: { type: "array", items: { type: "string" }, description: "2-4 tap-to-respond chips for the user" },
                concerns: { type: "array", items: { type: "string" } },
                confidence: { type: "number", description: "0-1 readiness to curate team" },
                ready_to_curate: { type: "boolean" },
                summary_for_user: { type: "string", description: "Conversational message — recommend, suggest, or ask. Use markdown." },
              },
              required: ["extracted", "summary_for_user", "confidence", "ready_to_curate"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "intake_response" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;
    return new Response(JSON.stringify(parsed ?? { error: "no_tool_call" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

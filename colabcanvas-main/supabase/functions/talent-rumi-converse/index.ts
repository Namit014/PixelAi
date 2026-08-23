// deploy: v1
// RUMI conversational endpoint — always returns a real reply.
// Used by:
//   - "Ask RUMI" composer (mode: "answer")
//   - Solo auto-takeover when no peers are on the call (mode: "fill" / "opener")
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM = `You are RUMI — an AI Creative Director on a live working call.
You speak like a calm, senior human collaborator. Warm, curious, decisive.

Hard rules:
- Reply in 1–3 short sentences. Never monologue. Never bullet-list.
- Talk naturally — contractions, light personality. Never say "as an AI".
- Take initiative: ask one tight question, suggest one concrete next step,
  or summarise where we are. Pick whichever moves the project forward.
- When no one else is on the call, keep the client engaged: walk through
  the brief, surface a tradeoff, propose what the team should tackle first.
- When asked a direct question, answer it concretely using the project
  context (brief, team, timeline, budget). Make decisions when reasonable.
- Never apologise. Never restate the user's question. Never pad.
- Output plain text only. No markdown, no JSON, no preamble.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      meeting_id,
      project_id,
      user_question,
      transcript_chunk,
      recent_notes,
      mode = "answer", // "answer" | "opener" | "fill"
    } = await req.json();

    if (!meeting_id && !project_id) {
      return json({ error: "meeting_id or project_id required" }, 400);
    }

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

    let resolvedProjectId = project_id as string | undefined;
    if (!resolvedProjectId && meeting_id) {
      const { data: meeting } = await service
        .from("talent_meetings")
        .select("project_id")
        .eq("id", meeting_id)
        .maybeSingle();
      resolvedProjectId = meeting?.project_id;
    }
    if (!resolvedProjectId) return json({ error: "Meeting not found" }, 404);

    const { data: ok } = await service.rpc("is_talent_project_participant", {
      _project_id: resolvedProjectId,
      _user_id: user.id,
    });
    if (!ok) return json({ error: "Forbidden" }, 403);

    const { data: project } = await service
      .from("talent_projects")
      .select("title, brief, extracted, team_composition, timeline, pricing")
      .eq("id", resolvedProjectId)
      .maybeSingle();

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY not configured" }, 500);

    const projectCtx = `PROJECT: ${project?.title || "Untitled"}
BRIEF: ${JSON.stringify(project?.brief ?? {}).slice(0, 1200)}
EXTRACTED: ${JSON.stringify(project?.extracted ?? {}).slice(0, 1200)}
TEAM: ${JSON.stringify(project?.team_composition ?? {}).slice(0, 600)}
TIMELINE: ${JSON.stringify(project?.timeline ?? {}).slice(0, 500)}
BUDGET: ${JSON.stringify(project?.pricing ?? {}).slice(0, 300)}`;

    let userMsg = "";
    if (mode === "opener") {
      userMsg = `${projectCtx}

The client just joined the call but the team isn't on yet. Greet them warmly,
acknowledge that the team is still joining, and propose how you can put the
wait to good use — for example, walking through the brief, sanity-checking
priorities, or pre-aligning on style references. End with one tight question.`;
    } else if (mode === "fill") {
      userMsg = `${projectCtx}

You've been alone on the call with the client for a little while. Recent
beats so far:
${(recent_notes || []).slice(-4).map((n: string, i: number) => `${i + 1}. ${n}`).join("\n") || "(none)"}

Latest transcript snippet:
${transcript_chunk || "(quiet)"}

Move the conversation forward with one short, useful turn — a fresh question,
a quick recap, a tradeoff to think about, or a concrete next step. Keep it
human and varied, never repeat your last beat.`;
    } else {
      userMsg = `${projectCtx}

Recent transcript (last ~30s):
${transcript_chunk || "(no transcript yet)"}

The participant just asked: "${user_question || "(no question)"}"

Answer concretely. Make a decision if reasonable. One short turn.`;
    }

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        temperature: 0.85,
        max_tokens: 220,
      }),
    });

    if (resp.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[talent-rumi-converse] AI error", resp.status, t);
      return json({ error: "AI gateway error" }, 502);
    }

    const data = await resp.json();
    const reply = (data?.choices?.[0]?.message?.content ?? "").trim();

    // Guarantee a non-empty answer for the user.
    const fallback =
      mode === "opener"
        ? "Hey — looks like the team is still joining. While we wait, want me to walk you through the brief and lock in priorities?"
        : mode === "fill"
        ? "Tell me — which deliverable feels most uncertain to you right now?"
        : "Let's lock that in. What's the single outcome you'd call a win for this round?";

    return json({ reply: reply || fallback });
  } catch (e) {
    console.error("[talent-rumi-converse]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

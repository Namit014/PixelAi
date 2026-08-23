// deploy: v2
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM = `You are RUMi, the AI Creative Director silently observing a video call between a client, their producer, and assigned designers.
You quietly monitor the conversation and surface short, useful, **proactive** notes only when truly helpful — never chat for the sake of chatting.

Your output rules:
- Keep notes under 22 words. One actionable insight at a time.
- Reference the brief, the team plan, the timeline, or the budget when flagging conflicts.
- If asked a direct question, answer crisply with concrete recommendations.
- If nothing meaningful to add, return an empty string. Do not pad.

Tone: senior, calm, observational. Never apologise. Never restate what was just said.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { meeting_id, transcript_chunk, user_question } = await req.json();
    if (!meeting_id) return json({ error: "meeting_id is required" }, 400);

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

    const { data: meeting } = await service.from("talent_meetings")
      .select("id, project_id").eq("id", meeting_id).maybeSingle();
    if (!meeting) return json({ error: "Meeting not found" }, 404);

    const { data: ok } = await service.rpc("is_talent_project_participant", {
      _project_id: meeting.project_id, _user_id: user.id,
    });
    if (!ok) return json({ error: "Forbidden" }, 403);

    const { data: project } = await service
      .from("talent_projects")
      .select("title, brief, team_composition, timeline, pricing")
      .eq("id", meeting.project_id).maybeSingle();

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY not configured" }, 500);

    const projectCtx = `PROJECT: ${project?.title || "Untitled"}
BRIEF: ${JSON.stringify(project?.brief ?? {}).slice(0, 1500)}
TEAM: ${JSON.stringify(project?.team_composition ?? {}).slice(0, 800)}
TIMELINE: ${JSON.stringify(project?.timeline ?? {}).slice(0, 600)}
BUDGET: ${JSON.stringify(project?.pricing ?? {}).slice(0, 400)}`;

    const userMsg = user_question
      ? `${projectCtx}\n\nLATEST TRANSCRIPT (last ~30s):\n${transcript_chunk || "(no transcript yet)"}\n\nQUESTION FROM PARTICIPANT: ${user_question}\n\nAnswer concisely.`
      : `${projectCtx}\n\nLATEST TRANSCRIPT (last ~30s):\n${transcript_chunk || ""}\n\nReturn a single short note ONLY if you spot a conflict, risk, missing detail, or commitment worth flagging. Otherwise return an empty string.`;

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
      }),
    });
    if (resp.status === 429) return json({ error: "Rate limited. Try again in a moment." }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[talent-rumi-meeting-assist] AI error", resp.status, t);
      return json({ error: "AI gateway error" }, 502);
    }
    const data = await resp.json();
    const note = (data?.choices?.[0]?.message?.content ?? "").trim();
    return json({ note });
  } catch (e) {
    console.error("[talent-rumi-meeting-assist]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

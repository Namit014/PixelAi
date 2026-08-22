// deploy: v2
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { room_code } = await req.json();
    if (!room_code) return json({ error: "room_code is required" }, 400);

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
      .select("id, project_id").eq("room_code", room_code).maybeSingle();
    if (!meeting) return json({ error: "Meeting not found" }, 404);

    const { data: ok } = await service.rpc("is_talent_project_participant", {
      _project_id: meeting.project_id, _user_id: user.id,
    });
    if (!ok) return json({ error: "Forbidden" }, 403);

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) return json({ error: "ELEVENLABS_API_KEY not configured" }, 500);

    const resp = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[talent-meeting-token] scribe token error", resp.status, t);
      return json({ error: "Could not issue transcription token" }, 502);
    }
    const data = await resp.json();
    return json({ token: data.token, meeting_id: meeting.id });
  } catch (e) {
    console.error("[talent-meeting-token]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

// deploy: v2
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const generateRoomCode = () => {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 8; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { project_id, title, scheduled_for, duration_min } = await req.json();
    if (!project_id) return json({ error: "project_id is required" }, 400);

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

    // Authorize: project participant only
    const { data: ok } = await service.rpc("is_talent_project_participant", {
      _project_id: project_id, _user_id: user.id,
    });
    if (!ok) return json({ error: "Forbidden" }, 403);

    const code = generateRoomCode();
    const isInstant = !scheduled_for || new Date(scheduled_for) <= new Date(Date.now() + 30_000);
    const status = isInstant ? "live" : "scheduled";

    const { data: meeting, error: mErr } = await service.from("talent_meetings").insert({
      project_id,
      host_user_id: user.id,
      title: (title && String(title).trim()) || "Project call",
      scheduled_for: scheduled_for ?? null,
      duration_min: Math.min(Math.max(Number(duration_min) || 30, 5), 240),
      room_code: code,
      status,
      started_at: isInstant ? new Date().toISOString() : null,
    }).select("id, room_code, scheduled_for, status, title").single();
    if (mErr || !meeting) return json({ error: mErr?.message || "Could not create meeting" }, 400);

    // Build canonical join URL (origin-aware, app domain fallback).
    const origin = req.headers.get("origin") || "https://app.letscolab.tech";
    const join_url = `${origin}/talent/projects/${project_id}?room=${encodeURIComponent(code)}`;

    // Post a chat card
    await service.from("talent_messages").insert({
      project_id,
      user_id: user.id,
      role: "system",
      kind: "meeting",
      content: isInstant ? `Live call started — join with code ${code}` : `Call scheduled for ${new Date(scheduled_for).toLocaleString()}`,
      metadata: {
        meeting_id: meeting.id,
        room_code: code,
        scheduled_for: meeting.scheduled_for,
        title: meeting.title,
        duration_min: Math.min(Math.max(Number(duration_min) || 30, 5), 240),
        join_url,
      },
    });

    return json({ success: true, meeting: { ...meeting, join_url } });
  } catch (e) {
    console.error("[talent-create-meeting]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

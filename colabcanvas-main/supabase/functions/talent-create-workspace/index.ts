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
    const { project_id } = await req.json();
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

    const { data: tp, error: tpErr } = await service
      .from("talent_projects")
      .select("id, user_id, title, assigned_freelancer_id, freelancer_visible, linked_project_id")
      .eq("id", project_id)
      .single();
    if (tpErr || !tp) return json({ error: "Talent project not found" }, 404);
    if (tp.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    if (tp.linked_project_id) {
      return json({ success: true, project_id: tp.linked_project_id, replayed: true });
    }

    // Create the canvas project
    const title = `${tp.title || "Untitled project"} — Workspace`;
    const { data: created, error: pErr } = await service
      .from("projects")
      .insert({
        user_id: user.id,
        title,
        description: "Auto-created from your talent engagement.",
        canvas_data: {},
      })
      .select("id")
      .single();
    if (pErr || !created) return json({ error: pErr?.message || "Could not create project" }, 400);

    // Grant the assigned freelancer edit access (if any)
    if (tp.assigned_freelancer_id && tp.freelancer_visible) {
      await service.from("project_collaborators").upsert({
        project_id: created.id,
        user_id: tp.assigned_freelancer_id,
        permission: "edit",
      }, { onConflict: "project_id,user_id" });
    }

    // Persist link on talent project
    await service.from("talent_projects")
      .update({ linked_project_id: created.id })
      .eq("id", project_id);

    // Drop a system message in chat
    await service.from("talent_messages").insert({
      project_id,
      user_id: user.id,
      role: "system",
      kind: "system_link",
      content: "Your shared design workspace is ready.",
      metadata: { project_id: created.id, kind: "canvas" },
    });

    return json({ success: true, project_id: created.id });
  } catch (e) {
    console.error("[talent-create-workspace]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

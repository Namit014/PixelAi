// Admin-only: change a freelancer's vetting status (and optional scores).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const VALID = new Set(["pending", "in_review", "approved", "rejected"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
    const token = authHeader.slice("Bearer ".length);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) return json(500, { error: "Server misconfigured" });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: "Invalid token" });

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json(403, { error: "Forbidden" });

    const body = await req.json();
    const { user_id, vetting_status, quality_score, communication_score, note } = body;
    if (!user_id || !vetting_status || !VALID.has(vetting_status)) {
      return json(400, { error: "Invalid input" });
    }

    const update: Record<string, any> = { vetting_status };
    if (typeof quality_score === "number") update.quality_score = quality_score;
    if (typeof communication_score === "number") update.communication_score = communication_score;
    if (note) {
      // Append admin note to evaluation_submission JSON
      const { data: cur } = await admin
        .from("freelancer_profiles")
        .select("evaluation_submission")
        .eq("user_id", user_id)
        .single();
      update.evaluation_submission = {
        ...(cur?.evaluation_submission ?? {}),
        admin_notes: [
          ...((cur?.evaluation_submission as any)?.admin_notes ?? []),
          { at: new Date().toISOString(), by: userData.user.email, note, status: vetting_status },
        ],
      };
    }

    const { error: upErr } = await admin
      .from("freelancer_profiles")
      .update(update)
      .eq("user_id", user_id);
    if (upErr) return json(500, { error: upErr.message });

    // If approved, ensure user_intent reflects freelancer
    if (vetting_status === "approved") {
      await admin
        .from("user_intent")
        .upsert(
          { user_id, intent: "freelancer", completed_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
    }

    return json(200, { ok: true });
  } catch (e) {
    console.error("admin-set-freelancer-status error", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown" });
  }
});

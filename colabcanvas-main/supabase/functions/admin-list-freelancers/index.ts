// Admin-only: list all freelancer applications with profile info.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

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

    const { data: freelancers, error: fErr } = await admin
      .from("freelancer_profiles")
      .select("*")
      .order("updated_at", { ascending: false });
    if (fErr) return json(500, { error: fErr.message });

    const ids = (freelancers ?? []).map((f: any) => f.user_id);
    let profilesById: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await admin
        .from("profiles")
        .select("id, email, full_name, created_at")
        .in("id", ids);
      profilesById = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }

    const rows = (freelancers ?? []).map((f: any) => ({
      ...f,
      profile: profilesById[f.user_id] ?? null,
    }));

    return json(200, { freelancers: rows });
  } catch (e) {
    console.error("admin-list-freelancers error", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown" });
  }
});

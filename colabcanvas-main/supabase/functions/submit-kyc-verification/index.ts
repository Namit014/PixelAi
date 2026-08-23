// AI-assisted KYC: OCR ID + face-match selfie via Lovable AI Gemini multimodal.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getDataUrl(service: any, path: string): Promise<string> {
  const { data, error } = await service.storage.from("talent-kyc").download(path);
  if (error || !data) throw new Error(`Could not read ${path}: ${error?.message}`);
  const buf = new Uint8Array(await data.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const mime = (data as any).type || "image/jpeg";
  return `data:${mime};base64,${btoa(bin)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
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

    const body = await req.json();
    const { id_type, id_country, id_front_path, id_back_path, selfie_path } = body || {};
    if (!id_type || !id_country || !id_front_path || !selfie_path) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (!["passport", "driver_license", "national_id"].includes(id_type)) {
      return json({ error: "Invalid id_type" }, 400);
    }
    // All paths must be under the user's folder
    for (const p of [id_front_path, id_back_path, selfie_path].filter(Boolean)) {
      if (!String(p).startsWith(`${user.id}/`)) return json({ error: "Forbidden path" }, 403);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    // Pull images and convert to data URLs (no network egress required by AI gateway)
    const [frontUrl, selfieUrl] = await Promise.all([
      getDataUrl(service, id_front_path),
      getDataUrl(service, selfie_path),
    ]);

    // Insert pending row first so the user sees a status immediately
    await service.from("talent_kyc").upsert({
      user_id: user.id,
      status: "submitted",
      id_type,
      id_country,
      id_front_path,
      id_back_path: id_back_path || null,
      selfie_path,
      submitted_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    const SYSTEM = `You are a KYC verification assistant. Compare a government-issued ID photo to a live selfie.
Return ONLY via the tool call. Be conservative: only confirm a match when both face and document look authentic.`;

    const userMsg = [
      { type: "text", text: `Verify this ID (type: ${id_type}, country: ${id_country}) against the selfie.` },
      { type: "image_url", image_url: { url: frontUrl } },
      { type: "image_url", image_url: { url: selfieUrl } },
    ];

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        tools: [{
          type: "function",
          function: {
            name: "kyc_decision",
            parameters: {
              type: "object",
              properties: {
                full_name_on_id: { type: "string" },
                id_number_last4: { type: "string" },
                face_match: { type: "boolean" },
                face_match_confidence: { type: "number" },
                document_authentic: { type: "boolean" },
                tamper_flags: { type: "array", items: { type: "string" } },
                overall_confidence: { type: "number" },
                reason: { type: "string" },
              },
              required: ["face_match", "document_authentic", "overall_confidence", "reason"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "kyc_decision" } },
      }),
    });

    if (resp.status === 429) return json({ error: "Rate limited, try again." }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!resp.ok) return json({ error: "AI error", detail: await resp.text() }, 502);

    const ai = await resp.json();
    const args = ai?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const decision = args ? JSON.parse(args) : null;
    if (!decision) return json({ error: "Could not parse AI decision" }, 500);

    const passed =
      decision.face_match === true &&
      decision.document_authentic === true &&
      Number(decision.overall_confidence ?? 0) >= 0.85;

    const newStatus = passed ? "verified" : "submitted";

    await service.from("talent_kyc").update({
      status: newStatus,
      ai_confidence: decision.overall_confidence,
      ai_reasons: decision,
      id_number_last4: decision.id_number_last4 ? String(decision.id_number_last4).slice(-4) : null,
      reviewed_at: passed ? new Date().toISOString() : null,
    }).eq("user_id", user.id);

    if (passed) {
      await service.from("credits")
        .update({ kyc_status: "verified" })
        .eq("user_id", user.id);
    }

    return json({ status: newStatus, decision });
  } catch (e) {
    console.error("[submit-kyc-verification]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

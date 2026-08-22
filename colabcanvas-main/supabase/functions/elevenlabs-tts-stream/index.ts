import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { text, voiceId, modelId } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'text'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const chosenVoiceId = (typeof voiceId === "string" && voiceId) ? voiceId : "EXAVITQu4vr4xnSDxMaL";
    const chosenModelId = (typeof modelId === "string" && modelId) ? modelId : "eleven_turbo_v2_5";

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${chosenVoiceId}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: chosenModelId,
        }),
      },
    );

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => "");
      console.error("[elevenlabs-tts-stream] Upstream error", upstream.status, errorText);
      // Return 200 with a fallback signal so the client UI never crashes.
      // 401 = invalid/blocked key (e.g. free-tier abuse lock); 429 = rate limited.
      const reason =
        upstream.status === 401
          ? "tts_unavailable_auth"
          : upstream.status === 429
            ? "tts_rate_limited"
            : "tts_upstream_error";
      return new Response(
        JSON.stringify({ ok: false, fallback: true, reason, upstream_status: upstream.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("[elevenlabs-tts-stream] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

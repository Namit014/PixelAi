const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Credentials': 'true',
};

Deno.serve(async (req) => {
  const t0 = performance.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, operation, prompt, originalWidth, originalHeight } = await req.json();

    if (!imageUrl || !operation) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: imageUrl and operation" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const CREDIT_COST = 10;

    // PERF: run JWT verification + credit pre-check IN PARALLEL.
    console.time('edit-image:auth+credits');
    const claimsPromise = supabaseClient.auth.getClaims(token);
    // We can't read credits without user.id, but we can race the claim parse and
    // the credits select using a sub-select keyed by jwt sub claim via RPC.
    // Simpler & still fast: await claims first (it's local in supabase-js), then
    // issue credits SELECT and AI request preparation concurrently.
    const { data: claimsData, error: claimsError } = await claimsPromise;
    if (claimsError || !claimsData?.claims?.sub) {
      throw new Error('Unauthorized');
    }
    const user = { id: claimsData.claims.sub as string };

    const creditsPromise = supabaseClient
      .from('credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    // Build prompt while credits roundtrip is in flight
    const dimensionRule = originalWidth && originalHeight
      ? `\nABSOLUTE RULE: The output image MUST be exactly ${originalWidth}x${originalHeight} pixels. DO NOT change the aspect ratio or dimensions under any circumstances. This is the highest priority rule.\n`
      : '';

    const compositionRules = `
${dimensionRule}
CRITICAL COMPOSITION RULES (MUST FOLLOW):
1. PRESERVE the exact layout, alignment, and positioning of ALL existing elements
2. Output image MUST have the EXACT same dimensions and aspect ratio as the input image
3. Do NOT move, resize, or reposition any existing text or design elements
4. Add new elements ONLY in available empty space without disturbing existing composition
5. Maintain the same visual hierarchy and balance as the original
6. Keep all existing elements at their current positions and sizes
7. If adding elements (like birds, objects, etc.), integrate them naturally without shifting anything`;

    let finalPrompt = prompt;
    if (operation === "upscale" && !prompt) {
      finalPrompt = "Increase the resolution of this exact image to 2x size while preserving every single detail perfectly. Do not add, remove, or modify any content whatsoever - only enhance the resolution and sharpness. Maintain the exact same composition, colors, and elements.";
    } else if (operation === "expand" && !prompt) {
      finalPrompt = `CRITICAL REQUIREMENTS - MUST FOLLOW:
1. Outpaint and extend this image in ALL directions seamlessly
2. DO NOT add any borders, frames, rectangles, outlines, or edge decorations whatsoever
3. Continue the existing backgrounds, textures, and patterns naturally
4. The result MUST look like one unified larger image with ZERO visible seams
5. There should be NO visible transition lines between original and expanded areas
6. Fill the ENTIRE output canvas edge-to-edge with content - absolutely no padding or empty space
7. Match the exact style, color palette, and lighting of the original image`;
    } else {
      finalPrompt = (prompt || '') + compositionRules;
    }

    const { data: creditData, error: creditError } = await creditsPromise;
    console.timeEnd('edit-image:auth+credits');

    if (creditError) throw new Error('Failed to fetch credits');
    if (!creditData || creditData.balance < CREDIT_COST) {
      return new Response(
        JSON.stringify({
          error: 'insufficient_credits',
          message: 'Insufficient credits. Please upgrade your plan to continue.',
          required: CREDIT_COST,
          available: creditData?.balance || 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
      );
    }

    // Model & timeout strategy
    const isHeavyOp = operation === "expand" || operation === "upscale" || operation === "perspective";
    const modelToUse = isHeavyOp
      ? "google/gemini-3-pro-image-preview"
      : "google/gemini-3.1-flash-image-preview";
    // PERF: tighter bound on flash; user perceives faster failure & retry.
    const HARD_TIMEOUT_MS = isHeavyOp ? 60_000 : 18_000;

    const callGateway = async (): Promise<Response> => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), HARD_TIMEOUT_MS);
      try {
        return await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: finalPrompt },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              },
            ],
            modalities: ["image", "text"],
          }),
        });
      } finally {
        clearTimeout(timer);
      }
    };

    console.time('edit-image:ai-gateway');
    let response: Response;
    try {
      response = await callGateway();
      // Retry only for HEAVY ops to avoid doubling user-perceived latency on fast edits.
      if (isHeavyOp && !response.ok && response.status >= 500 && response.status < 600) {
        console.warn("AI gateway transient error, retrying once:", response.status);
        try { await response.text(); } catch { /* drain */ }
        response = await callGateway();
      }
    } catch (err: any) {
      const aborted = err?.name === "AbortError";
      console.error("AI gateway fetch failed:", aborted ? "timeout" : err);
      return new Response(
        JSON.stringify({
          error: aborted ? "timeout" : "network_error",
          message: aborted
            ? `Image edit timed out after ${HARD_TIMEOUT_MS / 1000}s. Please try again.`
            : "Network error contacting AI gateway. Please try again.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 408 }
      );
    }
    console.timeEnd('edit-image:ai-gateway');

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    const data = await response.json();
    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!editedImageUrl) {
      throw new Error("No image returned from AI");
    }

    // Deduct credits AFTER success (kept post-AI to avoid charging on failure).
    // This is fire-and-forget to the client perception: we await but it's a single fast RPC.
    const { data: deductSuccess, error: deductError } = await supabaseClient
      .rpc('deduct_credits', { _user_id: user.id, _amount: CREDIT_COST });

    if (deductError || !deductSuccess) {
      console.error('Error deducting credits:', deductError);
      throw new Error('Insufficient credits');
    }

    console.log(`edit-image:total ${(performance.now() - t0).toFixed(0)}ms model=${modelToUse}`);

    return new Response(
      JSON.stringify({ imageUrl: editedImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in edit-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_ANON_KEY") ?? "", 
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("Auth error: Invalid token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const userId = claimsData.claims.sub as string;

    // 2. Parse request
    const { image, mimeType, width, height } = await req.json();

    if (!image || !mimeType) {
      return new Response(JSON.stringify({ error: "Missing image or mimeType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing 4K upscale request for user:", userId);

    // 3. Check and deduct 10 credits
    const { data: creditData, error: creditError } = await supabaseClient
      .from("credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (creditError || !creditData || creditData.balance < 10) {
      return new Response(JSON.stringify({ error: "insufficient_credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseClient
      .from("credits")
      .update({ balance: creditData.balance - 10 })
      .eq("user_id", userId);

    // 4. Call Lovable AI Gateway for upscaling
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const imageDataUrl = `data:${mimeType};base64,${image}`;
    const prompt = `UPSCALE AND ENHANCE this image to 4K resolution with professional quality enhancement:

ENHANCEMENT REQUIREMENTS:
1. SHARPNESS: Significantly sharpen all details - edges, textures, fine lines
2. NOISE REDUCTION: Remove any grain, compression artifacts, or visual noise
3. TEXTURE ENHANCEMENT: Enhance surface textures and materials to look more realistic
4. EDGE REFINEMENT: Create crisp, clean edges without halos or artifacts
5. COLOR PRESERVATION: Maintain exact original colors, saturation, and white balance
6. DETAIL RECOVERY: Recover and enhance fine details that may be blurry
7. ARTIFACT REMOVAL: Remove any JPEG compression blocks, banding, or ringing

OUTPUT SPECIFICATIONS:
- Target resolution: 4K (3840x2160 or equivalent aspect ratio)
- Quality: Maximum sharpness and clarity
- Content: 100% identical composition, subjects, and layout

CRITICAL: The output must look DRAMATICALLY sharper and more detailed than the input, not just larger. Every pixel should be enhanced.`;

    console.log(`Image dimensions: ${width}x${height}, upscaling to 4K with enhanced quality...`);

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      
      // Refund credits on failure
      await supabaseClient
        .from("credits")
        .update({ balance: creditData.balance })
        .eq("user_id", userId);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI Gateway failed");
    }

    const data = await response.json();

    // 5. Extract upscaled image from response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data));
      // Refund credits
      await supabaseClient
        .from("credits")
        .update({ balance: creditData.balance })
        .eq("user_id", userId);
      throw new Error("Model did not return an image.");
    }

    // Extract base64 from data URL
    const base64Match = imageUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid image format returned");
    }

    console.log("Successfully upscaled and enhanced to 4K with pro model");

    // 6. Return base64 image
    return new Response(
      JSON.stringify({
        success: true,
        resolution: "4K",
        mimeType: "image/png",
        image: base64Match[1],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Upscale failed:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

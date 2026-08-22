import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: claimsData.claims.sub as string };

    const { imageUrl, maskUrl, regions, prompt, textContent, backgroundFillHint } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Image URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits for inpainting (10 credits)
    const { error: creditError } = await supabaseClient.rpc("deduct_credits", {
      _user_id: user.id,
      _amount: 10,
      _description: "AI content-aware fill / inpainting",
    });

    if (creditError) {
      console.error("Credit deduction failed:", creditError);
      return new Response(JSON.stringify({ error: "Insufficient credits. You need 10 credits." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Refund credits
      await supabaseClient.rpc("add_credits", { _user_id: user.id, _amount: 10 });
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build text list for prompt
    const textList = textContent?.length > 0 
      ? textContent.map((t: string) => `"${t}"`).join(', ')
      : '';

    console.log("[inpaint-image] Received maskUrl:", maskUrl ? "yes" : "no");
    console.log("[inpaint-image] Text content:", textList || "(none)");
    console.log("[inpaint-image] Background fill hint:", backgroundFillHint || "(none)");

    // Use the backgroundFillHint from AI analysis for precise background generation
    const fillDescription = backgroundFillHint || "natural background continuation";

    // EDIT prompt - ask to modify the specific image, not generate new
    // Key: Frame as "extend the background" not "remove elements"
    const inpaintPrompt = `Edit this image: Extend the natural background elements (${fillDescription}) to cover the entire image area.

The final image should show ONLY:
- The scenic background: ${fillDescription}
- Natural lighting and atmosphere

Do not include any text, typography, words, or human figures in the output.
Extend the background seamlessly to fill the entire frame.
Output a clean scenic background only.`;

    console.log("[inpaint-image] Using edit prompt with fill hint:", fillDescription);

    // Build message content - ONLY send original image
    // Gemini doesn't support true mask-based inpainting, so sending mask confuses it
    const messageContent: any[] = [
      { type: "text", text: inpaintPrompt },
      { type: "image_url", image_url: { url: imageUrl } },
    ];

    console.log("[inpaint-image] Sending single image with explicit removal instructions");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      // Refund credits on failure
      await supabaseClient.rpc("add_credits", { _user_id: user.id, _amount: 10 });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract the generated image from the response
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImage) {
      console.error("[inpaint-image] No image in response:", JSON.stringify(data).substring(0, 500));
      // Refund credits if no image generated
      await supabaseClient.rpc("add_credits", { _user_id: user.id, _amount: 10 });
      return new Response(JSON.stringify({ error: "Failed to generate inpainted image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[inpaint-image] ✅ Successfully generated inpainted image using", maskUrl ? "mask-based" : "text-only", "approach");

    return new Response(
      JSON.stringify({ 
        imageUrl: generatedImage,
        creditsUsed: 10,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in inpaint-image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

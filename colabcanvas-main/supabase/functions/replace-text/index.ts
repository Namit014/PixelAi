import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TextReplacement {
  id: string;
  originalText: string;
  newText: string;
  position?: { x: number; y: number };
  fontSize?: string;
  fontStyle?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

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

    const body = await req.json() as { 
      imageUrl: string; 
      replacements?: TextReplacement[];
      instruction?: string;
    };
    const { imageUrl, replacements, instruction } = body;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Image URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Support instruction-based editing (from canvas-ai-chat text edit route)
    if (instruction && (!replacements || replacements.length === 0)) {
      console.log("📝 Instruction-based text edit:", instruction.substring(0, 80));
      
      // Deduct credits
      const { error: creditError } = await supabaseClient.rpc("deduct_credits", {
        _user_id: user.id,
        _amount: 10,
      });
      if (creditError) {
        return new Response(JSON.stringify({ error: "Insufficient credits" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) {
        await supabaseClient.rpc("add_credits", { _user_id: user.id, _amount: 10 });
        return new Response(JSON.stringify({ error: "API key not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash-image",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Edit the text in this image: ${instruction}\n\nCRITICAL: Copy replacement text CHARACTER BY CHARACTER. Keep font, size, color, position identical. Only change what was requested.` },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        await supabaseClient.rpc("add_credits", { _user_id: user.id, _amount: 10 });
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const editedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!editedImage) {
        await supabaseClient.rpc("add_credits", { _user_id: user.id, _amount: 10 });
        return new Response(JSON.stringify({ error: "No image returned" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        editedImageUrl: editedImage,
        imageUrl: editedImage,
        creditsUsed: 10,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Original replacements-based flow
    if (!replacements || replacements.length === 0) {
      return new Response(JSON.stringify({ error: "Replacements or instruction required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to only replacements that changed
    const changedReplacements = replacements.filter(r => r.originalText !== r.newText);
    
    if (changedReplacements.length === 0) {
      return new Response(JSON.stringify({ 
        imageUrl: imageUrl,
        message: "No changes to apply" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits for text replacement
    const { error: creditError } = await supabaseClient.rpc("deduct_credits", {
      _user_id: user.id,
      _amount: 10,
      _description: "AI text replacement in image",
    });

    if (creditError) {
      console.error("Credit deduction failed:", creditError);
      return new Response(JSON.stringify({ error: "Insufficient credits. You need 10 credits." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      await supabaseClient.rpc("add_credits", { _user_id: user.id, _amount: 10 });
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build replacement instructions with exact spelling emphasis
    const replacementInstructions = changedReplacements.map(r => {
      let instruction = `- Replace "${r.originalText}" with EXACTLY "${r.newText}" (copy character-by-character)`;
      if (r.fontStyle) instruction += ` (keep ${r.fontStyle} font style)`;
      if (r.color) instruction += ` (keep ${r.color} color)`;
      if (r.bold) instruction += ` (keep bold)`;
      return instruction;
    }).join("\n");

    // Use Gemini image generation to replace text with strict spelling enforcement
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Edit this image by replacing text. 
CRITICAL SPELLING RULE: Copy the replacement text CHARACTER BY CHARACTER. Do NOT correct spelling, do NOT add or remove any letters. The new text must match EXACTLY.

Text replacements:
${replacementInstructions}

STRICT RULES:
1. EXACT SPELLING: The new text MUST match the replacement EXACTLY - same letters, same capitalization, same spacing
2. Font: Keep identical font family, weight, and size
3. Position: Keep same position and alignment
4. Style: Preserve colors, shadows, effects, perspective
5. Background: Do not modify anything except the text being replaced

Double-check that your output text matches the replacement text EXACTLY before generating.`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
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
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract the generated image
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImage) {
      console.error("No image in response:", JSON.stringify(data));
      await supabaseClient.rpc("add_credits", { _user_id: user.id, _amount: 10 });
      return new Response(JSON.stringify({ error: "Failed to generate edited image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Successfully replaced text in image");

    return new Response(
      JSON.stringify({ 
        imageUrl: generatedImage,
        creditsUsed: 10,
        replacementsApplied: changedReplacements.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in replace-text:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

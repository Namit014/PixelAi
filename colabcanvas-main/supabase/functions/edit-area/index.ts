import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';

const CREDIT_COST = 15; // Area editing costs 15 credits (more than full edit due to mask processing)

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !lovableApiKey) {
      console.error('CRITICAL: Missing required environment variables');
      throw new Error("Service temporarily unavailable");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT locally (no network call)
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      throw new Error("Invalid authentication token");
    }
    const user = { id: claimsData.claims.sub as string };

    const { imageUrl, maskDataUrl, prompt, artboardId, originalWidth, originalHeight } = await req.json();

    if (!imageUrl || !maskDataUrl || !prompt) {
      throw new Error("Missing required parameters: imageUrl, maskDataUrl, prompt");
    }

    console.log("Area edit request:", { 
      userId: user.id, 
      artboardId, 
      prompt: prompt.substring(0, 50) + "..." 
    });

    // Check and deduct credits
    const { data: creditData, error: creditError } = await supabase
      .from("credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (creditError) throw creditError;

    if (creditData.balance < CREDIT_COST) {
      return new Response(
        JSON.stringify({
          error: `Insufficient credits. Area editing costs ${CREDIT_COST} credits. Current balance: ${creditData.balance}`,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Deduct credits using RPC
    const { error: deductError } = await supabase.rpc("deduct_credits", {
      _user_id: user.id,
      _amount: CREDIT_COST,
      _description: "AI area edit",
    });

    if (deductError) {
      console.error("Error deducting credits:", deductError);
      throw new Error("Failed to deduct credits");
    }

    console.log(`Credits deducted: ${CREDIT_COST}, remaining: ${creditData.balance - CREDIT_COST}`);

    console.log("Brush stroke detection: Checking for isBrushStroke metadata in request");

    // Call Lovable AI with inpainting instructions
    const aiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
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
                  text: `${originalWidth && originalHeight ? `ABSOLUTE RULE: The output image MUST be exactly ${originalWidth}x${originalHeight} pixels. DO NOT change the aspect ratio or dimensions under any circumstances.\n` : ''}Edit ONLY the white areas in the mask image (brush stroke areas). Do not modify the black areas. Apply the following changes naturally and realistically: ${prompt}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
                {
                  type: "image_url",
                  image_url: {
                    url: maskDataUrl,
                  },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      // Refund credits on AI failure
      await supabase.rpc("add_credits", {
        _user_id: user.id,
        _amount: CREDIT_COST,
        _description: "Refund: AI area edit failed",
      });

      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const editedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!editedImageUrl) {
      // Refund credits if no image returned
      await supabase.rpc("add_credits", {
        _user_id: user.id,
        _amount: CREDIT_COST,
        _description: "Refund: No edited image returned",
      });

      throw new Error("No edited image returned from AI");
    }

    // Update artboard with new image if artboardId provided
    if (artboardId) {
      const { error: updateError } = await supabase
        .from("artboards")
        .update({
          image_url: editedImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", artboardId);

      if (updateError) {
        console.error("Error updating artboard:", updateError);
      } else {
        console.log("Artboard updated successfully:", artboardId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: editedImageUrl,
        creditsUsed: CREDIT_COST,
        remainingCredits: creditData.balance - CREDIT_COST,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({
        error: getSafeErrorMessage(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
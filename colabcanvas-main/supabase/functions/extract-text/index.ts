import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Image URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits for text extraction
    const { error: creditError } = await supabaseClient.rpc("deduct_credits", {
      _user_id: user.id,
      _amount: 5,
      _description: "Text extraction from image",
    });

    if (creditError) {
      console.error("Credit deduction failed:", creditError);
      return new Response(JSON.stringify({ error: "Insufficient credits. You need 5 credits." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      // Refund credits
      await supabaseClient.rpc("add_credits", { _user_id: user.id, _amount: 5 });
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare image content for Gemini Vision
    const imageContent: any = {
      type: "image_url",
      image_url: { url: imageUrl },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
              text: `TASK: Extract EVERY piece of text visible in this image - large headlines, small captions, tiny footnotes, watermarks, credits, fine print - EVERYTHING no matter how small.

For EACH text element provide:

1. text: Exact text content (preserve capitalization, spacing)
2. boundingBox: Position as PERCENTAGE of image (0-100 ONLY):
   - x: left edge percentage (0 = left edge, 50 = center, 100 = right edge)
   - y: top edge percentage (0 = top, 50 = middle, 100 = bottom)
   - width: width as percentage of image width
   - height: height as percentage of image height
   
   EXAMPLE: Text at center-top spanning half width:
   {"x": 25, "y": 5, "width": 50, "height": 3}
   
3. fontSizeRatio: Font size as percentage of image HEIGHT (not pixels!)
   - A headline 5% of image height = fontSizeRatio: 5
   - Small footer 1% of image height = fontSizeRatio: 1

4. fontFamily: serif/sans-serif/script/monospace
5. color: Hex code (#FFFFFF)
6. bold: true/false
7. italic: true/false
8. textAlign: left/center/right (based on visual alignment in image)

CRITICAL RULES:
- ALL boundingBox values MUST be 0-100 (percentages, NOT pixels)
- Include ALL text no matter how small (footers, credits, watermarks, fine print)
- fontSizeRatio is percentage of image height, NOT pixel size
- textAlign should reflect how the text appears visually aligned

Return ONLY valid JSON array:
[
  {
    "id": "text_1",
    "text": "Hello",
    "boundingBox": {"x": 5, "y": 10, "width": 30, "height": 4},
    "fontSizeRatio": 4,
    "fontFamily": "sans-serif",
    "color": "#FFFFFF",
    "bold": true,
    "italic": false,
    "textAlign": "center"
  }
]

Return [] if no text. No explanations.`,
              },
              imageContent,
            ],
          },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      // Refund credits on failure
      await supabaseClient.rpc("add_credits", { _user_id: user.id, _amount: 5 });
      
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
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON response
    let extractedTexts = [];
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      extractedTexts = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      extractedTexts = [];
    }

    console.log("Extracted texts:", extractedTexts);

    return new Response(
      JSON.stringify({ 
        texts: extractedTexts,
        creditsUsed: 5,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in extract-text:", error);
    const isTimeout = error instanceof DOMException && error.name === 'AbortError';
    return new Response(
      JSON.stringify({ error: isTimeout ? 'Text extraction timed out. Please try again.' : (error instanceof Error ? error.message : "Unknown error"), timeout: isTimeout }),
      { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

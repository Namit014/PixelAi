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

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Image URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI Analysis prompt - identify ALL layers in the image
    const analysisPrompt = `Analyze this image and identify ALL distinct visual layers for editing purposes.

You MUST return a valid JSON object with this EXACT structure (no markdown, no code blocks, just pure JSON):
{
  "layers": [
    {
      "type": "background",
      "name": "descriptive name for this layer",
      "description": "what this layer contains",
      "boundingBox": { "x": 0, "y": 0, "width": 100, "height": 100 },
      "zIndex": 0,
      "extractionHint": "how to extract this layer"
    },
    {
      "type": "foreground",
      "name": "Person/Subject Name",
      "description": "description of the foreground subject",
      "boundingBox": { "x": number 0-100, "y": number 0-100, "width": number 0-100, "height": number 0-100 },
      "zIndex": 1,
      "extractionHint": "use segmentation model to isolate this subject"
    },
    {
      "type": "text",
      "name": "Text: first few words",
      "description": "the actual text content",
      "content": "exact text string",
      "boundingBox": { "x": number 0-100, "y": number 0-100, "width": number 0-100, "height": number 0-100 },
      "zIndex": 2,
      "color": "#hexcolor",
      "fontStyle": "sans-serif|serif|script|display",
      "fontSize": "small|medium|large|xlarge"
    }
  ],
  "backgroundFillHint": "detailed description of what should fill the background after removing foreground and text (e.g., 'natural sky with soft clouds transitioning to green grass field with wildflowers')",
  "totalLayers": number,
  "imageDescription": "brief overall description of the image"
}

CRITICAL RULES:
1. Identify EVERY distinct visual element as a separate layer
2. Background is ALWAYS type "background" with zIndex 0 and covers full image (0,0,100,100)
3. Each person/subject/object in foreground is a SEPARATE "foreground" layer
4. Each text block is a SEPARATE "text" layer with the actual text content
5. Bounding boxes are PERCENTAGES (0-100), not pixels
6. zIndex: 0=back, higher=front
7. backgroundFillHint MUST describe what natural elements should fill the space (sky, grass, pattern, color, etc.)
8. Return ONLY the JSON object, no markdown formatting`;

    console.log("[analyze-image-layers] Sending image for AI analysis...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
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
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("[analyze-image-layers] No content in response");
      return new Response(JSON.stringify({ error: "Failed to analyze image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the JSON response (strip markdown code blocks if present)
    let analysisResult;
    try {
      let jsonStr = content.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();
      
      analysisResult = JSON.parse(jsonStr);
      console.log("[analyze-image-layers] ✅ Parsed analysis:", JSON.stringify(analysisResult).substring(0, 500));
    } catch (parseError) {
      console.error("[analyze-image-layers] Failed to parse JSON:", parseError, "Raw content:", content.substring(0, 500));
      
      // Return a fallback structure
      analysisResult = {
        layers: [
          {
            type: "background",
            name: "Background",
            description: "Full image background",
            boundingBox: { x: 0, y: 0, width: 100, height: 100 },
            zIndex: 0,
            extractionHint: "Use AI inpainting to remove foreground and text",
          },
          {
            type: "foreground",
            name: "Main Subject",
            description: "Primary foreground subject",
            boundingBox: { x: 20, y: 10, width: 60, height: 80 },
            zIndex: 1,
            extractionHint: "Use segmentation to isolate",
          },
        ],
        backgroundFillHint: "Natural background continuation - sky, landscape, or pattern matching surrounding areas",
        totalLayers: 2,
        imageDescription: "Image with foreground subject",
      };
    }

    // Validate and normalize the response
    if (!analysisResult.layers || !Array.isArray(analysisResult.layers)) {
      analysisResult.layers = [];
    }
    
    // Ensure there's always a background layer
    const hasBackground = analysisResult.layers.some((l: any) => l.type === "background");
    if (!hasBackground) {
      analysisResult.layers.unshift({
        type: "background",
        name: "Background",
        description: "Full image background",
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        zIndex: 0,
        extractionHint: "Use AI inpainting",
      });
    }

    // Normalize bounding boxes to ensure they're valid percentages
    analysisResult.layers = analysisResult.layers.map((layer: any) => {
      const bbox = layer.boundingBox || { x: 0, y: 0, width: 100, height: 100 };
      return {
        ...layer,
        boundingBox: {
          x: Math.max(0, Math.min(100, bbox.x || 0)),
          y: Math.max(0, Math.min(100, bbox.y || 0)),
          width: Math.max(1, Math.min(100, bbox.width || 100)),
          height: Math.max(1, Math.min(100, bbox.height || 100)),
        },
      };
    });

    // Sort by zIndex
    analysisResult.layers.sort((a: any, b: any) => (a.zIndex || 0) - (b.zIndex || 0));
    analysisResult.totalLayers = analysisResult.layers.length;

    console.log("[analyze-image-layers] ✅ Returning", analysisResult.totalLayers, "layers");

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-image-layers:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

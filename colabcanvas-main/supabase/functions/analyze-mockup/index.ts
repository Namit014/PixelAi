import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const jwt = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(jwt);
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

    // Deduct credits for mockup analysis
    const { error: creditError } = await supabaseClient.rpc("deduct_credits", {
      _user_id: user.id,
      _amount: 5,
      _description: "Mockup surface detection",
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
      await supabaseClient.rpc("add_credits", { _user_id: user.id, _amount: 5 });
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Gemini Vision to detect mockup surfaces with detailed boundary polygons.
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a precise computer-vision annotator. Look at the image and identify EVERY surface where a custom design could be applied (label, screen, fabric print area, poster face, box face, mug wrap, etc.).

For each surface return:
1. id — unique string
2. type — one of: flat | perspective | curved | cylindrical | fabric | screen | irregular
3. bounds — axis-aligned bbox in PERCENT of image (x, y, width, height, all 0-100). This is only for hit-testing fallback.
4. boundary — REQUIRED. An ordered list of 12 to 40 points (in PERCENT, 0-100) tracing the actual visible outline of the surface (clockwise). For a rectangular face this can have 4 corners; for a label on a bottle this should follow the curved silhouette; for a t-shirt print area it should follow the print region outline; for a screen it should follow the inner glass cutout; for irregular shapes use as many points as needed.
5. uvQuad — OPTIONAL. Exactly 4 ordered points (in PERCENT) representing the perspective anchors of the surface in this order: top-left, top-right, bottom-right, bottom-left. Use these for perspective mapping of the design onto the surface. Required when type is perspective, screen, flat (with perspective), or any planar face. If the surface is severely curved (cylindrical/curved/fabric), still try to provide a best-fit quad covering the print area.
6. aspectRatio — suggested aspect ratio of the design that fits this surface (e.g. "16:9", "1:1", "3:4")
7. description — short human label

Return ONLY a single valid JSON object, no prose, no markdown fence:
{
  "surfaces": [
    {
      "id": "surface_1",
      "type": "screen",
      "bounds": {"x": 20, "y": 30, "width": 40, "height": 30},
      "boundary": [
        {"x": 20, "y": 30}, {"x": 60, "y": 30}, {"x": 60, "y": 60}, {"x": 20, "y": 60}
      ],
      "uvQuad": [
        {"x": 20, "y": 30}, {"x": 60, "y": 30}, {"x": 60, "y": 60}, {"x": 20, "y": 60}
      ],
      "aspectRatio": "9:19.5",
      "description": "Phone screen"
    }
  ],
  "primarySurface": "surface_1",
  "objectType": "smartphone",
  "lightDirection": "top-left",
  "ambientBrightness": "medium"
}

Rules:
- boundary points must trace the ACTUAL visible shape, not the bounding box.
- For curved/cylindrical surfaces, sample enough points to capture the curvature.
- Coordinates are percentages of the image, NOT pixels.
- If no suitable surfaces are found, return {"surfaces": [], "objectType": "unknown"}.`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      await supabaseClient.rpc("add_credits", { _user_id: user.id, _amount: 5 });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
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
    const content = data.choices?.[0]?.message?.content || "{}";
    
    // Parse the JSON response
    let mockupData: any = { surfaces: [], objectType: "unknown" };
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
      mockupData = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
    }

    // Normalize / sanitize surfaces. Drop any without a usable boundary.
    const clamp = (n: number) => Math.max(0, Math.min(100, Number(n) || 0));
    const sanitizePoint = (p: any) => ({ x: clamp(p?.x), y: clamp(p?.y) });
    const surfaces = Array.isArray(mockupData.surfaces) ? mockupData.surfaces : [];
    mockupData.surfaces = surfaces.map((s: any, i: number) => {
      const boundary = Array.isArray(s?.boundary) ? s.boundary.map(sanitizePoint) : [];
      const uvQuad = Array.isArray(s?.uvQuad) && s.uvQuad.length === 4
        ? s.uvQuad.map(sanitizePoint)
        : (Array.isArray(s?.corners) && s.corners.length === 4 ? s.corners.map(sanitizePoint) : null);

      // Derive bounds from boundary if missing
      let bounds = s?.bounds;
      if ((!bounds || typeof bounds.x !== 'number') && boundary.length >= 3) {
        const xs = boundary.map((p: any) => p.x);
        const ys = boundary.map((p: any) => p.y);
        const minX = Math.min(...xs), minY = Math.min(...ys);
        const maxX = Math.max(...xs), maxY = Math.max(...ys);
        bounds = { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
      }

      return {
        id: s?.id || `surface_${i + 1}`,
        type: s?.type || 'flat',
        bounds,
        boundary: boundary.length >= 3 ? boundary : null,
        uvQuad,
        // legacy alias
        corners: uvQuad,
        aspectRatio: s?.aspectRatio,
        description: s?.description || s?.label || `Surface ${i + 1}`,
      };
    }).filter((s: any) => s.boundary && s.bounds);

    console.log("Detected mockup surfaces:", JSON.stringify(mockupData).slice(0, 500));

    return new Response(
      JSON.stringify({ 
        ...mockupData,
        creditsUsed: 5,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-mockup:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

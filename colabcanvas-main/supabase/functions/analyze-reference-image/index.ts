import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !lovableApiKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { image_id, image_url } = await req.json();

    if (!image_id || !image_url) {
      throw new Error("Missing image_id or image_url");
    }

    console.log(`🔍 Analyzing image: ${image_id}`);

    // Use Lovable AI to analyze the image
    const analysisPrompt = `Analyze this design/branding image in detail. Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "alt_text": "Brief 50-character description for accessibility",
  "description": "Detailed 150-character description of the design elements, colors, and style",
  "semantic_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "style_keywords": ["keyword1", "keyword2", "keyword3"]
}

For semantic_tags: Include 5-10 descriptive keywords like "minimalist", "corporate", "playful", "elegant", "modern", "vintage", "colorful", "monochrome", "geometric", "organic", etc.

For style_keywords: Include 3-5 style descriptors that capture the visual aesthetic like "bold", "clean", "sophisticated", "energetic", "calm", "professional", etc.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
              { type: "image_url", image_url: { url: image_url } }
            ]
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("🤖 AI raw response:", content);

    // Parse the JSON response (remove markdown code blocks if present)
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.replace(/```json\n?/, "").replace(/\n?```$/, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/```\n?/, "").replace(/\n?```$/, "");
    }

    const analysis = JSON.parse(cleanContent);

    // Validate the structure
    if (!analysis.alt_text || !analysis.description || !analysis.semantic_tags || !analysis.style_keywords) {
      throw new Error("Invalid analysis structure from AI");
    }

    console.log("✅ Parsed analysis:", analysis);

    // Update the database with AI-generated metadata
    const { error: updateError } = await supabase
      .from("reference_images")
      .update({
        alt_text: analysis.alt_text.substring(0, 100),
        description: analysis.description.substring(0, 200),
        semantic_tags: analysis.semantic_tags,
        style_keywords: analysis.style_keywords,
      })
      .eq("id", image_id);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw updateError;
    }

    console.log(`✅ Successfully analyzed and updated image: ${image_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysis,
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
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

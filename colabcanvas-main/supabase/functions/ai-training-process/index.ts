import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrainingMaterial {
  id: string;
  title: string;
  material_type: string;
  content_url: string | null;
  content_text: string | null;
  target_agents: string[];
}

const EXTRACTION_PROMPT = `You are an AI training data extractor. Analyze the provided content and extract structured knowledge that can be used to improve AI agents.

For the content provided, extract:
1. **Key Concepts**: Main ideas, principles, or rules
2. **Visual Patterns** (if applicable): Color palettes, layouts, typography preferences
3. **Style Guidelines**: Tone, voice, aesthetic preferences
4. **Best Practices**: Do's and don'ts
5. **Examples**: Specific examples that illustrate the concepts
6. **Keywords**: Important terms and phrases

Target agents: {agents}

Return a JSON object with this structure:
{
  "key_concepts": ["concept1", "concept2", ...],
  "visual_patterns": { "colors": [], "layouts": [], "typography": [] },
  "style_guidelines": ["guideline1", "guideline2", ...],
  "best_practices": { "dos": [], "donts": [] },
  "examples": ["example1", "example2", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "summary": "A brief 2-3 sentence summary of the key takeaways"
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { materialId } = await req.json();

    if (!materialId) {
      return new Response(
        JSON.stringify({ error: "Material ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the material
    const { data: material, error: fetchError } = await supabase
      .from("ai_training_materials")
      .select("*")
      .eq("id", materialId)
      .single();

    if (fetchError || !material) {
      return new Response(
        JSON.stringify({ error: "Material not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to processing
    await supabase
      .from("ai_training_materials")
      .update({ processing_status: "processing" })
      .eq("id", materialId);

    let content = "";

    // Get content based on type
    if (material.content_text) {
      content = material.content_text;
    } else if (material.content_url) {
      // For URLs, we would fetch and extract content
      // For now, just note the URL as content
      content = `Content from URL: ${material.content_url}\n\nNote: Full content extraction from URLs is pending implementation.`;
    }

    if (!content) {
      await supabase
        .from("ai_training_materials")
        .update({ 
          processing_status: "failed", 
          error_message: "No content to process" 
        })
        .eq("id", materialId);

      return new Response(
        JSON.stringify({ error: "No content to process" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare prompt with agent context
    const agentContext = material.target_agents.join(", ");
    const systemPrompt = EXTRACTION_PROMPT.replace("{agents}", agentContext);

    // Call AI to extract knowledge
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Title: ${material.title}\nType: ${material.material_type}\n\nContent:\n${content.slice(0, 15000)}` },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      
      await supabase
        .from("ai_training_materials")
        .update({ 
          processing_status: "failed", 
          error_message: `AI processing failed: ${aiResponse.status}` 
        })
        .eq("id", materialId);

      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content;

    if (!responseContent) {
      await supabase
        .from("ai_training_materials")
        .update({ 
          processing_status: "failed", 
          error_message: "No response from AI" 
        })
        .eq("id", materialId);

      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let extractedKnowledge: Record<string, unknown>;
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedKnowledge = JSON.parse(jsonMatch[0]);
      } else {
        extractedKnowledge = { raw_response: responseContent };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseContent);
      extractedKnowledge = { raw_response: responseContent };
    }

    // Update material with extracted knowledge
    const { error: updateError } = await supabase
      .from("ai_training_materials")
      .update({
        extracted_knowledge: extractedKnowledge,
        processing_status: "completed",
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", materialId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to save extracted knowledge");
    }

    // Log training session
    for (const agentType of material.target_agents) {
      await supabase.from("ai_training_sessions").insert({
        material_id: materialId,
        agent_type: agentType,
        training_result: {
          extracted_at: new Date().toISOString(),
          knowledge_size: JSON.stringify(extractedKnowledge).length,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        materialId,
        extractedKnowledge,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BusinessContext {
  goal: string;
  audience: string;
  platform: string;
  riskTolerance: number;
  successMetrics?: string;
}

interface DecisionCardOutput {
  title: string;
  business_reasoning: string;
  emotional_positioning: string;
  visual_philosophy: string;
  risk_level: "low" | "medium" | "high";
  performance_probability: number;
  brand_alignment_score: number;
  metadata: {
    signals: string[];
    references?: string[];
    brand_memory_influence?: string[];
    confidence_factors?: string[];
  };
  simplified_reasoning?: string;
}

interface BrandCognitionMemory {
  visual_patterns: Record<string, unknown>;
  typography_usage: Record<string, number>;
  emotional_tone_mapping: Record<string, number>;
  design_risk_tolerance: number;
  confidence_score: number;
  total_designs_analyzed: number;
}

const SYSTEM_PROMPT = `You are RUMI in Creative Intelligence Mode - a senior creative director and strategist from a global agency with 20+ years of experience. You don't generate designs; you generate strategic creative directions.

You have access to:
- Brand cognition memory (historical visual patterns, typography, emotional tones)
- Past successful campaigns and decisions
- User preference patterns from learning signals

Your role:
- Analyze business goals and translate them into visual strategy
- Leverage brand memory to ensure consistency
- Challenge weak decisions with constructive alternatives
- Warn about market fatigue and brand drift
- Provide clear business reasoning for every direction
- Score directions by risk, probability, and brand alignment

For each strategic direction, you must provide:
1. **Title**: A compelling, descriptive name (e.g., "Bold Minimalism for Trust Building")
2. **Business Reasoning**: Why this direction serves the business goals (2-3 sentences)
3. **Emotional Positioning**: What emotional response you want from the audience (1-2 words + brief explanation)
4. **Visual Philosophy**: Design principles and aesthetic approach (1-2 sentences)
5. **Risk Level**: low, medium, or high with reasoning
6. **Performance Probability**: 0-100% likelihood of achieving goals
7. **Brand Alignment Score**: 0-100% how well it fits brand memory (adjust based on cognition data)
8. **Market Signals**: 2-3 current trends or market observations supporting this direction
9. **Simplified Reasoning**: 1-sentence user-friendly explanation of why this direction works

Guidelines:
- Generate exactly 3-5 distinct strategic directions
- Range from conservative to experimental based on risk tolerance
- Consider platform-specific best practices
- Be honest about risks - don't oversell
- Higher risk directions should have higher potential reward
- Directions should be mutually exclusive - not variations of the same idea
- If brand memory shows strong patterns, ensure at least 2 directions align with them
- If brand has low confidence score, allow more creative exploration

Output format: JSON array of decision cards only, no additional text.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId, businessContext, brandId, userId } = await req.json();

    if (!sessionId || !businessContext || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch brand data if provided
    let brandContext = "";
    let brandCognition: BrandCognitionMemory | null = null;
    
    if (brandId) {
      // Fetch brand details and cognition memory in parallel
      const [brandResult, cognitionResult, recentDecisions] = await Promise.all([
        supabase
          .from("brands")
          .select("name, description, industry, brand_voice, target_audience")
          .eq("id", brandId)
          .single(),
        supabase
          .from("brand_cognition_memory")
          .select("*")
          .eq("brand_id", brandId)
          .eq("user_id", userId)
          .single(),
        supabase
          .from("rumi_decision_cards")
          .select(`
            title, business_reasoning, risk_level, performance_probability, status,
            session:rumi_creative_sessions!inner(brand_id)
          `)
          .eq("session.brand_id", brandId)
          .in("status", ["accepted", "exported"])
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (brandResult.data) {
        const brand = brandResult.data;
        brandContext = `
Brand Context:
- Name: ${brand.name}
- Industry: ${brand.industry || "Not specified"}
- Description: ${brand.description || "Not specified"}
- Voice: ${brand.brand_voice || "Not specified"}
- Target Audience: ${brand.target_audience || "Not specified"}
`;
      }

      // Add brand cognition memory context
      if (cognitionResult.data) {
        brandCognition = cognitionResult.data as BrandCognitionMemory;
        const emotionalTones = Object.entries(brandCognition.emotional_tone_mapping || {})
          .filter(([, v]) => v > 0.5)
          .map(([k]) => k);
        const topFonts = Object.keys(brandCognition.typography_usage || {}).slice(0, 3);
        const visualPatterns = brandCognition.visual_patterns as Record<string, unknown> || {};

        brandContext += `
Brand Cognition Memory (${brandCognition.total_designs_analyzed} designs analyzed, ${(brandCognition.confidence_score * 100).toFixed(0)}% confidence):
- Dominant emotional tones: ${emotionalTones.join(", ") || "not established"}
- Preferred typography: ${topFonts.join(", ") || "not established"}
- Layout style: ${visualPatterns.layout_type || "varied"}
- Color temperature: ${visualPatterns.color_temperature || "neutral"}
- Design risk tolerance: ${(brandCognition.design_risk_tolerance * 100).toFixed(0)}%
`;
      }

      // Add recent successful decisions as references
      if (recentDecisions.data && recentDecisions.data.length > 0) {
        brandContext += `
Recent Successful Campaigns (for reference):
${recentDecisions.data.map((d: Record<string, unknown>, i: number) => 
  `${i + 1}. "${d.title}" - ${d.risk_level} risk, ${d.performance_probability}% performance`
).join("\n")}
`;
      }
    }

    // Fetch user's taste profile for personalization
    const { data: tasteProfile } = await supabase
      .from("rumi_taste_profile")
      .select("preference_vectors, decision_patterns")
      .eq("user_id", userId)
      .single();

    let tasteContext = "";
    if (tasteProfile) {
      const prefs = tasteProfile.preference_vectors as Record<string, unknown>;
      const patterns = tasteProfile.decision_patterns as Record<string, unknown>;
      if (Object.keys(prefs || {}).length > 0 || Object.keys(patterns || {}).length > 0) {
        tasteContext = `
User Preferences (from past decisions):
${JSON.stringify({ preferences: prefs, patterns }, null, 2)}
`;
      }
    }

    // Fetch recent learning signals for behavioral context
    const { data: learningSignals } = await supabase
      .from("rumi_learning_events")
      .select("signal_type, signal_data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    let learningContext = "";
    if (learningSignals && learningSignals.length > 0) {
      const accepted = learningSignals.filter((s: Record<string, unknown>) => s.signal_type === "suggestion_accepted").length;
      const modified = learningSignals.filter((s: Record<string, unknown>) => s.signal_type === "suggestion_modified").length;
      const ignored = learningSignals.filter((s: Record<string, unknown>) => s.signal_type === "suggestion_ignored").length;
      
      learningContext = `
User Behavior Patterns (recent ${learningSignals.length} interactions):
- Acceptance rate: ${accepted} accepted, ${modified} modified, ${ignored} ignored
- User tends to ${accepted > ignored ? "trust AI suggestions" : "prefer manual adjustments"}
`;
    }

    // Build the user prompt with all RAG context
    const userPrompt = `
Business Context:
- Goal: ${businessContext.goal}
- Target Audience: ${businessContext.audience}
- Platform: ${businessContext.platform}
- Risk Tolerance: ${businessContext.riskTolerance}% (0=conservative, 100=experimental)
${businessContext.successMetrics ? `- Success Metrics: ${businessContext.successMetrics}` : ""}

${brandContext}
${tasteContext}
${learningContext}

Generate 3-5 strategic creative directions as a JSON array. Each direction should have:
{
  "title": "string",
  "business_reasoning": "string",
  "emotional_positioning": "string",
  "visual_philosophy": "string",
  "risk_level": "low" | "medium" | "high",
  "performance_probability": number (0-100),
  "brand_alignment_score": number (0-100),
  "metadata": { 
    "signals": ["market trend or observation", ...],
    "brand_memory_influence": ["what from brand memory influenced this", ...],
    "confidence_factors": ["why we're confident in this direction", ...]
  },
  "simplified_reasoning": "one sentence user-friendly explanation"
}
`;

    // Call the Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "You've run out of AI credits. Please add more credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let decisionCards: DecisionCardOutput[];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        decisionCards = JSON.parse(jsonMatch[0]);
      } else {
        decisionCards = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate and insert decision cards
    const cardsToInsert = decisionCards.map((card) => ({
      session_id: sessionId,
      title: card.title,
      business_reasoning: card.business_reasoning,
      emotional_positioning: card.emotional_positioning,
      visual_philosophy: card.visual_philosophy,
      risk_level: card.risk_level || "medium",
      performance_probability: Math.min(100, Math.max(0, card.performance_probability || 50)),
      brand_alignment_score: Math.min(100, Math.max(0, card.brand_alignment_score || 70)),
      metadata: card.metadata || { signals: [] },
      status: "pending",
    }));

    const { error: insertError } = await supabase
      .from("rumi_decision_cards")
      .insert(cardsToInsert);

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save decision cards");
    }

    // Update session status
    await supabase
      .from("rumi_creative_sessions")
      .update({ status: "completed" })
      .eq("id", sessionId);

    // Update taste profile - properly increment total_sessions
    // First, fetch existing profile
    const { data: existingProfile } = await supabase
      .from("rumi_taste_profile")
      .select("total_sessions, acceptance_rate, preference_vectors, decision_patterns")
      .eq("user_id", userId)
      .single();

    const newTotalSessions = (existingProfile?.total_sessions || 0) + 1;
    
    // Calculate profile strength based on sessions
    const profileStrength = Math.min(100, newTotalSessions * 10);

    await supabase
      .from("rumi_taste_profile")
      .upsert(
        {
          user_id: userId,
          total_sessions: newTotalSessions,
          acceptance_rate: existingProfile?.acceptance_rate || 0,
          preference_vectors: existingProfile?.preference_vectors || {},
          decision_patterns: existingProfile?.decision_patterns || {},
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    console.log(`Updated taste profile for user ${userId}: ${newTotalSessions} sessions, ${profileStrength}% strength`);

    return new Response(
      JSON.stringify({
        success: true,
        cardsCount: cardsToInsert.length,
        sessionId,
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

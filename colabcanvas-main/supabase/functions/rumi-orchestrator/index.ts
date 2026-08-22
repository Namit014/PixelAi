import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Agent Types
interface AgentState {
  agent_id: string;
  status: "pending" | "processing" | "complete" | "error";
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  confidence: number;
  processing_time_ms: number;
  error?: string;
}

interface OrchestratorState {
  session_id: string;
  agents: Record<string, AgentState>;
  merged_context: Record<string, unknown>;
  final_output: CreativeDecision[] | null;
  total_processing_time_ms: number;
}

interface CreativeDecision {
  direction: {
    title: string;
    business_reasoning: string;
    emotional_positioning: string;
    visual_philosophy: string;
  };
  internal_reasoning: {
    brand_memory_influence: string[];
    past_campaign_references: string[];
    risk_calculation: Record<string, number>;
    confidence_factors: string[];
  };
  simplified_reasoning: string;
  risk_level: "low" | "medium" | "high";
  performance_probability: number;
  brand_alignment_score: number;
}

interface OrchestratorInput {
  userId: string;
  brandId?: string;
  projectId?: string;
  businessContext: {
    goal: string;
    audience: string;
    platform: string;
    riskTolerance: number;
    successMetrics?: string;
  };
  taggedAssets?: string[];
  taggedProjects?: string[];
  canvasState?: Record<string, unknown>;
}

// Brand Agent - Loads and analyzes brand memory
async function runBrandAgent(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  input: OrchestratorInput
): Promise<AgentState> {
  const startTime = Date.now();
  const state: AgentState = {
    agent_id: "brand_agent",
    status: "processing",
    input: { brandId: input.brandId },
    output: {},
    confidence: 0,
    processing_time_ms: 0,
  };

  try {
    if (!input.brandId) {
      state.status = "complete";
      state.output = { message: "No brand specified" };
      state.confidence = 0;
      state.processing_time_ms = Date.now() - startTime;
      return state;
    }

    // Load brand cognition memory
    const { data: brandMemory } = await supabase
      .from("brand_cognition_memory")
      .select("*")
      .eq("brand_id", input.brandId)
      .eq("user_id", input.userId)
      .single();

    // Load brand details
    const { data: brand } = await supabase
      .from("brands")
      .select("name, description, industry, brand_voice, target_audience")
      .eq("id", input.brandId)
      .single();

    // Load recent design events
    const { data: recentEvents } = await supabase
      .from("brand_design_events")
      .select("event_type, visual_features, created_at")
      .eq("brand_id", input.brandId)
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false })
      .limit(10);

    state.status = "complete";
    state.output = {
      brandMemory: brandMemory || null,
      brandDetails: brand || null,
      recentEvents: recentEvents || [],
      hasCognition: !!brandMemory,
      designsAnalyzed: brandMemory?.total_designs_analyzed || 0,
    };
    state.confidence = brandMemory?.confidence_score || 0;
    state.processing_time_ms = Date.now() - startTime;

    return state;
  } catch (error) {
    state.status = "error";
    state.error = error instanceof Error ? error.message : "Unknown error";
    state.processing_time_ms = Date.now() - startTime;
    return state;
  }
}

// Project Context Agent - Infers and retrieves project context
async function runProjectContextAgent(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  input: OrchestratorInput
): Promise<AgentState> {
  const startTime = Date.now();
  const state: AgentState = {
    agent_id: "project_context_agent",
    status: "processing",
    input: { projectId: input.projectId, businessContext: input.businessContext },
    output: {},
    confidence: 0,
    processing_time_ms: 0,
  };

  try {
    let projectContext = null;

    if (input.projectId) {
      // Try to load existing context
      const { data } = await supabase
        .from("project_context_intel")
        .select("*")
        .eq("project_id", input.projectId)
        .eq("user_id", input.userId)
        .single();

      projectContext = data;
    }

    // If no context exists, create inferred context from business input
    if (!projectContext && input.businessContext) {
      projectContext = {
        inferred_goal: input.businessContext.goal,
        inferred_audience: input.businessContext.audience,
        inferred_channel: input.businessContext.platform,
        timeline_urgency: input.businessContext.riskTolerance > 70 ? "high" : "normal",
        goal_confidence: 0.8, // High confidence since user provided it
        audience_confidence: 0.8,
        channel_confidence: 0.8,
      };

      // Store inferred context if project exists
      if (input.projectId) {
        await supabase.from("project_context_intel").upsert({
          project_id: input.projectId,
          brand_id: input.brandId || null,
          user_id: input.userId,
          ...projectContext,
        }, { onConflict: "project_id" });
      }
    }

    // Find similar historical campaigns
    const { data: similarCampaigns } = await supabase
      .from("rumi_creative_sessions")
      .select("id, business_context, created_at")
      .eq("user_id", input.userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5);

    state.status = "complete";
    state.output = {
      projectContext,
      similarCampaigns: similarCampaigns || [],
      businessContext: input.businessContext,
    };
    state.confidence = projectContext
      ? ((projectContext.goal_confidence || 0) + (projectContext.audience_confidence || 0) + (projectContext.channel_confidence || 0)) / 3
      : 0;
    state.processing_time_ms = Date.now() - startTime;

    return state;
  } catch (error) {
    state.status = "error";
    state.error = error instanceof Error ? error.message : "Unknown error";
    state.processing_time_ms = Date.now() - startTime;
    return state;
  }
}

// Design Reasoning Agent - Generates creative directions
async function runDesignReasoningAgent(
  // deno-lint-ignore no-explicit-any
  _supabase: any,
  input: OrchestratorInput,
  brandAgentOutput: Record<string, unknown>,
  projectAgentOutput: Record<string, unknown>,
  lovableApiKey: string
): Promise<AgentState> {
  const startTime = Date.now();
  const state: AgentState = {
    agent_id: "design_reasoning_agent",
    status: "processing",
    input: { brandOutput: brandAgentOutput, projectOutput: projectAgentOutput },
    output: {},
    confidence: 0,
    processing_time_ms: 0,
  };

  try {
    const brandMemory = brandAgentOutput.brandMemory as Record<string, unknown> | null;
    const brandDetails = brandAgentOutput.brandDetails as Record<string, unknown> | null;
    const projectContext = projectAgentOutput.projectContext as Record<string, unknown> | null;
    const businessContext = input.businessContext;

    // Build comprehensive prompt with all context
    const systemPrompt = `You are RUMI - a senior creative director with deep brand understanding. You generate strategic creative directions based on:
1. Brand cognition memory (historical patterns)
2. Project context and goals
3. Past successful campaigns

For each direction, provide:
- title: Compelling name
- business_reasoning: Why this serves business goals (2-3 sentences)
- emotional_positioning: Target emotional response (1-2 words + explanation)
- visual_philosophy: Design principles (1-2 sentences)
- risk_level: low/medium/high
- performance_probability: 0-100
- brand_alignment_score: 0-100
- internal_reasoning: Object with brand_memory_influence, past_campaign_references, risk_calculation, confidence_factors
- simplified_reasoning: User-friendly 1-sentence explanation

Generate 3-5 distinct strategic directions as JSON array.`;

    const contextParts: string[] = [];

    if (brandMemory) {
      contextParts.push(`BRAND MEMORY (${brandAgentOutput.designsAnalyzed} designs analyzed):
- Visual patterns: ${JSON.stringify(brandMemory.visual_patterns || {})}
- Typography: ${JSON.stringify(brandMemory.typography_usage || {})}
- Emotional tones: ${JSON.stringify(brandMemory.emotional_tone_mapping || {})}
- Risk tolerance: ${brandMemory.design_risk_tolerance || 0.5}`);
    }

    if (brandDetails) {
      contextParts.push(`BRAND DETAILS:
- Name: ${brandDetails.name || "Unknown"}
- Industry: ${brandDetails.industry || "Not specified"}
- Voice: ${brandDetails.brand_voice || "Not defined"}
- Target: ${brandDetails.target_audience || "Not specified"}`);
    }

    contextParts.push(`BUSINESS CONTEXT:
- Goal: ${businessContext.goal}
- Audience: ${businessContext.audience}
- Platform: ${businessContext.platform}
- Risk Tolerance: ${businessContext.riskTolerance}%
${businessContext.successMetrics ? `- Success Metrics: ${businessContext.successMetrics}` : ""}`);

    if (projectContext) {
      contextParts.push(`PROJECT CONTEXT:
- Inferred Goal: ${projectContext.inferred_goal || "N/A"}
- Inferred Audience: ${projectContext.inferred_audience || "N/A"}
- Inferred Channel: ${projectContext.inferred_channel || "N/A"}`);
    }

    const userPrompt = contextParts.join("\n\n") + "\n\nGenerate creative directions as JSON array.";

    // Call AI for creative reasoning
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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse AI response
    let decisions: CreativeDecision[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        decisions = JSON.parse(jsonMatch[0]);
      } else {
        decisions = JSON.parse(content);
      }
    } catch {
      throw new Error("Failed to parse AI response");
    }

    state.status = "complete";
    state.output = { decisions };
    state.confidence = decisions.length > 0 ? 0.8 : 0;
    state.processing_time_ms = Date.now() - startTime;

    return state;
  } catch (error) {
    state.status = "error";
    state.error = error instanceof Error ? error.message : "Unknown error";
    state.processing_time_ms = Date.now() - startTime;
    return state;
  }
}

// Execution Planning Agent - Prioritizes and finalizes output
async function runExecutionPlanningAgent(
  // deno-lint-ignore no-explicit-any
  _supabase: any,
  _input: OrchestratorInput,
  allAgentOutputs: Record<string, AgentState>
): Promise<AgentState> {
  const startTime = Date.now();
  const state: AgentState = {
    agent_id: "execution_planning_agent",
    status: "processing",
    input: { agentCount: Object.keys(allAgentOutputs).length },
    output: {},
    confidence: 0,
    processing_time_ms: 0,
  };

  try {
    const designAgent = allAgentOutputs.design_reasoning_agent;
    const brandAgent = allAgentOutputs.brand_agent;

    if (!designAgent || designAgent.status !== "complete") {
      throw new Error("Design reasoning agent failed or not complete");
    }

    const decisions = (designAgent.output.decisions || []) as CreativeDecision[];
    const brandConfidence = brandAgent?.confidence || 0;

    // Adjust scores based on brand confidence
    const adjustedDecisions = decisions.map((decision) => {
      const adjustedBrandScore = brandConfidence > 0.5
        ? decision.brand_alignment_score
        : Math.max(50, decision.brand_alignment_score * 0.8); // Reduce confidence if brand memory is weak

      return {
        ...decision,
        brand_alignment_score: Math.round(adjustedBrandScore),
      };
    });

    // Sort by weighted score (performance * 0.6 + brand_alignment * 0.4)
    const sortedDecisions = adjustedDecisions.sort((a, b) => {
      const scoreA = a.performance_probability * 0.6 + a.brand_alignment_score * 0.4;
      const scoreB = b.performance_probability * 0.6 + b.brand_alignment_score * 0.4;
      return scoreB - scoreA;
    });

    // Calculate overall confidence
    const agentConfidences = Object.values(allAgentOutputs)
      .filter(a => a.status === "complete")
      .map(a => a.confidence);
    const overallConfidence = agentConfidences.length > 0
      ? agentConfidences.reduce((a, b) => a + b, 0) / agentConfidences.length
      : 0;

    state.status = "complete";
    state.output = {
      finalDecisions: sortedDecisions,
      decisionsCount: sortedDecisions.length,
      riskDistribution: {
        low: sortedDecisions.filter(d => d.risk_level === "low").length,
        medium: sortedDecisions.filter(d => d.risk_level === "medium").length,
        high: sortedDecisions.filter(d => d.risk_level === "high").length,
      },
      recommendedFirst: sortedDecisions[0]?.direction.title || null,
    };
    state.confidence = overallConfidence;
    state.processing_time_ms = Date.now() - startTime;

    return state;
  } catch (error) {
    state.status = "error";
    state.error = error instanceof Error ? error.message : "Unknown error";
    state.processing_time_ms = Date.now() - startTime;
    return state;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const totalStartTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const input: OrchestratorInput = await req.json();

    if (!input.userId || !input.businessContext) {
      return new Response(
        JSON.stringify({ error: "Missing userId or businessContext" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting RUMI Orchestrator for user:", input.userId);

    // Phase 1: Run Brand and Project agents in parallel
    const [brandAgentState, projectContextState] = await Promise.all([
      runBrandAgent(supabase, input),
      runProjectContextAgent(supabase, input),
    ]);

    console.log("Phase 1 complete - Brand:", brandAgentState.status, "Project:", projectContextState.status);

    // Phase 2: Run Design Reasoning agent with context from Phase 1
    const designReasoningState = await runDesignReasoningAgent(
      supabase,
      input,
      brandAgentState.output,
      projectContextState.output,
      lovableApiKey
    );

    console.log("Phase 2 complete - Design Reasoning:", designReasoningState.status);

    // Phase 3: Run Execution Planning agent
    const allAgentStates: Record<string, AgentState> = {
      brand_agent: brandAgentState,
      project_context_agent: projectContextState,
      design_reasoning_agent: designReasoningState,
    };

    const executionPlanningState = await runExecutionPlanningAgent(
      supabase,
      input,
      allAgentStates
    );

    allAgentStates.execution_planning_agent = executionPlanningState;

    console.log("Phase 3 complete - Execution Planning:", executionPlanningState.status);

    const totalProcessingTime = Date.now() - totalStartTime;

    // Build final orchestrator state
    const orchestratorState: OrchestratorState = {
      session_id: crypto.randomUUID(),
      agents: allAgentStates,
      merged_context: {
        brandConfidence: brandAgentState.confidence,
        projectConfidence: projectContextState.confidence,
        hasStrongBrandMemory: brandAgentState.confidence > 0.5,
      },
      final_output: (executionPlanningState.output.finalDecisions as CreativeDecision[]) || null,
      total_processing_time_ms: totalProcessingTime,
    };

    console.log(`RUMI Orchestrator complete in ${totalProcessingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        state: orchestratorState,
        decisions: orchestratorState.final_output,
        metrics: {
          totalTimeMs: totalProcessingTime,
          agentTimings: Object.fromEntries(
            Object.entries(allAgentStates).map(([k, v]) => [k, v.processing_time_ms])
          ),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("RUMI Orchestrator Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

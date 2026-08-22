import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types for Context Fusion
interface FusionInput {
  userId: string;
  brandId?: string;
  projectId?: string;
  taggedAssets: string[];
  taggedProjects: string[];
  canvasState?: Record<string, unknown>;
  userMessage: string;
}

interface BrandCognitionMemory {
  visual_patterns: Record<string, unknown>;
  typography_usage: Record<string, number>;
  layout_density_patterns: Record<string, number>;
  color_relationship_vectors: Record<string, unknown>;
  emotional_tone_mapping: Record<string, number>;
  design_risk_tolerance: number;
  confidence_score: number;
  total_designs_analyzed: number;
}

interface TaggedAsset {
  id: string;
  file_name: string;
  asset_type: string;
  semantic_tags?: string[];
  color_palette?: unknown;
  usage_context?: string;
}

interface ProjectContext {
  inferred_goal?: string;
  inferred_audience?: string;
  inferred_channel?: string;
  timeline_urgency?: string;
  similar_campaign_ids?: string[];
  performance_benchmarks?: Record<string, unknown>;
}

interface HistoricalDecision {
  id: string;
  title: string;
  business_reasoning: string;
  risk_level: string;
  performance_probability: number;
  status: string;
  created_at: string;
}

interface FusedContext {
  brandMemory: BrandCognitionMemory | null;
  brandSummary: string;
  assets: TaggedAsset[];
  assetsSummary: string;
  projectContext: ProjectContext | null;
  projectSummary: string;
  canvasState: Record<string, unknown> | null;
  canvasSummary: string;
  historicalDecisions: HistoricalDecision[];
  historicalSummary: string;
  fusionWeights: Record<string, number>;
  confidence: number;
  processingTimeMs: number;
}

// Load brand cognition memory
async function loadBrandCognition(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  brandId: string,
  userId: string
): Promise<BrandCognitionMemory | null> {
  const { data, error } = await supabase
    .from("brand_cognition_memory")
    .select("*")
    .eq("brand_id", brandId)
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error loading brand cognition:", error);
    return null;
  }

  return data as BrandCognitionMemory | null;
}

// Retrieve tagged assets with semantic data
async function retrieveTaggedAssets(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  assetIds: string[],
  userId: string
): Promise<TaggedAsset[]> {
  if (assetIds.length === 0) return [];

  const { data, error } = await supabase
    .from("brand_assets")
    .select("id, file_name, asset_type, semantic_tags, color_palette, usage_context")
    .in("id", assetIds)
    .eq("user_id", userId);

  if (error) {
    console.error("Error loading assets:", error);
    return [];
  }

  return (data || []) as TaggedAsset[];
}

// Get project context intelligence
async function getProjectContext(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  projectId: string,
  userId: string
): Promise<ProjectContext | null> {
  const { data, error } = await supabase
    .from("project_context_intel")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error loading project context:", error);
    return null;
  }

  return data as ProjectContext | null;
}

// Find similar historical decisions
async function findSimilarDecisions(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  brandId?: string,
  _goal?: string,
  _channel?: string,
  limit = 5
): Promise<HistoricalDecision[]> {
  let query = supabase
    .from("rumi_decision_cards")
    .select(`
      id, title, business_reasoning, risk_level, 
      performance_probability, status, created_at,
      session:rumi_creative_sessions!inner(user_id, brand_id, business_context)
    `)
    .eq("session.user_id", userId)
    .in("status", ["accepted", "exported"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (brandId) {
    query = query.eq("session.brand_id", brandId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error loading historical decisions:", error);
    return [];
  }

  return (data || []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    title: d.title as string,
    business_reasoning: d.business_reasoning as string,
    risk_level: d.risk_level as string,
    performance_probability: d.performance_probability as number,
    status: d.status as string,
    created_at: d.created_at as string,
  }));
}

// Generate summary text for brand memory
function summarizeBrandMemory(memory: BrandCognitionMemory | null): string {
  if (!memory) return "No brand memory available yet.";

  const tones = Object.entries(memory.emotional_tone_mapping || {})
    .filter(([, v]) => v > 0.5)
    .map(([k]) => k);

  const fonts = Object.keys(memory.typography_usage || {}).slice(0, 3);
  const patterns = memory.visual_patterns as Record<string, unknown> || {};

  return `Brand analyzed ${memory.total_designs_analyzed} designs (confidence: ${(memory.confidence_score * 100).toFixed(0)}%). ` +
    `Emotional tones: ${tones.join(", ") || "neutral"}. ` +
    `Typography preferences: ${fonts.join(", ") || "not established"}. ` +
    `Layout style: ${patterns.layout_type || "varied"}. ` +
    `Risk tolerance: ${(memory.design_risk_tolerance * 100).toFixed(0)}%.`;
}

// Generate summary for assets
function summarizeAssets(assets: TaggedAsset[]): string {
  if (assets.length === 0) return "No assets tagged.";

  const types = [...new Set(assets.map(a => a.asset_type))];
  return `${assets.length} tagged assets (${types.join(", ")}). ` +
    `Files: ${assets.map(a => a.file_name).slice(0, 3).join(", ")}${assets.length > 3 ? "..." : ""}`;
}

// Generate summary for project context
function summarizeProjectContext(context: ProjectContext | null): string {
  if (!context) return "No project context inferred.";

  const parts: string[] = [];
  if (context.inferred_goal) parts.push(`Goal: ${context.inferred_goal}`);
  if (context.inferred_audience) parts.push(`Audience: ${context.inferred_audience}`);
  if (context.inferred_channel) parts.push(`Channel: ${context.inferred_channel}`);
  if (context.timeline_urgency && context.timeline_urgency !== "normal") {
    parts.push(`Urgency: ${context.timeline_urgency}`);
  }

  return parts.length > 0 ? parts.join(". ") + "." : "Project context available but details not specified.";
}

// Generate summary for canvas state
function summarizeCanvasState(canvas: Record<string, unknown> | null): string {
  if (!canvas) return "No active canvas context.";

  const objectCount = Array.isArray(canvas.objects) ? canvas.objects.length : 0;
  const dimensions = canvas.dimensions as { width?: number; height?: number } | undefined;

  let summary = `Active canvas with ${objectCount} objects`;
  if (dimensions?.width && dimensions?.height) {
    summary += ` (${dimensions.width}x${dimensions.height})`;
  }

  return summary + ".";
}

// Generate summary for historical decisions
function summarizeHistoricalDecisions(decisions: HistoricalDecision[]): string {
  if (decisions.length === 0) return "No relevant historical decisions found.";

  const avgProbability = decisions.reduce((acc, d) => acc + d.performance_probability, 0) / decisions.length;
  const riskLevels = decisions.map(d => d.risk_level);
  const dominantRisk = riskLevels.sort((a, b) =>
    riskLevels.filter(v => v === b).length - riskLevels.filter(v => v === a).length
  )[0];

  return `${decisions.length} similar past decisions found. ` +
    `Avg performance probability: ${avgProbability.toFixed(0)}%. ` +
    `Typical risk level: ${dominantRisk}. ` +
    `Recent: "${decisions[0]?.title || "N/A"}".`;
}

// Calculate fusion weights based on available context
function calculateFusionWeights(
  hasBrandMemory: boolean,
  assetsCount: number,
  hasProjectContext: boolean,
  hasCanvas: boolean,
  historicalCount: number
): Record<string, number> {
  const weights: Record<string, number> = {};
  let total = 0;

  if (hasBrandMemory) { weights.brandMemory = 0.35; total += 0.35; }
  if (assetsCount > 0) { weights.assets = Math.min(0.2, assetsCount * 0.05); total += weights.assets; }
  if (hasProjectContext) { weights.projectContext = 0.25; total += 0.25; }
  if (hasCanvas) { weights.canvasState = 0.15; total += 0.15; }
  if (historicalCount > 0) { weights.historicalDecisions = Math.min(0.15, historicalCount * 0.03); total += weights.historicalDecisions; }

  // Normalize weights to sum to 1
  if (total > 0) {
    Object.keys(weights).forEach(k => {
      weights[k] = weights[k] / total;
    });
  }

  return weights;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const input: FusionInput = await req.json();

    if (!input.userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute context loading in sequence to avoid variable reference issues
    const brandMemory = input.brandId
      ? await loadBrandCognition(supabase, input.brandId, input.userId)
      : null;

    const assets = await retrieveTaggedAssets(supabase, input.taggedAssets || [], input.userId);

    const projectContext = input.projectId
      ? await getProjectContext(supabase, input.projectId, input.userId)
      : null;

    const historicalDecisions = await findSimilarDecisions(
      supabase,
      input.userId,
      input.brandId,
      projectContext?.inferred_goal,
      projectContext?.inferred_channel
    );

    // Calculate fusion weights
    const fusionWeights = calculateFusionWeights(
      !!brandMemory,
      assets.length,
      !!projectContext,
      !!input.canvasState,
      historicalDecisions.length
    );

    // Calculate overall confidence
    const confidenceFactors: number[] = [];
    if (brandMemory) confidenceFactors.push(brandMemory.confidence_score);
    if (assets.length > 0) confidenceFactors.push(Math.min(1, assets.length / 5));
    if (projectContext) {
      const contextConfidence = (
        (projectContext.inferred_goal ? 0.33 : 0) +
        (projectContext.inferred_audience ? 0.33 : 0) +
        (projectContext.inferred_channel ? 0.34 : 0)
      );
      confidenceFactors.push(contextConfidence);
    }
    if (historicalDecisions.length > 0) confidenceFactors.push(Math.min(1, historicalDecisions.length / 5));

    const overallConfidence = confidenceFactors.length > 0
      ? confidenceFactors.reduce((a, b) => a + b, 0) / confidenceFactors.length
      : 0;

    const processingTimeMs = Date.now() - startTime;

    // Build fused context
    const fusedContext: FusedContext = {
      brandMemory,
      brandSummary: summarizeBrandMemory(brandMemory),
      assets,
      assetsSummary: summarizeAssets(assets),
      projectContext,
      projectSummary: summarizeProjectContext(projectContext),
      canvasState: input.canvasState || null,
      canvasSummary: summarizeCanvasState(input.canvasState || null),
      historicalDecisions,
      historicalSummary: summarizeHistoricalDecisions(historicalDecisions),
      fusionWeights,
      confidence: overallConfidence,
      processingTimeMs,
    };

    // Log fusion event for audit
    await supabase.from("rumi_context_fusion_log").insert({
      user_id: input.userId,
      brand_memory_used: !!brandMemory,
      tagged_assets_count: assets.length,
      tagged_projects_count: input.taggedProjects?.length || 0,
      canvas_context_used: !!input.canvasState,
      historical_decisions_count: historicalDecisions.length,
      fusion_weights: fusionWeights,
      processing_time_ms: processingTimeMs,
      result_summary: {
        confidence: overallConfidence,
        brandSummary: fusedContext.brandSummary,
        projectSummary: fusedContext.projectSummary,
      },
    });

    console.log(`Context fusion completed in ${processingTimeMs}ms, confidence: ${(overallConfidence * 100).toFixed(1)}%`);

    return new Response(
      JSON.stringify({ success: true, context: fusedContext }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Context Fusion Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types for the Brand Cognition Engine
interface DesignData {
  id: string;
  type: 'artboard' | 'canvas_object' | 'design_asset';
  colors?: string[];
  fonts?: string[];
  dimensions?: { width: number; height: number };
  layout?: LayoutGraph;
  metadata?: Record<string, unknown>;
}

interface LayoutGraph {
  nodes: {
    id: string;
    type: 'text_block' | 'image_container' | 'cta_element' | 'background_layer';
    position: { x: number; y: number; width: number; height: number };
    properties: Record<string, unknown>;
  }[];
  edges: {
    source: string;
    target: string;
    relationship: 'spatial' | 'hierarchy' | 'grouping';
    weight: number;
  }[];
}

interface VisualFeatures {
  dominant_colors: string[];
  color_saturation_mean: number;
  color_temperature: 'warm' | 'cool' | 'neutral';
  typography_weights: Record<string, number>;
  layout_type: 'grid' | 'freeform' | 'centered' | 'asymmetric';
  layout_density: number;
  text_density: number;
  visual_hierarchy_score: number;
}

interface BrandCognitionUpdate {
  visual_patterns: Record<string, unknown>;
  typography_usage: Record<string, number>;
  layout_density_patterns: Record<string, number>;
  color_relationship_vectors: Record<string, unknown>;
  emotional_tone_mapping: Record<string, number>;
}

// Extract visual features from design data
function extractVisualFeatures(designData: DesignData): VisualFeatures {
  const colors = designData.colors || [];
  
  // Calculate color saturation mean
  const saturationMean = colors.length > 0 
    ? colors.reduce((acc, color) => {
        // Simple heuristic - could be enhanced with proper color parsing
        const isVivid = !color.includes('#fff') && !color.includes('#000') && !color.includes('gray');
        return acc + (isVivid ? 0.7 : 0.3);
      }, 0) / colors.length
    : 0.5;

  // Determine color temperature
  const warmColors = colors.filter(c => 
    c.includes('red') || c.includes('orange') || c.includes('yellow') || 
    c.match(/#[a-f][0-9a-f]{5}/i)
  ).length;
  const coolColors = colors.filter(c => 
    c.includes('blue') || c.includes('green') || c.includes('purple') ||
    c.match(/#[0-5][0-9a-f]{5}/i)
  ).length;
  
  const colorTemperature: 'warm' | 'cool' | 'neutral' = 
    warmColors > coolColors ? 'warm' : 
    coolColors > warmColors ? 'cool' : 'neutral';

  // Typography weights from fonts
  const fonts = designData.fonts || [];
  const typographyWeights: Record<string, number> = {};
  fonts.forEach(font => {
    typographyWeights[font] = (typographyWeights[font] || 0) + 1;
  });

  // Layout analysis
  const layout = designData.layout;
  let layoutType: 'grid' | 'freeform' | 'centered' | 'asymmetric' = 'freeform';
  let layoutDensity = 0.5;
  let textDensity = 0.3;

  if (layout && layout.nodes.length > 0) {
    const textBlocks = layout.nodes.filter(n => n.type === 'text_block');
    const totalArea = designData.dimensions 
      ? designData.dimensions.width * designData.dimensions.height 
      : 1000000;
    
    const occupiedArea = layout.nodes.reduce((acc, node) => 
      acc + (node.position.width * node.position.height), 0
    );
    
    layoutDensity = Math.min(1, occupiedArea / totalArea);
    textDensity = textBlocks.length / Math.max(1, layout.nodes.length);

    // Determine layout type based on node positions
    const centerX = designData.dimensions ? designData.dimensions.width / 2 : 500;
    const centeredNodes = layout.nodes.filter(n => 
      Math.abs((n.position.x + n.position.width / 2) - centerX) < 100
    );
    
    if (centeredNodes.length > layout.nodes.length * 0.6) {
      layoutType = 'centered';
    } else if (layout.edges.filter(e => e.relationship === 'grouping').length > 2) {
      layoutType = 'grid';
    } else {
      layoutType = 'asymmetric';
    }
  }

  return {
    dominant_colors: colors.slice(0, 5),
    color_saturation_mean: saturationMean,
    color_temperature: colorTemperature,
    typography_weights: typographyWeights,
    layout_type: layoutType,
    layout_density: layoutDensity,
    text_density: textDensity,
    visual_hierarchy_score: textDensity > 0.4 ? 0.7 : 0.5,
  };
}

// Generate brand embedding update based on features
function generateCognitionUpdate(
  features: VisualFeatures,
  existingMemory: BrandCognitionUpdate | null
): BrandCognitionUpdate {
  const baseWeight = 0.3; // Weight for new data vs existing
  
  const newUpdate: BrandCognitionUpdate = {
    visual_patterns: {
      dominant_colors: features.dominant_colors,
      color_saturation_mean: features.color_saturation_mean,
      color_temperature: features.color_temperature,
      layout_type: features.layout_type,
    },
    typography_usage: features.typography_weights,
    layout_density_patterns: {
      density: features.layout_density,
      text_ratio: features.text_density,
    },
    color_relationship_vectors: {
      saturation: features.color_saturation_mean,
      temperature: features.color_temperature === 'warm' ? 1 : 
                   features.color_temperature === 'cool' ? -1 : 0,
    },
    emotional_tone_mapping: {
      energetic: features.color_saturation_mean * (features.color_temperature === 'warm' ? 1.2 : 0.8),
      calm: features.layout_density < 0.5 ? 0.7 : 0.3,
      professional: features.layout_type === 'grid' ? 0.8 : 0.5,
      creative: features.layout_type === 'asymmetric' ? 0.8 : 0.4,
    },
  };

  if (!existingMemory) {
    return newUpdate;
  }

  // Merge with existing memory using exponential moving average
  return {
    visual_patterns: { ...existingMemory.visual_patterns, ...newUpdate.visual_patterns },
    typography_usage: mergeWeights(existingMemory.typography_usage, newUpdate.typography_usage, baseWeight),
    layout_density_patterns: mergeWeights(
      existingMemory.layout_density_patterns as Record<string, number>, 
      newUpdate.layout_density_patterns, 
      baseWeight
    ),
    color_relationship_vectors: { 
      ...existingMemory.color_relationship_vectors, 
      ...newUpdate.color_relationship_vectors 
    },
    emotional_tone_mapping: mergeWeights(
      existingMemory.emotional_tone_mapping, 
      newUpdate.emotional_tone_mapping, 
      baseWeight
    ),
  };
}

// Merge weight vectors with exponential moving average
function mergeWeights(
  existing: Record<string, number>, 
  incoming: Record<string, number>, 
  newWeight: number
): Record<string, number> {
  const result: Record<string, number> = { ...existing };
  
  for (const [key, value] of Object.entries(incoming)) {
    if (result[key] !== undefined) {
      result[key] = result[key] * (1 - newWeight) + value * newWeight;
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, userId, brandId, designData, eventType } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "process_design": {
        // Process a design and update brand cognition memory
        if (!brandId || !designData) {
          return new Response(
            JSON.stringify({ error: "Missing brandId or designData" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Extract visual features
        const features = extractVisualFeatures(designData as DesignData);
        console.log("Extracted features:", features);

        // Get existing brand cognition memory
        const { data: existingMemory } = await supabase
          .from("brand_cognition_memory")
          .select("*")
          .eq("brand_id", brandId)
          .eq("user_id", userId)
          .single();

        // Generate cognition update
        const cognitionUpdate = generateCognitionUpdate(
          features, 
          existingMemory as BrandCognitionUpdate | null
        );

        // Upsert brand cognition memory
        const { error: upsertError } = await supabase
          .from("brand_cognition_memory")
          .upsert({
            brand_id: brandId,
            user_id: userId,
            visual_patterns: cognitionUpdate.visual_patterns,
            typography_usage: cognitionUpdate.typography_usage,
            layout_density_patterns: cognitionUpdate.layout_density_patterns,
            color_relationship_vectors: cognitionUpdate.color_relationship_vectors,
            emotional_tone_mapping: cognitionUpdate.emotional_tone_mapping,
            total_designs_analyzed: (existingMemory?.total_designs_analyzed || 0) + 1,
            confidence_score: Math.min(1, ((existingMemory?.total_designs_analyzed || 0) + 1) * 0.1),
            last_updated_at: new Date().toISOString(),
          }, {
            onConflict: "brand_id,user_id",
          });

        if (upsertError) {
          console.error("Upsert error:", upsertError);
          throw new Error("Failed to update brand cognition memory");
        }

        // Record design event
        if (eventType) {
          await supabase.from("brand_design_events").insert({
            brand_id: brandId,
            user_id: userId,
            project_id: designData.projectId || null,
            event_type: eventType,
            design_snapshot: designData,
            visual_features: features,
          });
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            features,
            cognitionUpdated: true,
            designsAnalyzed: (existingMemory?.total_designs_analyzed || 0) + 1,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_cognition": {
        // Retrieve brand cognition memory
        if (!brandId) {
          return new Response(
            JSON.stringify({ error: "Missing brandId" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: memory, error } = await supabase
          .from("brand_cognition_memory")
          .select("*")
          .eq("brand_id", brandId)
          .eq("user_id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        return new Response(
          JSON.stringify({ success: true, memory: memory || null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_design_history": {
        // Get recent design events for a brand
        const limit = 50;
        
        const { data: events, error } = await supabase
          .from("brand_design_events")
          .select("*")
          .eq("user_id", userId)
          .eq("brand_id", brandId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, events: events || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Brand Cognition Engine Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

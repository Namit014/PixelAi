import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface DesignSnapshot {
  colors?: string[];
  typography?: { fontFamily?: string; fontWeight?: number }[];
  layoutDensity?: number;
  emotionalTone?: string;
  dimensions?: { width: number; height: number };
}

interface BrandCognitionMemory {
  visual_patterns: {
    color_temperature?: string;
    layout_type?: string;
    avg_density?: number;
  };
  typography_usage: Record<string, number>;
  emotional_tone_mapping: Record<string, number>;
  color_relationship_vectors: {
    dominant_colors?: string[];
    color_harmony?: string;
  };
  design_risk_tolerance: number;
  confidence_score: number;
}

interface DriftDimension {
  score: number;
  deviation: string;
  current: unknown;
  expected: unknown;
  severity: "info" | "warning" | "critical";
}

interface DriftAnalysis {
  overall_drift_score: number;
  dimensions: {
    color: DriftDimension;
    typography: DriftDimension;
    layout: DriftDimension;
    tone: DriftDimension;
  };
  alerts: {
    drift_type: string;
    severity: string;
    deviation_score: number;
    correction_suggestion: string;
    current_value: unknown;
    expected_range: unknown;
  }[];
  suggestions: string[];
  requires_attention: boolean;
}

// Color distance calculation (simplified hex-based)
function colorDistance(hex1: string, hex2: string): number {
  const parseHex = (hex: string) => {
    const clean = hex.replace("#", "");
    return {
      r: parseInt(clean.substring(0, 2), 16) || 0,
      g: parseInt(clean.substring(2, 4), 16) || 0,
      b: parseInt(clean.substring(4, 6), 16) || 0,
    };
  };

  const c1 = parseHex(hex1);
  const c2 = parseHex(hex2);

  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  ) / 441.67; // Normalize to 0-1 range (max distance is sqrt(3 * 255^2))
}

// Calculate minimum color distance to brand palette
function calculateColorDrift(
  designColors: string[],
  brandColors: string[]
): { score: number; farthestColor: string | null } {
  if (!designColors?.length || !brandColors?.length) {
    return { score: 0, farthestColor: null };
  }

  let maxDrift = 0;
  let farthestColor: string | null = null;

  for (const designColor of designColors) {
    const minDistance = Math.min(
      ...brandColors.map((brandColor) => colorDistance(designColor, brandColor))
    );
    if (minDistance > maxDrift) {
      maxDrift = minDistance;
      farthestColor = designColor;
    }
  }

  return { score: maxDrift * 100, farthestColor };
}

// Calculate typography drift
function calculateTypographyDrift(
  designTypography: { fontFamily?: string }[],
  brandTypography: Record<string, number>
): { score: number; unknownFonts: string[] } {
  if (!designTypography?.length) {
    return { score: 0, unknownFonts: [] };
  }

  const brandFonts = Object.keys(brandTypography);
  const unknownFonts: string[] = [];

  for (const typog of designTypography) {
    if (typog.fontFamily && !brandFonts.some(
      (bf) => bf.toLowerCase().includes(typog.fontFamily!.toLowerCase()) ||
              typog.fontFamily!.toLowerCase().includes(bf.toLowerCase())
    )) {
      unknownFonts.push(typog.fontFamily);
    }
  }

  const driftScore = (unknownFonts.length / designTypography.length) * 100;
  return { score: driftScore, unknownFonts: [...new Set(unknownFonts)] };
}

// Calculate layout density drift
function calculateLayoutDrift(
  designDensity: number | undefined,
  brandAvgDensity: number | undefined,
  riskTolerance: number
): { score: number; deviation: number } {
  if (designDensity === undefined || brandAvgDensity === undefined) {
    return { score: 0, deviation: 0 };
  }

  const deviation = Math.abs(designDensity - brandAvgDensity);
  // Adjust score based on risk tolerance (higher tolerance = lower score)
  const adjustedScore = deviation * 100 * (1 - riskTolerance * 0.5);

  return { score: Math.min(100, adjustedScore), deviation };
}

// Calculate emotional tone drift
function calculateToneDrift(
  designTone: string | undefined,
  brandToneMapping: Record<string, number>
): { score: number; expectedTone: string | null } {
  if (!designTone || !Object.keys(brandToneMapping).length) {
    return { score: 0, expectedTone: null };
  }

  // Find dominant brand tone
  const [dominantTone, dominantWeight] = Object.entries(brandToneMapping)
    .sort(([, a], [, b]) => b - a)[0] || [null, 0];

  if (!dominantTone) {
    return { score: 0, expectedTone: null };
  }

  // Check if design tone matches dominant brand tones
  const toneMatch = designTone.toLowerCase() === dominantTone.toLowerCase();
  const score = toneMatch ? 0 : (dominantWeight > 0.5 ? 50 : 30);

  return { score, expectedTone: dominantTone };
}

// Determine severity based on score
function getSeverity(score: number): "info" | "warning" | "critical" {
  if (score >= 70) return "critical";
  if (score >= 40) return "warning";
  return "info";
}

// Generate correction suggestions
function generateSuggestions(analysis: DriftAnalysis): string[] {
  const suggestions: string[] = [];

  if (analysis.dimensions.color.score > 30) {
    suggestions.push(
      `Consider using brand colors instead of ${analysis.dimensions.color.current}`
    );
  }

  if (analysis.dimensions.typography.score > 0) {
    const unknownFonts = analysis.dimensions.typography.current as string[];
    if (unknownFonts?.length) {
      suggestions.push(
        `Replace non-brand fonts (${unknownFonts.join(", ")}) with approved typography`
      );
    }
  }

  if (analysis.dimensions.layout.score > 40) {
    suggestions.push(
      "Adjust layout density to match brand's typical visual weight"
    );
  }

  if (analysis.dimensions.tone.score > 30) {
    suggestions.push(
      `Shift emotional tone towards "${analysis.dimensions.tone.expected}" to align with brand`
    );
  }

  return suggestions;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { brandId, userId, projectId, designSnapshot } = await req.json() as {
      brandId: string;
      userId: string;
      projectId?: string;
      designSnapshot: DesignSnapshot;
    };

    if (!brandId || !userId || !designSnapshot) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: brandId, userId, designSnapshot" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing drift for brand ${brandId}, user ${userId.substring(0, 8)}...`);

    // Fetch brand cognition memory
    const { data: cognition, error: cognitionError } = await supabase
      .from("brand_cognition_memory")
      .select("*")
      .eq("brand_id", brandId)
      .eq("user_id", userId)
      .single();

    if (cognitionError || !cognition) {
      // No brand memory yet - can't detect drift
      return new Response(
        JSON.stringify({
          overall_drift_score: 0,
          dimensions: {
            color: { score: 0, deviation: "No brand memory", current: null, expected: null, severity: "info" },
            typography: { score: 0, deviation: "No brand memory", current: null, expected: null, severity: "info" },
            layout: { score: 0, deviation: "No brand memory", current: null, expected: null, severity: "info" },
            tone: { score: 0, deviation: "No brand memory", current: null, expected: null, severity: "info" },
          },
          alerts: [],
          suggestions: ["Build brand memory by creating more designs"],
          requires_attention: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const brandMemory = cognition as unknown as BrandCognitionMemory;

    // Calculate drift for each dimension
    const colorDrift = calculateColorDrift(
      designSnapshot.colors || [],
      brandMemory.color_relationship_vectors?.dominant_colors || []
    );

    const typographyDrift = calculateTypographyDrift(
      designSnapshot.typography || [],
      brandMemory.typography_usage || {}
    );

    const layoutDrift = calculateLayoutDrift(
      designSnapshot.layoutDensity,
      brandMemory.visual_patterns?.avg_density,
      brandMemory.design_risk_tolerance || 0.5
    );

    const toneDrift = calculateToneDrift(
      designSnapshot.emotionalTone,
      brandMemory.emotional_tone_mapping || {}
    );

    // Build analysis result
    const analysis: DriftAnalysis = {
      overall_drift_score: Math.round(
        (colorDrift.score * 0.3 +
         typographyDrift.score * 0.25 +
         layoutDrift.score * 0.25 +
         toneDrift.score * 0.2)
      ),
      dimensions: {
        color: {
          score: Math.round(colorDrift.score),
          deviation: colorDrift.farthestColor
            ? `Color ${colorDrift.farthestColor} differs from brand palette`
            : "Within brand palette",
          current: colorDrift.farthestColor,
          expected: brandMemory.color_relationship_vectors?.dominant_colors,
          severity: getSeverity(colorDrift.score),
        },
        typography: {
          score: Math.round(typographyDrift.score),
          deviation: typographyDrift.unknownFonts.length
            ? `Using non-brand fonts: ${typographyDrift.unknownFonts.join(", ")}`
            : "Using approved fonts",
          current: typographyDrift.unknownFonts,
          expected: Object.keys(brandMemory.typography_usage || {}),
          severity: getSeverity(typographyDrift.score),
        },
        layout: {
          score: Math.round(layoutDrift.score),
          deviation: layoutDrift.deviation > 0.2
            ? `Layout density ${(layoutDrift.deviation * 100).toFixed(0)}% different from brand average`
            : "Layout density within range",
          current: designSnapshot.layoutDensity,
          expected: brandMemory.visual_patterns?.avg_density,
          severity: getSeverity(layoutDrift.score),
        },
        tone: {
          score: Math.round(toneDrift.score),
          deviation: toneDrift.expectedTone && designSnapshot.emotionalTone !== toneDrift.expectedTone
            ? `Current tone "${designSnapshot.emotionalTone}" differs from brand tone "${toneDrift.expectedTone}"`
            : "Tone aligns with brand",
          current: designSnapshot.emotionalTone,
          expected: toneDrift.expectedTone,
          severity: getSeverity(toneDrift.score),
        },
      },
      alerts: [],
      suggestions: [],
      requires_attention: false,
    };

    // Generate alerts for significant drift
    const alertThreshold = 40;

    if (colorDrift.score > alertThreshold) {
      analysis.alerts.push({
        drift_type: "color_risk",
        severity: getSeverity(colorDrift.score),
        deviation_score: colorDrift.score,
        correction_suggestion: "Use colors from brand palette",
        current_value: colorDrift.farthestColor,
        expected_range: brandMemory.color_relationship_vectors?.dominant_colors,
      });
    }

    if (typographyDrift.score > alertThreshold) {
      analysis.alerts.push({
        drift_type: "typography_deviation",
        severity: getSeverity(typographyDrift.score),
        deviation_score: typographyDrift.score,
        correction_suggestion: "Switch to approved brand fonts",
        current_value: typographyDrift.unknownFonts,
        expected_range: Object.keys(brandMemory.typography_usage || {}),
      });
    }

    if (layoutDrift.score > alertThreshold) {
      analysis.alerts.push({
        drift_type: "layout_drift",
        severity: getSeverity(layoutDrift.score),
        deviation_score: layoutDrift.score,
        correction_suggestion: "Adjust element spacing to match brand density",
        current_value: designSnapshot.layoutDensity,
        expected_range: { avg: brandMemory.visual_patterns?.avg_density },
      });
    }

    if (toneDrift.score > alertThreshold) {
      analysis.alerts.push({
        drift_type: "tone_shift",
        severity: getSeverity(toneDrift.score),
        deviation_score: toneDrift.score,
        correction_suggestion: `Adjust design to convey "${toneDrift.expectedTone}" tone`,
        current_value: designSnapshot.emotionalTone,
        expected_range: toneDrift.expectedTone,
      });
    }

    // Generate suggestions
    analysis.suggestions = generateSuggestions(analysis);
    analysis.requires_attention = analysis.alerts.some(
      (a) => a.severity === "warning" || a.severity === "critical"
    );

    // Store alerts if significant drift detected
    if (analysis.alerts.length > 0) {
      const alertsToInsert = analysis.alerts.map((alert) => ({
        brand_id: brandId,
        project_id: projectId || null,
        user_id: userId,
        drift_type: alert.drift_type,
        severity: alert.severity,
        deviation_score: alert.deviation_score,
        current_value: alert.current_value,
        expected_range: alert.expected_range,
        correction_suggestion: alert.correction_suggestion,
      }));

      await supabase.from("brand_drift_alerts").insert(alertsToInsert);
      console.log(`Stored ${alertsToInsert.length} drift alerts`);
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Drift detection error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Drift detection failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

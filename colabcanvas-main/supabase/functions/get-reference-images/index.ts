import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing required environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      throw new Error("Invalid authentication token");
    }
    const user = { id: claimsData.claims.sub as string };

    const { project_id, category, keywords, limit = 20 } = await req.json();

    console.log("Get reference images request:", { 
      userId: user.id, 
      projectId: project_id,
      category,
      keywords: keywords?.substring(0, 50),
      limit 
    });

    // Simple query: fetch more candidates for randomization
    console.log('🔍 Fetching reference images with category filter...');
    
    let query = supabase
      .from("reference_images")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit * 3); // Get 3x more candidates for better randomization

    if (category) {
      query = query.contains("tags", [category.toLowerCase()]);
    }

    const { data: images, error } = await query;

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    // Fisher-Yates shuffle for proper randomization (not the broken sort() method)
    const shuffle = <T>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const shuffled = shuffle(images || []);
    const randomSelection = shuffled.slice(0, limit);

    console.log(`✅ Found ${images?.length || 0} total images, returning ${randomSelection.length} random selection`);

    return new Response(
      JSON.stringify({
        success: true,
        images: randomSelection,
        count: randomSelection.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in get-reference-images function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        images: [],
        count: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

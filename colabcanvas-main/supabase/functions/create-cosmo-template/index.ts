import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pre-defined template configurations
const TEMPLATE_CONFIGS: Record<string, {
  title: string;
  description: string;
  nodes: any[];
  edges: any[];
}> = {
  "welcome-to-cosmo": {
    title: "Welcome to Cosmo",
    description: "A simple introduction to Cosmo workflows",
    nodes: [
      {
        id: "node-1",
        type: "cosmoNode",
        position: { x: 100, y: 200 },
        data: {
          nodeType: "textInput",
          label: "Welcome Message",
          config: {
            text: "Welcome to Cosmo! This is a sample workflow to help you get started. Try connecting nodes to create powerful AI pipelines."
          }
        }
      },
      {
        id: "node-2",
        type: "cosmoNode",
        position: { x: 450, y: 200 },
        data: {
          nodeType: "assistant",
          label: "AI Assistant",
          config: {
            instruction: "Explain what this workflow does and suggest ways to extend it."
          }
        }
      }
    ],
    edges: [
      { id: "edge-1-2", source: "node-1", target: "node-2" }
    ]
  },
  "create-images": {
    title: "Create Images in Cosmo",
    description: "Generate images from text prompts",
    nodes: [
      {
        id: "node-1",
        type: "cosmoNode",
        position: { x: 100, y: 200 },
        data: {
          nodeType: "promptInput",
          label: "Image Prompt",
          config: {
            prompt: "A beautiful sunset over mountains, photorealistic, 8k resolution"
          }
        }
      },
      {
        id: "node-2",
        type: "cosmoNode",
        position: { x: 450, y: 200 },
        data: {
          nodeType: "imageGenerator",
          label: "Image Generator",
          config: {
            model: "gemini-2.5-flash-image",
            designType: "illustration"
          }
        }
      },
      {
        id: "node-3",
        type: "cosmoNode",
        position: { x: 800, y: 200 },
        data: {
          nodeType: "imageOutput",
          label: "Output Image",
          config: {}
        }
      }
    ],
    edges: [
      { id: "edge-1-2", source: "node-1", target: "node-2" },
      { id: "edge-2-3", source: "node-2", target: "node-3" }
    ]
  },
  "create-video": {
    title: "Create Your First Video",
    description: "Generate videos from text prompts",
    nodes: [
      {
        id: "node-1",
        type: "cosmoNode",
        position: { x: 100, y: 200 },
        data: {
          nodeType: "promptInput",
          label: "Video Prompt",
          config: {
            prompt: "A cinematic drone shot flying over a tropical beach at golden hour"
          }
        }
      },
      {
        id: "node-2",
        type: "cosmoNode",
        position: { x: 450, y: 200 },
        data: {
          nodeType: "videoGenerator",
          label: "Video Generator",
          config: {}
        }
      },
      {
        id: "node-3",
        type: "cosmoNode",
        position: { x: 800, y: 200 },
        data: {
          nodeType: "export",
          label: "Export Video",
          config: {}
        }
      }
    ],
    edges: [
      { id: "edge-1-2", source: "node-1", target: "node-2" },
      { id: "edge-2-3", source: "node-2", target: "node-3" }
    ]
  },
  "explore-cosmo": {
    title: "Explore How Cosmo Works",
    description: "Learn about node connections and data flow",
    nodes: [
      {
        id: "node-1",
        type: "cosmoNode",
        position: { x: 100, y: 100 },
        data: {
          nodeType: "textInput",
          label: "Text Input",
          config: {
            text: "This is a text input node. It provides text data to connected nodes."
          }
        }
      },
      {
        id: "node-2",
        type: "cosmoNode",
        position: { x: 100, y: 350 },
        data: {
          nodeType: "promptInput",
          label: "Prompt Input",
          config: {
            prompt: "A creative prompt for image generation"
          }
        }
      },
      {
        id: "node-3",
        type: "cosmoNode",
        position: { x: 450, y: 225 },
        data: {
          nodeType: "assistant",
          label: "AI Processor",
          config: {
            instruction: "Combine the inputs and enhance them for creative output"
          }
        }
      }
    ],
    edges: [
      { id: "edge-1-3", source: "node-1", target: "node-3" },
      { id: "edge-2-3", source: "node-2", target: "node-3" }
    ]
  },
  "moodboard": {
    title: "Use Cosmo as Moodboard",
    description: "Create visual moodboards with AI-generated images",
    nodes: [
      {
        id: "node-1",
        type: "cosmoNode",
        position: { x: 100, y: 200 },
        data: {
          nodeType: "upload",
          label: "Upload Reference",
          config: {
            imageUrl: ""
          }
        }
      },
      {
        id: "node-2",
        type: "cosmoNode",
        position: { x: 450, y: 50 },
        data: {
          nodeType: "imageGenerator",
          label: "Variation 1",
          config: {
            model: "gemini-2.5-flash-image",
            prompt: "Create a variation with warm tones"
          }
        }
      },
      {
        id: "node-3",
        type: "cosmoNode",
        position: { x: 450, y: 200 },
        data: {
          nodeType: "imageGenerator",
          label: "Variation 2",
          config: {
            model: "gemini-2.5-flash-image",
            prompt: "Create a variation with cool tones"
          }
        }
      },
      {
        id: "node-4",
        type: "cosmoNode",
        position: { x: 450, y: 350 },
        data: {
          nodeType: "imageGenerator",
          label: "Variation 3",
          config: {
            model: "gemini-2.5-flash-image",
            prompt: "Create a minimalist variation"
          }
        }
      }
    ],
    edges: [
      { id: "edge-1-2", source: "node-1", target: "node-2" },
      { id: "edge-1-3", source: "node-1", target: "node-3" },
      { id: "edge-1-4", source: "node-1", target: "node-4" }
    ]
  }
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

    const jwt = (authHeader ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: claimsData.claims.sub as string };

    const { templateId } = await req.json();

    if (!templateId || !TEMPLATE_CONFIGS[templateId]) {
      return new Response(
        JSON.stringify({ error: "Invalid template ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const template = TEMPLATE_CONFIGS[templateId];

    // Create the workflow
    const { data: workflow, error: workflowError } = await supabaseClient
      .from("workflows")
      .insert({
        user_id: user.id,
        title: template.title,
        description: template.description,
      })
      .select()
      .single();

    if (workflowError) {
      console.error("Error creating workflow:", workflowError);
      throw workflowError;
    }

    // Create workflow nodes - label goes inside config JSONB, not as separate column
    const nodesToInsert = template.nodes.map(node => ({
      workflow_id: workflow.id,
      node_id: node.id,
      node_type: node.data.nodeType,
      position_x: node.position.x,
      position_y: node.position.y,
      config: { ...(node.data.config || {}), label: node.data.label },
    }));

    const { error: nodesError } = await supabaseClient
      .from("workflow_nodes")
      .insert(nodesToInsert);

    if (nodesError) {
      console.error("Error creating workflow nodes:", nodesError);
      // Cleanup workflow if nodes fail
      await supabaseClient.from("workflows").delete().eq("id", workflow.id);
      throw nodesError;
    }

    // Create workflow edges
    if (template.edges.length > 0) {
      const edgesToInsert = template.edges.map(edge => ({
        workflow_id: workflow.id,
        edge_id: edge.id,
        source_node_id: edge.source,
        target_node_id: edge.target,
      }));

      const { error: edgesError } = await supabaseClient
        .from("workflow_edges")
        .insert(edgesToInsert);

      if (edgesError) {
        console.error("Error creating workflow edges:", edgesError);
        // Continue anyway, edges are not critical
      }
    }

    console.log(`Created template workflow: ${workflow.id} from template: ${templateId}`);

    return new Response(
      JSON.stringify({
        success: true,
        workflowId: workflow.id,
        title: template.title,
        nodeCount: template.nodes.length,
        edgeCount: template.edges.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-cosmo-template:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

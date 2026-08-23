import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowNode {
  type: string;
  label: string;
  config: Record<string, any>;
}

interface WorkflowPlan {
  title: string;
  description: string;
  nodes: WorkflowNode[];
  connections: { from: number; to: number }[];
}

const WORKFLOW_PLANNER_PROMPT = `You are a workflow planning AI for Cosmo, a visual node-based creative tool.

Analyze the user's request and generate a workflow structure that accomplishes their goal.

Available node types:
- textInput: For static text/prompts (use for the user's main creative brief)
- promptInput: For dynamic prompt input from user
- upload: For uploading reference images
- assistant: AI text enhancement - improves and expands prompts (IMPORTANT: always use before image/video generation)
- imageGenerator: Creates images from text prompts (config: { model: "flux", aspectRatio: "1:1", iterations: 1 })
- videoGenerator: Creates videos from text/images (config: { model: "ray2", aspectRatio: "16:9", duration: 5 })
- upscaler: Upscales images to higher resolution
- batchGenerator: Generates multiple variations (config: { count: 4 })
- conditional: Branch logic based on conditions
- merge: Combine multiple outputs into one
- imageOutput: Final image output display
- videoOutput: Final video output display
- export: Export results for download

IMPORTANT RULES:
1. Always start with textInput containing the user's prompt
2. ALWAYS use 'assistant' node before imageGenerator or videoGenerator to enhance the prompt
3. Always end with appropriate output node (imageOutput, videoOutput, or export)
4. Keep workflows simple and efficient - typically 3-6 nodes
5. For batch/variation requests, use batchGenerator with appropriate count

Return ONLY valid JSON with this exact structure:
{
  "title": "Short descriptive workflow name",
  "description": "One sentence describing what this workflow does",
  "nodes": [
    { "type": "nodeType", "label": "Display name", "config": { ... } }
  ],
  "connections": [
    { "from": 0, "to": 1 }
  ]
}

Example for "Create a logo for a coffee shop":
{
  "title": "Coffee Shop Logo",
  "description": "Generates a professional logo design for a coffee shop",
  "nodes": [
    { "type": "textInput", "label": "Creative Brief", "config": { "text": "Create a minimalist, modern logo for a coffee shop. The logo should convey warmth, quality coffee, and a welcoming atmosphere. Use coffee-related imagery like coffee beans, cups, or steam." } },
    { "type": "assistant", "label": "Prompt Enhancer", "config": { "model": "gemini-flash", "temperature": 0.7 } },
    { "type": "imageGenerator", "label": "Logo Generator", "config": { "model": "flux", "aspectRatio": "1:1", "iterations": 1 } },
    { "type": "imageOutput", "label": "Final Logo", "config": {} }
  ],
  "connections": [
    { "from": 0, "to": 1 },
    { "from": 1, "to": 2 },
    { "from": 2, "to": 3 }
  ]
}

Example for "Generate 4 poster variations":
{
  "title": "Poster Variations",
  "description": "Creates multiple poster design variations",
  "nodes": [
    { "type": "promptInput", "label": "Poster Brief", "config": {} },
    { "type": "assistant", "label": "Prompt Enhancer", "config": { "model": "gemini-flash", "temperature": 0.8 } },
    { "type": "batchGenerator", "label": "Variation Generator", "config": { "count": 4 } },
    { "type": "export", "label": "Export All", "config": {} }
  ],
  "connections": [
    { "from": 0, "to": 1 },
    { "from": 1, "to": 2 },
    { "from": 2, "to": 3 }
  ]
}`;

function calculateNodePositions(nodes: WorkflowNode[]) {
  const HORIZONTAL_GAP = 320;
  const VERTICAL_OFFSET = 40;
  const START_X = 100;
  const START_Y = 200;
  
  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: START_X + (index * HORIZONTAL_GAP),
      y: START_Y + (index % 2 === 0 ? 0 : VERTICAL_OFFSET)
    }
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating workflow for user ${user.id} with prompt: ${prompt}`);

    // Call Lovable AI to plan the workflow
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: WORKFLOW_PLANNER_PROMPT },
          { role: 'user', content: `Create a workflow for: ${prompt}` }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', aiContent);

    // Parse the JSON from AI response
    let workflowPlan: WorkflowPlan;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      workflowPlan = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse workflow plan from AI');
    }

    // Validate the workflow plan
    if (!workflowPlan.title || !workflowPlan.nodes || !Array.isArray(workflowPlan.nodes) || workflowPlan.nodes.length === 0) {
      throw new Error('Invalid workflow plan structure');
    }

    // Calculate node positions
    const nodesWithPositions = calculateNodePositions(workflowPlan.nodes);

    // Create the workflow in database
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        user_id: user.id,
        title: workflowPlan.title,
        description: workflowPlan.description || `Auto-generated from: ${prompt.substring(0, 100)}`,
        is_template: false,
        is_public: false,
        tags: ['ai-generated'],
      })
      .select()
      .single();

    if (workflowError) {
      console.error('Failed to create workflow:', workflowError);
      throw new Error('Failed to create workflow in database');
    }

    console.log('Created workflow:', workflow.id);

    // Create nodes - match actual workflow_nodes schema
    const nodeInserts = nodesWithPositions.map((node, index) => ({
      workflow_id: workflow.id,
      node_id: `node-${index}-${Date.now()}`,
      node_type: node.type,
      position_x: node.position.x,
      position_y: node.position.y,
      config: { ...(node.config || {}), label: node.label },
    }));

    const { data: createdNodes, error: nodesError } = await supabase
      .from('workflow_nodes')
      .insert(nodeInserts)
      .select();

    if (nodesError) {
      console.error('Failed to create nodes:', nodesError);
      // Cleanup: delete the workflow
      await supabase.from('workflows').delete().eq('id', workflow.id);
      throw new Error('Failed to create workflow nodes');
    }

    console.log('Created nodes:', createdNodes.length);

    // Create edges based on connections
    if (workflowPlan.connections && workflowPlan.connections.length > 0) {
      const edgeInserts = workflowPlan.connections.map((conn) => {
        const sourceNode = createdNodes[conn.from];
        const targetNode = createdNodes[conn.to];
        
        if (!sourceNode || !targetNode) {
          console.warn(`Invalid connection: from ${conn.from} to ${conn.to}`);
          return null;
        }

        return {
          workflow_id: workflow.id,
          source_node_id: sourceNode.id,
          target_node_id: targetNode.id,
        };
      }).filter(Boolean);

      if (edgeInserts.length > 0) {
        const { error: edgesError } = await supabase
          .from('workflow_edges')
          .insert(edgeInserts);

        if (edgesError) {
          console.error('Failed to create edges:', edgesError);
          // Continue anyway - nodes are created, edges can be added manually
        } else {
          console.log('Created edges:', edgeInserts.length);
        }
      }
    }

    return new Response(
      JSON.stringify({
        workflowId: workflow.id,
        title: workflowPlan.title,
        description: workflowPlan.description,
        nodeCount: createdNodes.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating workflow:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate workflow' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) throw new Error('Unauthorized');
    const user = { id: claimsData.claims.sub as string };

    const { workflowId } = await req.json();

    // Get original workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError) throw workflowError;

    // Create new workflow
    const { data: newWorkflow, error: newError } = await supabase
      .from('workflows')
      .insert({
        user_id: user.id,
        title: `${workflow.title} (Fork)`,
        description: workflow.description,
        thumbnail_url: workflow.thumbnail_url,
      })
      .select()
      .single();

    if (newError) throw newError;

    // Copy nodes
    const { data: nodes } = await supabase
      .from('workflow_nodes')
      .select('*')
      .eq('workflow_id', workflowId);

    if (nodes && nodes.length > 0) {
      const newNodes = nodes.map(n => ({
        workflow_id: newWorkflow.id,
        node_id: n.node_id,
        node_type: n.node_type,
        position_x: n.position_x,
        position_y: n.position_y,
        config: n.config,
      }));

      await supabase
        .from('workflow_nodes')
        .insert(newNodes);
    }

    // Copy edges
    const { data: edges } = await supabase
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', workflowId);

    if (edges && edges.length > 0) {
      const newEdges = edges.map(e => ({
        workflow_id: newWorkflow.id,
        edge_id: e.edge_id,
        source_node_id: e.source_node_id,
        target_node_id: e.target_node_id,
        source_handle: e.source_handle,
        target_handle: e.target_handle,
      }));

      await supabase
        .from('workflow_edges')
        .insert(newEdges);
    }

    // Create fork record
    await supabase
      .from('workflow_forks')
      .insert({
        original_workflow_id: workflowId,
        forked_workflow_id: newWorkflow.id,
        forked_by: user.id,
      });

    // Increment fork count
    await supabase
      .from('workflows')
      .update({ fork_count: (workflow.fork_count || 0) + 1 })
      .eq('id', workflowId);

    return new Response(
      JSON.stringify({ workflowId: newWorkflow.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error forking workflow:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

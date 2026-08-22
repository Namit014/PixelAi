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

    const { workflowId, nodes, edges, title } = await req.json();

    // Verify ownership
    const { data: workflow } = await supabase
      .from('workflows')
      .select('user_id, title')
      .eq('id', workflowId)
      .single();

    if (!workflow || workflow.user_id !== user.id) {
      throw new Error('Unauthorized');
    }

    // Get current version count
    const { data: versions } = await supabase
      .from('workflow_versions')
      .select('version_number')
      .eq('workflow_id', workflowId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (versions?.[0]?.version_number || 0) + 1;

    // Create version snapshot
    const { error: versionError } = await supabase
      .from('workflow_versions')
      .insert({
        workflow_id: workflowId,
        version_number: nextVersion,
        snapshot: {
          nodes,
          edges,
          title: title || workflow.title,
        },
        created_by: user.id,
      });

    if (versionError) throw versionError;

    // Limit to 50 versions per workflow
    const { data: allVersions } = await supabase
      .from('workflow_versions')
      .select('id')
      .eq('workflow_id', workflowId)
      .order('version_number', { ascending: false });

    if (allVersions && allVersions.length > 50) {
      const toDelete = allVersions.slice(50).map(v => v.id);
      await supabase
        .from('workflow_versions')
        .delete()
        .in('id', toDelete);
    }

    return new Response(
      JSON.stringify({ versionNumber: nextVersion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating version:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

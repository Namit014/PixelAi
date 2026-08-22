import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Generate a random color for cursor
const cursorColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899'
];

function getRandomColor(): string {
  return cursorColors[Math.floor(Math.random() * cursorColors.length)];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verify user
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - please log in' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    const { shareToken, action } = await req.json();

    if (!shareToken) {
      return new Response(
        JSON.stringify({ error: 'Missing shareToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to access share data (bypassing RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the share
    const { data: share, error: shareError } = await supabaseAdmin
      .from('workflow_shares')
      .select(`
        *,
        workflows:workflow_id (
          id,
          title,
          user_id
        )
      `)
      .eq('share_token', shareToken)
      .eq('is_active', true)
      .single();

    if (shareError || !share) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired share link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This share link has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const workflow = share.workflows;

    // Check if user is the owner
    if (workflow.user_id === user.id) {
      return new Response(
        JSON.stringify({ 
          error: 'You are the owner of this workflow',
          workflowId: workflow.id,
          isOwner: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If just validating, return share info
    if (action === 'validate') {
      return new Response(
        JSON.stringify({
          workflowId: workflow.id,
          workflowTitle: workflow.title,
          permission: share.permission,
          valid: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Join action - create or update collaborator record
    const { data: existingCollab } = await supabaseAdmin
      .from('workflow_collaborators')
      .select('id')
      .eq('workflow_id', workflow.id)
      .eq('user_id', user.id)
      .single();

    if (existingCollab) {
      // Update existing collaborator (maybe upgrading permission)
      await supabaseAdmin
        .from('workflow_collaborators')
        .update({ 
          permission: share.permission,
          last_active_at: new Date().toISOString(),
          is_online: true
        })
        .eq('id', existingCollab.id);
    } else {
      // Create new collaborator
      const { error: insertError } = await supabaseAdmin
        .from('workflow_collaborators')
        .insert({
          workflow_id: workflow.id,
          user_id: user.id,
          permission: share.permission,
          joined_via_share_id: share.id,
          cursor_color: getRandomColor(),
          is_online: true
        });

      if (insertError) {
        console.error('Error creating collaborator:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to join workflow' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`User ${user.id} joined workflow ${workflow.id} via share ${share.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        workflowId: workflow.id,
        workflowTitle: workflow.title,
        permission: share.permission,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in accept-workflow-share:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

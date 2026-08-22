import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Verify user via local JWT
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    const { workflowId, permission, expiresInDays } = await req.json();

    if (!workflowId) {
      return new Response(
        JSON.stringify({ error: 'Missing workflowId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify workflow ownership
    const { data: workflow, error: workflowError } = await supabaseClient
      .from('workflows')
      .select('id, user_id')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return new Response(
        JSON.stringify({ error: 'Workflow not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (workflow.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Only workflow owner can share' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure share token
    const shareToken = crypto.randomUUID();

    // Calculate expiration
    let expiresAt: string | null = null;
    if (expiresInDays && expiresInDays > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expiresInDays);
      expiresAt = expirationDate.toISOString();
    }

    // Create share record
    const { data: share, error: shareError } = await supabaseClient
      .from('workflow_shares')
      .insert({
        workflow_id: workflowId,
        share_token: shareToken,
        created_by: user.id,
        permission: permission || 'view',
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (shareError) {
      console.error('Error creating share:', shareError);
      return new Response(
        JSON.stringify({ error: 'Failed to create share link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build share URL
    const origin = req.headers.get('origin') || 'https://colabcanvas.lovable.app';
    const shareUrl = `${origin}/workflow/join/${shareToken}`;

    console.log(`Share created for workflow ${workflowId} by user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        shareUrl, 
        shareToken, 
        share 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in share-workflow:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with user's auth
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { template_id } = await req.json();
    if (!template_id) {
      return new Response(
        JSON.stringify({ error: 'template_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Remixing template ${template_id} for user ${user.id}`);

    // Fetch the template
    const { data: template, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', template_id)
      .eq('is_template', true)
      .single();

    if (fetchError || !template) {
      console.error('Template fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Template not found or not a template' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a new project for the user (remix)
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: `${template.title} (Remix)`,
        description: template.description,
        canvas_data: template.canvas_data, // Deep copy via JSON
        thumbnail_url: template.thumbnail_url,
        is_template: false, // User's copy is not a template
      })
      .select()
      .single();

    if (createError || !newProject) {
      console.error('Project creation error:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create remix project' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created new project ${newProject.id} from template ${template_id}`);

    // Increment remix count on original template
    const { error: updateError } = await supabase
      .from('projects')
      .update({ remix_count: (template.remix_count || 0) + 1 })
      .eq('id', template_id);

    if (updateError) {
      console.error('Failed to increment remix count:', updateError);
      // Don't fail the whole operation if this fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        project_id: newProject.id,
        message: 'Template remixed successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in remix-template function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
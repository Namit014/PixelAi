import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const handler = async (req: Request): Promise<Response> => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ authorized: false, reason: 'unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Create service role client for admin queries
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Validate JWT locally (no network call)
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('JWT verification failed: Invalid token');
      return new Response(
        JSON.stringify({ authorized: false, reason: 'invalid_token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    const userId = claimsData.claims.sub as string;
    
    console.log('Authorization check initiated', {
      userId,
      timestamp: new Date().toISOString(),
    });

    // Parse request body for required role
    const body = await req.json().catch(() => ({}));
    const requiredRole = body.requiredRole;

    // Check user roles directly with service role privileges
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (roleError) {
      console.error('Failed to fetch user roles:', roleError);
      return new Response(
        JSON.stringify({ authorized: false, reason: 'verification_failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const userRoles = roles?.map(r => r.role) || [];
    const isAdmin = userRoles.includes('admin');
    const hasRequiredRole = !requiredRole || userRoles.includes(requiredRole);

    // Admin bypass: If user is admin, grant immediate access
    if (isAdmin) {
      console.log('Authorization granted - Admin bypass', {
        timestamp: new Date().toISOString(),
        userId,
        roles: userRoles,
      });
      return new Response(
        JSON.stringify({ authorized: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // For non-admin users, check email verification
    const { data: verification, error: verificationError } = await supabase
      .from('email_verifications')
      .select('verified')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (verificationError || !verification?.verified) {
      console.log('Authorization denied: email not verified', {
        timestamp: new Date().toISOString(),
        userId,
      });
      return new Response(
        JSON.stringify({ authorized: false, reason: 'email_not_verified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if user has required role
    if (!hasRequiredRole) {
      console.log('Authorization denied: insufficient role', {
        timestamp: new Date().toISOString(),
        userId,
        requiredRole,
        userRoles,
      });
      return new Response(
        JSON.stringify({ authorized: false, reason: 'insufficient_role' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('Authorization granted', {
      timestamp: new Date().toISOString(),
      userId,
      roles: userRoles,
    });

    return new Response(
      JSON.stringify({ authorized: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Authorization verification error:', error.message);
    return new Response(
      JSON.stringify({ authorized: false, reason: 'verification_failed', error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};

Deno.serve(handler);

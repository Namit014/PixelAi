import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';
import { validateAuth } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const identifier = getRateLimitIdentifier(req);
  if (!checkRateLimit(identifier, { requests: 20, window: 60000 })) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Authenticate user from JWT — never trust caller-supplied userId
    const { user, error: authError } = await validateAuth(req);
    if (!user || authError) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check user's subscription tier
    const { data: creditData, error: creditError } = await supabase
      .from('credits')
      .select('subscription_tier')
      .eq('user_id', userId)
      .single();

    if (creditError) {
      console.error('Error fetching user credits:', creditError);
      throw new Error('Failed to fetch user subscription');
    }

    const shouldWatermark = creditData?.subscription_tier === 'free';

    return new Response(
      JSON.stringify({ shouldWatermark }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting for public endpoint
  const identifier = getRateLimitIdentifier(req);
  if (!checkRateLimit(identifier, { requests: 30, window: 60000 })) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    console.log('📥 Received body:', JSON.stringify(body));
    
    const { category } = body;
    console.log('🏷️  Category value:', category);

    if (!category) {
      console.error('❌ Missing category parameter. Body:', body);
      return new Response(
        JSON.stringify({ error: 'Missing category parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data, error } = await supabaseClient
      .from('design_template_categories')
      .select('*')
      .eq('category_name', category)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching category:', error);
      throw error;
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Category not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
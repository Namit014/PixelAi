import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';

// Validation schema
const RequestSchema = z.object({
  code: z.string().min(1).max(50).transform(val => val.toUpperCase().trim()),
  plan_price: z.number().positive().optional(),
  plan_id: z.string().optional(),
  billing_period: z.enum(['monthly', 'yearly']).optional()
});

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting: 10 requests per minute per IP to prevent brute force
  const identifier = getRateLimitIdentifier(req);
  if (!checkRateLimit(identifier, { requests: 10, window: 60000 })) {
    return new Response(
      JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create admin client for reading discount codes (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client to get authenticated user
    const authHeader = req.headers.get('Authorization');
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // Get authenticated user (required)
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const validated = RequestSchema.safeParse(body);
    
    if (!validated.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', valid: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code, plan_id, billing_period } = validated.data;
    let planPrice = validated.data.plan_price ?? 0;

    // If a specific plan is supplied, pricing is derived server-side so the
    // client cannot understate the checkout amount while validating a coupon.
    if (plan_id) {
      const { data: plan, error: planError } = await supabaseAdmin
        .from('subscription_plans')
        .select('price_inr')
        .eq('id', plan_id)
        .eq('is_active', true)
        .maybeSingle();

      if (planError || !plan) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Invalid subscription plan' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const monthlyPrice = Number(plan.price_inr || 0);
      planPrice = billing_period === 'yearly'
        ? Math.round(monthlyPrice * 12 * 0.8)
        : monthlyPrice;
    }

    // Fetch discount code using admin client (server-side only)
    const { data: discountCode, error: codeError } = await supabaseAdmin
      .from('discount_codes')
      .select('id, code, discount_type, discount_value, min_purchase_amount, max_uses, current_uses, max_uses_per_user, expires_at, applicable_plan_ids, applicable_billing_periods')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (codeError || !discountCode) {
      // Log failed attempts for security monitoring (without revealing if code exists)
      console.log('Discount validation attempt:', {
        userId: user.id.substring(0, 8) + '...',
        result: 'not_found',
        timestamp: new Date().toISOString()
      });
      
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or expired discount code' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (discountCode.expires_at && new Date(discountCode.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This discount code has expired' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max uses
    if (discountCode.max_uses !== null && discountCode.current_uses >= discountCode.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This discount code has reached its usage limit' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check min purchase
    if (planPrice > 0 && planPrice < (discountCode.min_purchase_amount || 0)) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Minimum purchase of ₹${discountCode.min_purchase_amount} required` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if applicable to specific plans only
    if (discountCode.applicable_plan_ids && discountCode.applicable_plan_ids.length > 0 && plan_id) {
      if (!discountCode.applicable_plan_ids.includes(plan_id)) {
        return new Response(
          JSON.stringify({ valid: false, error: 'This code is not valid for the selected plan' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if applicable to specific billing periods only
    if (discountCode.applicable_billing_periods && 
        discountCode.applicable_billing_periods.length > 0 && 
        billing_period) {
      if (!discountCode.applicable_billing_periods.includes(billing_period)) {
        const periods = discountCode.applicable_billing_periods.join(' or ');
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: `This code is only valid for ${periods} billing` 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check per-user limit
    if (discountCode.max_uses_per_user) {
      const { count } = await supabaseAdmin
        .from('discount_code_usage')
        .select('*', { count: 'exact', head: true })
        .eq('code_id', discountCode.id)
        .eq('user_id', user.id);
      
      if ((count || 0) >= discountCode.max_uses_per_user) {
        return new Response(
          JSON.stringify({ valid: false, error: "You've already used this discount code" }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discountCode.discount_type === 'percentage') {
      discountAmount = Math.round(planPrice * (discountCode.discount_value / 100));
    } else {
      discountAmount = planPrice > 0 ? Math.min(discountCode.discount_value, planPrice) : Number(discountCode.discount_value);
    }

    // Log successful validation
    console.log('Discount validated:', {
      userId: user.id.substring(0, 8) + '...',
      codeId: discountCode.id.substring(0, 8) + '...',
      discountAmount,
      timestamp: new Date().toISOString()
    });

    // Return ONLY the information needed for frontend display
    // Never return the full discount code object or sensitive fields
    return new Response(
      JSON.stringify({
        valid: true,
        discount_type: discountCode.discount_type,
        discount_value: discountCode.discount_value,
        discount_amount: discountAmount,
        code: discountCode.code, // Return the normalized code for reference
        applicable_plan_ids: discountCode.applicable_plan_ids || null,
        applicable_billing_periods: discountCode.applicable_billing_periods || null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Discount validation error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CANONICAL_PLANS = [
  { name: 'Starter', description: 'Try Colab and ship a few designs.', price_inr: 1245, price_usd: 15, credits_monthly: 300, display_order: 1, cogent_runs_monthly: 0 },
  { name: 'Creator', description: 'Run a full creative pipeline solo.', price_inr: 2407, price_usd: 29, credits_monthly: 1000, display_order: 2, cogent_runs_monthly: 0 },
  { name: 'Pro', description: 'Replace your design + video team.', price_inr: 4897, price_usd: 59, credits_monthly: 2500, display_order: 3, cogent_runs_monthly: 5 },
  { name: 'Business', description: 'Operate a full creative agency.', price_inr: 9960, price_usd: 120, credits_monthly: 6000, display_order: 4, cogent_runs_monthly: 25 },
  { name: 'Enterprise', description: 'Unlimited creative infrastructure.', price_inr: 0, price_usd: 0, credits_monthly: 15000, display_order: 5, cogent_runs_monthly: -1 },
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid user session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = { id: claimsData.claims.sub as string, email: claimsData.claims.email };

    // Parse request body
    const { planId, planName, discountCode, billingPeriod = 'monthly' } = await req.json();

    if (!planId || !discountCode) {
      return new Response(
        JSON.stringify({ error: 'Plan ID and discount code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate billing period
    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return new Response(
        JSON.stringify({ error: 'Invalid billing period' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch plan details
    let { data: plan, error: planError } = await adminClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle();

    if (planName) {
      const canonical = CANONICAL_PLANS.find((p) => p.name.toLowerCase() === String(planName).toLowerCase());
      if (canonical) {
        const { data: upserted } = await adminClient
          .from('subscription_plans')
          .upsert({ ...canonical, features: [], is_active: true }, { onConflict: 'name' })
          .select('*')
          .single();
        if (upserted) {
          plan = upserted;
          planError = null;
        }
      }
    }

    if (planError || !plan) {
      console.error('Plan fetch error:', planError);
      return new Response(
        JSON.stringify({ error: 'Invalid plan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate the actual price based on billing period
    const monthlyPrice = plan.price_inr;
    const yearlyPrice = Math.round(monthlyPrice * 12 * 0.8);
    const actualPrice = billingPeriod === 'yearly' ? yearlyPrice : monthlyPrice;

    // Validate discount code gives 100% off
    const { data: discount, error: discountError } = await adminClient
      .from('discount_codes')
      .select('*')
      .eq('code', discountCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (discountError || !discount) {
      console.error('Discount fetch error:', discountError);
      return new Response(
        JSON.stringify({ error: 'Invalid discount code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if discount is expired
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Discount code has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.discount_type === 'percentage') {
      discountAmount = Math.round((actualPrice * discount.discount_value) / 100);
    } else {
      discountAmount = discount.discount_value;
    }

    // Ensure it's 100% off (or close enough due to rounding)
    const finalPrice = actualPrice - discountAmount;
    if (finalPrice > 0) {
      return new Response(
        JSON.stringify({ error: 'This discount code does not give 100% off. Please use the normal payment flow.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max uses
    if (discount.max_uses && discount.current_uses >= discount.max_uses) {
      return new Response(
        JSON.stringify({ error: 'Discount code has reached maximum uses' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max uses per user
    if (discount.max_uses_per_user) {
      const { count } = await adminClient
        .from('discount_code_usage')
        .select('*', { count: 'exact', head: true })
        .eq('code_id', discount.id)
        .eq('user_id', user.id);

      if (count && count >= discount.max_uses_per_user) {
        return new Response(
          JSON.stringify({ error: 'You have already used this discount code the maximum number of times' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check plan eligibility
    if (discount.applicable_plan_ids && discount.applicable_plan_ids.length > 0) {
      if (!discount.applicable_plan_ids.includes(plan.id) && !discount.applicable_plan_ids.includes(planId)) {
        return new Response(
          JSON.stringify({ error: 'This discount code is not valid for this plan' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check billing period eligibility
    if (discount.applicable_billing_periods && discount.applicable_billing_periods.length > 0) {
      if (!discount.applicable_billing_periods.includes(billingPeriod)) {
        const periods = discount.applicable_billing_periods.join(' or ');
        return new Response(
          JSON.stringify({ error: `This discount code is only valid for ${periods} billing` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Activating free subscription for user ${user.id} on plan ${plan.name}`);

    // Calculate subscription dates
    const now = new Date();
    const endDate = new Date(now);
    if (billingPeriod === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Upsert the subscription (update if exists, insert if not)
    // The table has a unique constraint on user_id, so we use onConflict
    const { error: subscriptionError } = await adminClient
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: plan.id,
        status: 'active',
        start_date: now.toISOString(),
        end_date: endDate.toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (subscriptionError) {
      console.error('Subscription creation error:', subscriptionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map plan name to subscription tier (lowercase to match enum)
    const planToTier: Record<string, string> = {
        'Starter': 'starter',
        'Creator': 'creator',
      'Pro': 'pro',
      'Business': 'business',
      'Enterprise': 'enterprise'
    };
    const tier = (planToTier[plan.name] || 'free').toLowerCase();

    // Update credits - add monthly credits and update tier
    const { error: creditsError } = await adminClient
      .from('credits')
      .upsert({
        user_id: user.id,
        balance: plan.credits_monthly,
        subscription_tier: tier,
        monthly_credit_allocation: plan.credits_monthly,
        credit_rollover_limit: plan.credits_monthly,
        subscription_expires_at: endDate.toISOString(),
        plan_status: 'active',
        cogent_runs_used: 0,
        cogent_runs_limit: plan.cogent_runs_monthly || 0,
        cogent_runs_reset_at: now.toISOString(),
        updated_at: now.toISOString()
      }, { onConflict: 'user_id' });

    if (creditsError) {
      console.error('Credits update error:', creditsError);
    }

    // Record discount code usage
    await adminClient
      .from('discount_code_usage')
      .insert({
        code_id: discount.id,
        user_id: user.id,
        original_amount: actualPrice,
        discount_amount: discountAmount,
        final_amount: 0,
        used_at: now.toISOString()
      });

    // Increment discount code usage count
    await adminClient
      .from('discount_codes')
      .update({ current_uses: (discount.current_uses || 0) + 1 })
      .eq('id', discount.id);

    // Create a payment record for tracking (with 0 amount)
    const txnId = `FREE_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await adminClient
      .from('payments')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount: 0,
        original_amount: actualPrice,
        discount_code_id: discount.id,
        discount_amount: discountAmount,
        currency: 'INR',
        status: 'success',
        payment_gateway: 'free_subscription',
        transaction_id: txnId,
        billing_period: billingPeriod
      });

    console.log(`Free subscription activated successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription activated successfully!',
        plan: plan.name,
        credits: plan.credits_monthly
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error activating free subscription:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

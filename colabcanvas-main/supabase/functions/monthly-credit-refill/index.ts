import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Monthly Credit Refill Edge Function
 * 
 * This function handles monthly credit refills for all users.
 * It can be triggered via:
 * - pg_cron scheduled job (recommended)
 * - Admin manual trigger
 * - Individual user request (limited to their own account)
 * 
 * Logic:
 * 1. Check last_credit_refill date for each user
 * 2. If more than 30 days since last refill, process refill
 * 3. Calculate rollover (capped at credit_rollover_limit)
 * 4. Add monthly_credit_allocation
 * 5. Log transaction in credit_transactions
 */

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");

    // Authentication: allow either an internal cron secret OR an authenticated admin user
    const internalSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    let isAuthorized = false;

    if (cronSecret && internalSecret && internalSecret === cronSecret) {
      isAuthorized = true;
    } else if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData } = await userClient.auth.getClaims(token);
      const userId = claimsData?.claims?.sub as string | undefined;
      if (userId) {
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);
        const { data: roleData } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        if (roleData) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, forceRefill = false } = await req.json().catch(() => ({}));

    // If a specific userId is provided, only process that user
    // Otherwise, process all users due for refill
    let query = supabase
      .from('credits')
      .select('user_id, balance, monthly_credit_allocation, credit_rollover_limit, last_credit_refill, subscription_tier');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: usersCredits, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching credits:', fetchError);
      throw new Error('Failed to fetch user credits');
    }

    if (!usersCredits || usersCredits.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let processedCount = 0;
    const results: any[] = [];

    for (const userCredits of usersCredits) {
      const lastRefill = userCredits.last_credit_refill 
        ? new Date(userCredits.last_credit_refill) 
        : null;

      // Check if refill is due (30+ days since last refill, or never refilled)
      const isDue = !lastRefill || lastRefill < thirtyDaysAgo || forceRefill;

      if (!isDue) {
        results.push({
          userId: userCredits.user_id,
          status: 'skipped',
          reason: 'Not due for refill yet',
          lastRefill: lastRefill?.toISOString(),
          nextRefill: new Date(lastRefill!.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        continue;
      }

      // Calculate rollover
      const currentBalance = userCredits.balance || 0;
      const rolloverLimit = userCredits.credit_rollover_limit || 100;
      const monthlyAllocation = userCredits.monthly_credit_allocation || 100;
      
      // Rollover is capped at the limit
      const rollover = Math.min(currentBalance, rolloverLimit);
      const newBalance = rollover + monthlyAllocation;

      // Update credits
      const { error: updateError } = await supabase
        .from('credits')
        .update({
          balance: newBalance,
          last_credit_refill: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('user_id', userCredits.user_id);

      if (updateError) {
        console.error(`Error updating credits for user ${userCredits.user_id}:`, updateError);
        results.push({
          userId: userCredits.user_id,
          status: 'error',
          error: updateError.message
        });
        continue;
      }

      // Log the transaction
      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: userCredits.user_id,
          amount: monthlyAllocation,
          transaction_type: 'monthly_refill',
          description: `Monthly credit refill. Rolled over ${rollover} credits, added ${monthlyAllocation} credits.`
        });

      if (txError) {
        console.error(`Error logging transaction for user ${userCredits.user_id}:`, txError);
      }

      processedCount++;
      results.push({
        userId: userCredits.user_id,
        status: 'success',
        previousBalance: currentBalance,
        rollover,
        monthlyAllocation,
        newBalance,
        tier: userCredits.subscription_tier
      });

      console.log(`✅ Refilled credits for user ${userCredits.user_id}: ${currentBalance} -> ${newBalance}`);
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${processedCount} users`,
        processed: processedCount,
        total: usersCredits.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Monthly credit refill error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

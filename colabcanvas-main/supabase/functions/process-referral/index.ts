import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, referral_code, plan_name, plan_amount } = await req.json();

    if (action === "signup") {
      // Process referral on signup
      if (!referral_code) {
        return new Response(
          JSON.stringify({ error: "Missing referral_code" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Look up the referral code
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from("referral_codes")
        .select("*")
        .eq("code", referral_code.toUpperCase())
        .eq("is_active", true)
        .single();

      if (codeError || !codeData) {
        return new Response(
          JSON.stringify({ error: "Invalid referral code" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Prevent self-referral
      if (codeData.user_id === user.id) {
        return new Response(
          JSON.stringify({ error: "Cannot refer yourself" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if already referred
      const { data: existing } = await supabaseAdmin
        .from("referrals")
        .select("id")
        .eq("referred_id", user.id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "Already referred" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const SIGNUP_CREDITS = 50;

      // Create referral record
      await supabaseAdmin.from("referrals").insert({
        referrer_id: codeData.user_id,
        referred_id: user.id,
        referral_code_id: codeData.id,
        status: "signed_up",
        credited_amount: SIGNUP_CREDITS,
        signed_up_at: new Date().toISOString(),
      });

      // Award credits to referrer
      await supabaseAdmin.rpc("add_credits", {
        _user_id: codeData.user_id,
        _amount: SIGNUP_CREDITS,
        _description: `Referral signup bonus (referred user: ${user.email})`,
      });

      // Update referral earnings
      await supabaseAdmin
        .from("referral_earnings")
        .update({
          total_credits_earned: supabaseAdmin.rpc ? undefined : 0, // handled below
          total_referrals: supabaseAdmin.rpc ? undefined : 0,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", codeData.user_id);

      // Use raw SQL via rpc for atomic increment
      await supabaseAdmin.rpc("add_credits", {
        _user_id: codeData.user_id,
        _amount: 0, // already added above, just need earnings update
        _description: "noop",
      }).then(() => {});

      // Direct update for earnings counters
      const { data: currentEarnings } = await supabaseAdmin
        .from("referral_earnings")
        .select("*")
        .eq("user_id", codeData.user_id)
        .single();

      if (currentEarnings) {
        await supabaseAdmin
          .from("referral_earnings")
          .update({
            total_credits_earned: currentEarnings.total_credits_earned + SIGNUP_CREDITS,
            total_referrals: currentEarnings.total_referrals + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", codeData.user_id);
      }

      return new Response(
        JSON.stringify({ success: true, credits_awarded: SIGNUP_CREDITS }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "conversion") {
      // Process conversion when referred user buys a plan
      if (!plan_name || !plan_amount) {
        return new Response(
          JSON.stringify({ error: "Missing plan details" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Find referral where this user was referred
      const { data: referral } = await supabaseAdmin
        .from("referrals")
        .select("*, referral_codes(user_id)")
        .eq("referred_id", user.id)
        .eq("status", "signed_up")
        .single();

      if (!referral) {
        return new Response(
          JSON.stringify({ message: "No pending referral found" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const CONVERSION_CREDITS = 100;
      const REVENUE_SHARE_PERCENT = 10;
      const revenueShare = (plan_amount * REVENUE_SHARE_PERCENT) / 100;

      // Update referral to converted
      await supabaseAdmin
        .from("referrals")
        .update({
          status: "converted",
          credited_amount: referral.credited_amount + CONVERSION_CREDITS,
          revenue_share_amount: revenueShare,
          plan_purchased: plan_name,
          converted_at: new Date().toISOString(),
        })
        .eq("id", referral.id);

      // Award conversion credits to referrer
      await supabaseAdmin.rpc("add_credits", {
        _user_id: referral.referrer_id,
        _amount: CONVERSION_CREDITS,
        _description: `Referral conversion bonus (${plan_name} plan purchased)`,
      });

      // Update referral earnings
      const { data: currentEarnings } = await supabaseAdmin
        .from("referral_earnings")
        .select("*")
        .eq("user_id", referral.referrer_id)
        .single();

      if (currentEarnings) {
        await supabaseAdmin
          .from("referral_earnings")
          .update({
            total_credits_earned: currentEarnings.total_credits_earned + CONVERSION_CREDITS,
            total_revenue_earned: Number(currentEarnings.total_revenue_earned) + revenueShare,
            pending_payout: Number(currentEarnings.pending_payout) + revenueShare,
            successful_conversions: currentEarnings.successful_conversions + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", referral.referrer_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          credits_awarded: CONVERSION_CREDITS,
          revenue_share: revenueShare,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing referral:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

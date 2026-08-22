import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { code, subtotal, project_id } = await req.json();
    if (!code || typeof subtotal !== 'number') {
      return new Response(JSON.stringify({ error: "Missing code or subtotal" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: promo, error: pErr } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('active', true)
      .maybeSingle();

    if (pErr || !promo) {
      return new Response(JSON.stringify({ error: 'Invalid or expired promo code', valid: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Scope guard: only 'talent' or 'all' codes apply on talent payments
    if (promo.scope && promo.scope !== 'talent' && promo.scope !== 'all') {
      return new Response(JSON.stringify({ error: 'This code is not valid for talent payments', valid: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Promo code expired', valid: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return new Response(JSON.stringify({ error: 'Promo code fully redeemed', valid: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Per-user single-use guard: only enforced for non-admins so admins can keep testing.
    const { data: adminCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!adminCheck) {
      const { data: existingRedemption } = await supabase
        .from('promo_code_redemptions')
        .select('id')
        .eq('promo_code_id', promo.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (existingRedemption) {
        return new Response(JSON.stringify({ error: 'You have already used this code', valid: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const discount = promo.discount_type === 'percent'
      ? Math.round(subtotal * (Number(promo.discount_value) / 100))
      : Math.min(Number(promo.discount_value), subtotal);

    return new Response(JSON.stringify({
      valid: true,
      promo_id: promo.id,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: Number(promo.discount_value),
      discount_amount: discount,
      new_total: Math.max(0, subtotal - discount),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

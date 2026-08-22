import { createClient } from 'npm:@supabase/supabase-js@2';

// Rate limiting configuration
const RATE_LIMITS = {
  requests: 5,
  window: 300000, // 5 requests per 5 minutes
  blockDuration: 900000 // Block for 15 minutes if exceeded
};

const rateLimitStore = new Map<string, number[]>();
const blockedUsers = new Map<string, number>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  
  // Check if user is blocked
  const blockExpiry = blockedUsers.get(userId);
  if (blockExpiry && now < blockExpiry) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((blockExpiry - now) / 1000) 
    };
  }
  
  const requests = rateLimitStore.get(userId) || [];
  const recentRequests = requests.filter(t => now - t < RATE_LIMITS.window);
  
  if (recentRequests.length >= RATE_LIMITS.requests) {
    // Block user
    blockedUsers.set(userId, now + RATE_LIMITS.blockDuration);
    console.warn('SECURITY: Rate limit exceeded', {
      userId: userId.substring(0, 8),
      attempts: recentRequests.length,
      timestamp: new Date().toISOString(),
    });
    return { 
      allowed: false, 
      retryAfter: Math.ceil(RATE_LIMITS.blockDuration / 1000)
    };
  }
  
  recentRequests.push(now);
  rateLimitStore.set(userId, recentRequests);
  return { allowed: true };
}

// Security: Whitelist of allowed CORS origins (regex patterns for flexibility)
const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovableproject\.com$/,
  /^https:\/\/.*\.letscolab\.tech$/,
  /^https:\/\/.*\.letscolab\.in$/,
  /^http:\/\/localhost:\d+$/,
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(pattern => pattern.test(origin));
  
  return {
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : 'https://todaviqzeylccmyduomt.lovable.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface PaymentRequest {
  planId: string;
  planName?: string;
  discountCode?: string;
  billingPeriod?: 'monthly' | 'yearly';
  currency?: 'INR' | 'USD';
  successUrl: string;
  failureUrl: string;
}

// USD to INR conversion rate for PayU (which only supports INR)
const USD_TO_INR_RATE = 83;

const CANONICAL_PLANS = [
  { name: 'Starter', description: 'Try Colab and ship a few designs.', price_inr: 1245, price_usd: 15, credits_monthly: 300, display_order: 1, cogent_runs_monthly: 0 },
  { name: 'Creator', description: 'Run a full creative pipeline solo.', price_inr: 2407, price_usd: 29, credits_monthly: 1000, display_order: 2, cogent_runs_monthly: 0 },
  { name: 'Pro', description: 'Replace your design + video team.', price_inr: 4897, price_usd: 59, credits_monthly: 2500, display_order: 3, cogent_runs_monthly: 5 },
  { name: 'Business', description: 'Operate a full creative agency.', price_inr: 9960, price_usd: 120, credits_monthly: 6000, display_order: 4, cogent_runs_monthly: 25 },
  { name: 'Enterprise', description: 'Unlimited creative infrastructure.', price_inr: 0, price_usd: 0, credits_monthly: 15000, display_order: 5, cogent_runs_monthly: -1 },
];

// Security: Whitelist of allowed redirect domains
const ALLOWED_DOMAINS = [
  'lovable.app',
  'lovableproject.com',
  'letscolab.tech',
  'letscolab.in',
  'localhost',
];

// Security: Whitelist of allowed redirect paths
const ALLOWED_PATHS = [
  '/pricing',
  '/payment/callback',
  '/payment/success',
  '/payment/failure',
];

// Security: Validate redirect URLs to prevent open redirect attacks
function validateRedirectUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Check protocol - must be HTTPS or HTTP for localhost only
    if (url.protocol !== 'https:' && (url.protocol !== 'http:' || url.hostname !== 'localhost')) {
      console.warn('SECURITY: Invalid protocol in redirect URL', {
        url: urlString,
        protocol: url.protocol,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
    
    // Check domain whitelist
    const isAllowedDomain = ALLOWED_DOMAINS.some(domain => 
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );
    
    if (!isAllowedDomain) {
      console.warn('SECURITY: Unauthorized domain in redirect URL', {
        url: urlString,
        hostname: url.hostname,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
    
    // Check path whitelist
    const isAllowedPath = ALLOWED_PATHS.some(path => 
      url.pathname.startsWith(path)
    );
    
    if (!isAllowedPath) {
      console.warn('SECURITY: Unauthorized path in redirect URL', {
        url: urlString,
        pathname: url.pathname,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('SECURITY: Malformed redirect URL', {
      url: urlString,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Create client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract and validate JWT token
    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(jwt);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.warn('SECURITY: Invalid or expired token', {
        error: claimsError?.message,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }
    const user = { id: claimsData.claims.sub as string, email: claimsData.claims.email };

    // Rate limiting check
    const rateLimitCheck = checkRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitCheck.retryAfter
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': rateLimitCheck.retryAfter!.toString()
          }
        }
      );
    }

    const { planId, planName, discountCode, billingPeriod = 'monthly', currency = 'INR', successUrl, failureUrl }: PaymentRequest = await req.json();

    // Security: Validate redirect URLs to prevent open redirect attacks
    if (!validateRedirectUrl(successUrl)) {
      console.warn('SECURITY: Invalid success URL rejected', {
        userId: user.id,
        url: successUrl,
        timestamp: new Date().toISOString(),
      });
      throw new Error('Invalid success redirect URL');
    }
    
    if (!validateRedirectUrl(failureUrl)) {
      console.warn('SECURITY: Invalid failure URL rejected', {
        userHash: user.id.substring(0, 8),
        timestamp: new Date().toISOString(),
      });
      throw new Error('Invalid failure redirect URL');
    }

    console.log('Payment creation initiated', {
      userHash: user.id.substring(0, 8),
      timestamp: new Date().toISOString(),
    });

    // Fetch plan details using admin client. Prefer canonical planName so stale
    // Live rows do not undercharge or allocate old credits.
    let { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (planName) {
      const canonical = CANONICAL_PLANS.find((p) => p.name.toLowerCase() === planName.toLowerCase());
      if (canonical) {
        const { data: upserted } = await supabaseAdmin
          .from('subscription_plans')
          .upsert({ ...canonical, features: [], is_active: true }, { onConflict: 'name' })
          .select('*')
          .single();
        plan = upserted;
        planError = null;
      }
    }

    if (planError || !plan) {
      console.error('Plan lookup failed', {
        planId,
        error: planError?.message,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ error: 'Invalid subscription plan' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get authoritative base price for the selected billing period.
    // PayU charges INR, so USD display prices are converted server-side here.
    const monthlyInr = Number(plan.price_inr || 0);
    const monthlyUsd = Number(plan.price_usd || Math.round(monthlyInr / USD_TO_INR_RATE));
    let originalAmount = billingPeriod === 'yearly'
      ? Math.round(monthlyInr * 12 * 0.8)
      : Math.round(monthlyInr);

    if (currency === 'USD') {
      const usdPrice = billingPeriod === 'yearly' ? monthlyUsd * 12 * 0.8 : monthlyUsd;
      originalAmount = Math.round(usdPrice * USD_TO_INR_RATE);
      console.log(`Converting USD price $${usdPrice} to INR ₹${originalAmount}`);
    }
    
    let discountAmount = 0;
    let discountCodeId = null;

    if (discountCode) {
      const { data: discount, error: discountError } = await supabaseAdmin
        .from('discount_codes')
        .select('*')
        .eq('code', discountCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (discountError || !discount) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired discount code' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      if (discount) {
        const isExpired = discount.expires_at && new Date(discount.expires_at) < new Date();
        const isMaxed = discount.max_uses !== null && discount.current_uses >= discount.max_uses;
        
        // Check plan eligibility
        const resolvedPlanId = plan.id;
        const isPlanEligible = !discount.applicable_plan_ids || 
          discount.applicable_plan_ids.length === 0 || 
          discount.applicable_plan_ids.includes(resolvedPlanId) ||
          discount.applicable_plan_ids.includes(planId);
        
        // Check billing period eligibility
        const isBillingPeriodEligible = !discount.applicable_billing_periods || 
          discount.applicable_billing_periods.length === 0 || 
          discount.applicable_billing_periods.includes(billingPeriod);
        
        if (!isExpired && !isMaxed && isPlanEligible && isBillingPeriodEligible && 
            originalAmount >= (discount.min_purchase_amount || 0)) {
          if (discount.discount_type === 'percentage') {
            discountAmount = Math.round(originalAmount * (discount.discount_value / 100));
          } else {
            discountAmount = Math.min(discount.discount_value, originalAmount);
          }
          discountCodeId = discount.id;

          // Usage is recorded only after successful verification, not at checkout creation.
        } else {
          const reason = isExpired ? 'This discount code has expired'
            : isMaxed ? 'This discount code has reached its usage limit'
            : !isPlanEligible ? 'This code is not valid for the selected plan'
            : !isBillingPeriodEligible ? 'This code is not valid for the selected billing period'
            : 'Minimum purchase amount not met for this code';
          return new Response(
            JSON.stringify({ error: reason }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
      }
    }

    const finalAmount = Math.max(0, originalAmount - discountAmount);

    // Fetch user profile using admin client
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    // Create payment record using admin client
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount: finalAmount,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        discount_code_id: discountCodeId,
        currency: 'INR',
        status: 'pending',
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('Payment record creation failed', {
        error: paymentError?.message,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ error: 'Unable to process payment. Please try again.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // PayU Money integration
    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY');
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT');
    
    if (!merchantKey || !merchantSalt) {
      console.error('PayU credentials not configured', {
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ error: 'Payment service temporarily unavailable' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503,
        }
      );
    }

    const txnid = payment.id;
    const amount = Number(finalAmount).toFixed(2);
    const productinfo = plan.name;
    const firstname = profile?.full_name || 'User';
    const email = profile?.email || user.email;
    const phone = '0000000000';
    
    // Use payment callback page for PayU redirects
    const callbackOrigin = origin || 'https://colabcanvas.lovable.app';
    const verifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-payment`;
    const redirectTarget = encodeURIComponent(callbackOrigin);
    const surl = `${verifyUrl}?redirect_origin=${redirectTarget}`;
    const furl = `${verifyUrl}?redirect_origin=${redirectTarget}`;
    
    // Server-to-server callback URL for PayU to notify payment status directly
    const curl = verifyUrl;

    // Generate hash: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
    const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${merchantSalt}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // PayU Money payment form data
    const paymentData = {
      key: merchantKey,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      curl, // Server-to-server callback for automatic verification
      hash,
      service_provider: 'payu_paisa',
    };

    console.log('Payment created successfully', {
      paymentHash: payment.id.substring(0, 8),
      userHash: user.id.substring(0, 8),
      tier: plan.name,
      amount: finalAmount,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        paymentData,
        payuUrl: 'https://secure.payu.in/_payment',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Payment creation failed', {
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({ error: 'Unable to initiate payment. Please try again.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};

Deno.serve(handler);

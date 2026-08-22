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

// Security: Whitelist of allowed CORS origins
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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface TopUpRequest {
  credits: number;
  price: number;
}

// USD to INR conversion rate for PayU (which only supports INR)
const USD_TO_INR_RATE = 83;

// Valid credit packs
const VALID_PACKS = [
  { credits: 100, price: 10 },
  { credits: 500, price: 45 },
  { credits: 1000, price: 80 },
];

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

    const { credits, price }: TopUpRequest = await req.json();

    // Validate the credit pack
    const validPack = VALID_PACKS.find(p => p.credits === credits && p.price === price);
    if (!validPack) {
      console.warn('SECURITY: Invalid credit pack requested', {
        userId: user.id.substring(0, 8),
        credits,
        price,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ error: 'Invalid credit pack' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Top-up payment creation initiated', {
      userHash: user.id.substring(0, 8),
      credits,
      priceUSD: price,
      timestamp: new Date().toISOString(),
    });

    // Convert USD to INR for PayU
    const amountINR = Math.round(price * USD_TO_INR_RATE);

    // Fetch user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        plan_id: null, // null for top-up payments
        amount: amountINR,
        original_amount: amountINR,
        discount_amount: 0,
        currency: 'INR',
        status: 'pending',
        metadata: {
          type: 'topup',
          credits: credits,
          price_usd: price,
        }
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
    const amount = Number(amountINR).toFixed(2);
    const productinfo = `${credits} Credits Top-Up`;
    const firstname = profile?.full_name || 'User';
    const email = profile?.email || user.email;
    const phone = '0000000000';
    
    // Use payment callback page for PayU redirects
    const callbackOrigin = origin || 'https://colabcanvas.lovable.app';
    const verifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-payment`;
    const redirectTarget = encodeURIComponent(callbackOrigin);
    const surl = `${verifyUrl}?redirect_origin=${redirectTarget}&type=topup`;
    const furl = `${verifyUrl}?redirect_origin=${redirectTarget}&type=topup`;
    
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
      curl,
      hash,
      service_provider: 'payu_paisa',
    };

    console.log('Top-up payment created successfully', {
      paymentHash: payment.id.substring(0, 8),
      userHash: user.id.substring(0, 8),
      credits,
      amountINR,
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
    console.error('Top-up payment creation failed', {
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

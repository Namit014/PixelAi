import { createClient } from 'npm:@supabase/supabase-js@2';

// Security: Whitelist of allowed CORS origins for payment verification
// Includes PayU domains and app domains for client-side verification
const ALLOWED_ORIGINS = [
  'https://info.payu.in',
  'https://secure.payu.in',
  'https://test.payu.in',
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovableproject\.com$/,
  /^https:\/\/.*\.letscolab\.tech$/,
  /^https:\/\/.*\.letscolab\.in$/,
  /^http:\/\/localhost:\d+$/,
];

function getSafeRedirectOrigin(req: Request): string | null {
  const value = new URL(req.url).searchParams.get('redirect_origin');
  if (!value) return null;
  try {
    const url = new URL(value);
    const allowed = ALLOWED_ORIGINS.some(origin =>
      typeof origin === 'string' ? origin === url.origin : origin.test(url.origin)
    );
    return allowed ? url.origin : null;
  } catch {
    return null;
  }
}

function redirectPayment(origin: string | null, status: 'success' | 'failure', txnid?: string, type?: string) {
  if (!origin) return null;
  const target = new URL('/payment/callback', origin);
  target.searchParams.set('status', status);
  if (txnid) target.searchParams.set('txnid', txnid);
  if (type) target.searchParams.set('type', type);
  return Response.redirect(target.toString(), 303);
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
  );

  return {
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Rate limiting configuration
const RATE_LIMITS = {
  requests: 10,
  window: 60000, // 10 requests per minute
  blockDuration: 300000 // Block for 5 minutes if exceeded
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

interface VerifyPaymentRequest {
  paymentId?: string;
  status: string;
  txnid: string;
  amount: string;
  mihpayid?: string;
  mode?: string;
  hash?: string;
  firstname?: string;
  email?: string;
  productinfo?: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  [key: string]: any;
}

// Parse form-urlencoded data from PayU
function parseFormData(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const redirectOrigin = getSafeRedirectOrigin(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // PayU can either POST form data or redirect with query params.
    const queryPayload = Object.fromEntries(new URL(req.url).searchParams.entries());
    const contentType = req.headers.get('content-type') || '';
    let payload: VerifyPaymentRequest;

    if (req.method === 'GET') {
      payload = queryPayload as any;
      console.log('Received query params from PayU');
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.text();
      console.log('Received form-urlencoded data from PayU');
      payload = { ...queryPayload, ...parseFormData(formData) } as any;
    } else if (contentType.includes('application/json')) {
      payload = { ...queryPayload, ...(await req.json()) } as any;
      console.log('Received JSON data');
    } else {
      // Try to parse as form data first (PayU default)
      const bodyText = await req.text();
      try {
        payload = { ...queryPayload, ...JSON.parse(bodyText) } as any;
        console.log('Parsed as JSON');
      } catch {
        payload = { ...queryPayload, ...parseFormData(bodyText) } as any;
        console.log('Parsed as form-urlencoded');
      }
    }

    console.log('Payment verification attempt:', {
      txnid: payload.txnid,
      status: payload.status,
      timestamp: new Date().toISOString()
    });

    const status = String(payload.status || '').toLowerCase();
    const { txnid, mihpayid, hash, firstname, email } = payload;
    // PayU uses txnid which is our payment.id
    const paymentId = payload.paymentId || txnid;

    // Get PayU credentials
    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY');
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT');
    if (!merchantKey || !merchantSalt) {
      console.error('PayU credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Fetch payment record using txnid (which is our payment ID)
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, subscription_plans(*)')
      .eq('id', txnid)
      .single();

    if (paymentError || !payment) {
      console.error('Payment lookup failed:', {
        txnid,
        error: paymentError?.message,
        timestamp: new Date().toISOString()
      });
      const redirect = redirectPayment(redirectOrigin, 'failure', paymentId, payload.type);
      if (redirect) return redirect;
      return new Response(
        JSON.stringify({ error: 'Payment verification failed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Rate limiting check
    const rateLimitCheck = checkRateLimit(payment.user_id);
    if (!rateLimitCheck.allowed) {
      const redirect = redirectPayment(redirectOrigin, payment.status === 'completed' || payment.status === 'success' ? 'success' : 'failure', payment.id, payload.type);
      if (redirect) return redirect;
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

    // Verify payment hasn't already been processed
    if (payment.status !== 'pending') {
      console.log('Payment already processed:', payment.status);
      const redirect = redirectPayment(
        redirectOrigin,
        payment.status === 'completed' || payment.status === 'success' ? 'success' : 'failure',
        payment.id,
        payload.type,
      );
      if (redirect) return redirect;
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: payment.status,
          message: 'Payment already processed' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Verify hash from PayU (reverse hash verification)
    // PayU reverse hash format: sha512(salt|status|||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
    const productinfo = payload.productinfo || payment.subscription_plans?.name || '';
    // PayU hashes the exact amount string it posts back (often "4897.00").
    // Use payload.amount for hash verification, then separately compare it to
    // our stored amount in paise below.
    const amount = String(payload.amount || payment.amount);
    const udf1 = payload.udf1 || '';
    const udf2 = payload.udf2 || '';
    const udf3 = payload.udf3 || '';
    const udf4 = payload.udf4 || '';
    const udf5 = payload.udf5 || '';
    
    // Correct PayU reverse hash format:
    // sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
    const reverseHashString = `${merchantSalt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email || ''}|${firstname || ''}|${productinfo}|${amount}|${txnid}|${merchantKey}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(reverseHashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('Hash verification:', {
      provided: hash?.substring(0, 16) + '...',
      calculated: calculatedHash.substring(0, 16) + '...',
      match: hash === calculatedHash
    });

    // Verify the hash matches - MANDATORY for security
    if (!hash) {
      console.warn('SECURITY: Missing hash in payment verification', {
        paymentId: paymentId?.substring(0, 8) || 'unknown',
        timestamp: new Date().toISOString(),
      });
      const redirect = redirectPayment(redirectOrigin, 'failure', paymentId, payload.type);
      if (redirect) return redirect;
      return new Response(
        JSON.stringify({ error: 'Payment verification failed - missing hash' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    if (hash !== calculatedHash) {
      console.warn('SECURITY: Hash verification failed', {
        paymentId: paymentId?.substring(0, 8) || 'unknown',
        timestamp: new Date().toISOString(),
      });
      const redirect = redirectPayment(redirectOrigin, 'failure', paymentId, payload.type);
      if (redirect) return redirect;
      return new Response(
        JSON.stringify({ error: 'Payment verification failed - hash mismatch' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Verify amount matches using integer arithmetic (paise) for exact comparison
    const amountRegex = /^\d+(\.\d{1,2})?$/;
    if (!amountRegex.test(payload.amount)) {
      console.warn('SECURITY: Invalid amount format', {
        timestamp: new Date().toISOString(),
      });
      throw new Error('Payment verification failed');
    }
    
    const parsedAmount = parseFloat(payload.amount);
    
    if (!isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1000000) {
      console.warn('SECURITY: Amount out of bounds', {
        timestamp: new Date().toISOString(),
      });
      throw new Error('Payment verification failed');
    }
    
    const payloadAmountPaise = Math.round(parsedAmount * 100);
    const paymentAmountPaise = Math.round(parseFloat(payment.amount.toString()) * 100);
    if (payloadAmountPaise !== paymentAmountPaise) {
      console.warn('SECURITY: Amount mismatch', {
        payloadAmount: payloadAmountPaise,
        paymentAmount: paymentAmountPaise,
        timestamp: new Date().toISOString(),
      });
      throw new Error('Payment verification failed');
    }

    const isSuccess = status === 'success';

    // Sanitize gateway response - store only essential transaction data
    const sanitizedGatewayResponse = {
      status: payload.status,
      mihpayid: payload.mihpayid || null,
      mode: payload.mode || null,
      txnid: payload.txnid,
      amount: payload.amount,
      error: !isSuccess ? (payload.error || payload.error_Message || null) : null,
      error_code: !isSuccess ? (payload.unmappedstatus || null) : null,
      bank_ref_num: payload.bank_ref_num || null,
      bankcode: payload.bankcode || null,
      PG_TYPE: payload.PG_TYPE || null,
      card_type: payload.card_type || null,
      addedon: payload.addedon || null,
      verified_at: new Date().toISOString(),
    };

    // Always update gateway_response + transaction_id; status is set below by RPC for success
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        transaction_id: mihpayid || txnid,
        gateway_response: sanitizedGatewayResponse,
        status: isSuccess ? payment.status : 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', txnid);

    if (updateError) {
      console.error('Error updating payment:', updateError.message);
      throw updateError;
    }

    if (isSuccess) {
      const meta = (payment.metadata || {}) as { type?: string; credits?: number };
      try {
        if (meta?.type === 'topup' && meta.credits) {
          const { error: topupError } = await supabase.rpc('record_topup_completion', {
            _payment_id: txnid,
            _credits: meta.credits,
          });
          if (topupError) throw topupError;
        } else {
          const { error: rpcError } = await supabase.rpc('record_payment_completion', {
            _payment_id: txnid,
          });
          if (rpcError) throw rpcError;
        }
      } catch (rpcErr: any) {
        // Don't leave the payment stuck "pending" — surface a usable failure_reason
        // so the new PaymentCallback page can show the user something meaningful.
        console.error('Completion RPC failed:', rpcErr?.message);
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            metadata: {
              ...(payment.metadata || {}),
              failure_reason: rpcErr?.message || 'Could not finalize subscription. Contact support.',
              failed_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', txnid);
        const redirect = redirectPayment(redirectOrigin, 'failure', txnid, payload.type);
        if (redirect) return redirect;
        throw rpcErr;
      }
    }

    console.log('Payment verification completed:', {
      txnid,
      status: isSuccess ? 'completed' : 'failed',
      timestamp: new Date().toISOString()
    });
    
    const redirect = redirectPayment(redirectOrigin, isSuccess ? 'success' : 'failure', txnid, payload.type);
    if (redirect) return redirect;
    return new Response(
      JSON.stringify({
        success: true,
        status: isSuccess ? 'completed' : 'failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Payment verification failed:', error.message);
    const redirect = redirectPayment(redirectOrigin, 'failure', undefined, undefined);
    if (redirect) return redirect;
    return new Response(
      JSON.stringify({ error: 'Payment verification failed. Please contact support if the issue persists.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
};

Deno.serve(handler);

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Credentials': 'true',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * Decode a base64 data URL or raw base64 string into a Blob.
 * Falls back to fetching http(s) URLs.
 */
async function loadImageAsBlob(imageData: string): Promise<Blob> {
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    const r = await fetch(imageData);
    if (!r.ok) throw new Error(`Failed to fetch source image (${r.status})`);
    return await r.blob();
  }
  let b64 = imageData;
  let mime = 'image/png';
  if (imageData.startsWith('data:')) {
    const m = imageData.match(/^data:(.*?);base64,(.*)$/);
    if (!m) throw new Error('Invalid data URL');
    mime = m[1] || 'image/png';
    b64 = m[2];
  }
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function vectorizeViaVectorizerApi(
  imageData: string,
  apiKey: string,
): Promise<string | null> {
  // Vectorizer.ai supports `Basic <id:secret>` HTTP basic auth. Users can store
  // the credentials as either "id:secret" or already-base64-encoded value.
  let basic = apiKey.trim();
  if (!basic.includes(' ')) {
    // If it doesn't already look like base64-with-colon, assume "id:secret".
    if (basic.includes(':')) {
      basic = btoa(basic);
    }
  }

  const blob = await loadImageAsBlob(imageData);
  const form = new FormData();
  form.append('image', blob, 'input.png');
  form.append('mode', 'production');
  form.append('output.file_format', 'svg');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const r = await fetch('https://vectorizer.ai/api/v1/vectorize', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}` },
      body: form,
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error('Vectorizer.ai error', r.status, txt.slice(0, 400));
      return null;
    }
    const svg = await r.text();
    if (!svg.includes('<svg')) {
      console.error('Vectorizer.ai returned non-SVG payload');
      return null;
    }
    return svg;
  } catch (err) {
    console.error('Vectorizer.ai fetch failed', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function vectorizeViaAi(imageData: string, apiKey: string): Promise<string | null> {
  let imageUrl = imageData;
  if (!imageData.startsWith('data:') && !imageData.startsWith('http')) {
    imageUrl = `data:image/png;base64,${imageData}`;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Convert this image into a clean, production-quality SVG vector. Output ONLY raw <svg>...</svg> code with xmlns. Use <path> with bezier curves, preserve every shape, color, and gradient. No markdown, no explanation.',
              },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!r.ok) {
      console.error('AI vectorize fallback error', r.status);
      return null;
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content;
    let svg = '';
    if (typeof content === 'string') svg = content;
    else if (Array.isArray(content)) svg = content.find((p: any) => p?.type === 'text')?.text || '';
    if (!svg) return null;
    const m = svg.match(/<svg[\s\S]*?<\/svg>/i);
    return m ? m[0] : null;
  } catch (err) {
    console.error('AI fallback failed', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(500, { error: 'Service configuration error' });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(401, { error: 'Authorization required' });

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) return json(401, { error: 'Unauthorized' });
    const userId = claimsData.claims.sub as string;

    const { imageData } = await req.json();
    if (!imageData) return json(400, { error: 'Image data is required' });

    const CREDIT_COST = 10;
    const { data: creditRow, error: creditErr } = await supabaseClient
      .from('credits').select('balance').eq('user_id', userId).single();
    if (creditErr) return json(500, { error: 'Failed to verify credits' });
    if (!creditRow || creditRow.balance < CREDIT_COST) {
      return json(402, {
        error: 'insufficient_credits',
        message: 'Insufficient credits. Please add more credits to vectorize.',
        required: CREDIT_COST,
        available: creditRow?.balance || 0,
      });
    }

    // Try premium vector engine first when configured.
    const VECTORIZER_API_KEY = Deno.env.get('VECTORIZER_API_KEY');
    let svg: string | null = null;
    let engine: 'vectorizer' | 'ai' = 'ai';

    if (VECTORIZER_API_KEY) {
      svg = await vectorizeViaVectorizerApi(imageData, VECTORIZER_API_KEY);
      if (svg) engine = 'vectorizer';
    }

    if (!svg) {
      const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
      if (!GEMINI_API_KEY) return json(503, { error: 'Vectorization service unavailable' });
      svg = await vectorizeViaAi(imageData, GEMINI_API_KEY);
      engine = 'ai';
    }

    if (!svg || !svg.includes('<svg') || !svg.includes('</svg>')) {
      return json(502, { error: 'Failed to generate vector SVG. Please try again.' });
    }

    if (!svg.includes('xmlns=')) {
      svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    // Ensure a viewBox exists so client-side bounds fallback works.
    if (!/viewBox\s*=/.test(svg) && !/<svg[^>]*\swidth\s*=/.test(svg)) {
      svg = svg.replace('<svg', '<svg viewBox="0 0 1024 1024"');
    }

    // Deduct ONLY after success.
    const { data: deductOk, error: deductErr } = await supabaseClient.rpc('deduct_credits', {
      _user_id: userId, _amount: CREDIT_COST,
    });
    if (deductErr || !deductOk) return json(402, { error: 'Failed to deduct credits' });

    try {
      await supabaseClient.rpc('tag_last_credit_transaction', {
        _user_id: userId,
        _event_type: 'vectorization',
        _metadata: { source: 'vectorize-image', engine, credits: CREDIT_COST },
      });
    } catch (e) { console.warn('Ledger tag failed:', e); }

    return json(200, { success: true, svg, engine });
  } catch (error) {
    console.error('Vectorization error:', error);
    return json(500, { error: error instanceof Error ? error.message : 'Vectorization failed' });
  }
});

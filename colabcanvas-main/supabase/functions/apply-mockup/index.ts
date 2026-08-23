import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface MockupSurface {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  type: string;
  corners?: { x: number; y: number }[];
  aspectRatio?: string;
  description?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(401, { error: 'Unauthorized' });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) return json(401, { error: 'Unauthorized' });
    const userId = claimsData.claims.sub as string;

    const body = await req.json() as {
      baseImageUrl?: string;
      overlayImageUrl?: string;
      surface?: MockupSurface;
      lightDirection?: string;
      ambientBrightness?: string;
    };
    const { baseImageUrl, overlayImageUrl, surface } = body;
    if (!baseImageUrl || !overlayImageUrl || !surface) {
      return json(400, { error: 'Base image, overlay image, and surface data are required' });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) return json(500, { error: 'API key not configured' });

    // Pre-check credits but DO NOT deduct yet — only deduct after success.
    const CREDIT_COST = 10;
    const { data: creditRow, error: creditErr } = await supabaseClient
      .from('credits').select('balance').eq('user_id', userId).single();
    if (creditErr) return json(500, { error: 'Failed to verify credits' });
    if (!creditRow || creditRow.balance < CREDIT_COST) {
      return json(402, {
        error: 'insufficient_credits',
        message: 'Insufficient credits. You need 10 credits.',
      });
    }

    const surfaceDesc = surface.type === 'curved'
      ? 'curved surface with natural wrap-around effect'
      : surface.type === 'cylindrical'
      ? 'cylindrical surface with wrap distortion'
      : surface.type === 'perspective'
      ? 'surface with perspective transformation'
      : surface.type === 'screen'
      ? 'digital screen with subtle glow'
      : 'flat surface';

    const cornersTxt = surface.corners?.length === 4
      ? `\nCorner points (percentages): ${surface.corners.map((c, i) => `P${i + 1}=(${c.x},${c.y})`).join(', ')}`
      : '';

    const prompt = `Realistically place the SECOND image (the design) onto the FIRST image (the product/scene), perfectly registered to the indicated surface.

Surface details:
- Type: ${surfaceDesc}
- Bounding box (% of base image): x=${surface.bounds.x}, y=${surface.bounds.y}, w=${surface.bounds.width}, h=${surface.bounds.height}${cornersTxt}
- Description: ${surface.description || 'Product surface'}
${body.lightDirection ? `- Lighting direction: ${body.lightDirection}` : ''}
${body.ambientBrightness ? `- Ambient brightness: ${body.ambientBrightness}` : ''}

ABSOLUTE RULES:
1. Output image MUST keep the EXACT same dimensions and aspect ratio as the FIRST input image.
2. Do not move, crop, or zoom the base scene. Only composite the design onto the indicated surface.
3. Match perspective, warping, lighting, shadows, highlights and surface texture so the design looks physically printed/displayed there.
4. Blend edges seamlessly. Preserve the underlying material's texture (fabric grain, screen pixels, paper, etc.).
5. Preserve the design's colors and proportions; do not invent new content inside the design.

Return ONLY the composited image.`;

    const callGateway = async (): Promise<Response> => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60_000);
      try {
        return await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
          method: 'POST',
          signal: ctrl.signal,
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-pro-image-preview',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: baseImageUrl } },
                  { type: 'image_url', image_url: { url: overlayImageUrl } },
                ],
              },
            ],
            modalities: ['image', 'text'],
          }),
        });
      } finally { clearTimeout(timer); }
    };

    let response: Response;
    try {
      response = await callGateway();
      if (!response.ok && response.status >= 500 && response.status < 600) {
        try { await response.text(); } catch { /* drain */ }
        response = await callGateway();
      }
    } catch (err: any) {
      const aborted = err?.name === 'AbortError';
      return json(408, {
        error: aborted ? 'timeout' : 'network_error',
        message: aborted ? 'Mockup generation timed out. Please try again.' : 'Network error contacting AI gateway.',
      });
    }

    if (!response.ok) {
      if (response.status === 429) {
        return json(429, { error: 'Rate limit exceeded. Please try again later.' });
      }
      if (response.status === 402) {
        return json(402, { error: 'Payment required. Please add AI credits.' });
      }
      const t = await response.text().catch(() => '');
      console.error('AI gateway error:', response.status, t.slice(0, 400));
      return json(502, { error: 'AI gateway error' });
    }

    const data = await response.json();
    const generatedImage = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!generatedImage) {
      console.error('No image in response keys=', Object.keys(data?.choices?.[0]?.message || {}));
      return json(502, { error: 'AI did not return an image. Please retry.' });
    }

    // Deduct ONLY after success.
    const { data: deductOk, error: deductErr } = await supabaseClient.rpc('deduct_credits', {
      _user_id: userId, _amount: CREDIT_COST, _description: 'AI mockup composition',
    });
    if (deductErr || !deductOk) {
      console.error('Credit deduction failed after success:', deductErr);
      // Still return the image; do not fail the user when we already did the work.
    }

    return json(200, { imageUrl: generatedImage, creditsUsed: CREDIT_COST });
  } catch (error) {
    console.error('Error in apply-mockup:', error);
    return json(500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

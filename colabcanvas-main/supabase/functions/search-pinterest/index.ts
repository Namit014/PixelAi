// @ts-nocheck
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovableproject\.com$/,
  'http://localhost:5173',
  'http://localhost:5174',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
  );
  const allowedOrigin = isAllowed ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

async function getPinterestAccessToken(appId: string, appSecret: string): Promise<string> {
  console.log('🔐 Requesting Pinterest OAuth token...');
  
  // Pinterest v5 OAuth endpoint
  const tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
  
  // Base64 encode credentials for Basic Auth
  const credentials = btoa(`${appId}:${appSecret}`);
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    // Request client credentials grant with required scopes
    body: 'grant_type=client_credentials&scope=pins:read_secret,boards:read_secret'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Pinterest OAuth failed:', response.status, errorText);
    throw new Error(`Pinterest OAuth failed: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('✅ Pinterest OAuth token obtained');
  
  return data.access_token;
}

const SearchRequestSchema = z.object({
  query: z.string().min(1).max(200)
});

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validated = SearchRequestSchema.parse(body);
    const searchQuery = validated.query;

    console.log('🔍 Pinterest search:', searchQuery);

    // Get Pinterest App credentials
    const appId = Deno.env.get('PINTEREST_APP_ID');
    const appSecret = Deno.env.get('PINTEREST_APP_SECRET');
    
    if (!appId || !appSecret) {
      console.error('❌ PINTEREST_APP_ID or PINTEREST_APP_SECRET not configured in Supabase secrets');
      return new Response(
        JSON.stringify({
          error: 'MISSING_API_KEY',
          message: 'Pinterest API credentials are not configured. Please contact support.',
          images: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Get fresh OAuth token via Client Credentials flow
    let accessToken: string;
    try {
      accessToken = await getPinterestAccessToken(appId, appSecret);
    } catch (error) {
      console.error('❌ Failed to obtain Pinterest access token:', error);
      return new Response(
        JSON.stringify({
          error: 'AUTH_FAILED',
          message: 'Failed to authenticate with Pinterest. Please try again.',
          images: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Make Pinterest API request with OAuth token
    const pinterestUrl = new URL('https://api.pinterest.com/v5/search/pins');
    pinterestUrl.searchParams.append('query', searchQuery);
    pinterestUrl.searchParams.append('page_size', '24');

    console.log('📤 Calling Pinterest API with OAuth token');

    const response = await fetch(pinterestUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinterest API error:', response.status, errorText);
      
      if (response.status === 401) {
        console.error('❌ Pinterest OAuth token invalid - authentication failed');
        return new Response(
          JSON.stringify({
            error: 'INVALID_API_KEY',
            message: 'Pinterest authentication failed. Please contact support.',
            images: [],
            status: 401
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
      
      if (response.status === 429) {
        console.warn('⚠️ Pinterest rate limit hit');
        return new Response(
          JSON.stringify({
            error: 'RATE_LIMIT',
            message: 'Pinterest rate limit reached. Please try again in a moment.',
            images: [],
            status: 429
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429,
          }
        );
      }

      throw new Error(`Pinterest API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Pinterest API response received:', data.items?.length || 0, 'items');

    // Extract image URLs from Pinterest response
    const images = data.items?.map((pin: any) => {
      return pin.media?.images?.['600x']?.url || 
             pin.media?.images?.original?.url ||
             pin.images?.['600x']?.url;
    }).filter(Boolean) || [];

    return new Response(
      JSON.stringify({
        images,
        total: images.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Search error:', error);
    
    // Return error without fallback images
    return new Response(
      JSON.stringify({
        error: 'SEARCH_FAILED',
        message: 'Pinterest search failed. Please try again.',
        images: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

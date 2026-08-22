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

const SearchRequestSchema = z.object({
  query: z.string().min(1).max(200)
});

interface PinterestImage {
  url: string;
  title?: string;
  description?: string;
}

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

    console.log('🔍 Pinterest scrape request:', searchQuery);

    const browserlessApiKey = Deno.env.get('BROWSERLESS_API_KEY');
    
    if (!browserlessApiKey) {
      console.error('❌ BROWSERLESS_API_KEY not configured');
      return new Response(
        JSON.stringify({
          error: 'MISSING_API_KEY',
          message: 'Browserless API is not configured. Please contact support.',
          images: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Browserless API endpoint - using /chrome for JavaScript execution
    const browserlessUrl = `https://production-sfo.browserless.io/chrome`;
    
    console.log('📤 Calling Browserless to scrape Pinterest...');

    // Pinterest search URL
    const pinterestSearchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(searchQuery)}`;

    // Browserless request configuration - using /chrome endpoint with Puppeteer
    const response = await fetch(browserlessUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: browserlessApiKey,
        url: pinterestSearchUrl,
        gotoOptions: {
          waitUntil: 'networkidle0',
          timeout: 30000
        },
        waitFor: 5000,
        evaluate: `
          Array.from(document.querySelectorAll('img[src*="pinimg.com"]'))
            .filter(img => !img.src.includes('avatar'))
            .slice(0, 24)
            .map(img => img.src.replace(/\\/\\d+x\\//, '/564x/'))
        `
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Browserless API error:', response.status, errorText);
      
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({
            error: 'INVALID_API_KEY',
            message: 'Browserless authentication failed. Please contact support.',
            images: []
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
      
      if (response.status === 429) {
        console.warn('⚠️ Browserless rate limit hit');
        return new Response(
          JSON.stringify({
            error: 'RATE_LIMIT',
            message: 'Pinterest scraping rate limit reached. Please try again in a moment.',
            images: []
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429,
          }
        );
      }

      throw new Error(`Browserless API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Browserless response received');

    // Extract images from the Chrome evaluation result
    const imageUrls = data.data || [];
    
    console.log(`📸 Found ${imageUrls.length} Pinterest images`);

    return new Response(
      JSON.stringify({
        images: imageUrls,
        total: imageUrls.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Scrape error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'SCRAPE_FAILED',
        message: 'Pinterest scraping failed. Please try again.',
        images: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

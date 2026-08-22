// @ts-nocheck
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Production mode detection - hide logs in production
const IS_PRODUCTION = Deno.env.get('DENO_DEPLOYMENT_ID') !== undefined;
const log = IS_PRODUCTION ? () => {} : console.log.bind(console);
const warn = IS_PRODUCTION ? () => {} : console.warn.bind(console);
const error = IS_PRODUCTION ? () => {} : console.error.bind(console);

const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovableproject\.com$/,
  'http://localhost:5173',
  'http://localhost:5174',
  'https://app.letscolab.tech',
  'https://letscolab.tech',
  'https://www.letscolab.tech',
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

    log('🔍 Pinterest scrape request (Jina AI):', searchQuery);

    // Try to get at least 9 images with retry logic
    let allImageUrls: string[] = [];
    const searchVariations = [
      searchQuery,
      `${searchQuery} design`,
      `${searchQuery} inspiration`,
      `${searchQuery} creative`
    ];

    for (let i = 0; i < searchVariations.length && allImageUrls.length < 20; i++) {
      const currentQuery = searchVariations[i];
      log(`📤 Attempt ${i + 1}: Searching for "${currentQuery}"`);

      const pinterestSearchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(currentQuery)}`;
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(pinterestSearchUrl)}`;

      const response = await fetch(jinaUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Return-Format': 'html'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        error('❌ Jina AI error:', response.status, errorText);
        continue; // Try next variation
      }

      const html = await response.text();
      log('✅ Jina AI response received');

      // Extract Pinterest image URLs from HTML
      const imageRegex = /https:\/\/i\.pinimg\.com\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)/gi;
      const matches = html.match(imageRegex) || [];
      
      // Filter and clean image URLs
      const newUrls = [...new Set(matches)]
        .filter(url => !url.includes('avatar'))
        .map(url => url.replace(/\/\d+x\d+\//, '/originals/').replace(/\/\d+x\//, '/originals/'))
        .filter(url => !allImageUrls.includes(url));
      
      allImageUrls.push(...newUrls);
      log(`📸 Attempt ${i + 1}: Found ${newUrls.length} new images (total: ${allImageUrls.length})`);

      // Stop if we have enough images
      if (allImageUrls.length >= 20) break;
    }

    // Take up to 20 images for base64 conversion
    const imageUrls = allImageUrls.slice(0, 20);
    log(`📸 Converting ${imageUrls.length} Pinterest images to base64...`);

    // Download images and convert to base64
    const base64Images = await Promise.all(
      imageUrls.map(async (url) => {
        try {
          const imgResponse = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://www.pinterest.com/',
            }
          });
          
          if (!imgResponse.ok) {
            warn(`⚠️ Failed to fetch image: ${url}`);
            return null;
          }

          const arrayBuffer = await imgResponse.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
          
          return `data:${contentType};base64,${base64}`;
        } catch (err) {
          error(`❌ Error fetching image ${url}:`, err);
          return null;
        }
      })
    );

    const validImages = base64Images.filter(img => img !== null);
    log(`✅ Converted ${validImages.length} images to base64`);

    return new Response(
      JSON.stringify({
        images: validImages,
        total: validImages.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (err) {
    error('❌ Scrape error:', err);
    
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

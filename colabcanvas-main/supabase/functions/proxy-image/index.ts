import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = {
    ...getCorsHeaders(origin),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting for public endpoint
  const identifier = getRateLimitIdentifier(req);
  if (!checkRateLimit(identifier, { requests: 50, window: 60000 })) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate URL to prevent SSRF attacks
    const ALLOWED_DOMAINS = [
      'i.pinimg.com',
      'pinterest.com',
      'pinimg.com'
    ];

    let urlObj: URL;
    try {
      urlObj = new URL(imageUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return new Response(
        JSON.stringify({ error: 'Invalid protocol. Only HTTP/HTTPS allowed' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check domain whitelist
    const hostname = urlObj.hostname.toLowerCase();
    if (!ALLOWED_DOMAINS.some(domain => hostname.endsWith(domain))) {
      return new Response(
        JSON.stringify({ error: 'Domain not allowed' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Block private IP ranges
    const privateIPPattern = /^(10\.|127\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
    if (privateIPPattern.test(hostname)) {
      return new Response(
        JSON.stringify({ error: 'Private IP addresses not allowed' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch the image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.pinterest.com/',
      }
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    return new Response(imageBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      }
    });

  } catch (error) {
    const origin = req.headers.get('origin');
    const corsHeaders = {
      ...getCorsHeaders(origin),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

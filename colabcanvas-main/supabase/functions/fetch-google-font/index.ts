import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const family = url.searchParams.get('family');
    const weight = url.searchParams.get('weight') || '400';
    const style = url.searchParams.get('style') || 'normal';

    if (!family) {
      return new Response(JSON.stringify({ error: 'Missing family parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use CSS API v1 with Wget User-Agent to get TTF URLs
    const italic = style === 'italic';
    const cssUrl = `https://fonts.googleapis.com/css?family=${encodeURIComponent(family)}:${italic ? 'ital,' : ''}wght@${weight}`;
    
    // Try v1 simple format first
    const cssUrlSimple = `https://fonts.googleapis.com/css?family=${encodeURIComponent(family)}:${weight}${italic ? 'italic' : ''}`;

    let ttfUrl: string | null = null;

    for (const tryUrl of [cssUrlSimple, cssUrl]) {
      const cssResponse = await fetch(tryUrl, {
        headers: { 'User-Agent': 'Wget/1.21.1' },
      });

      if (!cssResponse.ok) continue;

      const cssText = await cssResponse.text();
      // Extract TTF URL from CSS
      const urlMatches = [...cssText.matchAll(/url\(([^)]+)\)/g)];
      for (const match of urlMatches) {
        const u = match[1].replace(/['"]/g, '');
        if (u.endsWith('.ttf') || u.includes('format(\'truetype\')') || (!u.includes('.woff2'))) {
          ttfUrl = u;
          break;
        }
      }
      if (ttfUrl) break;
    }

    if (!ttfUrl) {
      return new Response(JSON.stringify({ error: 'Could not find TTF URL for this font' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download the TTF file
    const fontResponse = await fetch(ttfUrl);
    if (!fontResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to download font file' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fontBuffer = await fontResponse.arrayBuffer();

    return new Response(fontBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=604800',
      },
    });
  } catch (error) {
    console.error('fetch-google-font error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { corsHeaders } from '../_shared/cors.ts';

const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY') || '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query = 'nature', per_page = 30, page = 1 } = await req.json();

    // If no Pexels API key, return curated fallback
    if (!PEXELS_API_KEY) {
      const fallback = generateFallbackPhotos(query);
      return new Response(JSON.stringify({ photos: fallback }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${per_page}&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!res.ok) {
      throw new Error(`Pexels API error: ${res.status}`);
    }

    const data = await res.json();
    const photos = data.photos.map((p: any) => ({
      id: String(p.id),
      src: p.src.large,
      thumb: p.src.small,
      alt: p.alt || query,
      photographer: p.photographer,
    }));

    return new Response(JSON.stringify({ photos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stock photos error:', error);
    return new Response(JSON.stringify({ error: error.message, photos: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackPhotos(query: string) {
  // Generate placeholder photos using picsum when no API key
  return Array.from({ length: 20 }, (_, i) => ({
    id: `fallback-${i}`,
    src: `https://picsum.photos/seed/${query}-${i}/800/600`,
    thumb: `https://picsum.photos/seed/${query}-${i}/200/200`,
    alt: query,
    photographer: 'Picsum',
  }));
}

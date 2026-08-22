import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SearchRequestSchema = z.object({
  query: z.string()
    .trim()
    .min(1, 'Query cannot be empty')
    .max(500, 'Query must be less than 500 characters'),
});

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validated = SearchRequestSchema.parse(body);
    const { query } = validated;

    const YOU_API_KEY = Deno.env.get('YOU_API_KEY');
    
    if (!YOU_API_KEY) {
      console.error('YOU_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Search service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔍 Searching You.com for: ${query}`);

    const response = await fetch(`https://api.ydc-index.io/search?query=${encodeURIComponent(query)}`, {
      headers: {
        'X-API-Key': YOU_API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('You.com API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Search failed',
        details: errorText 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    
    console.log(`✅ You.com search returned ${data.hits?.length || 0} results`);
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('You.com search error:', error);
    const status = error instanceof z.ZodError ? 400 : 500;
    const errorMessage = error instanceof z.ZodError 
      ? 'Invalid search query' 
      : error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Source {
  title: string;
  url: string;
  snippet?: string;
  favicon?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!FIRECRAWL_API_KEY) {
      console.log('[think-web-scrape] FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Web scraping not configured',
          sources: [],
          content: ''
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const supabaseUser = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    const { query, url, mode = 'search' } = await req.json();

    console.log(`[think-web-scrape] Mode: ${mode}, Query: ${query || url}`);

    // Mode 1: Search the web and return sources with content
    if (mode === 'search' && query) {
      const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 8,
          scrapeOptions: {
            formats: ['markdown'],
            onlyMainContent: true,
          },
        }),
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('[think-web-scrape] Search failed:', errorText);
        throw new Error('Search failed');
      }

      const searchData = await searchResponse.json();
      
      const sources: Source[] = [];
      let combinedContent = '';

      if (searchData.data) {
        for (const result of searchData.data.slice(0, 6)) {
          sources.push({
            title: result.title || result.url,
            url: result.url,
            snippet: result.description || result.markdown?.slice(0, 200),
          });

          if (result.markdown) {
            combinedContent += `\n\n## ${result.title || 'Source'}\nURL: ${result.url}\n\n${result.markdown.slice(0, 2000)}`;
          }
        }
      }

      console.log(`[think-web-scrape] Found ${sources.length} sources`);

      return new Response(
        JSON.stringify({
          success: true,
          sources,
          content: combinedContent,
          query
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mode 2: Scrape a single URL
    if (mode === 'scrape' && url) {
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formattedUrl,
          formats: ['markdown'],
          onlyMainContent: true,
        }),
      });

      if (!scrapeResponse.ok) {
        const errorText = await scrapeResponse.text();
        console.error('[think-web-scrape] Scrape failed:', errorText);
        throw new Error('Scrape failed');
      }

      const scrapeData = await scrapeResponse.json();
      
      const source: Source = {
        title: scrapeData.data?.metadata?.title || formattedUrl,
        url: formattedUrl,
        snippet: scrapeData.data?.metadata?.description,
      };

      console.log(`[think-web-scrape] Scraped: ${source.title}`);

      return new Response(
        JSON.stringify({
          success: true,
          sources: [source],
          content: scrapeData.data?.markdown || '',
          url: formattedUrl
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request - provide query or url' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[think-web-scrape] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        sources: [],
        content: ''
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

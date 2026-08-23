import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ResearchRequestSchema = z.object({
  query: z.string()
    .trim()
    .min(1, 'Query cannot be empty')
    .max(500, 'Query must be less than 500 characters'),
  research_type: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(jwt);

    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    const body = await req.json();
    const validated = ResearchRequestSchema.parse(body);
    const { query, research_type } = validated;
    
    console.log(`📊 User ${user.id} performing web research for: ${query}`);

    // Try Google Custom Search first
    const googleApiKey = Deno.env.get('GOOGLE_SEARCH_API_KEY');
    const searchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID');
    
    let results: any[] = [];
    let summary = '';
    let usedFallback = false;

    if (googleApiKey && searchEngineId) {
      try {
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=5`;
        const searchResponse = await fetch(searchUrl);

        if (searchResponse.ok) {
          const data = await searchResponse.json();
          results = data.items?.map((item: any) => ({
            title: item.title,
            snippet: item.snippet,
            link: item.link,
          })) || [];
          summary = results.map((r: any) => `${r.title}: ${r.snippet}`).join('\n\n');
          console.log(`✅ Google Search returned ${results.length} results`);
        } else {
          console.warn('⚠️ Google Search failed:', searchResponse.status, await searchResponse.text());
        }
      } catch (err) {
        console.warn('⚠️ Google Search error:', err);
      }
    }

    // Fallback: Use Lovable AI to synthesize knowledge
    if (results.length === 0) {
      console.log('🔄 Falling back to Lovable AI for web knowledge synthesis');
      usedFallback = true;
      
      const lovableApiKey = Deno.env.get('GEMINI_API_KEY');
      if (lovableApiKey) {
        try {
          const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: 'You are a research assistant. Given a design/creative query, provide 3-5 key insights with sources. Format each insight as a JSON array of objects with "title", "snippet", and "link" (use relevant real URLs). Return ONLY the JSON array, no markdown.'
                },
                { role: 'user', content: `Research this for a design project: ${query}` }
              ],
              max_tokens: 1000,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content || '';
            
            try {
              // Try to parse as JSON
              const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              const parsed = JSON.parse(cleaned);
              if (Array.isArray(parsed)) {
                results = parsed.map((item: any) => ({
                  title: item.title || 'Research Insight',
                  snippet: item.snippet || item.description || '',
                  link: item.link || item.url || '#',
                }));
              }
            } catch {
              // If JSON parse fails, create a single result from the text
              results = [{
                title: 'AI Research Summary',
                snippet: content.substring(0, 300),
                link: '#',
              }];
            }
            summary = results.map((r: any) => `${r.title}: ${r.snippet}`).join('\n\n');
            console.log(`✅ AI fallback returned ${results.length} insights`);
          } else {
            console.error('❌ AI fallback failed:', aiResponse.status);
          }
        } catch (err) {
          console.error('❌ AI fallback error:', err);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        results,
        summary,
        research_type: research_type || 'general',
        source: usedFallback ? 'ai_synthesis' : 'google_search'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in web-research function:', error);
    const status = error instanceof z.ZodError ? 400 : 500;
    const errorMessage = error instanceof z.ZodError 
      ? 'Invalid research query' 
      : error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

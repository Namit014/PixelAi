import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RequestSchema = z.object({
  category: z.string().optional(),
  keywords: z.string().optional(),
  exclude_ids: z.array(z.string()).optional().default([]),
  limit: z.number().min(1).max(50).optional().default(6) // Restored for quality references
});

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(v => String(v).toLowerCase()).filter(Boolean);
}

function tokenizeKeywords(input?: string): string[] {
  if (!input) return [];
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 3)
    .slice(0, 12);
}

function isLogoStrictMatch(img: any, tokens: string[]): boolean {
  const tags = normalizeArray(img?.semantic_tags || img?.tags);
  const styleKeywords = normalizeArray(img?.style_keywords);

  // EXPANDED: Include branding-related terms as logo signals
  const logoish = ['logo', 'logomark', 'wordmark', 'monogram', 'combination', 'mark', 'brand mark', 'brandmark', 'branding', 'brand identity', 'brand', 'identity'];
  const posterish = ['poster', 'flyer', 'print', 'brochure', 'menu', 'packaging', 'layout', 'typography poster', 'campaign'];
  const lowQuality = ['clipart', 'cartoon', 'stock'];

  const title = String(img?.title || '').toLowerCase();
  const desc = String(img?.description || '').toLowerCase();
  const fileName = String(img?.file_name || '').toLowerCase();

  // Hard include: must have a logo/branding signal (tag OR metadata text)
  const hasLogoSignal =
    tags.some(t => logoish.includes(t)) ||
    logoish.some(s => title.includes(s) || desc.includes(s) || fileName.includes(s));
  if (!hasLogoSignal) return false;

  if (tags.some(t => posterish.includes(t))) return false;
  if (tags.some(t => lowQuality.includes(t))) return false;

  // Hard exclude: obvious non-logo reference sets
  if (tags.includes('mockup') && !tags.some(t => ['logo', 'wordmark', 'logomark', 'monogram', 'mark'].includes(t))) {
    return false;
  }

  if (tokens.length > 0) {
    const hay = new Set([...tags, ...styleKeywords]);
    const matched = tokens.some(tok => hay.has(tok) || title.includes(tok) || desc.includes(tok) || fileName.includes(tok));
    if (!matched) return false;
  }

  return true;
}

// Fisher-Yates shuffle for true randomization (not broken Math.random sort)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests FIRST
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting: 20 requests per minute per IP
  const identifier = getRateLimitIdentifier(req);
  if (!checkRateLimit(identifier, { requests: 20, window: 60000 })) {
    console.warn('Rate limit exceeded for reference-curator-agent:', identifier);
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Verify the user's token
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    // CRITICAL: Log function entry IMMEDIATELY
    console.log('🎯 CURATOR AGENT INVOKED - ENTRY POINT', {
      method: req.method,
      userId: user.id.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    });
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('📦 Raw request body received:', JSON.stringify(body).substring(0, 200));
    
    const { category, keywords, exclude_ids, limit } = RequestSchema.parse(body);
    
    console.log('🎯 CURATOR AGENT CALLED:', {
      timestamp: new Date().toISOString(),
      category, 
      keywords, 
      exclude_count: exclude_ids.length, 
      limit,
      exclude_ids: exclude_ids.slice(0, 5) // Show first 5 for debugging
    });
    
    // Category mapping for fallbacks (logo → branding → brand identity)
    // CRITICAL: "branding", "brand identity", "brand" are ALL mapped to logo search
    const categoryMappings: Record<string, string[]> = {
      'logo': ['branding', 'brand identity', 'logo design', 'logomark', 'wordmark'],
  'logo_only': ['logo', 'branding', 'brand identity', 'logomark', 'wordmark'],
      'poster': ['flyer', 'print design', 'poster'],
      'illustration': ['artwork', 'drawing', 'illustration'],
      'character': ['mascot', 'character design', 'cartoon'],
      'branding': ['logo', 'brand identity', 'corporate identity', 'logomark', 'wordmark'],
      'brand': ['logo', 'branding', 'brand identity', 'logomark'],
      'brand identity': ['logo', 'branding', 'corporate identity', 'logomark']
    };

    // Normalize category - branding/brand/brand identity ALL map to logo search
    const normalizedCategory = (category || '').toLowerCase();
    const isStrictLogo = normalizedCategory === 'logo' || 
                         normalizedCategory === 'logo_only' ||
                         normalizedCategory === 'branding' || 
                         normalizedCategory === 'brand identity' ||
                         normalizedCategory === 'brand';
    
    console.log('🔍 Category normalization:', { 
      original: category, 
      normalized: normalizedCategory, 
      isStrictLogo 
    });
    
    // Logo/branding search: always try logo first, then branding fallbacks
    const searchCategories = isStrictLogo
      ? ['logo', 'branding', 'brand identity', 'logomark', 'wordmark'] // Full logo fallback chain
      : (category && categoryMappings[normalizedCategory]
          ? [category, ...categoryMappings[normalizedCategory]]
          : [category || 'design']);

    const keywordTokens = tokenizeKeywords(keywords);
    
    let images: any[] = [];
    let relaxedMatching = false;
    
    // Try each category variant until we get enough results
    for (const searchCategory of searchCategories) {
      let query = supabase.from('reference_images').select('*');
      
      if (searchCategory) {
        // Broad pre-filter by tag category (final strict filtering is done server-side below)
        query = query.or(`tags.cs.{${searchCategory}},semantic_tags.cs.{${searchCategory}}`);
      }
      
      if (exclude_ids.length > 0) {
        // Ensure proper quoting for UUID/text IDs
        const quoted = exclude_ids.map(id => `'${id}'`).join(',');
        query = query.not('id', 'in', `(${quoted})`);
      }
      
      // Fetch more than needed for strict filtering and shuffling
      query = query.limit(limit * 12);

      const { data } = await query;

      const candidates = (data || []).filter((img: any) => {
        // Strict logo-only enforced here
        if (isStrictLogo) return isLogoStrictMatch(img, keywordTokens);

        // Non-logo: if keywords provided, require at least one token match across tags/style/title/description
        if (keywordTokens.length > 0) {
          const tags = normalizeArray(img?.semantic_tags || img?.tags);
          const styleKeywords = normalizeArray(img?.style_keywords);
          const hay = new Set([...tags, ...styleKeywords]);
          const title = String(img?.title || '').toLowerCase();
          const desc = String(img?.description || '').toLowerCase();
          const matched = keywordTokens.some(tok => hay.has(tok) || title.includes(tok) || desc.includes(tok));
          if (!matched) return false;
        }

        return true;
      });

      if (candidates.length >= 2) {
        images = candidates;
        relaxedMatching = searchCategory !== 'logo' && isStrictLogo;
        console.log(`✅ Found ${images.length} filtered images for category: ${searchCategory} (strictLogo=${isStrictLogo}, relaxed=${relaxedMatching})`);
        break;
      }
    }
    
    // If strict logo search returned nothing, try branding without strict filter
    if (isStrictLogo && images.length < 2) {
      console.log('⚠️ Strict logo search failed, trying branding fallback without strict filter...');
      
      const { data: brandingData } = await supabase
        .from('reference_images')
        .select('*')
        .or(`tags.cs.{branding},tags.cs.{brand identity},semantic_tags.cs.{branding}`)
        .not('id', 'in', exclude_ids.length > 0 ? `(${exclude_ids.map(id => `'${id}'`).join(',')})` : '()')
        .limit(limit * 5);
      
      if (brandingData && brandingData.length >= 2) {
        images = brandingData;
        relaxedMatching = true;
        console.log(`✅ Fallback to branding found ${images.length} images`);
      }
    }
    
    if (images.length === 0) {
      // Final fallback: return empty with flag so frontend can offer alternatives
      console.warn('⚠️ No references found for category:', category);
      return new Response(JSON.stringify({
        references: [],
        updated_exclude_ids: exclude_ids,
        relaxed_matching: true,
        no_references: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Apply Fisher-Yates shuffle for true randomization
    const shuffled = shuffleArray(images);
    const selected = shuffled.slice(0, limit);
    
    console.log('🎲 Reference curator result:', {
      totalAvailable: images.length,
      excludedCount: exclude_ids.length,
      returned: selected.length,
      relaxedMatching,
      selectedIds: selected.map(img => img.id)
    });
    
    return new Response(JSON.stringify({
      references: selected,
      updated_exclude_ids: [...exclude_ids, ...selected.map(img => img.id)],
      relaxed_matching: relaxedMatching
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ CURATOR AGENT ERROR:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(JSON.stringify({
      error: 'Reference curator failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      references: [],
      updated_exclude_ids: [],
      no_references: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

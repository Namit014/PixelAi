import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RequestSchema = z.object({
  base_prompt: z.string().min(1),
  reference_urls: z.array(z.string().url()).optional().default([]),
  design_type: z.string().optional().default('design')
});

// Category-specific quality benchmarks
const QUALITY_BENCHMARKS: Record<string, string> = {
  'logo': 'Fortune 500 corporate identity standards. Pentagram/Chermayeff & Geismar level minimalism. Must match $50,000 professional logo design.',
  'branding': 'Award-winning brand identity (D&AD Black Pencil level). Must match $50,000 agency branding package.',
  'poster': 'Exhibition-ready design (Cannes Lions Gold). Sophisticated typography, museum-quality composition.',
  'illustration': 'Editorial illustration (New Yorker/NY Times commissioned art level). Premium execution.',
  'character': 'Production animation quality (Pixar/Disney concept art). Studio-ready character design.',
  'campaign': 'Advertising excellence (Clio Grand Prix level). Cohesive, sophisticated brand campaign.'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests FIRST
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting: 10 requests per minute per IP (more expensive AI operations)
  const identifier = getRateLimitIdentifier(req);
  if (!checkRateLimit(identifier, { requests: 10, window: 60000 })) {
    console.warn('Rate limit exceeded for prompt-enhancer-agent:', identifier);
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
    console.log('✨ ENHANCER AGENT INVOKED - ENTRY POINT', {
      method: req.method,
      userId: user.id.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    });

    const body = await req.json();
    console.log('📦 Raw request body received:', JSON.stringify(body).substring(0, 200));
    
    const { base_prompt, reference_urls, design_type } = RequestSchema.parse(body);
    
    console.log('✨ ENHANCER AGENT CALLED:', {
      timestamp: new Date().toISOString(),
      design_type, 
      referenceCount: reference_urls.length,
      base_prompt_preview: base_prompt.slice(0, 100)
    });
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    // Build analysis prompt
    const analysisMessages = [];
    
    if (reference_urls.length > 0) {
      analysisMessages.push({
        role: 'user',
        content: [
          {
            type: 'text',
          text: `ANALYZE THESE REFERENCE IMAGES FOR MANDATORY STYLE REPLICATION:

You MUST extract these EXACT visual qualities to replicate:

1. COLOR PALETTE:
   - List ALL colors with EXACT hex codes
   - Note saturation levels (low/mid/high)
   - Identify the 60-30-10 color distribution

2. TYPOGRAPHY:
   - Font classification (geometric sans, humanist sans, serif, display)
   - Weight used (light/regular/medium/bold/black)
   - Letter spacing (tight/normal/loose)
   - Capitalization style

3. COMPOSITION:
   - Grid system (centered, rule of thirds, asymmetric)
   - White space ratio (minimal/balanced/generous)
   - Visual hierarchy levels

4. VISUAL LANGUAGE:
   - Shape language (geometric/organic/angular/rounded)
   - Edge treatment (sharp/soft/rounded)
   - Finish quality (matte/clean/textured)

5. QUALITY LEVEL:
   - Level of minimalism
   - Craft refinement (pixel-perfect details)
   - Contemporary vs traditional aesthetic

For: ${base_prompt}

Design Type: ${design_type}
Quality Benchmark: ${QUALITY_BENCHMARKS[design_type.toLowerCase()] || 'Professional design standards with $500 level execution.'}

Return JSON with SPECIFIC values to replicate:
{
  "colors": {
    "primary": "#hex",
    "secondary": "#hex", 
    "accent": "#hex",
    "background": "#hex"
  },
  "typography": {
    "classification": "geometric sans-serif",
    "weight": "bold",
    "style": "all caps with tight tracking"
  },
  "composition": {
    "grid": "centered with generous whitespace",
    "hierarchy": "single focal point"
  },
  "visual_language": {
    "shapes": "geometric, sharp edges",
    "finish": "clean vector, flat style"
  },
  "quality_mandate": "Match EXACT sophistication level of reference"
}`
          },
          ...reference_urls.map(url => ({
            type: 'image_url',
            image_url: { url }
          }))
        ]
      });
      
      // Call AI to analyze references
      const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: analysisMessages,
          tools: [{
            type: 'function',
            function: {
              name: 'extract_design_dna',
              description: 'Extract exact visual style for replication',
              parameters: {
                type: 'object',
                properties: {
                  colors: { 
                    type: 'object',
                    properties: {
                      primary: { type: 'string' },
                      secondary: { type: 'string' },
                      accent: { type: 'string' },
                      background: { type: 'string' }
                    }
                  },
                  typography: {
                    type: 'object',
                    properties: {
                      classification: { type: 'string' },
                      weight: { type: 'string' },
                      style: { type: 'string' }
                    }
                  },
                  composition: {
                    type: 'object',
                    properties: {
                      grid: { type: 'string' },
                      hierarchy: { type: 'string' }
                    }
                  },
                  visual_language: {
                    type: 'object',
                    properties: {
                      shapes: { type: 'string' },
                      finish: { type: 'string' }
                    }
                  },
                  quality_mandate: { type: 'string' }
                },
                required: ['colors', 'typography', 'composition', 'visual_language', 'quality_mandate']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'extract_design_dna' } }
        })
      });
      
      if (!analysisResponse.ok) {
        throw new Error(`Analysis failed: ${analysisResponse.status}`);
      }
      
      const analysisData = await analysisResponse.json();
      const toolCall = analysisData.choices?.[0]?.message?.tool_calls?.[0];
      const designDNA = toolCall ? JSON.parse(toolCall.function.arguments) : null;
      
      if (designDNA) {
        const enhanced_prompt = `${base_prompt}

STYLE: Colors ${JSON.stringify(designDNA.colors)}, Type: ${designDNA.typography.classification} ${designDNA.typography.weight} ${designDNA.typography.style}, Layout: ${designDNA.composition.grid}, Shapes: ${designDNA.visual_language.shapes} ${designDNA.visual_language.finish}. ${designDNA.quality_mandate}`;
        
        console.log('✅ Enhanced prompt with style replication:', designDNA.quality_mandate);
        
        return new Response(JSON.stringify({
          enhanced_prompt,
          design_dna_summary: designDNA.quality_mandate,
          sophistication_level: designDNA.quality_mandate
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // No references - return base prompt with quality benchmark
    const enhanced_prompt = `${base_prompt}

QUALITY BENCHMARK: ${QUALITY_BENCHMARKS[design_type.toLowerCase()] || 'Professional design standards with $500 level execution.'}`;
    
    console.log('✅ Enhanced prompt without references');
    
    return new Response(JSON.stringify({
      enhanced_prompt,
      design_dna_summary: 'No reference analysis',
      sophistication_level: 'Standard professional quality'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Prompt enhancer error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Prompt enhancement failed',
      enhanced_prompt: '',
      design_dna_summary: ''
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

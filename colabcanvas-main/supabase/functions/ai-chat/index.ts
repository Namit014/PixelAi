// @ts-nocheck
// AI Chat Edge Function v2.3 - Zero-friction AI designer
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

// Security: Whitelist of allowed CORS origins
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
    'Access-Control-Allow-Credentials': 'true',
  };
}

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(10000),
});

const isValidHttpUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const AiChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(100),
  conversationId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().optional(),
  model: z.enum([
    'google/gemini-2.5-flash',
    'google/gemini-2.5-pro',
    'google/gemini-2.5-flash-lite',
    'google/gemini-3-pro-preview',
    'google/gemini-3-flash-preview',
    'google/gemini-3-pro-image-preview',
    'openai/gpt-5',
    'openai/gpt-5-mini',
    'openai/gpt-5-nano',
    'openai/gpt-5.2'
  ]).optional(),
  context: z.object({
    designType: z.string().optional(),
    brandInfo: z.any().optional(),
    lastDesignPrompt: z.string().max(5000).optional(),
    styleKeywords: z.array(z.string().max(100)).max(20).optional(),
    brand_system: z.any().optional(),
    uploadedImageUrl: z.string().nullable().optional().refine(
      (val) => !val || isValidHttpUrl(val),
      { message: 'Invalid URL format for uploaded image' }
    ),
    hasUploadedImage: z.boolean().optional(),
    selectedSkill: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      designType: z.string().optional(),
      requestType: z.string().optional(),
      iterationCount: z.number().optional(),
    }).optional(),
    taggedAssets: z.array(z.object({
      id: z.string(),
      name: z.string(),
      imageUrl: z.string().optional(),
    })).optional(),
    selectedArtboardImage: z.string().optional(),
  }).optional(),
});

function getSafeErrorMessage(error: Error): string {
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    errorType: error.constructor.name,
  });
  
  if (error.message.includes('Unauthorized') || error.message.includes('authorization')) {
    return 'Authentication required';
  }
  if (error.message.includes('not found')) {
    return 'Resource not found';
  }
  if (error.message.includes('AI Gateway error')) {
    return 'AI service temporarily unavailable';
  }
  if (error.message.includes('Invalid')) {
    return 'Invalid request format';
  }
  
  return 'An error occurred. Please try again later.';
}

function buildSystemPrompt(context?: any): string {
  let contextInfo = '';
  if (context) {
    const hasImage = context.hasUploadedImage || (context.taggedAssets?.length > 0) || (context.taggedAssetImageUrls?.length > 0);
    contextInfo = `\nCTX: design=${context.designType||'none'} brand=${context.brandInfo?.name||'none'} type=${context.requestType||'none'} img=${hasImage?'yes':'no'}`;
    
    if (context.recentGenerations?.length > 0) {
      contextInfo += `\nRECENT_DESIGNS: ${context.recentGenerations.length} design batches generated. When user asks about previous designs, reference these and offer concept notes.`;
    }
    
    // Tagged canvas assets awareness
    if (context.taggedAssets?.length > 0) {
      const assetNames = context.taggedAssets.map((a: any) => a.name).join(', ');
      contextInfo += `\nTAGGED_ASSETS: User has tagged ${context.taggedAssets.length} canvas object(s) as reference: [${assetNames}]. These are images from the user's canvas that they want you to use as reference material for the next generation. ALWAYS acknowledge these tagged assets and use them as design references. Include them as context in your comprehensive_generate response.`;
      // Force action when tagged assets + design context exists
      if (context.designType && context.designType !== 'none') {
        contextInfo += `\nCRITICAL: TAGGED_ASSETS present + design context "${context.designType}" exists. You MUST respond with comprehensive_generate immediately. Do NOT ask questions. The tagged image IS the brief. Treat the image as the complete product reference.`;
      }
    }
    
    // Selected artboard image
    if (context.selectedArtboardImage) {
      contextInfo += `\nSELECTED_CANVAS_IMAGE: User has a canvas object selected. Use it as visual reference for generation.`;
    }
  }
  
  const skillInfo = context?.selectedSkill 
    ? `\nACTIVE_SKILL: "${context.selectedSkill.name}" (designType: ${context.selectedSkill.designType || 'design'}, requestType: ${context.selectedSkill.requestType || 'design'}).
The user selected this specific skill. Your goal is to execute it.
- IF the user has a tagged image OR uploaded image: Proceed IMMEDIATELY with {"action":"comprehensive_generate","design_type":"${context.selectedSkill.designType || 'design'}","brand_info":{"name":"","industry":"","features":[${context.taggedAssets?.length ? 'any user-mentioned features' : ''}]},"search_query":"${context.selectedSkill.name}","style_keywords":"","auto_generate":true}. The frontend image analysis step will extract all visual details from the image. Do NOT ask for product name, brand name, or any details — the image contains everything needed.
- IF the user has NO image AND gave no description at all: Ask ONLY for a reference image or a brief description, nothing else.
- NEVER ask what TYPE of design — they already chose via the skill. NEVER ask for product name if image is present.
- After designs are generated (hasGeneratedDesigns=true), switch to conversational mode for follow-ups. Do NOT auto-generate again.`
    : '';

  return `You are RUMI, an elite AI creative director at CoLab. You respond in JSON format with TWO possible structures:

1. CONVERSATIONAL (when you need more info, are chatting, or responding to feedback):
{"message": "Your conversational response here", "options": ["Option 1", "Option 2", "Option 3"]}

2. ACTION (when you have enough context to take action):
{"action": "comprehensive_generate", "design_type": "...", "brand_info": {"name": "...", "industry": "...", "features": ["..."]}, "search_query": "...", "style_keywords": "...", "auto_generate": true}

WHEN TO CHAT vs WHEN TO ACT:
- User gives vague request ("make something cool", "help me with social media") → CHAT: Ask what brand, what product, what's the goal
- User gives partial info ("amazon listing") but no product details → CHAT: Ask what product, key features, brand name
- User gives COMPLETE brief (product name + features + what they want) → ACT immediately with comprehensive_generate
- User says "yes", "go ahead", "do it", "generate" after discussion → ACT with accumulated context
- User gives feedback on generated designs ("too dark", "more minimal", "I like #2") → CHAT naturally about results
- User asks about previous designs → CHAT and reference them
- ACTIVE_SKILL is set → ACT immediately, collect brand/product name if missing but don't re-ask what to create

VALID ACTIONS:
- comprehensive_generate: For ALL design generation. PRIMARY action.
- generate_iterations: Generate variations of existing designs
- image_question: When user uploads an image with no text instruction
- web_research: Research a brand or topic online
- generate_logo_variations: Generate logo package with variations

DESIGN TYPES: logo, branding, poster, campaign, social_media, ecommerce, illustration, character, app_poster, brand_guidelines

SYNONYMS: "amazon/product listing/shopify" → ecommerce, "social media/instagram/facebook" → social_media, "ad campaign/marketing" → campaign, "app poster/app banner" → app_poster, "brand guidelines/brand guide/style guide/brand book/brand manual" → brand_guidelines

INTELLIGENCE RULES:
1) Complete brief (product + features + goal) → comprehensive_generate IMMEDIATELY
2) Extract selling points/features into brand_info.features array
3) ACTIVE_SKILL set + image present (tagged or uploaded) → comprehensive_generate IMMEDIATELY. The image analysis step will extract all details. ACTIVE_SKILL set + NO image + NO description → ASK for image or description only.
4) Image present + skill active → comprehensive_generate immediately. Image present + no skill + no text → image_question.
5) "research [brand]" → web_research
6) NEVER respond with just "I understand" - always take action or ask a SPECIFIC question
7) NEVER use search_inspiration as default step
8) After designs are generated (hasGeneratedDesigns=true), respond CONVERSATIONALLY to follow-up messages. Do NOT auto-generate again unless user explicitly asks.
9) Always include 3-6 options for conversational responses

MEMORY: When user asks about designs you created, acknowledge them and offer concept notes.${skillInfo}${contextInfo}`;
}

const DESIGNER_SYSTEM_PROMPT = buildSystemPrompt();

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔥 AI-CHAT FUNCTION CALLED:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      hasAuth: !!req.headers.get('Authorization')
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.warn('SECURITY: Invalid or expired token', {
        error: claimsError?.message,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    const body = await req.json();
    const validated = AiChatRequestSchema.parse(body);
    
    const { messages, conversationId, projectId, model, context } = validated;

    console.log('📥 AI Chat Request received:', {
      messageCount: messages.length,
      lastUserMessage: messages[messages.length - 1]?.content?.substring(0, 100),
      hasContext: !!context,
      model: model || 'default'
    });

    const CREDIT_COST = 1;

    const selectedModel = model || 'google/gemini-2.5-flash';
    const startTime = Date.now();

    const systemPrompt = buildSystemPrompt(context);
    
    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const isNewerModel = selectedModel.includes('gpt-5') || selectedModel.includes('gpt-4.1') || 
                         selectedModel.includes('o3') || selectedModel.includes('o4');
    
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    
    // FIXED: Only force JSON mode when:
    // 1. A skill is actively selected (user chose a specific workflow)
    // 2. User explicitly says "generate/create" + a design keyword AND no designs generated yet
    // This allows natural conversation after generation and for briefing questions
    const hasExplicitCreateIntent = lastUserMessage.match(/\b(generate|create)\b/i) && 
      lastUserMessage.match(/\b(logo|poster|listing|banner|post|campaign|illustration|design|brand|amazon|social|character|app)\b/i);
    
    const hasGeneratedDesigns = context?.hasGeneratedDesigns === true;
    
    const needsJSONMode = !!(context?.selectedSkill && !hasGeneratedDesigns) || 
      (hasExplicitCreateIntent && !hasGeneratedDesigns);
    
    const requestBody: any = {
      model: selectedModel,
      messages: conversationMessages
    };
    
    if (needsJSONMode) {
      requestBody.response_format = { type: "json_object" };
    }
    
    if (isNewerModel) {
      requestBody.max_completion_tokens = 2000;
    } else {
      requestBody.max_tokens = 2000;
      requestBody.temperature = 0.3;
    }

    console.log('Calling AI with request:', JSON.stringify(requestBody, null, 2));

    const aiStartTime = Date.now();
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    console.log(`⏱️ AI response received in ${Date.now() - aiStartTime}ms`);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'rate_limit',
            message: 'AI service rate limit reached. Please wait a moment and try again.',
            options: ['Try Again', 'Start Over']
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'lovable_ai_limit_reached',
            message: 'AI service usage limit reached. Please upgrade your plan to continue.',
            details: 'This application uses the Lovable AI Gateway which has usage limits.',
            options: ['Contact Support', 'Try Again Later']
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('Raw AI response:', JSON.stringify(aiData, null, 2));
    
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent || rawContent.trim() === '') {
      console.error('Empty response from AI. Full response:', JSON.stringify(aiData));
      
      return new Response(
        JSON.stringify({ 
          message: "I'm having trouble generating a response. Please try rephrasing your request or try again in a moment.",
          options: ["Try Again", "Start Over", "Simplify Request"]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('AI Response content:', rawContent);
    
    const assistantMessage = rawContent;
    
    let aiParsedResponse;
    try {
      aiParsedResponse = JSON.parse(rawContent);
      
      if (Array.isArray(aiParsedResponse) && aiParsedResponse.length > 0) {
        console.log('🔀 AI returned array, extracting first');
        aiParsedResponse = aiParsedResponse[0];
      }
      
      console.log('✅ Parsed AI response as JSON action:', aiParsedResponse);
    } catch (parseError) {
      console.log('💬 Natural language response detected');
      
      return new Response(
        JSON.stringify({ message: rawContent, options: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let responseData;
    try {
      const parsed = aiParsedResponse;
        
      if (parsed.action === 'comprehensive_generate') {
        console.log('Comprehensive generation requested:', parsed);
        
        responseData = {
          action: 'comprehensive_generate',
          design_type: parsed.design_type,
          search_query: parsed.search_query,
          brand_info: parsed.brand_info,
          style_keywords: parsed.style_keywords,
          auto_generate: parsed.auto_generate,
          message: "Analyzing your request and generating designs..."
        };
      }
      else if (parsed.action === 'image_question') {
        // If skill is active + image present, auto-route to comprehensive_generate
        if (context?.selectedSkill && (context?.taggedAssets?.length > 0 || context?.uploadedImageUrl)) {
          const skillDesignType = context.selectedSkill.designType || 'design';
          responseData = {
            action: 'comprehensive_generate',
            design_type: skillDesignType,
            brand_info: parsed.brand_info || { name: '', industry: '', features: [] },
            search_query: context.selectedSkill.name,
            style_keywords: '',
            auto_generate: true,
            message: `Starting ${context.selectedSkill.name} workflow...`
          };
        } else {
          // No skill - pass through to frontend
          responseData = {
            action: 'image_question',
            message: parsed.message || 'What would you like me to do with this image?',
            options: parsed.options || ['Use as inspiration', 'Edit this image', 'Extract colors']
          };
        }
      }
      else if (parsed.action === 'search_inspiration' || parsed.action === 'search_dribbble') {
        // Remap to comprehensive_generate - no inspiration browsing anymore
        responseData = {
          action: 'comprehensive_generate',
          design_type: parsed.design_type || context?.designType || 'design',
          brand_info: parsed.brand_info || context?.brandInfo || {},
          search_query: parsed.search_query || '',
          style_keywords: parsed.style_keywords || '',
          auto_generate: true,
          message: 'Generating designs...'
        };
      }
      else if (parsed.action === 'web_research') {
        responseData = {
          action: 'web_research',
          research_type: parsed.research_type || 'design_trends',
          query: parsed.query,
          premium_required: true,
          message: "Researching design trends and market insights..."
        };
      }
      else if (parsed.action === 'generate_logo_variations') {
        responseData = {
          action: 'generate_logo_variations',
          brand_name: parsed.brand_name,
          base_prompt: parsed.base_prompt,
          variations: parsed.variations || [],
          message: "Generating complete logo package with variations..."
        };
      }
      else if (parsed.action === 'generate_iterations' && parsed.base_prompt) {
        console.log('Iteration generation requested:', parsed.base_prompt);
        
        console.log('🎯 Calling reference-curator-agent...');
        const curatorResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/reference-curator-agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            category: parsed.design_type,
            exclude_ids: [],
            limit: 3
          })
        });
        
        let references = [];
        let updated_exclude_ids = [];
        
        if (curatorResponse.ok) {
          const curatorData = await curatorResponse.json();
          references = curatorData.references || [];
          updated_exclude_ids = curatorData.updated_exclude_ids || [];
          console.log(`✅ Curator returned ${references.length} references`);
        } else {
          console.warn('⚠️ Curator failed, continuing without references');
        }
        
        let iterationCount = parsed.iterations || 5;
        if (parsed.design_type?.toLowerCase().includes('brand') || 
            parsed.design_type?.toLowerCase().includes('guideline') ||
            parsed.base_prompt?.toLowerCase().includes('brand guideline')) {
          iterationCount = Math.max(iterationCount, 6);
        }
        
        responseData = {
          action: 'generate_iterations',
          design_type: parsed.design_type,
          base_prompt: parsed.base_prompt,
          iterations: iterationCount,
          rationale: parsed.rationale,
          message: iterationCount > 5 
            ? `Generating ${iterationCount} pages for comprehensive brand guidelines...`
            : "Generating design iterations..."
        };
      }
      else if (parsed.action === 'generate_design' && parsed.prompt) {
        console.log('Design generation requested:', parsed.prompt);
        
        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image',
            messages: [{ role: 'user', content: parsed.prompt }],
            modalities: ['image', 'text']
          }),
        });

        if (!imageResponse.ok) {
          console.error('Image generation failed:', await imageResponse.text());
          throw new Error('Image generation failed');
        }

        const imageData = await imageResponse.json();
        const generatedImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!generatedImageUrl) {
          throw new Error('No image URL in response');
        }

        const { data: creditData } = await supabase
          .from('credits')
          .select('subscription_tier')
          .eq('user_id', user.id)
          .single();

        const shouldWatermark = creditData?.subscription_tier === 'free';

        let finalProjectId = projectId;
        if (!finalProjectId && conversationId) {
          const { data: conversation } = await supabase
            .from('conversations')
            .select('project_id')
            .eq('id', conversationId)
            .single();
          finalProjectId = conversation?.project_id;
        }

        if (!finalProjectId) {
          throw new Error('No project_id available');
        }

        const newArtboard = {
          user_id: user.id,
          project_id: finalProjectId,
          title: 'AI Generated Design',
          width: 1024,
          height: 1024,
          position_x: Math.random() * 300,
          position_y: Math.random() * 300,
          image_url: generatedImageUrl
        };

        const { data: artboard, error: artboardError } = await supabase
          .from('artboards')
          .insert(newArtboard)
          .select()
          .single();

        if (artboardError) {
          console.error('Failed to create artboard:', artboardError);
          throw artboardError;
        }

        const generationTime = Date.now() - startTime;
        await supabase.from('design_generations').insert({
          user_id: user.id,
          project_id: finalProjectId,
          conversation_id: conversationId,
          model_used: 'google/gemini-2.5-flash-image',
          design_type: parsed.design_type || 'general',
          prompt: parsed.prompt,
          generation_time_ms: generationTime,
          success: true,
        });

        responseData = {
          message: parsed.rationale || '✨ Design generated successfully! Check your canvas.',
          designGenerated: true,
          artboard: artboard,
          shouldWatermark
        };
      } else if (parsed.message) {
        let finalMessage = parsed.message;
        let finalOptions = parsed.options || [];
        
        if (typeof parsed.message === 'string' && parsed.message.trim().startsWith('{')) {
          try {
            const nestedParsed = JSON.parse(parsed.message);
            if (nestedParsed.message) {
              finalMessage = nestedParsed.message;
              finalOptions = nestedParsed.options || [];
              console.log('✅ Extracted nested JSON from message field');
            }
          } catch {
            // Not nested JSON, use as-is
          }
        }
        
        responseData = { 
          message: finalMessage,
          options: finalOptions
        };
      } else if (parsed.action && parsed.design_type && parsed.auto_generate === true) {
        // ONLY remap to comprehensive_generate if AI explicitly set auto_generate: true
        console.log('🔄 Mapping unknown action to comprehensive_generate (auto_generate=true):', parsed.action);
        responseData = {
          action: 'comprehensive_generate',
          design_type: parsed.design_type,
          search_query: parsed.search_query || parsed.brand_info?.name || '',
          brand_info: parsed.brand_info,
          style_keywords: parsed.style_keywords || '',
          auto_generate: true,
          message: "Analyzing your request and generating designs..."
        };
      } else if (parsed.action && parsed.design_type && !parsed.auto_generate) {
        // AI returned an action with design_type but didn't say auto_generate
        // Treat as conversational - show message if present, otherwise ask
        const msg = parsed.message || `I can help you with ${parsed.design_type} design. What brand or product is this for?`;
        responseData = {
          message: msg,
          options: parsed.options || ["Provide brand details", "Upload a reference image", "Browse inspiration"]
        };
      } else {
        const fallbackMessage = parsed.message || parsed.content || "What type of design would you like to create?";
        responseData = { 
          message: typeof fallbackMessage === 'string' ? fallbackMessage : "What type of design would you like to create?",
          options: parsed.options || ["Logo Design", "Social Media Post", "Amazon Listing", "Poster", "Campaign", "Illustration"]
        };
      }
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      console.error('Raw response:', assistantMessage);
      responseData = { 
        message: assistantMessage,
        options: ["Continue", "Start Over", "Get Help"]
      };
    }

    // PHASE 1 FIX: Do NOT save messages here — frontend is the single source of truth
    // for message persistence (it saves with rich metadata: tagged_assets, design_iterations, etc.)
    // Backend duplicate writes were overwriting metadata with plain text, causing data loss on reload.
    console.log('📝 Skipping backend message save — frontend handles persistence with full metadata');

    const { data: deductSuccess, error: deductError } = await supabase
      .rpc('deduct_credits', { 
        _user_id: user.id, 
        _amount: CREDIT_COST 
      });

    if (deductError || !deductSuccess) {
      console.error('Error deducting credits:', deductError);
      throw new Error('Insufficient credits');
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('=== AI CHAT ERROR ===');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error type:', error instanceof z.ZodError ? 'VALIDATION' : 'RUNTIME');
    console.error('Detailed error:', {
      message: error.message,
      ...(error instanceof z.ZodError && { issues: error.issues }),
      stack: error.stack,
    });
    
    const status = error instanceof z.ZodError ? 400 : 500;
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
    );
  }
});

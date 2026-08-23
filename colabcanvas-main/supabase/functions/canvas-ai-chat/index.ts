import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation schema
const CanvasAIRequestSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(2000, 'Prompt must be less than 2000 characters')
    .trim(),
  selectedImages: z.array(z.object({
    src: z.string()
      .min(1, 'Image src is required')
      .refine(
        (src) => src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:'),
        'Image src must be a valid HTTP(S) URL or data URL'
      ),
    uploaded: z.boolean().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  })).max(5, 'Maximum 5 images allowed').optional().nullable(),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string()
  })).optional(),
  selectedReference: z.string().url().optional().nullable(),
  // Aspect ratio control params — accepts "W:H" or raw "1280:720"
  aspectRatio: z.string().optional().default('9:16'),
  resolution: z.string().optional().default('1K'),
  originalWidth: z.number().optional(),
  originalHeight: z.number().optional(),
  isEditingSelected: z.boolean().optional()
});

// Safe error handler to prevent information leakage
function getSafeErrorMessage(error: Error): string {
  // Log error server-side only (not exposing to client)
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    errorType: error.constructor.name,
  });
  
  if (error.message.includes('Unauthorized') || error.message.includes('authorization')) {
    return 'Authentication required';
  }
  if (error.message.includes('insufficient_credits')) {
    return error.message; // This is safe to expose
  }
  if (error.message.includes('Rate limit')) {
    return 'Rate limit exceeded. Please try again later.';
  }
  if (error.message.includes('Invalid') || error.message.includes('validation')) {
    return 'Invalid request format';
  }
  
  return 'An error occurred. Please try again later.';
}

Deno.serve(async (req) => {
  console.log('🚀 canvas-ai-chat function invoked');
  console.log('📥 Request method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const body = await req.json();
    console.log('📦 Request body received:', {
      hasPrompt: !!body.prompt,
      hasSelectedImages: !!body.selectedImages,
      selectedImagesCount: body.selectedImages?.length
    });
    
    const validated = CanvasAIRequestSchema.parse(body);
    const { prompt, selectedImages, messages, selectedReference, aspectRatio, resolution, isEditingSelected: clientIsEditingSelected } = validated;
    
    console.log('✅ Validation passed - Canvas AI image generation request:', { 
      promptLength: prompt.length,
      imageCount: selectedImages?.length || 0,
      aspectRatio,
      resolution
    });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing');
    }

    // Get auth header and verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Extract and validate JWT locally (no network call)
    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(jwt);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.warn('SECURITY: Invalid or expired token');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    // ───────────────────────────────────────────────────────────
    // INTENT CLASSIFICATION + COMPOUND PROMPT SPLITTER
    // ───────────────────────────────────────────────────────────
    function parseSlashCommands(p: string): { command: string | null } {
      const m = p.match(/\/(colou?r|filter|style|edit|resize|crop|background|aspect|shot|lighting|angle|remove|replace)\b/i);
      return { command: m ? m[1].toLowerCase() : null };
    }

    function detectCompositeIntent(p: string): boolean {
      return /\b(combine|merge|composite|blend|put\s+(?:the\s+)?\w+\s+into|place\s+(?:the\s+)?\w+\s+(?:on|in|into)|overlay|stitch\s+together|side\s+by\s+side|collage)\b/i.test(p);
    }

    // Split a compound prompt into separate deliverable briefs.
    // Detects numbered lists, bullet lists, semicolon lists, and
    // "create X, Y, and Z" style enumeration of distinct outputs.
    function splitCompoundPrompt(p: string): string[] {
      const trimmed = p.trim();

      // 1. Numbered or bulleted list (newline separated)
      const lineItems = trimmed
        .split(/\n+/)
        .map(l => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
        .filter(l => l.length > 3);
      if (lineItems.length >= 2) return lineItems.slice(0, 6);

      // 2. Semicolon list ("a poster; a banner; a story")
      if (/;/.test(trimmed)) {
        const parts = trimmed.split(/\s*;\s*/).map(s => s.trim()).filter(s => s.length > 3);
        if (parts.length >= 2) return parts.slice(0, 6);
      }

      // 3. Enumeration with verb+articles: "generate/create/make/design A, B, and C"
      const enumMatch = trimmed.match(
        /\b(?:generate|create|make|design|produce|give\s+me|build)\b\s+(.+)/i
      );
      const sourceForEnum = enumMatch ? enumMatch[1] : trimmed;
      // Look for a list of noun phrases joined by commas + and/&
      // e.g. "a logo, a poster and a social post"
      if (/,/.test(sourceForEnum) && /\b(?:and|&)\b/i.test(sourceForEnum)) {
        // Split on commas and trailing "and"
        const raw = sourceForEnum
          .replace(/\s+&\s+/gi, ', ')
          .replace(/,\s*and\s+/gi, ', ')
          .replace(/\s+and\s+/gi, ', ');
        const parts = raw.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);
        // Keep only parts that look like distinct deliverables (have an article or design noun)
        const deliverableHint = /\b(a|an|the|one|new)\b|\b(logo|poster|banner|ad|advert|advertisement|mockup|design|image|photo|illustration|render|graphic|cover|thumbnail|story|reel|post|portrait|landscape|scene|wallpaper|flyer|brochure|card|hero|key\s*visual|product\s+shot)\b/i;
        const deliverables = parts.filter(p => deliverableHint.test(p));
        if (deliverables.length >= 2) {
          // Re-attach a generation verb so each prompt reads cleanly
          return deliverables.slice(0, 6).map(d => /^(generate|create|make|design|produce|build)\b/i.test(d) ? d : `Generate ${d}`);
        }
      }

      return [trimmed];
    }

    type Intent =
      | { kind: 'edit_selected'; count: 1 }
      | { kind: 'variations'; count: number }
      | { kind: 'separate_outputs'; briefs: string[] }
      | { kind: 'composite'; count: 1 }
      | { kind: 'generate_single'; count: 1 };

    function classifyIntent(
      p: string,
      hasOneSelected: boolean,
      hasMultipleSources: boolean
    ): Intent {
      // Slash command on selected image -> always edit
      if (hasOneSelected && parseSlashCommands(p).command) {
        return { kind: 'edit_selected', count: 1 };
      }

      // Explicit composite request with multiple sources
      if (hasMultipleSources && detectCompositeIntent(p)) {
        return { kind: 'composite', count: 1 };
      }

      // Selected image: default to edit unless user clearly asks for variations or distinct outputs
      if (hasOneSelected) {
        const variationMatch = p.match(/\b(\d+)\s*(?:variations?|versions?|options?|alternatives?)\b/i);
        if (variationMatch) {
          const n = Math.min(Math.max(parseInt(variationMatch[1], 10), 1), 6);
          return { kind: 'variations', count: n };
        }
        if (/\b(variations?|options?|alternatives?|several|multiple)\b/i.test(p)) {
          return { kind: 'variations', count: 3 };
        }
        // Default: in-place edit
        return { kind: 'edit_selected', count: 1 };
      }

      // No selected image — check for compound deliverables
      const briefs = splitCompoundPrompt(p);
      if (briefs.length >= 2) {
        return { kind: 'separate_outputs', briefs: briefs.slice(0, 6) };
      }

      // Explicit number of variations
      const explicit = p.match(/\b(\d+)\s+(?:variations?|versions?|options?|images?|designs?|mockups?|posts?|shots?|photos?)\b/i);
      if (explicit) {
        const n = Math.min(Math.max(parseInt(explicit[1], 10), 1), 6);
        return { kind: 'variations', count: n };
      }

      return { kind: 'generate_single', count: 1 };
    }

    // Helper function to detect design category from prompt
    function detectDesignCategory(prompt: string): string {
      const categories = ['poster', 'branding', 'character', 'illustration', 'mockup'];
      const lowerPrompt = prompt.toLowerCase();
      for (const cat of categories) {
        if (lowerPrompt.includes(cat)) return cat;
      }
      return 'branding';
    }

    const hasOneSelected = !!(selectedImages && selectedImages.length === 1) && (clientIsEditingSelected !== false);
    const hasMultipleSources = !!(selectedImages && selectedImages.length > 1);
    const intent = classifyIntent(prompt, hasOneSelected, hasMultipleSources);
    console.log('🎯 Classified intent:', intent);

    // Build the per-call brief list
    const callBriefs: string[] = intent.kind === 'separate_outputs'
      ? intent.briefs
      : Array(intent.kind === 'variations' ? intent.count : 1).fill(prompt);
    const requestedCount = callBriefs.length;
    const isEditMode = intent.kind === 'edit_selected';

    // Extract original dimensions for edit mode
    let effectiveWidth = 0;
    let effectiveHeight = 0;
    if (isEditMode && selectedImages && selectedImages.length === 1) {
      const selectedImg = selectedImages[0] as any;
      effectiveWidth = selectedImg.width || body.originalWidth || 0;
      effectiveHeight = selectedImg.height || body.originalHeight || 0;
      if (effectiveWidth && effectiveHeight) {
        console.log(`📐 EDIT MODE: Will preserve original dimensions ${effectiveWidth}x${effectiveHeight}`);
      }
    }

    // Check user credits and deduct upfront before proceeding
    const CREDIT_COST_PER_IMAGE = 10;
    const totalCreditCost = CREDIT_COST_PER_IMAGE * requestedCount;
    
    const { data: creditData, error: creditError } = await supabaseClient
      .from('credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (creditError) {
      throw new Error('Failed to fetch credits');
    }

    if (!creditData || creditData.balance < totalCreditCost) {
      return new Response(
        JSON.stringify({ 
          error: 'insufficient_credits',
          message: `Generating ${requestedCount} image${requestedCount > 1 ? 's' : ''} requires ${totalCreditCost} credits. You have ${creditData?.balance || 0}.`,
          required: totalCreditCost,
          available: creditData?.balance || 0
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct credits upfront BEFORE generation
    console.log(`💰 Deducting ${totalCreditCost} credits upfront for ${requestedCount} image(s)`);
    
    const { data: deductSuccess, error: deductError } = await supabaseClient
      .rpc('deduct_credits', { 
        _user_id: user.id, 
        _amount: totalCreditCost 
      });

    if (deductError || !deductSuccess) {
      console.error('Error deducting credits:', deductError);
      throw new Error('Insufficient credits');
    }

    // Use aspect ratio from request params, with fallback to prompt parsing
    // IMPORTANT: Gemini image model has ~2048 max dimension limit, so 2K/4K are capped
    const sizeMap: Record<string, Record<string, string>> = {
      '21:9': { '1K': '1568x672', '2K': '2048x880', '4K': '2048x880' },
      '16:9': { '1K': '1456x816', '2K': '2048x1152', '4K': '2048x1152' },
      '4:3': { '1K': '1232x928', '2K': '2048x1536', '4K': '2048x1536' },
      '3:2': { '1K': '1344x896', '2K': '2048x1365', '4K': '2048x1365' },
      '1:1': { '1K': '1024x1024', '2K': '2048x2048', '4K': '2048x2048' },
      '9:16': { '1K': '816x1456', '2K': '1152x2048', '4K': '1152x2048' },
      '3:4': { '1K': '928x1232', '2K': '1536x2048', '4K': '1536x2048' },
      '2:3': { '1K': '896x1344', '2K': '1365x2048', '4K': '1365x2048' },
      '5:4': { '1K': '1280x1024', '2K': '2048x1638', '4K': '2048x1638' },
      '4:5': { '1K': '1024x1280', '2K': '1638x2048', '4K': '1638x2048' },
    };
    
    // If client passed a raw "W:H" pixel ratio (edit mode), derive size directly
    let size: string;
    let targetWidth: number;
    let targetHeight: number;
    const MAX_DIM = 1536;
    const rawWH = aspectRatio.match(/^(\d{2,5}):(\d{2,5})$/);

    if (isEditMode && effectiveWidth && effectiveHeight) {
      const scale = Math.min(1, MAX_DIM / Math.max(effectiveWidth, effectiveHeight));
      targetWidth = Math.round(effectiveWidth * scale);
      targetHeight = Math.round(effectiveHeight * scale);
      size = `${targetWidth}x${targetHeight}`;
      console.log(`📐 EDIT MODE: Using original dimensions ${targetWidth}x${targetHeight} (from ${effectiveWidth}x${effectiveHeight})`);
    } else if (rawWH) {
      const w = parseInt(rawWH[1], 10);
      const h = parseInt(rawWH[2], 10);
      const scale = Math.min(1, MAX_DIM / Math.max(w, h));
      targetWidth = Math.round(w * scale);
      targetHeight = Math.round(h * scale);
      size = `${targetWidth}x${targetHeight}`;
      console.log(`📐 Using raw aspect ${w}:${h} → ${size}`);
    } else {
      size = sizeMap[aspectRatio]?.[resolution] || sizeMap['9:16']['1K'];
      const [widthStr, heightStr] = size.split('x');
      targetWidth = parseInt(widthStr, 10);
      targetHeight = parseInt(heightStr, 10);
      console.log(`📐 Using aspect ratio ${aspectRatio} at ${resolution}: ${size}`);
    }

    // Build the message content based on classified intent
    const messageContent: any[] = [];

    if (intent.kind === 'composite') {
      // EXPLICIT composite of multiple sources
      messageContent.push({
        type: "text",
        text: `ROLE: Senior photo compositor at a top creative studio.
TASK: Combine the provided source images into ONE seamless, photorealistic composition.
USER REQUEST: ${prompt}

NON-NEGOTIABLE RULES:
- Output is exactly ${targetWidth}×${targetHeight} pixels (${aspectRatio}).
- ONE single, complete, standalone image. Never a grid, collage, montage, or split-screen.
- Match lighting direction, color temperature, perspective, and grain across sources.
- Preserve realistic scale, contact shadows, and material detail.
- No watermarks, no captions, no UI overlays.
- Final output must look like a real, professionally retouched photograph or render — not an AI artifact.`
      });
    } else if (intent.kind === 'edit_selected' || intent.kind === 'variations') {
      // SELECTED IMAGE — in-place edit OR variations of that image
      const isTextEditRequest = (p: string): boolean => {
        const textPatterns = [
          /change\s+(the\s+)?text/i,
          /edit\s+(the\s+)?text/i,
          /replace\s+(the\s+)?text/i,
          /update\s+(the\s+)?text/i,
          /modify\s+(the\s+)?text/i,
          /rewrite/i,
          /rename/i,
          /change\s+["'].+["']\s+to/i,
          /change.*to\s+["']/i
        ];
        return textPatterns.some(re => re.test(p));
      };

      // Route text-only edits to dedicated text replacement
      if (intent.kind === 'edit_selected' && isTextEditRequest(prompt)) {
        console.log('📝 Detected text edit request, routing to replace-text function');
        try {
          const replaceResponse = await supabaseClient.functions.invoke('replace-text', {
            body: {
              imageUrl: selectedImages![0].src,
              instruction: prompt,
              originalWidth: effectiveWidth || undefined,
              originalHeight: effectiveHeight || undefined
            }
          });
          if (replaceResponse.data?.editedImageUrl) {
            console.log('✅ Text edit completed via replace-text function');
            return new Response(JSON.stringify({
              images: [replaceResponse.data.editedImageUrl],
              message: "Text updated successfully"
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch (err) {
          console.warn('⚠️ replace-text fell through:', err);
        }
      }

      const dimsBlock = effectiveWidth && effectiveHeight
        ? `Output dimensions: ${effectiveWidth}×${effectiveHeight} pixels — IDENTICAL to the source image. Do not crop, pad, letterbox, or resize.`
        : `Output dimensions and aspect ratio MUST match the source image exactly.`;

      const variationLine = intent.kind === 'variations'
        ? `\nThis is one of ${intent.count} variations. Make this version meaningfully different in lighting, palette, or framing while staying true to the brief and source.`
        : `\nApply ONLY the requested changes. Preserve every other element exactly: subject, layout, composition, identity, props, background, typography, and color of unaffected areas.`;

      messageContent.push({
        type: "text",
        text: `ROLE: Senior retoucher and creative director at a flagship agency.
TASK: ${intent.kind === 'edit_selected' ? 'Edit the attached image in place.' : 'Generate a high-end variation of the attached image.'}
USER REQUEST: ${prompt}

${dimsBlock}${variationLine}

QUALITY BAR (mandatory):
- Photorealistic, agency-grade craft. No plastic skin, no waxy textures, no uncanny faces.
- Realistic optics: correct depth of field, accurate reflections, believable contact shadows.
- Honest materials: fabric weave, metal grain, glass refraction, skin pores where appropriate.
- Modern, cinematic color grading. No oversaturation. No HDR halos.
- ZERO collage, grid, montage, split-screen, side-by-side, or multi-panel output.
- ZERO watermarks, captions, UI chrome, frames, or borders.
- Output a single, complete, standalone image filling the canvas edge to edge.`
      });
    } else {
      // generate_single OR separate_outputs — fetch references and build a base
      // generation system prompt. Per-brief user text is injected per iteration.
      let referenceImages: any[] | null = null;

      if (selectedReference) {
        console.log(`🎯 User selected specific reference: ${selectedReference.substring(0, 50)}...`);
        const { data: selectedRef, error: refError } = await supabaseClient
          .from('reference_images')
          .select('image_url, title, tags')
          .eq('image_url', selectedReference)
          .single();
        if (!refError && selectedRef) {
          referenceImages = [selectedRef];
          console.log(`✅ Using user-selected reference: ${selectedRef.title}`);
        }
      } else {
        const category = detectDesignCategory(prompt);
        console.log(`🎨 Detected design category: ${category}`);
        const { data: categoryRefs } = await supabaseClient
          .from('reference_images')
          .select('image_url, title, tags')
          .contains('tags', [category])
          .order('created_at', { ascending: false })
          .limit(3);
        referenceImages = categoryRefs || null;
        console.log(`📸 Found ${referenceImages?.length || 0} reference images for category: ${category}`);
      }

      const generationSystemPrompt = `ROLE: Senior art director and image specialist at a flagship creative agency.
GOAL: Produce ONE single, finished, publication-ready image at exactly ${targetWidth}×${targetHeight} pixels (${aspectRatio}).

QUALITY BAR (mandatory):
- Photorealistic, agency-grade craft. Modern 2026 cinematic look.
- Realistic optics, depth of field, accurate lighting, true-to-life materials.
- Sharp, clean composition with intentional negative space.
- No outdated AI artifacts: no plastic skin, no melted hands, no warped text, no distorted geometry.
- No oversaturation, no HDR halos, no fake bokeh smears.
- No watermarks, captions, UI overlays, frames, or borders.

OUTPUT FORMAT:
- Exactly ONE complete, standalone image that fills the entire canvas edge-to-edge.
- NEVER a collage, grid, montage, mood board, split-screen, side-by-side, or multi-panel layout.
- If reference images are provided, treat them as STYLE INSPIRATION ONLY — never copy or reproduce them.

If text appears in the design, render it sharply with correct spelling and strong contrast.`;

      messageContent.push({ type: "text", text: generationSystemPrompt });

      // Reference images attached as visual context
      if (referenceImages && referenceImages.length > 0) {
        for (const ref of referenceImages.slice(0, 3)) {
          messageContent.push({ type: "image_url", image_url: { url: ref.image_url } });
        }
      }
    }



    // Attach selected/source images ONLY for edit or composite intents.
    // Generation intents must not pull selected images in (that's what causes
    // accidental collages and "merged" outputs).
    const shouldAttachSources = intent.kind === 'edit_selected'
      || intent.kind === 'variations'
      || intent.kind === 'composite';
    if (shouldAttachSources && selectedImages && selectedImages.length > 0) {
      for (const img of selectedImages) {
        if (img?.src) {
          messageContent.push({ type: "image_url", image_url: { url: img.src } });
        }
      }
    }

    // Generate one image per brief (separate_outputs) or per variation
    const generatedImages: string[] = [];

    try {
      for (let i = 0; i < requestedCount; i++) {
        const brief = callBriefs[i] || prompt;
        console.log(`🎨 Generating image ${i + 1}/${requestedCount} — brief: ${brief.substring(0, 80)}`);

        const iterationMessageContent: any[] = [...messageContent];

        // Inject the per-iteration USER REQUEST so each output is independent
        if (intent.kind === 'separate_outputs' || intent.kind === 'generate_single') {
          iterationMessageContent.push({
            type: "text",
            text: `USER REQUEST (deliverable ${i + 1} of ${requestedCount}): ${brief}\n\nProduce ONE single, complete, standalone image for this deliverable only. Do not reference or combine with any other deliverable.`
          });
        }

        // Anti-collage reinforcement for multi-output runs
        if (requestedCount > 1) {
          iterationMessageContent.push({
            type: "text",
            text: `OUTPUT RULE: Exactly ONE complete, standalone image. NEVER a collage, grid, montage, split-screen, or side-by-side. Fill the entire ${targetWidth}×${targetHeight} canvas edge-to-edge with ONE design only.`
          });
        }

        // CRITICAL: Strong aspect ratio instruction as FIRST element
        // Gemini models respond well to explicit, repeated dimension requirements
        const aspectInstruction = {
          type: "text",
          text: `🖼️ OUTPUT FORMAT REQUIREMENT:
- Aspect ratio: ${aspectRatio}
- Exact dimensions: ${size} pixels (${targetWidth}px wide × ${targetHeight}px tall)
- This is MANDATORY. Generate the image at EXACTLY this size and aspect ratio.
- DO NOT generate a square image. The output MUST be ${aspectRatio === '1:1' ? 'square' : aspectRatio.includes(':') && parseInt(aspectRatio.split(':')[0]) > parseInt(aspectRatio.split(':')[1]) ? 'LANDSCAPE/HORIZONTAL' : 'PORTRAIT/VERTICAL'}.`
        };
        
        // Insert aspect instruction at the very beginning
        const finalMessageContent = [aspectInstruction, ...iterationMessageContent];
        
        // Make API call for this image using the IMAGE GENERATION model
        // Retry up to 2 times on transient failures
        let response: Response | null = null;
        let lastError = '';
        for (let attempt = 1; attempt <= 2; attempt++) {
          response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GEMINI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-pro-image-preview",
              messages: [
                {
                  role: "user",
                  content: finalMessageContent
                }
              ],
              modalities: ["image", "text"],
              temperature: 0.9,
              aspect_ratio: rawWH ? `${targetWidth}:${targetHeight}` : aspectRatio,
              size: size,
              image_config: { aspect_ratio: rawWH ? `${targetWidth}:${targetHeight}` : aspectRatio },
              generation_config: { aspect_ratio: rawWH ? `${targetWidth}:${targetHeight}` : aspectRatio }
            }),
          });

          if (response.ok) break;
          
          lastError = await response.text();
          console.error(`❌ Attempt ${attempt}/2 failed for image ${i + 1}:`, response.status, lastError);
          
          if (response.status === 429 || response.status === 402) break; // Don't retry rate limits
          if (attempt < 2) {
            console.log(`⏳ Retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (!response || !response.ok) {
          console.error(`Failed to generate image ${i + 1} after retries:`, response?.status, lastError);
          
          if (response?.status === 429) {
            await supabaseClient.rpc('add_credits', {
              _user_id: user.id,
              _amount: totalCreditCost
            });
            console.log(`♻️ Refunded ${totalCreditCost} credits due to rate limit`);
            
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          if (response?.status === 402) {
            await supabaseClient.rpc('add_credits', {
              _user_id: user.id,
              _amount: totalCreditCost
            });
            console.log(`♻️ Refunded ${totalCreditCost} internal credits due to AI service limit`);
            
            return new Response(
              JSON.stringify({ 
                error: "ai_limit_reached",
                message: `AI service limit reached. Your credits have been refunded (${totalCreditCost}). Please try again later.`,
                refunded: totalCreditCost
              }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          continue;
        }

        const data = await response.json();
        console.log(`📊 API response keys for image ${i + 1}:`, Object.keys(data));
        
        // Try multiple extraction paths for the image URL
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
          || data.choices?.[0]?.message?.content?.find?.((c: any) => c.type === 'image_url')?.image_url?.url
          || data.images?.[0]?.url;
        
        if (imageUrl) {
          generatedImages.push(imageUrl);
          console.log(`✅ Image ${i + 1}/${requestedCount} generated successfully`);
        } else {
          console.error(`⚠️ Image ${i + 1} - no image URL found in response. Response structure:`, JSON.stringify(data).substring(0, 500));
        }
      }

      if (generatedImages.length === 0) {
        // Refund ALL credits on total failure
        await supabaseClient.rpc('add_credits', {
          _user_id: user.id,
          _amount: totalCreditCost
        });
        console.log(`♻️ Refunded ${totalCreditCost} credits - no images generated`);
        throw new Error("No images were generated successfully");
      }

      // Calculate partial refund if some generations failed
      const failedCount = requestedCount - generatedImages.length;
      if (failedCount > 0) {
        const refundAmount = failedCount * CREDIT_COST_PER_IMAGE;
        await supabaseClient.rpc('add_credits', {
          _user_id: user.id,
          _amount: refundAmount
        });
        console.log(`♻️ Refunded ${refundAmount} credits for ${failedCount} failed generation(s)`);
      }

      console.log(`✅ Successfully generated ${generatedImages.length}/${requestedCount} images`);

      // Apply watermark for free tier users
      const { data: creditData } = await supabaseClient
        .from('credits')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .single();

      const shouldWatermark = creditData?.subscription_tier === 'free';
      
      // Note: Watermarking is handled client-side, just return metadata
      console.log(`✅ Successfully generated ${generatedImages.length}/${requestedCount} images`);
      console.log(`🎨 Should watermark: ${shouldWatermark} (tier: ${creditData?.subscription_tier})`);

      return new Response(
        JSON.stringify({ 
          images: generatedImages,
          count: generatedImages.length,
          shouldWatermark
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (error) {
      // Refund ALL credits on any error during generation
      await supabaseClient.rpc('add_credits', {
        _user_id: user.id,
        _amount: totalCreditCost
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`♻️ Refunded ${totalCreditCost} credits due to error: ${errorMessage}`);
      throw error;
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', {
        issues: error.issues,
        firstError: error.issues[0]
      });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request format',
          details: error.issues[0]?.message || 'Validation failed',
          allErrors: error.errors
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const safeMessage = error instanceof Error ? getSafeErrorMessage(error) : 'An error occurred';
    return new Response(
      JSON.stringify({ error: safeMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

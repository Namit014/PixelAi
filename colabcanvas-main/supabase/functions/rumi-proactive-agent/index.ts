import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Credentials': 'true',
};

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

interface ProposalRequest {
  brandId: string;
  userId: string;
  sessionId?: string;
  contentType?: string; // 'social_media' | 'blog' | 'article'
  iteration?: boolean;
  proposalId?: string;
  feedback?: string;
  previousPrompt?: string;
}

interface ContentConcept {
  title: string;
  copy_text: string;
  hashtags: string[];
  content_type: string;
  image_prompt: string;
  platform_specs: { aspectRatio: string; width: number; height: number };
}

const CONTENT_SYSTEM_PROMPT = `You are RUMI, a senior creative director and brand strategist. You generate specific, actionable content proposals for brands.

Given a brand's identity (colors, typography, voice, audience, industry), generate a content proposal.

## Output Format
Return valid JSON with this structure:
{
  "proposals": [
    {
      "title": "Short catchy title for the content piece",
      "copy_text": "The actual caption/copy/article intro (2-4 sentences, brand voice)",
      "hashtags": ["relevant", "hashtags", "for", "social"],
      "content_type": "instagram_post",
      "image_prompt": "Detailed visual prompt for image generation. Include brand colors, style, composition details. Be specific about layout, objects, mood, lighting.",
      "platform_specs": {"aspectRatio": "1:1", "width": 1080, "height": 1080}
    }
  ]
}

## Content Types & Specs
- instagram_post: 1:1 (1080x1080) or 4:5 (1080x1350)
- instagram_story: 9:16 (1080x1920)
- twitter_post: 16:9 (1200x675)
- linkedin_post: 1.91:1 (1200x628)
- blog_header: 16:9 (1200x675)
- article_cover: 3:2 (1200x800)

## Rules
1. Content MUST reflect the brand's voice, colors, and visual identity
2. Copy must be ready-to-post quality
3. Image prompts must reference brand colors by hex/name
4. Generate 2-3 proposals per request
5. Vary content types unless user specifies one
6. For iterations, incorporate the feedback while maintaining brand consistency
7. NEVER use generic stock photo descriptions—be specific and creative`;

async function fetchBrandData(supabase: any, brandId: string) {
  const { data: brand, error } = await supabase
    .from('brands')
    .select('name, description, industry, brand_voice, target_audience, brand_system_snapshot, logo_primary_url')
    .eq('id', brandId)
    .single();

  if (error) throw new Error(`Brand not found: ${error.message}`);

  // Also fetch brand sections for color/typography data
  const { data: sections } = await supabase
    .from('brand_sections')
    .select('section_type, section_name')
    .eq('brand_id', brandId);

  const { data: blocks } = await supabase
    .from('brand_content_blocks')
    .select('block_type, content, section:brand_sections!inner(brand_id)')
    .eq('section.brand_id', brandId)
    .in('block_type', ['color_palette', 'typography', 'brand_voice']);

  return { brand, sections, blocks };
}

function buildBrandContext(brandData: any): string {
  const { brand, blocks } = brandData;
  const snapshot = brand.brand_system_snapshot || {};

  let context = `## Brand: ${brand.name}\n`;
  if (brand.description) context += `Description: ${brand.description}\n`;
  if (brand.industry) context += `Industry: ${brand.industry}\n`;
  if (brand.brand_voice) context += `Voice: ${brand.brand_voice}\n`;
  if (brand.target_audience) context += `Target Audience: ${brand.target_audience}\n`;

  // Extract colors from snapshot
  if (snapshot.colors) {
    context += `\n## Colors\n`;
    const colors = snapshot.colors;
    if (colors.primary) context += `Primary: ${colors.primary}\n`;
    if (colors.secondary) context += `Secondary: ${colors.secondary}\n`;
    if (colors.accent) context += `Accent: ${colors.accent}\n`;
    if (colors.background) context += `Background: ${colors.background}\n`;
  }

  // Extract typography
  if (snapshot.typography) {
    context += `\n## Typography\n`;
    const typo = snapshot.typography;
    if (typo.headingFont) context += `Heading Font: ${typo.headingFont}\n`;
    if (typo.bodyFont) context += `Body Font: ${typo.bodyFont}\n`;
  }

  // Add block data
  if (blocks?.length) {
    blocks.forEach((block: any) => {
      if (block.block_type === 'color_palette' && block.content) {
        context += `\nColor Palette Data: ${JSON.stringify(block.content)}\n`;
      }
      if (block.block_type === 'brand_voice' && block.content) {
        context += `\nBrand Voice Details: ${JSON.stringify(block.content)}\n`;
      }
    });
  }

  return context;
}

async function generateContentConcepts(
  brandContext: string,
  contentType?: string,
  iteration?: boolean,
  feedback?: string,
  previousPrompt?: string,
): Promise<ContentConcept[]> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  let userPrompt = `${brandContext}\n\n`;

  if (iteration && feedback) {
    userPrompt += `## Iteration Request\nPrevious concept prompt: ${previousPrompt}\nUser feedback: ${feedback}\nPlease regenerate with this feedback incorporated.\n`;
  } else if (contentType) {
    userPrompt += `Generate ${contentType} content proposals for this brand. Create 2-3 varied proposals.\n`;
  } else {
    userPrompt += `Generate a mix of social media and blog content proposals for this brand. Create 2-3 varied proposals across different platforms.\n`;
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GEMINI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: CONTENT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limit exceeded. Please try again shortly.');
    if (response.status === 402) throw new Error('Credits exhausted. Please add credits.');
    throw new Error('AI service error');
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '';

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : raw;

  try {
    const parsed = JSON.parse(jsonStr.trim());
    return parsed.proposals || [];
  } catch {
    console.error('Failed to parse content concepts:', raw);
    throw new Error('Failed to generate content concepts');
  }
}

async function generateImage(imagePrompt: string): Promise<string | null> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) return null;

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-image',
        messages: [{ role: 'user', content: imagePrompt }],
        modalities: ['image', 'text'],
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      console.error('Image generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return imageUrl || null;
  } catch (e) {
    console.error('Image generation error:', e);
    return null;
  }
}

async function uploadImageToStorage(
  supabase: any,
  base64DataUrl: string,
  userId: string,
  proposalId: string,
): Promise<string | null> {
  try {
    // Extract base64 data
    const matches = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1];
    const base64Data = matches[2];
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const filePath = `${userId}/${proposalId}.${ext}`;

    const { error } = await supabase.storage
      .from('rumi-proposals')
      .upload(filePath, bytes, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('rumi-proposals')
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  } catch (e) {
    console.error('Upload error:', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );

    const body: ProposalRequest = await req.json();
    const { brandId, userId, sessionId, contentType, iteration, proposalId, feedback, previousPrompt } = body;

    if (!brandId || !userId) {
      return new Response(
        JSON.stringify({ error: 'brandId and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1. Fetch brand data
    const brandData = await fetchBrandData(supabase, brandId);
    const brandContext = buildBrandContext(brandData);

    // 2. Generate content concepts
    const concepts = await generateContentConcepts(
      brandContext, contentType, iteration, feedback, previousPrompt,
    );

    // 3. Generate images + save proposals
    const proposals = [];

    for (const concept of concepts) {
      // Generate image
      const base64Image = await generateImage(concept.image_prompt);

      // Create proposal record first to get ID
      const { data: proposal, error: insertError } = await supabase
        .from('rumi_content_proposals')
        .insert({
          user_id: userId,
          brand_id: brandId,
          session_id: sessionId || null,
          content_type: concept.content_type,
          title: concept.title,
          copy_text: concept.copy_text,
          hashtags: concept.hashtags,
          image_prompt: concept.image_prompt,
          platform_specs: concept.platform_specs,
          status: 'pending',
          iteration_count: iteration ? 1 : 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert proposal error:', insertError);
        continue;
      }

      // Upload image if generated
      let imageUrl: string | null = null;
      if (base64Image) {
        imageUrl = await uploadImageToStorage(supabase, base64Image, userId, proposal.id);
        if (imageUrl) {
          await supabase
            .from('rumi_content_proposals')
            .update({ image_url: imageUrl })
            .eq('id', proposal.id);
        }
      }

      proposals.push({
        ...proposal,
        image_url: imageUrl,
      });
    }

    return new Response(
      JSON.stringify({ success: true, proposals }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Proactive agent error:', error);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

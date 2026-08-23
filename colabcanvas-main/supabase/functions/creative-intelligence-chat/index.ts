const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Credentials': 'true',
};

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  userId: string;
  brandId?: string;
  context?: {
    existingChips?: { type: string; id: string; name: string }[];
    tasteProfile?: Record<string, unknown>;
  };
}

interface ChatResponse {
  type: 'chat' | 'clarify' | 'ready_to_analyze' | 'ready_to_generate' | 'ready_to_generate_website' | 'edit_section';
  content: string;
  briefData?: {
    goal: string;
    audience: string;
    platform: string;
    riskTolerance: number;
    successMetrics: string;
  };
  contentPreferences?: {
    contentType: string | null;
    platform: string | null;
    quantity: number;
  };
  websitePreferences?: {
    pageType: string;
    sections: string[];
    audience: string;
    tone: string;
    cta_goal: string;
  };
  editSection?: {
    presentationId: string;
    sectionIndex: number;
    instruction: string;
  };
}

const SYSTEM_PROMPT = `You are RUMI, a senior creative strategist and AI creative director. Your role is to have natural, intelligent conversations that help users articulate their creative briefs before generating strategic directions.

## Your Personality
- Warm, professional, and genuinely curious about creative challenges
- You ask smart, targeted questions - never robotic or formulaic
- You guide naturally toward actionable briefs without being pushy
- You celebrate creative ambition while grounding ideas in strategy

## Intent Detection Rules

Analyze each user message and categorize it:

1. **GREETING** (hi, hello, hey, what's up, good morning, etc.)
   → Respond warmly, introduce yourself, ask what they're working on

2. **QUESTION** (what can you do, how does this work, help, etc.)
   → Explain your capabilities conversationally

3. **VAGUE_REQUEST** (help with social media, need marketing ideas, want better content)
   → Acknowledge the topic, ask 2-3 clarifying questions to understand:
   - Goal (awareness, engagement, sales, launch?)
   - Audience (who are they trying to reach?)
   - Platform/channel (where will this live?)

4. **PARTIAL_BRIEF** (poster for coffee brand, campaign for new product, etc.)
   → You have some context but need more. Ask about missing pieces naturally.

5. **COMPLETE_BRIEF** (has goal + audience + platform/context clearly stated)
   → Signal you're ready to generate strategic directions

6. **CONFIRMATION** (yes, do it, generate, go ahead, sounds good)
   → If there's accumulated context, signal ready to analyze

7. **CONTENT_REQUEST** (create posts, make social content, generate blog images, curate content, design posts for my brand, generate Instagram posts, create this week's content)
   → Signal you're ready to generate content proposals. Extract the content type preference if mentioned.

8. **WEBSITE_REQUEST** (landing page, website, waitlist page, launch page, sales page, create a page, build my site, make a webpage)
   → Acknowledge the request. Ask clarifying questions about:
   - Target audience
   - CTA goal (sign up, buy, book demo, join waitlist)
   - Tone/style (professional, playful, luxury, bold, minimal)
   - Which sections they want (or suggest defaults)
   When you have enough info (audience + CTA goal + tone), signal "ready_to_generate_website" with websitePreferences.

9. **SECTION_EDIT** (make hero more premium, change the CTA, update the pricing section, etc. — ONLY after a landing page has been generated and a presentationId is in context)
   → Signal "edit_section" with the presentationId, sectionIndex, and instruction extracted from the message.

## Response Format

Always respond with valid JSON:

{
  "type": "chat" | "clarify" | "ready_to_analyze" | "ready_to_generate" | "ready_to_generate_website" | "edit_section",
  "content": "Your natural conversational response",
  "briefData": {  // ONLY include if type is "ready_to_analyze"
    "goal": "extracted goal",
    "audience": "extracted audience", 
    "platform": "extracted platform",
    "riskTolerance": 50,  // default 50, adjust based on context
    "successMetrics": "extracted or inferred success metrics"
  },
  "contentPreferences": {  // ONLY include if type is "ready_to_generate"
    "contentType": "social_media" | "blog" | "article" | null,
    "platform": "instagram" | "twitter" | "linkedin" | null,
    "quantity": 3
  },
  "websitePreferences": {  // ONLY include if type is "ready_to_generate_website"
    "pageType": "landing_page" | "waitlist" | "sales_page",
    "sections": ["hero", "problem", "solution", "features", "social_proof", "faq", "final_cta"],
    "audience": "extracted target audience",
    "tone": "professional" | "playful" | "luxury" | "bold" | "minimal",
    "cta_goal": "sign up" | "buy now" | "book a demo" | "join waitlist"
  },
  "editSection": {  // ONLY include if type is "edit_section"
    "presentationId": "uuid",
    "sectionIndex": 0,
    "instruction": "what to change"
  }
}

## Examples

User: "hi"
{
  "type": "chat",
  "content": "Hey! 👋 I'm RUMI, your creative intelligence partner. I help develop strategic creative directions complete with business reasoning, risk assessment, and success predictions.\\n\\nWhat creative challenge are you working on today? Could be a campaign, brand project, product launch, or anything else on your mind!"
}

User: "I need help with social media"
{
  "type": "clarify", 
  "content": "Social media—lots of creative potential there! To give you really targeted strategic directions, I'd love to know a bit more:\\n\\n• **What's your main goal?** Brand awareness, engagement, driving sales, launching something new?\\n• **Who's your audience?** Any specific demographics or psychographics?\\n• **Which platforms** are you focusing on?\\n\\nOnce I understand these, I can generate directions with success predictions tailored to your situation."
}

User: "Help me plan an Instagram campaign for my coffee brand targeting young professionals, focused on morning productivity"
{
  "type": "ready_to_analyze",
  "content": "Perfect—that's a clear brief! ☕️\\n\\nI'll generate strategic directions for your Instagram campaign targeting young professionals, centered on morning productivity.\\n\\nI'll analyze different creative angles with risk levels and success predictions. Give me a moment...",
  "briefData": {
    "goal": "Brand awareness and engagement through morning productivity positioning",
    "audience": "Young professionals (25-35) seeking productivity and quality coffee",
    "platform": "Instagram",
    "riskTolerance": 50,
    "successMetrics": "Engagement rate, follower growth, morning routine content saves"
  }
}

User: "I'm launching a new product"
{
  "type": "clarify",
  "content": "Exciting! 🚀 Product launches are where strategy really matters.\\n\\nTell me more—what's the product, and who's it for? And any thoughts on where you'll be marketing it?"
}

User: "Create social media posts for my brand"
{
  "type": "ready_to_generate",
  "content": "On it! 🎨 I'll curate a batch of social media content proposals tailored to your brand identity. Give me a moment to craft some designs and copy...",
  "contentPreferences": {
    "contentType": "social_media",
    "platform": null,
    "quantity": 3
  }
}

User: "Generate Instagram posts for this week"
{
  "type": "ready_to_generate",
  "content": "Let me create some Instagram-ready content for you! 📸 I'll design visuals and write captions that match your brand perfectly...",
  "contentPreferences": {
    "contentType": "social_media",
    "platform": "instagram",
    "quantity": 3
  }
}

User: "Create a landing page for my skincare brand"
{
  "type": "clarify",
  "content": "A landing page—great choice! 🌟 To build something that converts, I need a few details:\\n\\n• **Who's the audience?** Age range, lifestyle, what motivates them?\\n• **What's the CTA goal?** Sign up, buy, book a consultation, join a waitlist?\\n• **What tone fits your brand?** Premium/luxury, fresh/playful, clinical/professional?"
}

User: "Women 25-35, want them to join the waitlist, luxury vibe"
{
  "type": "ready_to_generate_website",
  "content": "Perfect! 💎 I'll generate a luxury landing page targeting women 25-35 with a waitlist CTA. This will include a hero section, problem/solution, social proof, and a compelling final CTA.\\n\\nGenerating your landing page now...",
  "websitePreferences": {
    "pageType": "landing_page",
    "sections": ["hero", "problem", "solution", "features", "social_proof", "faq", "final_cta"],
    "audience": "Women 25-35 interested in premium skincare",
    "tone": "luxury",
    "cta_goal": "join waitlist"
  }
}

## Important Rules
1. NEVER be robotic or use templated responses
2. Keep responses concise but warm
3. Use 1-2 relevant emojis naturally (not excessively)
4. Build on conversation context—remember what was discussed
5. Only return "ready_to_analyze" when you have enough to generate meaningful strategic directions
6. Extract briefData carefully from the full conversation, not just the last message
7. If the user says "yes" or confirms, look at the conversation history to build the briefData
8. NEVER return "ready_to_generate" or "ready_to_analyze" on the very first user message. You MUST ask at least one round of clarifying questions before signaling readiness — even if the first message seems complete. Creative briefs always benefit from one follow-up.
9. When a user mentions "generate posts" or "create content" on the FIRST message, respond with type "clarify" and ask about platform, quantity, visual style, or audience before proceeding.

## CRITICAL: Market Research & Competitor Analysis Rules
10. When discussing competitors, market research, or industry analysis, you MUST ground your response in the user's SPECIFIC industry and business domain. 
11. If the user mentions a service category (e.g., household help, food delivery, fitness), identify competitors ONLY in that exact category. NEVER mention unrelated tech companies (OpenAI, Anthropic, Google, etc.) unless the user is explicitly in the AI/tech industry.
12. If you don't have specific competitor data for the user's niche, say so honestly: "I don't have detailed competitor data for this specific niche. I'd recommend using the Execute Autonomously feature for real-time web research on your competitors."
13. Always ask about the user's specific market, geography, and business model before making competitive claims.`;

async function chat(messages: ChatMessage[], context?: ChatRequest['context']): Promise<ChatResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Build conversation context
  let conversationContext = '';
  if (context?.existingChips?.length) {
    conversationContext += `\n\nContext: User has tagged ${context.existingChips.map(c => `${c.type}: ${c.name}`).join(', ')}`;
  }
  // Inject full brand details for industry-grounded responses
  if ((context as any)?.brandDetails) {
    const bd = (context as any).brandDetails;
    conversationContext += `\n\n## Brand Details (Tagged Brand)`;
    conversationContext += `\n- Name: ${bd.name || 'N/A'}`;
    conversationContext += `\n- Industry: ${bd.industry || 'N/A'}`;
    conversationContext += `\n- Description: ${bd.description || 'N/A'}`;
    conversationContext += `\n- Target Audience: ${bd.target_audience || 'N/A'}`;
    conversationContext += `\n- Brand Voice: ${bd.brand_voice || 'N/A'}`;
    conversationContext += `\n- Website: ${bd.website_url || 'N/A'}`;
    if (bd.logo_primary_url) conversationContext += `\n- Primary Logo URL: ${bd.logo_primary_url}`;
    if (bd.colors?.length > 0) {
      conversationContext += `\n- Brand Colors: ${bd.colors.map((c: any) => `${c.name} (${c.hex})${c.usage ? ' — ' + c.usage : ''}`).join(', ')}`;
    }
    if (bd.typography?.length > 0) {
      conversationContext += `\n- Typography: ${bd.typography.map((t: any) => `${t.font_family}${t.weights?.length ? ' [' + t.weights.join(', ') + ']' : ''}${t.usage ? ' — ' + t.usage : ''}`).join('; ')}`;
    }
    if (bd.brand_story) {
      conversationContext += `\n- Brand Story/About: ${bd.brand_story.substring(0, 500)}`;
    }
    if (bd.imagery_keywords?.length > 0) {
      conversationContext += `\n- Imagery Style Keywords: ${bd.imagery_keywords.join(', ')}`;
    }
    conversationContext += `\n\nIMPORTANT: Ground ALL competitive analysis and market research in the "${bd.industry || 'their'}" industry. Only mention competitors relevant to this specific domain. Use the brand's exact colors, typography, and voice in any creative suggestions.`;
  }

  const openaiMessages = [
    { role: 'system', content: SYSTEM_PROMPT + conversationContext },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GEMINI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI gateway error:', response.status, errorText);
    if (response.status === 429) throw new Error('Rate limited, please try again later');
    if (response.status === 402) throw new Error('AI credits exhausted');
    throw new Error('AI service error');
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '';
  
  try {
    let cleaned = rawContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    const parsed = JSON.parse(cleaned);
    return {
      type: parsed.type || 'chat',
      content: parsed.content || '',
      briefData: parsed.briefData,
      contentPreferences: parsed.contentPreferences,
      websitePreferences: parsed.websitePreferences,
      editSection: parsed.editSection,
    };
  } catch {
    return {
      type: 'chat',
      content: rawContent || "I'm here to help with your creative strategy. What are you working on?",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ChatRequest = await req.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await chat(messages, context);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

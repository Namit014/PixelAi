import { corsHeaders } from '../_shared/cors.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const RUMI_CREATIVE_DIRECTOR_PROMPT = `You are RUMI, a world-class Creative Director on a voice call with a client. You're warm, passionate about design, and deeply experienced in brand strategy, visual storytelling, and campaign development.

YOUR ROLE ON THIS CALL:
- You're taking a creative brief from the client
- Ask probing, thoughtful questions about their brand, audience, goals, and vision
- Be conversational, natural, and encouraging — like a real creative director
- Keep your responses SHORT (1-3 sentences max) since this is a voice conversation
- Show genuine enthusiasm about their ideas
- Gently push for specifics: colors, mood, references, target audience, channels, timeline
- Summarize key points naturally as you go

CONVERSATION FLOW:
1. Start by warmly greeting them and asking what they're working on
2. Dig into the brand context — who they are, what makes them unique
3. Understand the specific project/campaign goal
4. Explore the audience and channels
5. Discuss visual direction, tone, and references
6. Wrap up by summarizing the brief

IMPORTANT:
- Keep ALL responses under 3 sentences — this is a real-time voice call
- Sound natural, not robotic
- Use conversational phrases like "Love that!", "Tell me more about...", "That's interesting because..."
- Don't list things — speak naturally
- Extract concrete details: hex colors, font names, platform sizes, deadlines

After each response, also return a "notes" array with key brief points extracted so far.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, conversationHistory, brandContext } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing transcript' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const messages: any[] = [
      { role: 'system', content: RUMI_CREATIVE_DIRECTOR_PROMPT + (brandContext ? `\n\nBRAND CONTEXT:\n${JSON.stringify(brandContext)}` : '') },
    ];

    // Add conversation history
    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-20)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add the latest user transcript
    messages.push({ role: 'user', content: transcript });

    // Also ask for structured notes extraction
    messages.push({
      role: 'user',
      content: `[SYSTEM: After your conversational response, output a JSON block with key brief notes extracted from the conversation so far. Format: {"response": "your spoken response", "notes": ["note 1", "note 2", ...]}. Return ONLY this JSON.]`,
    });

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.8,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[rumi-voice-chat] AI gateway ${res.status}:`, errBody);
      if (res.status === 402) {
        return new Response(
          JSON.stringify({ error: 'You have run out of AI credits. Please top up your credits in Settings → Workspace → Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (res.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // Try to parse structured response
    let response = rawContent;
    let notes: string[] = [];

    try {
      const cleaned = rawContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.response) response = parsed.response;
      if (Array.isArray(parsed.notes)) notes = parsed.notes;
    } catch {
      // If not JSON, just use the raw content as the response
      response = rawContent;
    }

    return new Response(
      JSON.stringify({ response, notes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[rumi-voice-chat] Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

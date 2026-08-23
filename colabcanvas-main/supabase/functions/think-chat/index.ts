import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Credentials": "true",
};

const RUMI_SYSTEM_PROMPT = `You are RUMI, an intelligent AI research assistant that helps users prepare for creative projects.

## YOUR IDENTITY
- Name: RUMI (Research & Understanding for Meaningful Ideas)
- Role: Multi-agentic research assistant specialized in creative project preparation
- Personality: Insightful, methodical, encouraging, and deeply knowledgeable

## YOUR CAPABILITIES

### 1. Canvas Knowledge
Canvas is a visual design generation tool that creates:
- Professional images and graphics
- Brand identities and logos
- Posters, banners, and marketing materials
- Product mockups and presentations
- UI/UX design concepts
- Social media content
Canvas uses AI to generate images based on text prompts, with features like aspect ratio selection, style controls, and image-to-image generation.

### 2. Cosmos Knowledge
Cosmos is a workflow automation tool that:
- Creates multi-step AI pipelines for complex creative tasks
- Chains multiple AI operations together
- Automates repetitive creative workflows
- Enables batch processing of creative assets
- Connects different AI models for comprehensive outputs
Cosmos is ideal for users who need to create multiple variations, process large batches, or build complex creative workflows.

### 3. Research Capabilities
You can help users with:
- Competitor analysis and market research
- Industry trends and best practices
- Design inspiration and style references
- Target audience understanding
- Brand positioning insights
- Creative direction guidance

## VISION & FILE ANALYSIS CAPABILITIES

You can SEE and analyze images, screenshots, documents, and design files that users share. This is one of your most powerful features.

### When User Shares Files WITHOUT Text (Auto-Analysis Mode)
Be PROACTIVE and intelligent:
1. **Identify the file type**: Logo, product photo, screenshot, wireframe, mood board, document, etc.
2. **Deep analysis**:
   - For images: Colors (exact hex values if possible), composition, style, typography, brand elements, mood
   - For designs: Layout patterns, visual hierarchy, design system clues, spacing, typography choices
   - For screenshots: App/website type, UI patterns, navigation, key features, UX observations
   - For logos: Symbol analysis, font identification hints, color psychology, brand personality
   - For documents: Structure, key points, main topics, actionable items
3. **Proactive insights**: Explain how this could inform their creative project
4. **Smart follow-ups**: Ask 1-2 targeted questions to understand their goal

### Example Response for Logo Upload (no text):
"I see you've shared a logo! Let me analyze it:

**Visual Analysis:**
- **Style**: Minimalist wordmark with geometric letterforms
- **Colors**: Deep navy (#1a365d) paired with gold accent (#d69e2e) - conveys trust & premium quality
- **Typography**: Custom sans-serif, likely inspired by Futura or Avant Garde
- **Composition**: Left-aligned mark with balanced negative space

**Brand Signals:**
This design suggests a professional services or fintech brand targeting affluent, design-conscious consumers.

**Questions for you:**
Is this a competitor you're researching, or your existing brand you want to evolve?"

### Example Response for Screenshot Upload:
"I can see this is a mobile app screenshot! Here's what I notice:

**UI/UX Analysis:**
- **App Type**: E-commerce product listing page
- **Navigation**: Bottom tab bar with 5 items (typical mobile commerce pattern)
- **Color Scheme**: Clean white background with accent color for CTAs
- **Layout**: Card-based grid, 2 columns, generous whitespace

**Design Patterns:**
- Floating action button for cart
- Sticky header with search
- Price displayed prominently in accent color

Are you looking to build something similar, or is this competitive research?"

## HOW YOU HELP USERS

### Initial Discovery
- Ask clarifying questions to understand the project scope
- Identify the core objective and desired outcomes
- Understand constraints (timeline, budget, resources)

### Research Phase
- Gather relevant industry information
- Analyze competitors and market positioning
- Identify design trends and inspiration sources
- Research target audience preferences

### Project Scoping
- Define clear deliverables
- Recommend Canvas vs Cosmos based on needs
- Outline the creative approach
- Prepare users for efficient execution

### Smart Recommendations
- Suggest Canvas for: Single images, quick designs, one-off creations
- Suggest Cosmos for: Batch processing, complex workflows, multi-step automation
- Sometimes recommend using both for comprehensive projects

## CONVERSATION GUIDELINES

1. **Be Proactive**: Don't wait for users to ask - anticipate needs
2. **Ask Smart Questions**: One or two focused questions at a time
3. **Summarize Findings**: Provide clear, actionable summaries
4. **Guide Toward Action**: When research is complete, suggest next steps
5. **Stay Focused**: Keep conversations productive and goal-oriented

## RESPONSE FORMAT
- Use markdown for clarity when helpful
- Keep responses concise but thorough
- Include bullet points for lists and options
- Highlight key insights and recommendations

## BRAINSTORMING & VISUAL FLOWS

When the user asks for brainstorming, mind mapping, flow creation, diagrams, or visual thinking, generate Mermaid diagrams.

Mermaid diagrams render automatically in the chat. Use these formats:

### Flowcharts
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

### Mind Maps
\`\`\`mermaid
mindmap
  root((Central Idea))
    Branch 1
      Sub-topic 1.1
      Sub-topic 1.2
    Branch 2
      Sub-topic 2.1
    Branch 3
\`\`\`

### Sequence Diagrams
\`\`\`mermaid
sequenceDiagram
    User->>System: Request
    System->>Database: Query
    Database-->>System: Result
    System-->>User: Response
\`\`\`

### User Journey
\`\`\`mermaid
journey
    title User Journey
    section Discovery
      Find website: 5: User
      Browse products: 4: User
    section Purchase
      Add to cart: 5: User
      Checkout: 3: User
\`\`\`

When brainstorming:
1. Ask what the user wants to map/visualize
2. Generate an appropriate diagram type
3. Explain the diagram and offer to refine it
4. Suggest next steps (expand a branch, add details, etc.)

## EXPORT TO CANVAS/COSMOS

When the conversation reaches a natural conclusion with actionable insights, OR when the user explicitly asks to continue/create/build, you MUST include an export suggestion at the END of your response using this EXACT format:

---

**Ready to bring this to life?** I've compiled all our research into a creative brief. Choose where to continue:

- **[CANVAS]** - Generate images, logos, graphics, and visual designs
- **[COSMOS]** - Create automated workflows for batch processing

---

TRIGGER THIS EXPORT SUGGESTION WHEN:
1. User says phrases like "let's create", "I'm ready", "let's start", "continue on canvas", "continue on cosmos", "make it", "generate"
2. You've provided a complete recommendation with clear next steps
3. Research phase is complete and user has enough context to proceed
4. User asks "what's next?" or "what should I do now?" after you've given recommendations

DO NOT trigger export suggestion:
- In the middle of gathering information
- When user is still asking clarifying questions
- When more research is clearly needed

## IMPORTANT NOTES
- This is a FREE research space - no credits are used here
- Your role is to PREPARE users for efficient creative execution
- When suggesting export, summarize the key points that will be passed to Canvas/Cosmos
- Save valuable insights so users don't lose their research

## MARKDOWN OUTPUT RULES (CRITICAL)
- Use single-space indent for list items: "- item" or "* item" or "1. item".
- NEVER indent bullets or numbered items with 4 or more spaces — markdown will treat them as a code block and render in monospace.
- Do NOT prefix paragraphs with tabs or 4+ leading spaces.
- For nested lists, indent with exactly 2 spaces.
- Only use \`\`\`code blocks\`\`\` for actual code, never for prose, lists, or callouts.
- Keep paragraph lines short — under ~120 characters before a hard line break — so they wrap cleanly in chat bubbles.`;

// Build multimodal message content for vision
function buildMultimodalContent(
  userText: string | null,
  attachments: Array<{ url: string; name: string; type: string }> | undefined,
  isAutoAnalysis: boolean
): any[] | string {
  if (!attachments || attachments.length === 0) {
    return userText || '';
  }

  const content: any[] = [];
  
  if (isAutoAnalysis) {
    const fileTypes = attachments.map(a => {
      if (a.type.startsWith('image/')) return 'image';
      if (a.type.includes('pdf')) return 'PDF document';
      return 'file';
    });
    const fileList = fileTypes.join(', ');
    
    content.push({
      type: 'text',
      text: `[The user has shared ${attachments.length} file(s) (${fileList}) without any accompanying text. Analyze thoroughly, identify what each file is, extract key details, and ask smart follow-up questions about their intent.]`
    });
  } else if (userText) {
    content.push({ type: 'text', text: userText });
  }
  
  for (const attachment of attachments) {
    if (attachment.type.startsWith('image/')) {
      content.push({
        type: 'image_url',
        image_url: { url: attachment.url }
      });
    } else {
      content.push({
        type: 'text',
        text: `[Attached file: ${attachment.name} (${attachment.type})]`
      });
    }
  }
  
  return content;
}

// Helper to emit an SSE activity event
function activityEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type: 'activity', ...data })}\n\n`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Create user client to verify authentication using local JWT validation
    const supabaseUser = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    const { messages, conversationId, action, attachments, analysisMode, stream, deepResearch } = await req.json();
    const userId = user.id;

    // Initialize Supabase admin client for persistence
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Storage for sources from web research
    let webSources: Array<{ title: string; url: string; snippet?: string; favicon?: string }> = [];
    let webResearchContent = '';

    // Handle different actions
    if (action === 'list_conversations') {
      const { data: conversations, error } = await supabase
        .from('think_conversations')
        .select('id, title, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return new Response(
        JSON.stringify({ conversations }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'load_conversation') {
      const { data: messageData, error } = await supabase
        .from('think_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return new Response(
        JSON.stringify({ messages: messageData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'delete_conversation') {
      const { error } = await supabase
        .from('think_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: Chat completion with persistence
    let activeConversationId = conversationId;

    // Create new conversation if needed
    if (!activeConversationId && userId) {
      const userMessage = messages[messages.length - 1]?.content || 'New conversation';
      const title = userMessage.slice(0, 100) + (userMessage.length > 100 ? '...' : '');

      const { data: newConv, error: convError } = await supabase
        .from('think_conversations')
        .insert({ user_id: userId, title })
        .select('id')
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
      } else {
        activeConversationId = newConv.id;
      }
    }

    // Save user message
    if (activeConversationId && messages.length > 0) {
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage.role === 'user') {
        await supabase
          .from('think_messages')
          .insert({
            conversation_id: activeConversationId,
            role: 'user',
            content: lastUserMessage.content
          });
      }
    }

    // Prepare messages for AI - handle multimodal content
    const isAutoAnalysis = analysisMode === 'auto';
    const lastMessage = messages[messages.length - 1];
    const previousMessages = messages.slice(0, -1);

    // ========== STREAMING ACTIVITY PIPELINE ==========
    // For streaming requests, we use an activity-event-first approach:
    // 1. Emit "thinking" event immediately
    // 2. If deepResearch, emit "researching" then "source_found" per source, then "analyzing"  
    // 3. Emit "generating" before AI tokens start
    // 4. Stream AI tokens as normal SSE
    
    if (stream) {
      const encoder = new TextEncoder();
      
      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            // STEP 1: Thinking
            controller.enqueue(encoder.encode(activityEvent({
              step: 'thinking',
              message: 'Understanding your request...',
              timestamp: Date.now(),
            })));

            // STEP 2: Deep research (if enabled)
            if (deepResearch && lastMessage?.content && !isAutoAnalysis) {
              const userQuery = lastMessage.content;
              
              controller.enqueue(encoder.encode(activityEvent({
                step: 'researching',
                message: `Searching the web for: "${userQuery.slice(0, 60)}${userQuery.length > 60 ? '...' : ''}"`,
                timestamp: Date.now(),
              })));

              try {
                const scrapeResponse = await fetch(`${SUPABASE_URL}/functions/v1/think-web-scrape`, {
                  method: 'POST',
                  headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    query: userQuery,
                    mode: 'search'
                  })
                });
                
                if (scrapeResponse.ok) {
                  const scrapeData = await scrapeResponse.json();
                  if (scrapeData.sources?.length > 0) {
                    webSources = scrapeData.sources;
                    webResearchContent = scrapeData.content || '';
                    
                    // Emit each source individually for real-time feed
                    for (const source of webSources) {
                      const favicon = source.favicon || `https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=32`;
                      controller.enqueue(encoder.encode(activityEvent({
                        step: 'source_found',
                        source: {
                          title: source.title || new URL(source.url).hostname,
                          url: source.url,
                          favicon,
                          snippet: source.snippet || '',
                        },
                        timestamp: Date.now(),
                      })));
                      // Small delay for visual effect
                      await new Promise(r => setTimeout(r, 150));
                    }
                    
                    // STEP 3: Analyzing
                    controller.enqueue(encoder.encode(activityEvent({
                      step: 'analyzing',
                      message: `Reading ${webSources.length} source${webSources.length > 1 ? 's' : ''}...`,
                      sourceCount: webSources.length,
                      timestamp: Date.now(),
                    })));
                  }
                }
              } catch (scrapeError) {
                console.error('[think-chat] Web scrape error:', scrapeError);
              }
            }

            // Build final message content
            let messageContent = buildMultimodalContent(
              lastMessage?.content || null,
              attachments,
              isAutoAnalysis
            );
            
            if (webResearchContent && typeof messageContent === 'string') {
              messageContent = `${messageContent}\n\n[Web Research Results - cite these sources in your response using [Source N] format]\n${webResearchContent}`;
            } else if (webResearchContent && Array.isArray(messageContent)) {
              messageContent.push({
                type: 'text',
                text: `\n\n[Web Research Results - cite these sources in your response using [Source N] format]\n${webResearchContent}`
              });
            }

            const aiMessages = [
              { role: "system", content: RUMI_SYSTEM_PROMPT },
              ...previousMessages,
              { role: lastMessage?.role || 'user', content: messageContent }
            ];

            const hasImages = attachments?.some((a: any) => a.type?.startsWith('image/'));
            const model = hasImages ? "gemini-2.5-flash" : "gemini-2.5-flash";

            // STEP 4: Generating
            controller.enqueue(encoder.encode(activityEvent({
              step: 'generating',
              message: 'Crafting response...',
              timestamp: Date.now(),
            })));

            // Send initial metadata (conversationId + sources)
            const initialData: any = {};
            if (activeConversationId) initialData.conversationId = activeConversationId;
            if (webSources.length > 0) initialData.sources = webSources;
            if (Object.keys(initialData).length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));
            }

            // Call AI
            const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${GEMINI_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                messages: aiMessages,
                stream: true,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error("AI gateway error:", response.status, errorText);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "AI gateway error" })}\n\n`));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }

            // Stream AI tokens
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              controller.enqueue(encoder.encode(chunk));

              // Parse chunk to accumulate full content for saving
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.choices?.[0]?.delta?.content) {
                      fullContent += parsed.choices[0].delta.content;
                    }
                  } catch {
                    // Ignore parse errors
                  }
                }
              }
            }

            // Send done signal
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));

            // Save the complete message to database
            if (activeConversationId && fullContent) {
              await supabase
                .from('think_messages')
                .insert({
                  conversation_id: activeConversationId,
                  role: 'assistant',
                  content: fullContent
                });

              await supabase
                .from('think_conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', activeConversationId);
            }

            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        }
      });

      return new Response(streamResponse, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });
    }

    // ========== NON-STREAMING PATH (fallback) ==========
    
    // If deep research mode is enabled for non-streaming
    if (deepResearch && lastMessage?.content && !isAutoAnalysis) {
      const userQuery = lastMessage.content;
      try {
        const scrapeResponse = await fetch(`${SUPABASE_URL}/functions/v1/think-web-scrape`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: userQuery, mode: 'search' })
        });
        
        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          if (scrapeData.sources?.length > 0) {
            webSources = scrapeData.sources;
            webResearchContent = scrapeData.content || '';
          }
        }
      } catch (scrapeError) {
        console.error('[think-chat] Web scrape error:', scrapeError);
      }
    }
    
    let messageContent = buildMultimodalContent(
      lastMessage?.content || null,
      attachments,
      isAutoAnalysis
    );
    
    if (webResearchContent && typeof messageContent === 'string') {
      messageContent = `${messageContent}\n\n[Web Research Results - cite these sources in your response using [Source N] format]\n${webResearchContent}`;
    } else if (webResearchContent && Array.isArray(messageContent)) {
      messageContent.push({
        type: 'text',
        text: `\n\n[Web Research Results - cite these sources in your response using [Source N] format]\n${webResearchContent}`
      });
    }
    
    const aiMessages = [
      { role: "system", content: RUMI_SYSTEM_PROMPT },
      ...previousMessages,
      { role: lastMessage?.role || 'user', content: messageContent }
    ];

    const hasImages = attachments?.some((a: any) => a.type?.startsWith('image/'));
    const model = hasImages ? "gemini-2.5-flash" : "gemini-2.5-flash";

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: aiMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI generation limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    // Save assistant message
    if (activeConversationId) {
      await supabase
        .from('think_messages')
        .insert({
          conversation_id: activeConversationId,
          role: 'assistant',
          content: aiMessage
        });

      await supabase
        .from('think_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConversationId);
    }

    return new Response(
      JSON.stringify({ 
        message: aiMessage,
        conversationId: activeConversationId,
        sources: webSources.length > 0 ? webSources : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("RUMI chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

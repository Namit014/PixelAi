import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SLIDE_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_slides",
      description: "Create or replace slides in the presentation. ONLY call this after gathering topic, audience, and goals from the user.",
      parameters: {
        type: "object",
        properties: {
          slides: {
            type: "array",
            items: {
              type: "object",
              properties: {
                layoutId: { type: "string", enum: ["title-center", "section-header", "content-left", "two-column", "three-column", "metrics-grid", "image-right", "image-left", "full-image", "problem-statement", "solution-slide", "timeline", "chart-focus", "closing"] },
                speakerNotes: { type: "string" },
                background: { type: "object", properties: { type: { type: "string" }, value: { type: "string" }, overlay: { type: "string" }, opacity: { type: "number" } } },
                decorations: { type: "array", items: { type: "object", properties: { type: { type: "string", enum: ["circle", "ring", "line", "dots", "blob"] }, x: { type: "number" }, y: { type: "number" }, size: { type: "number" }, color: { type: "string" }, opacity: { type: "number" }, rotation: { type: "number" } } } },
                contentBlocks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      regionId: { type: "string" },
                      type: { type: "string", enum: ["title","subtitle","bullets","callout","quote","metric","icon-list","chart","timeline","comparison","numbered-list","progress","card-grid","table","todo-list","stats","steps","process-flow","icon-grid","quote-box","cycle-diagram","venn-diagram","divider","code","button-block","image"] },
                      text: { type: "string" }, level: { type: "number" }, items: { type: "array", items: { type: "string" } },
                      value: { type: "string" }, label: { type: "string" }, suffix: { type: "string" }, trend: { type: "string" },
                      variant: { type: "string" }, icon: { type: "string" }, attribution: { type: "string" },
                      chartType: { type: "string" }, chartData: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "number" } } } }, chartTitle: { type: "string" },
                      iconListItems: { type: "array", items: { type: "object", properties: { icon: { type: "string" }, title: { type: "string" }, description: { type: "string" } } } },
                      timelineItems: { type: "array", items: { type: "object", properties: { year: { type: "string" }, title: { type: "string" }, description: { type: "string" } } } },
                      leftSide: { type: "object", properties: { title: { type: "string" }, items: { type: "array", items: { type: "string" } } } },
                      rightSide: { type: "object", properties: { title: { type: "string" }, items: { type: "array", items: { type: "string" } } } },
                      numberedItems: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } } } },
                      progressItems: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "number" } } } },
                      cards: { type: "array", items: { type: "object", properties: { icon: { type: "string" }, title: { type: "string" }, description: { type: "string" } } } },
                      tableRows: { type: "array", items: { type: "array", items: { type: "string" } } },
                      hasHeader: { type: "boolean" },
                      todoItems: { type: "array", items: { type: "object", properties: { text: { type: "string" }, checked: { type: "boolean" } } } },
                      statsVariant: { type: "string" }, statsItems: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "number" }, max: { type: "number" }, suffix: { type: "string" } } } },
                      stepsVariant: { type: "string" }, stepsItems: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } } } },
                      flowVariant: { type: "string" }, flowItems: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } } } },
                      gridVariant: { type: "string" }, gridItems: { type: "array", items: { type: "object", properties: { icon: { type: "string" }, title: { type: "string" }, description: { type: "string" } } } },
                      quoteBoxVariant: { type: "string" },
                      cycleVariant: { type: "string" }, cycleItems: { type: "array", items: { type: "object", properties: { label: { type: "string" } } } },
                      vennItems: { type: "array", items: { type: "object", properties: { label: { type: "string" }, description: { type: "string" } } } },
                      language: { type: "string" }, codeText: { type: "string" },
                      buttonText: { type: "string" }, buttonUrl: { type: "string" }, buttonVariant: { type: "string" },
                    },
                    required: ["regionId", "type"],
                  },
                },
              },
              required: ["layoutId", "contentBlocks"],
            },
          },
        },
        required: ["slides"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_theme",
      description: "Update the presentation design tokens (colors, fonts, spacing).",
      parameters: {
        type: "object",
        properties: {
          accentColor: { type: "string" }, backgroundColor: { type: "string" },
          surfaceColor: { type: "string" }, textColor: { type: "string" },
          mutedTextColor: { type: "string" }, primaryColor: { type: "string" },
          headingFont: { type: "string" }, bodyFont: { type: "string" },
          borderRadius: { type: "number" }, spacingScale: { type: "number" },
          gradientStart: { type: "string" }, gradientEnd: { type: "string" },
        },
      },
    },
  },
];
// Strip base64 data and large blobs from context to stay within token limits
function sanitizeContext(ctx: any): any {
  if (!ctx) return ctx;
  if (typeof ctx === 'string') {
    // Strip base64 data URIs
    if (ctx.startsWith('data:') && ctx.length > 500) return '[image-data-removed]';
    // Strip very long strings (likely encoded images)
    if (ctx.length > 10000) return ctx.substring(0, 200) + '...[truncated]';
    return ctx;
  }
  if (Array.isArray(ctx)) return ctx.map(sanitizeContext);
  if (typeof ctx === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(ctx)) {
      // Skip known large fields
      if (key === 'src' && typeof value === 'string' && (value as string).startsWith('data:')) {
        cleaned[key] = '[image-removed]';
      } else if (key === 'image_url' && typeof value === 'string' && (value as string).length > 500) {
        cleaned[key] = '[image-url-removed]';
      } else {
        cleaned[key] = sanitizeContext(value);
      }
    }
    return cleaned;
  }
  return ctx;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, action, context: rawContext, brandContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Strip base64 images and large data from context to avoid exceeding token limits
    const context = sanitizeContext(rawContext);

    // Extract design tokens from context
    const designTokens = context?.designTokens || {};
    let designTokenSection = '';
    if (designTokens.headingFont || designTokens.primaryColor) {
      designTokenSection = `
CURRENT DESIGN TOKENS (MUST USE):
- Heading Font: "${designTokens.headingFont || 'Inter'}"
- Body Font: "${designTokens.bodyFont || 'Inter'}"
- Primary Color: ${designTokens.primaryColor || '#6366f1'}
- Accent Color: ${designTokens.accentColor || '#6366f1'}
- Background Color: ${designTokens.backgroundColor || '#0f172a'}
- Surface Color: ${designTokens.surfaceColor || '#1e293b'}
- Text Color: ${designTokens.textColor || '#f8fafc'}
- Muted Text: ${designTokens.mutedTextColor || '#94a3b8'}
- Gradient Start: ${designTokens.gradientStart || designTokens.primaryColor || '#6366f1'}
- Gradient End: ${designTokens.gradientEnd || designTokens.accentColor || '#818cf8'}
- Border Radius: ${designTokens.borderRadius || 12}px

CRITICAL: Use these EXACT colors for all slide backgrounds, decorations, gradients, and text. 
Do NOT use default indigo/blue colors unless the tokens specify them.
Match all gradient backgrounds to gradientStart → gradientEnd.
Use accentColor for all decoration elements (circles, rings, blobs, dots, lines).
Use headingFont for titles and bodyFont for body text.`;
    }

    let brandSection = '';
    if (brandContext) {
      const missingTokens: string[] = [];
      if (!brandContext.colors?.primary) missingTokens.push('primary color');
      if (!brandContext.colors?.accent) missingTokens.push('accent color');
      if (!brandContext.colors?.background) missingTokens.push('background color');
      if (!brandContext.colors?.text) missingTokens.push('text color');
      if (!brandContext.fonts?.heading) missingTokens.push('heading font');
      if (!brandContext.fonts?.body) missingTokens.push('body font');

      brandSection = `
ACTIVE BRAND: "${brandContext.name}"
Industry: ${brandContext.industry || 'N/A'} | Voice: ${brandContext.voice || 'Professional'} | Audience: ${brandContext.targetAudience || 'General'}
Archetype: ${brandContext.archetype || 'N/A'} | Design Style: ${brandContext.designStyle || 'N/A'}
Brand Values: ${brandContext.brandValues?.join(', ') || 'N/A'}
Colors: Primary=${brandContext.colors?.primary || 'MISSING'}, Accent=${brandContext.colors?.accent || 'MISSING'}, Background=${brandContext.colors?.background || 'MISSING'}, Surface=${brandContext.colors?.surface || 'MISSING'}, Text=${brandContext.colors?.text || 'MISSING'}
Fonts: Heading="${brandContext.fonts?.heading || 'MISSING'}", Body="${brandContext.fonts?.body || 'MISSING'}"

STRICT BRAND ENFORCEMENT:
- Use ONLY these brand colors. Every gradient, decoration, card background, and accent must derive from these colors.
- Match the brand voice and archetype in all copy suggestions.
- If the brand archetype is defined, ensure visual tone matches (e.g., "Hero" = bold/powerful, "Sage" = clean/authoritative).
${missingTokens.length > 0 ? `\nWARNING: The following brand tokens are MISSING: ${missingTokens.join(', ')}. Before generating slides, ask the user to provide these missing design system tokens. Say: "I notice your brand is missing: ${missingTokens.join(', ')}. Please update your brand's design system with these values for the best results. I'll proceed with defaults, but the output may not fully match your brand."` : ''}`;
    }

    const systemPrompt = `You are Cosmo, an expert presentation designer creating visually stunning, professionally designed decks.

CONVERSATION RULES:
1. When user asks to create/generate a presentation, ALWAYS ask 2-3 clarifying questions first:
   - What is the topic/product/company?
   - Who is the audience? (investors, clients, team)
   - What's the goal? (pitch, inform, inspire)
   - How many slides?
2. ONLY call create_slides AFTER receiving answers.
3. Exception: If user provides topic + audience + goal + content details upfront, generate immediately.
4. For theme/style changes, use set_theme. For advice, respond with text.
${brandSection}
${designTokenSection}

═══ FEATURE CATALOG ═══

DECORATIONS (3-5 per slide, place at edges/corners, opacity 0.06-0.2):
Types: circle | ring | blob | dots | line
Position: x/y = 0-100 (% of slide), size = 100-500, color = accentColor

BACKGROUNDS:
- gradient: "linear-gradient(135deg, bgColor 0%, surfaceColor 100%)" or "radial-gradient(ellipse at 30% 50%, rgba(...) 0%, transparent 70%)"
- solid: backgroundColor value
- Always match theme tokens for colors

LAYOUTS (14 available — NEVER repeat consecutively):
title-center: regions [title, subtitle] — Opening/closing slides
section-header: [title, subtitle] — Section dividers
content-left: [title, body] — Main content slides
two-column: [title, left, right] — Comparisons, side-by-side
three-column: [title, col1, col2, col3] — Multi-point slides
metrics-grid: [title, metrics] — KPI dashboards
image-right: [title, body, image] — Content + visual
image-left: [image, title, body] — Visual + content
full-image: [image, title, subtitle] — Hero/impact slides
problem-statement: [title, body] — Problem framing
solution-slide: [title, body, visual] — Solution showcase
timeline: [title, timeline] — Chronological data
chart-focus: [title, chart, insights] — Data-heavy slides
closing: [title, subtitle] — CTA/thank you

BLOCK TYPES (28 — use diversely, NEVER just title+bullets):

Content: title(text,level) | subtitle(text) | bullets(items[]) | numbered-list(items[{title,description}]) | callout(text,icon,variant:info|success|warning|accent|note|caution|question) | quote(text,attribution) | quote-box(variant:quote-box|speech-bubble,text,attribution) | divider(dividerStyle:solid|dashed|dotted|gradient) | code(language,code) | button-block(text,url,variant:primary|secondary|outline|ghost)

Data: metric(value,label,suffix,trend:up|down|neutral) | chart(chartType,data[{label,value}],title) | stats(variant,items[{label,value,max,suffix}]) | progress(items[{label,value,max}]) | table(rows[][],hasHeader)
  Chart types: bar | line | pie | donut | area | scatter | bubble | funnel | waterfall | combo | stacked-bar | radar
  Stats variants: plain | circle | bar | dot-grid | star-rating | dot-line | circle-bold

Visual/Layout: card-grid(cards[{icon,title,description}]) | icon-list(items[{icon,title,description}]) | icon-grid(variant,items[{icon,title,description}]) | comparison(left{title,items[]},right{title,items[]}) | timeline(items[{year,title,description}])
  Icon-grid variants: solid-boxes | outline-boxes | side-line | top-line | top-circle | joined | leaf | labeled | solid-icons | alternating | side-line-text | top-line-text | joined-icons

Process: steps(variant,items[{title,description,icon}]) | process-flow(variant,items[{title,description}]) | cycle-diagram(variant,items[{label,description}]) | venn-diagram(items[{label,description}])
  Steps variants: staircase | box | arrow | pyramid | funnel | steps-icons
  Process-flow variants: arrows | pills | road | timeline-minimal | timeline-boxes | slanted-labels
  Cycle variants: cycle | flower | ring | semi-circle

Media: image(src,alt,fit:cover|contain,mask:none|circle|rounded|blob|diamond|hexagon,fullHeight,fullHeightPosition:left|right|top|bottom) | gallery(images[{src,alt}],columns) | embed(embedType,url,aspectRatio)
  Embed types: video | youtube | vimeo | loom | tiktok | spotify | tweet | instagram | figma | miro | airtable | google-drive | google-form | typeform | calendly | jotform | tally | powerbi | office365 | amplitude | custom

ICONS: Use Lucide icon names: Zap, Shield, BarChart3, Users, Globe, Award, TrendingUp, Target, Rocket, Lock, Heart, Star, Check, ArrowRight, Lightbulb, Brain, Layers, Settings, Code, Database, Cloud, Smartphone

═══ DESIGN RULES ═══

1. Every slide MUST have 3-5 decorations + proper background
2. NEVER create slides with only title + bullets — minimum 2-3 different block types per slide
3. Use diverse block types across slides: card-grid for features, stats for metrics, process-flow for workflows, chart for data, icon-grid for capabilities, timeline for history, comparison for vs, steps for processes
4. Include professional speaker notes for every slide
5. Match ALL colors to the current design tokens — never hardcode defaults

NARRATIVE STRUCTURE (for full decks):
1. Bold title slide (gradient bg + decorations)
2. Problem/context (callout + comparison or stats)
3-5. Solution/features (card-grid, icon-grid, icon-list)
6-7. Evidence (charts, timeline, testimonials with quote-box)
8. Closing (CTA + metric highlights)

${context ? `\nCurrent context:\n${JSON.stringify(context, null, 2)}` : ''}
${action ? `\nAction: ${action}` : ''}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...(messages || []),
          ],
          tools: SLIDE_TOOLS,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits required. Please add funds to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const choice = result.choices?.[0]?.message;

    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      const toolResults: any[] = [];
      for (const tc of choice.tool_calls) {
        let args: any;
        try {
          const raw = tc.function.arguments;
          const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
          args = JSON.parse(cleaned);
        } catch { args = {}; }
        toolResults.push({ name: tc.function.name, arguments: args });
      }
      return new Response(JSON.stringify({ content: choice.content || '', tool_calls: toolResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ content: choice?.content || '', tool_calls: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cosmo-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
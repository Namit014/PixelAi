import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a world-class presentation designer like Gamma.app and Canva. Given a topic, generate a stunning, visually rich presentation that looks like it was made by a professional designer.

You MUST call the create_presentation tool with a complete structured presentation.

CRITICAL DESIGN GUIDELINES:
- Create 8-12 slides for a compelling narrative
- Use VARIED and RICH content block types — NOT just titles and bullets
- Each slide should feel like a beautifully designed card with visual depth
- Mix block types extensively: card-grid, timeline, numbered-list, progress, metric, icon-list, comparison, chart, callout, quote, stats, steps, process-flow, icon-grid, table, todo-list, quote-box, cycle-diagram, venn-diagram
- Use backgrounds on slides for visual depth (gradients, radial gradients)
- Add 3-5 decorative elements per slide (circles, rings, blobs, dots, lines) for visual richness
- Create a strong narrative: Hook → Context → Problem → Solution → Evidence → Details → Roadmap → Closing

IMAGE BLOCKS (MANDATORY):
- Include at least 2-3 image blocks across the deck using Unsplash URLs
- Use layouts: full-image, image-right, image-left for visual impact
- Image block format: { type: "image", regionId: "image", src: "https://images.unsplash.com/photo-XXXXX?w=800&q=80", alt: "description", fit: "cover" }
- Choose relevant Unsplash photos. Use real Unsplash photo IDs like:
  - Technology: photo-1518770660439-4636190af475
  - Business/Team: photo-1522071820081-009f0129c71c
  - Data/Finance: photo-1611974789855-9c2a0a7236a3
  - Nature: photo-1469474968028-56623f02e42e
  - City: photo-1477959858617-67f85cf4f1df
  - Abstract: photo-1557672172-298e090bd0f1
  - AI/Future: photo-1677442136019-21780ecad995
  - Education: photo-1503676260728-1c00da094a0b
  - Health: photo-1571019613454-1cb2f99b2d8b
  - Space: photo-1451187580459-43490279c0fa
- The first slide should ideally use full-image layout with a dramatic hero photo

VISUAL VARIETY:
- Never use the same layout twice in a row
- Each slide must use a different primary block type
- Use at least 8 different block types across the entire deck
- Vary decoration positions and sizes across slides
- Use both gradient and solid backgrounds, alternating

Available layouts (with region IDs):
- title-center: title, subtitle
- section-header: title, subtitle
- content-left: title, body
- two-column: title, left, right
- three-column: title, col1, col2, col3
- metrics-grid: title, metrics
- image-right: title, body, image
- image-left: image, title, body
- full-image: image, title, subtitle
- problem-statement: title, body
- solution-slide: title, body, visual
- timeline: title, timeline
- chart-focus: title, chart, insights
- closing: title, subtitle

Available block types and their properties:
- title: { text, level: 1|2|3 }
- subtitle: { text }
- bullets: { items: string[] }
- image: { src (Unsplash URL), alt, fit: cover|contain }
- callout: { text, icon (emoji), variant: info|success|warning|accent|note|caution|question }
- quote: { text, attribution }
- metric: { value, label, suffix, trend: up|down|neutral }
- icon-list: { iconListItems: [{ icon (emoji), title, description }] }
- timeline: { timelineItems: [{ year, title, description }] }
- comparison: { leftSide: { title, items: string[] }, rightSide: { title, items: string[] } }
- numbered-list: { numberedItems: [{ title, description }] }
- progress: { progressItems: [{ label, value (0-100) }] }
- card-grid: { cards: [{ icon (emoji), title, description }] }
- chart: { chartType: bar|line|pie|donut, chartData: [{ label, value, color? }], chartTitle }
- table: { tableRows: string[][], hasHeader: true }
- todo-list: { todoItems: [{ text, checked: boolean }] }
- stats: { statsVariant: plain|circle|bar|star-rating|dot-grid, statsItems: [{ label, value, max?, suffix? }] }
- steps: { stepsVariant: staircase|box|arrow|pyramid|funnel, stepsItems: [{ title, description }] }
- process-flow: { flowVariant: arrows|pills|timeline-minimal, flowItems: [{ title, description? }] }
- icon-grid: { gridVariant: solid-boxes|outline-boxes|side-line|top-line|top-circle|joined|leaf|labeled, gridItems: [{ icon (emoji), title, description }] }
- quote-box: { quoteBoxVariant: quote-box|speech-bubble, text, attribution }
- cycle-diagram: { cycleVariant: cycle|flower|ring|semi-circle, cycleItems: [{ label }] }
- venn-diagram: { vennItems: [{ label, description? }] }
- divider: { dividerStyle: solid|dashed|gradient }
- code: { language, codeText }
- button-block: { buttonText, buttonUrl, buttonVariant: primary|secondary|outline }

Slide background options:
- type: solid|gradient
- value: CSS gradient string (use dramatic gradients like "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c4a6e 100%)")

Decorations (add 3-5 per slide):
- type: circle|blob|ring|line|dots
- x, y: percentage (0-100), size: pixels (100-500), color: "currentAccent" or hex, opacity: 0.03-0.15

Make every slide visually distinct and designer-quality. The presentation should look like a premium Canva template.`;

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
            { role: "user", content: `Create a stunning, Gamma.app-quality presentation about: ${topic}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_presentation",
                description: "Create a visually rich structured presentation with advanced block types",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    slides: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          layoutId: {
                            type: "string",
                            enum: ["title-center", "section-header", "content-left", "two-column", "three-column", "metrics-grid", "image-right", "image-left", "full-image", "problem-statement", "solution-slide", "timeline", "chart-focus", "closing"],
                          },
                          speakerNotes: { type: "string" },
                          background: {
                            type: "object",
                            properties: {
                              type: { type: "string", enum: ["solid", "gradient"] },
                              value: { type: "string" },
                            },
                          },
                          decorations: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                type: { type: "string", enum: ["circle", "blob", "ring", "line", "dots"] },
                                x: { type: "number" }, y: { type: "number" }, size: { type: "number" },
                                color: { type: "string" }, opacity: { type: "number" },
                              },
                              required: ["type", "x", "y", "size", "color", "opacity"],
                            },
                          },
                          contentBlocks: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                regionId: { type: "string" },
                                type: {
                                  type: "string",
                                  enum: [
                                    "title", "subtitle", "bullets", "image", "callout", "quote",
                                    "metric", "icon-list", "chart", "timeline", "comparison",
                                    "numbered-list", "progress", "card-grid",
                                    "table", "todo-list", "stats", "steps", "process-flow",
                                    "icon-grid", "quote-box", "cycle-diagram", "venn-diagram",
                                    "divider", "code", "button-block",
                                  ],
                                },
                                text: { type: "string" },
                                level: { type: "number" },
                                items: { type: "array", items: { type: "string" } },
                                value: { type: "string" },
                                label: { type: "string" },
                                suffix: { type: "string" },
                                trend: { type: "string", enum: ["up", "down", "neutral"] },
                                variant: { type: "string" },
                                icon: { type: "string" },
                                attribution: { type: "string" },
                                chartType: { type: "string", enum: ["bar", "line", "pie", "donut"] },
                                chartData: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "number" }, color: { type: "string" } }, required: ["label", "value"] } },
                                chartTitle: { type: "string" },
                                iconListItems: { type: "array", items: { type: "object", properties: { icon: { type: "string" }, title: { type: "string" }, description: { type: "string" } }, required: ["icon", "title", "description"] } },
                                timelineItems: { type: "array", items: { type: "object", properties: { year: { type: "string" }, title: { type: "string" }, description: { type: "string" } }, required: ["year", "title", "description"] } },
                                leftSide: { type: "object", properties: { title: { type: "string" }, items: { type: "array", items: { type: "string" } } } },
                                rightSide: { type: "object", properties: { title: { type: "string" }, items: { type: "array", items: { type: "string" } } } },
                                numberedItems: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title", "description"] } },
                                progressItems: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "number" } }, required: ["label", "value"] } },
                                cards: { type: "array", items: { type: "object", properties: { icon: { type: "string" }, title: { type: "string" }, description: { type: "string" } }, required: ["title", "description"] } },
                                // New block type fields
                                tableRows: { type: "array", items: { type: "array", items: { type: "string" } } },
                                hasHeader: { type: "boolean" },
                                todoItems: { type: "array", items: { type: "object", properties: { text: { type: "string" }, checked: { type: "boolean" } }, required: ["text", "checked"] } },
                                statsVariant: { type: "string", enum: ["plain", "circle", "bar", "star-rating", "dot-grid"] },
                                statsItems: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "number" }, max: { type: "number" }, suffix: { type: "string" } }, required: ["label", "value"] } },
                                stepsVariant: { type: "string", enum: ["staircase", "box", "arrow", "pyramid", "funnel"] },
                                stepsItems: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title"] } },
                                flowVariant: { type: "string", enum: ["arrows", "pills", "timeline-minimal"] },
                                flowItems: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title"] } },
                                gridVariant: { type: "string", enum: ["solid-boxes", "outline-boxes", "side-line", "top-line", "top-circle", "joined", "leaf", "labeled"] },
                                gridItems: { type: "array", items: { type: "object", properties: { icon: { type: "string" }, title: { type: "string" }, description: { type: "string" } }, required: ["icon", "title", "description"] } },
                                quoteBoxVariant: { type: "string", enum: ["quote-box", "speech-bubble"] },
                                cycleVariant: { type: "string", enum: ["cycle", "flower", "ring", "semi-circle"] },
                                cycleItems: { type: "array", items: { type: "object", properties: { label: { type: "string" } }, required: ["label"] } },
                                vennItems: { type: "array", items: { type: "object", properties: { label: { type: "string" }, description: { type: "string" } }, required: ["label"] } },
                                dividerStyle: { type: "string", enum: ["solid", "dashed", "gradient"] },
                                language: { type: "string" },
                                codeText: { type: "string" },
                                buttonText: { type: "string" },
                                buttonUrl: { type: "string" },
                                buttonVariant: { type: "string", enum: ["primary", "secondary", "outline"] },
                              },
                              required: ["regionId", "type"],
                            },
                          },
                        },
                        required: ["layoutId", "speakerNotes", "contentBlocks"],
                      },
                    },
                  },
                  required: ["title", "slides"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "create_presentation" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Credits required. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No structured output from AI");

    const presentation = JSON.parse(toolCall.function.arguments);

    const slides = presentation.slides.map((slide: any) => ({
      id: crypto.randomUUID(),
      layoutId: slide.layoutId,
      speakerNotes: slide.speakerNotes || "",
      animationConfig: { transition: "fade", elementAnimations: [] },
      background: slide.background || undefined,
      decorations: slide.decorations || undefined,
      contentBlocks: (slide.contentBlocks || []).map((block: any) => {
        const base: any = { id: crypto.randomUUID(), regionId: block.regionId, type: block.type };

        switch (block.type) {
          case 'title': return { ...base, text: block.text || '', level: block.level || 1 };
          case 'subtitle': return { ...base, text: block.text || '' };
          case 'bullets': return { ...base, items: block.items || [] };
          case 'callout': return { ...base, text: block.text || '', icon: block.icon, variant: block.variant || 'accent' };
          case 'quote': return { ...base, text: block.text || '', attribution: block.attribution };
          case 'metric': return { ...base, value: block.value || '0', label: block.label || '', suffix: block.suffix, trend: block.trend };
          case 'icon-list': return { ...base, items: block.iconListItems || block.items || [] };
          case 'timeline': return { ...base, items: block.timelineItems || [] };
          case 'comparison': return { ...base, left: block.leftSide || { title: '', items: [] }, right: block.rightSide || { title: '', items: [] } };
          case 'numbered-list': return { ...base, items: block.numberedItems || [] };
          case 'progress': return { ...base, items: block.progressItems || [] };
          case 'card-grid': return { ...base, cards: block.cards || [] };
          case 'chart': return { ...base, chartType: block.chartType || 'bar', data: block.chartData || [], title: block.chartTitle };
          case 'image': return { ...base, src: block.src || '', alt: block.alt || '', fit: block.fit || 'cover' };
          // New block types
          case 'table': return { ...base, rows: block.tableRows || [['', ''], ['', '']], hasHeader: block.hasHeader ?? true };
          case 'todo-list': return { ...base, items: block.todoItems || [] };
          case 'divider': return { ...base, dividerStyle: block.dividerStyle || 'solid' };
          case 'code': return { ...base, language: block.language || 'javascript', code: block.codeText || '' };
          case 'stats': return { ...base, variant: block.statsVariant || 'plain', items: block.statsItems || [] };
          case 'steps': return { ...base, variant: block.stepsVariant || 'box', items: block.stepsItems || [] };
          case 'process-flow': return { ...base, variant: block.flowVariant || 'arrows', items: block.flowItems || [] };
          case 'icon-grid': return { ...base, variant: block.gridVariant || 'solid-boxes', items: block.gridItems || [] };
          case 'quote-box': return { ...base, variant: block.quoteBoxVariant || 'quote-box', text: block.text || '', attribution: block.attribution };
          case 'cycle-diagram': return { ...base, variant: block.cycleVariant || 'cycle', items: block.cycleItems || [] };
          case 'venn-diagram': return { ...base, items: block.vennItems || [] };
          case 'button-block': return { ...base, text: block.buttonText || 'Click', url: block.buttonUrl || '#', variant: block.buttonVariant || 'primary' };
          case 'gallery': return { ...base, images: [], columns: 3 };
          default: return { ...base, text: block.text || '' };
        }
      }),
    }));

    return new Response(
      JSON.stringify({ title: presentation.title, slides }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-presentation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

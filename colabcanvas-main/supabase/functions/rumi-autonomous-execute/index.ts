import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('[rumi-autonomous-execute] v6 deployed — website-only fast path, per-state timeout');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const STATES = [
  'QUEUED',
  'BRAND_RESOLUTION',
  'MARKET_RESEARCH',
  'COMPETITIVE_ANALYSIS',
  'STRATEGY_BUILD',
  'ASSET_PLANNING',
  'WEBSITE_GENERATION',
  'PROJECT_CREATION',
  'ASSET_GENERATION',
  'VALIDATION',
  'SCORING',
  'COMPLETE',
] as const;

const WEBSITE_ONLY_STATES = [
  'QUEUED',
  'BRAND_RESOLUTION',
  'STRATEGY_BUILD',
  'WEBSITE_GENERATION',
  'COMPLETE',
] as const;

type JobState = typeof STATES[number] | 'FAILED' | 'CANCELLED';

// Per-state timeout: if an AI call exceeds this, log a warning and continue
const STATE_TIMEOUT_MS = 90_000; // 90 seconds
const STREAM_HEARTBEAT_MS = 15_000;

interface Job {
  id: string;
  user_id: string;
  brand_id: string | null;
  project_id: string | null;
  objective: Record<string, unknown>;
  asset_matrix: unknown[];
  state: JobState;
  checkpoint: Record<string, unknown>;
  strategy_output: Record<string, unknown>;
  scoring_output: Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────

class CancelledError extends Error {
  constructor() { super('Job cancelled by user'); this.name = 'CancelledError'; }
}

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function checkCancelled(jobId: string): Promise<void> {
  const supabase = getServiceClient();
  const { data } = await supabase.from('rumi_autonomous_jobs').select('state').eq('id', jobId).single();
  if (data?.state === 'FAILED' || data?.state === 'CANCELLED') throw new CancelledError();
}

async function emitAction(jobId: string, userId: string, actionType: string, actionData: Record<string, unknown>): Promise<void> {
  const supabase = getServiceClient();
  await supabase.from('rumi_agent_actions').insert({
    job_id: jobId,
    user_id: userId,
    action_type: actionType,
    action_data: actionData,
    status: 'executing',
  });
}

async function completeAction(jobId: string, actionType: string, resultData: Record<string, unknown>): Promise<void> {
  const supabase = getServiceClient();
  // Update the latest action of this type for this job
  const { data: actions } = await supabase
    .from('rumi_agent_actions')
    .select('id')
    .eq('job_id', jobId)
    .eq('action_type', actionType)
    .eq('status', 'executing')
    .order('created_at', { ascending: false })
    .limit(1);
  if (actions?.[0]) {
    await supabase.from('rumi_agent_actions')
      .update({ status: 'done', result_data: resultData, updated_at: new Date().toISOString() })
      .eq('id', actions[0].id);
  }
}

async function updateJobState(jobId: string, state: JobState, extra: Record<string, unknown> = {}) {
  const supabase = getServiceClient();
  const updates: Record<string, unknown> = { state, ...extra };
  if (state === 'COMPLETE') updates.completed_at = new Date().toISOString();
  if (state !== 'QUEUED' && !extra.started_at) updates.started_at = updates.started_at ?? undefined;
  await supabase.from('rumi_autonomous_jobs').update(updates).eq('id', jobId);
}

async function logAgent(jobId: string, agentName: string, status: string, opts: { input?: string; output?: string; confidence?: number; durationMs?: number } = {}) {
  const supabase = getServiceClient();
  await supabase.from('rumi_job_logs').insert({
    job_id: jobId,
    agent_name: agentName,
    status,
    input_summary: opts.input?.slice(0, 2000),
    output_summary: opts.output?.slice(0, 8000),
    confidence: opts.confidence,
    duration_ms: opts.durationMs,
  });
}

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 2048): Promise<string> {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`AI error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJSON(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

function safeParseJSON(raw: string): Record<string, unknown> | null {
  try {
    return parseJSON(raw);
  } catch {
    console.warn('[safeParseJSON] Failed to parse:', raw.slice(0, 200));
    return null;
  }
}

function isWebsiteRequest(job: Job): boolean {
  const obj = (job.objective || {}) as any;
  // Explicit metadata wins
  if (obj.jobType === 'website') return true;
  if (obj.executionMode === 'website_only') return true;
  if (obj.websitePreferences) return true;
  // Fallback: keyword match
  const objectiveStr = JSON.stringify(job.objective || {}).toLowerCase();
  return Boolean(
    objectiveStr.includes('landing page') ||
    objectiveStr.includes('website') ||
    objectiveStr.includes('waitlist page') ||
    objectiveStr.includes('sales page') ||
    objectiveStr.includes('launch page')
  );
}

/** Wrap a long-running operation with a timeout. On timeout, logs a warning and rejects. */
async function withTimeout<T>(promise: Promise<T>, ms: number, stateName: string, jobId: string): Promise<T> {
  let timeoutHandle: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      console.warn(`[timeout] State ${stateName} exceeded ${ms}ms for job ${jobId}`);
      reject(new Error(`State "${stateName}" timed out after ${Math.round(ms / 1000)}s`));
    }, ms) as unknown as number;
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

// ─── Delay helper ───
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Direct Image Generation with retry + backoff ───
async function generateImageDirect(
  prompt: string,
  userId: string,
  width = 1080,
  height = 1080,
  maxRetries = 3,
): Promise<{ imageUrl: string | null; filePath: string | null }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoff = Math.min(2000 * Math.pow(2, attempt), 15000);
        console.log(`[generateImageDirect] Retry ${attempt}/${maxRetries}, waiting ${backoff}ms`);
        await delay(backoff);
      }

      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [{ role: 'user', content: prompt }],
          modalities: ['image', 'text'],
        }),
      });

      if (!res.ok) {
        const status = res.status;
        console.error(`[generateImageDirect] AI gateway error: ${status} (attempt ${attempt + 1})`);
        if (status === 429 || status >= 500) continue; // retry on rate limit or server error
        return { imageUrl: null, filePath: null };
      }

      const data = await res.json();
      const base64Url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!base64Url || !base64Url.startsWith('data:image')) {
        console.error('[generateImageDirect] No image in AI response');
        if (attempt < maxRetries - 1) continue;
        return { imageUrl: null, filePath: null };
      }

      const base64Data = base64Url.split(',')[1];
      const mimeMatch = base64Url.match(/data:(image\/\w+);/);
      const mimeType = mimeMatch?.[1] || 'image/png';
      const ext = mimeType.split('/')[1] || 'png';

      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const supabase = getServiceClient();
      const filePath = `${userId}/rumi-auto/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('design-assets')
        .upload(filePath, bytes, { contentType: mimeType, upsert: true });

      if (uploadErr) {
        console.error('[generateImageDirect] Upload failed:', uploadErr.message);
        return { imageUrl: null, filePath: null };
      }

      const { data: urlData } = await supabase.storage.from('design-assets').createSignedUrl(filePath, 86400);
      const imageUrl = urlData?.signedUrl || null;

      console.log(`[generateImageDirect] ✅ Image generated & uploaded: ${filePath}`);
      return { imageUrl, filePath };
    } catch (err) {
      console.error(`[generateImageDirect] Error (attempt ${attempt + 1}):`, err);
      if (attempt >= maxRetries - 1) return { imageUrl: null, filePath: null };
    }
  }
  return { imageUrl: null, filePath: null };
}

// ─── Agent Functions ──────────────────────────────────────

async function brandResolutionAgent(job: Job): Promise<Record<string, unknown>> {
  const start = Date.now();
  const supabase = getServiceClient();

  let brandDNA: Record<string, unknown> = {};

  if (job.brand_id) {
    const { data: brand } = await supabase
      .from('brands')
      .select('*, brand_sections(*, brand_content_blocks(*))')
      .eq('id', job.brand_id)
      .single();

    if (brand) {
      brandDNA = {
        name: brand.name,
        description: brand.description,
        industry: brand.industry,
        target_audience: brand.target_audience,
        brand_voice: brand.brand_voice,
        brand_system: brand.brand_system_snapshot,
        logo_url: brand.logo_primary_url,
        sections: brand.brand_sections,
      };
    }
  }

  if (!brandDNA.name) {
    const raw = await callAI(
      'You are a brand strategist. Generate brand DNA from the given objective. Return JSON with: name, industry, target_audience, brand_voice, color_palette (array of hex), typography (heading_font, body_font), tone.',
      JSON.stringify(job.objective),
    );
    brandDNA = parseJSON(raw);
  }

  const brandSummary = [
    `Brand: ${brandDNA.name || 'Generated'}`,
    `Industry: ${brandDNA.industry || 'N/A'}`,
    `Audience: ${brandDNA.target_audience || 'N/A'}`,
    `Voice: ${brandDNA.brand_voice || brandDNA.tone || 'N/A'}`,
    brandDNA.color_palette ? `Colors: ${JSON.stringify(brandDNA.color_palette)}` : '',
    brandDNA.typography ? `Typography: ${JSON.stringify(brandDNA.typography)}` : '',
  ].filter(Boolean).join('\n');

  await logAgent(job.id, 'Brand Context Agent', 'complete', {
    input: `brand_id: ${job.brand_id}`,
    output: brandSummary,
    confidence: job.brand_id ? 0.95 : 0.7,
    durationMs: Date.now() - start,
  });

  return brandDNA;
}

// ─── Market Research Agent ──────────────────────────

async function marketResearchAgent(job: Job, brandDNA: Record<string, unknown>): Promise<Record<string, unknown>> {
  const start = Date.now();
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

  const brandName = (brandDNA.name as string) || '';
  const industry = (brandDNA.industry as string) || '';
  const objectiveGoal = (job.objective as any)?.goal || (job.objective as any)?.title || '';

  const researchSources: Array<{ title: string; url: string; snippet: string; key_findings: string[] }> = [];
  let researchContent = '';

  if (!FIRECRAWL_API_KEY) {
    console.log('[market-research] FIRECRAWL_API_KEY not configured, trying web-research fallback');
    
    // Fallback: Use the web-research edge function (Google Custom Search)
    try {
      const queries = [
        `${brandName} ${industry} competitors market landscape 2024 2025`,
        `${industry} trends consumer insights ${objectiveGoal}`,
      ];
      
      for (const query of queries) {
        try {
          const webRes = await fetch(`${SUPABASE_URL}/functions/v1/web-research`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
            },
            body: JSON.stringify({ query, research_type: 'market' }),
          });
          
          if (webRes.ok) {
            const webData = await webRes.json();
            if (webData.results?.length) {
              for (const r of webData.results) {
                researchSources.push({
                  title: r.title || 'Research Result',
                  url: r.link || '#',
                  snippet: r.snippet || '',
                  key_findings: [r.snippet || ''],
                });
              }
              researchContent += (webData.summary || '') + '\n\n';
            }
          }
        } catch (err) {
          console.warn(`[market-research] Web-research fallback error for "${query}":`, err);
        }
      }
      
      if (researchSources.length > 0) {
        console.log(`[market-research] ✅ Web-research fallback returned ${researchSources.length} results`);
        await logAgent(job.id, 'Market Research Agent', 'complete', {
          input: `Brand: ${brandName}, Industry: ${industry}`,
          output: `Web research via Google Search returned ${researchSources.length} results.`,
          confidence: 0.6,
          durationMs: Date.now() - start,
        });
        return { research_sources: researchSources, research_content: researchContent, research_available: true };
      }
    } catch (err) {
      console.warn('[market-research] Web-research fallback failed entirely:', err);
    }
    
    await logAgent(job.id, 'Market Research Agent', 'complete', {
      input: `Brand: ${brandName}, Industry: ${industry}`,
      output: 'Web research skipped — no search APIs available. Strategy will rely on AI knowledge only.',
      confidence: 0.3,
      durationMs: Date.now() - start,
    });
    return { research_sources: [], research_content: '', research_available: false };
  }

  const queries = [
    `${brandName} ${industry} competitors market landscape 2024 2025`,
    `${industry} trends consumer insights ${objectiveGoal}`,
    `${brandName} brand positioning target audience marketing strategy`,
  ];

  console.log(`[market-research] Running ${queries.length} searches via Firecrawl`);

  for (const query of queries) {
    try {
      const searchRes = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 4,
          scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
        }),
      });

      if (!searchRes.ok) {
        console.error(`[market-research] Search failed for query "${query}": ${searchRes.status}`);
        continue;
      }

      const searchData = await searchRes.json();

      if (searchData.data) {
        for (const result of searchData.data.slice(0, 3)) {
          const markdownContent = (result.markdown || '').slice(0, 3000);
          
          let keyFindings: string[] = [];
          try {
            const findingsRaw = await callAI(
              'Extract 2-3 key business/marketing insights from this content. Return JSON array of strings. Keep each under 100 chars.',
              markdownContent.slice(0, 2000),
              512,
            );
            const parsed = JSON.parse(findingsRaw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim());
            keyFindings = Array.isArray(parsed) ? parsed : [];
          } catch {
            keyFindings = [result.description || result.title || 'Content analyzed'];
          }

          researchSources.push({
            title: result.title || result.url,
            url: result.url,
            snippet: result.description || markdownContent.slice(0, 200),
            key_findings: keyFindings,
          });

          researchContent += `\n\n## ${result.title || 'Source'}\nURL: ${result.url}\n\n${markdownContent}`;
        }
      }
    } catch (err) {
      console.error(`[market-research] Error for query "${query}":`, err);
    }
  }

  console.log(`[market-research] Gathered ${researchSources.length} sources`);

  const logOutput = [
    `📊 Market Research Complete — ${researchSources.length} sources analyzed`,
    '',
    ...researchSources.map((s, i) => [
      `${i + 1}. ${s.title}`,
      `   URL: ${s.url}`,
      `   Key Findings:`,
      ...s.key_findings.map(f => `   • ${f}`),
    ].join('\n')),
  ].join('\n');

  await logAgent(job.id, 'Market Research Agent', 'complete', {
    input: `Queries: ${queries.join(' | ')}`,
    output: logOutput,
    confidence: researchSources.length > 3 ? 0.9 : researchSources.length > 0 ? 0.7 : 0.3,
    durationMs: Date.now() - start,
  });

  return {
    research_sources: researchSources,
    research_content: researchContent,
    research_available: true,
    queries_executed: queries,
  };
}

// ─── NEW: Competitive Analysis Agent ──────────────────────

async function competitiveAnalysisAgent(job: Job, brandDNA: Record<string, unknown>, marketResearch: Record<string, unknown>): Promise<Record<string, unknown>> {
  const start = Date.now();
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  const brandName = (brandDNA.name as string) || '';
  const industry = (brandDNA.industry as string) || '';

  // Step 1: Identify competitors from market research or AI
  let competitorNames: Array<{ name: string; url: string }> = [];

  try {
    const identifyRaw = await callAI(
      `You are a competitive intelligence analyst. Given the brand and market research, identify the top 3-5 direct competitors.
Return JSON array: [{ "name": "Competitor Name", "url": "https://competitor.com" }]
Only include real companies with real URLs. If unsure of the URL, use a best guess.`,
      JSON.stringify({
        brand: { name: brandName, industry },
        research_sources: (marketResearch.research_sources as any[])?.slice(0, 5) || [],
        research_content: ((marketResearch.research_content as string) || '').slice(0, 4000),
      }),
      1024,
    );
    const parsed = JSON.parse(identifyRaw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim());
    competitorNames = Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch (err) {
    console.error('[competitive-analysis] Failed to identify competitors:', err);
  }

  if (competitorNames.length === 0) {
    await logAgent(job.id, 'Competitive Analysis Agent', 'complete', {
      input: `Brand: ${brandName}`,
      output: 'No competitors identified. Skipping competitive analysis.',
      confidence: 0.3,
      durationMs: Date.now() - start,
    });
    return { competitors: [], own_swot: null, competitive_positioning: '' };
  }

  // Step 2: Scrape competitor websites via Firecrawl
  const competitors: Array<{ name: string; url: string; branding: any; content: string; swot: any }> = [];

  for (const comp of competitorNames) {
    let branding: any = null;
    let content = '';

    if (FIRECRAWL_API_KEY && comp.url) {
      try {
        const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: comp.url,
            formats: ['branding', 'markdown'],
            onlyMainContent: true,
          }),
        });

        if (scrapeRes.ok) {
          const scrapeData = await scrapeRes.json();
          branding = scrapeData.data?.branding || scrapeData.branding || null;
          content = (scrapeData.data?.markdown || scrapeData.markdown || '').slice(0, 3000);
          console.log(`[competitive-analysis] ✅ Scraped ${comp.name}: branding=${!!branding}`);
        } else {
          console.error(`[competitive-analysis] Scrape failed for ${comp.url}: ${scrapeRes.status}`);
        }
      } catch (err) {
        console.error(`[competitive-analysis] Scrape error for ${comp.url}:`, err);
      }
    }

    // Generate per-competitor SWOT
    let swot: any = null;
    try {
      const swotRaw = await callAI(
        `Generate a SWOT analysis for this competitor relative to ${brandName} in the ${industry} industry.
Return JSON: { "strengths": ["..."], "weaknesses": ["..."], "opportunities": ["..."], "threats": ["..."] }
Keep each item under 80 chars. Max 4 items per category.`,
        JSON.stringify({ competitor: comp.name, url: comp.url, branding, content: content.slice(0, 2000) }),
        1024,
      );
      swot = parseJSON(swotRaw);
    } catch {
      swot = { strengths: [], weaknesses: [], opportunities: [], threats: [] };
    }

    competitors.push({ name: comp.name, url: comp.url, branding, content, swot });
  }

  // Step 3: Generate own brand SWOT
  let ownSwot: any = null;
  try {
    const ownRaw = await callAI(
      `Generate a SWOT analysis for ${brandName} in the ${industry} industry, considering these competitors: ${competitors.map(c => c.name).join(', ')}.
Return JSON: { "strengths": ["..."], "weaknesses": ["..."], "opportunities": ["..."], "threats": ["..."] }
Keep each item under 80 chars. Max 4 items per category.`,
      JSON.stringify({ brand: brandDNA, competitors: competitors.map(c => ({ name: c.name, swot: c.swot })) }),
      1024,
    );
    ownSwot = parseJSON(ownRaw);
  } catch {
    ownSwot = { strengths: [], weaknesses: [], opportunities: [], threats: [] };
  }

  // Step 4: Competitive positioning summary
  let positioning = '';
  try {
    positioning = await callAI(
      'Write a 2-3 sentence competitive positioning statement for this brand based on the SWOT analysis and competitor landscape. Be specific and actionable.',
      JSON.stringify({ brand: brandName, own_swot: ownSwot, competitors: competitors.map(c => ({ name: c.name, swot: c.swot })) }),
      512,
    );
  } catch {
    positioning = 'Competitive positioning could not be determined.';
  }

  const logOutput = [
    `🔍 Competitive Analysis — ${competitors.length} competitors analyzed`,
    '',
    ...competitors.map((c, i) => [
      `${i + 1}. ${c.name} (${c.url})`,
      `   Strengths: ${c.swot?.strengths?.join(', ') || 'N/A'}`,
      `   Weaknesses: ${c.swot?.weaknesses?.join(', ') || 'N/A'}`,
      c.branding ? `   Brand Colors: ${JSON.stringify(c.branding.colors || {}).slice(0, 100)}` : '',
    ].filter(Boolean).join('\n')),
    '',
    `Own SWOT:`,
    `  S: ${ownSwot?.strengths?.join(', ') || 'N/A'}`,
    `  W: ${ownSwot?.weaknesses?.join(', ') || 'N/A'}`,
    `  O: ${ownSwot?.opportunities?.join(', ') || 'N/A'}`,
    `  T: ${ownSwot?.threats?.join(', ') || 'N/A'}`,
    '',
    `Positioning: ${positioning}`,
  ].join('\n');

  await logAgent(job.id, 'Competitive Analysis Agent', 'complete', {
    input: `Competitors: ${competitorNames.map(c => c.name).join(', ')}`,
    output: logOutput,
    confidence: competitors.length > 2 ? 0.85 : 0.6,
    durationMs: Date.now() - start,
  });

  return {
    competitors: competitors.map(c => ({ name: c.name, url: c.url, branding: c.branding, swot: c.swot })),
    own_swot: ownSwot,
    competitive_positioning: positioning,
  };
}

// ─── Strategy Agent (now receives market research + competitive analysis) ──────

async function strategyBuildAgent(job: Job, brandDNA: Record<string, unknown>, marketResearch: Record<string, unknown>, competitiveAnalysis: Record<string, unknown>): Promise<Record<string, unknown>> {
  const start = Date.now();

  const researchContext = (marketResearch.research_available)
    ? `\n\nMARKET RESEARCH DATA (from real web sources):\n${(marketResearch.research_content as string || '').slice(0, 6000)}\n\nResearch Sources: ${JSON.stringify((marketResearch.research_sources as any[])?.map(s => ({ title: s.title, url: s.url, findings: s.key_findings })) || [])}`
    : '\n\nNo market research data available — generate strategy based on AI knowledge.';

  const competitiveContext = (competitiveAnalysis.competitors as any[])?.length > 0
    ? `\n\nCOMPETITIVE ANALYSIS:\nCompetitors: ${JSON.stringify((competitiveAnalysis.competitors as any[]).map(c => ({ name: c.name, url: c.url, swot: c.swot })))}\nOwn SWOT: ${JSON.stringify(competitiveAnalysis.own_swot)}\nPositioning: ${competitiveAnalysis.competitive_positioning}`
    : '';

  const raw = await callAI(
    `You are a creative strategy architect. Given a brand, objective, REAL market research data, and competitive analysis with SWOT, generate a comprehensive creative strategy.
Return JSON with:
- objective_tree: { primary_goal, sub_goals: string[] }
- messaging_hierarchy: { headline_theme, supporting_messages: string[], cta_direction }
- emotional_direction: string
- content_pillars: string[]
- asset_matrix: array of { asset_type, content_type ("visual"|"document"|"cosmo_presentation"|"canvas_video"|"brand_guidelines"), platform, dimensions: {w,h}, priority, description }
  content_type options:
  - "visual": static image designs (social posts, banners, posters, logos)
  - "document": HTML documents (brand briefs, one-pagers, reports)
  - "cosmo_presentation": Cosmo slide deck (pitch decks, campaign overviews) — created as real Cosmo presentations
  - "canvas_video": AI-generated video (promos, ads, reels) — actually triggers video generation
  - "brand_guidelines": Full brand guideline document (16-page brand manual) — generates via design pipeline
  Include a mix: at least 2-3 visuals, 1 document, 1 cosmo_presentation, and optionally 1 canvas_video or 1 brand_guidelines if relevant.
- market_insights: string[] (key insights from research that informed this strategy)
- competitive_advantages: string[] (from SWOT analysis)

Be specific and actionable. Reference actual competitor data and trends from the research.`,
    JSON.stringify({ objective: job.objective, brand: brandDNA }) + researchContext + competitiveContext,
    4096,
  );

  const strategy = safeParseJSON(raw) || { objective_tree: { primary_goal: 'Campaign' }, messaging_hierarchy: {}, content_pillars: [], asset_matrix: [] };

  const strategySummary = [
    `Goal: ${(strategy.objective_tree as any)?.primary_goal || 'N/A'}`,
    `Headline Theme: ${(strategy.messaging_hierarchy as any)?.headline_theme || 'N/A'}`,
    `Emotional Direction: ${strategy.emotional_direction || 'N/A'}`,
    `Content Pillars: ${Array.isArray(strategy.content_pillars) ? strategy.content_pillars.join(', ') : 'N/A'}`,
    `CTA Direction: ${(strategy.messaging_hierarchy as any)?.cta_direction || 'N/A'}`,
    `Asset Matrix: ${Array.isArray(strategy.asset_matrix) ? strategy.asset_matrix.length + ' assets planned' : 'N/A'}`,
    Array.isArray(strategy.market_insights) ? `Market Insights:\n${strategy.market_insights.map((m: string) => `  • ${m}`).join('\n')}` : '',
    Array.isArray(strategy.competitive_advantages) ? `Competitive Advantages:\n${strategy.competitive_advantages.map((a: string) => `  • ${a}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');

  await logAgent(job.id, 'Strategy Agent', 'complete', {
    input: `Objective: ${JSON.stringify(job.objective).slice(0, 500)}`,
    output: strategySummary,
    confidence: 0.85,
    durationMs: Date.now() - start,
  });

  return strategy;
}

async function assetPlanningAgent(job: Job, strategy: Record<string, unknown>): Promise<unknown[]> {
  const start = Date.now();
  const websiteJob = isWebsiteRequest(job);

  const raw = await callAI(
    `You are an asset structuring specialist. Given a creative strategy with an asset matrix, finalize each asset with production specs.
Return JSON array where each item has:
- asset_id: string (unique slug)
- asset_type: string (e.g. "social_post", "banner", "brand_brief", "pitch_deck", "promo_video")
- content_type: "visual" | "document" | "cosmo_presentation" | "canvas_video" | "brand_guidelines"
- design_type: string (REQUIRED for visual assets — must be one of: "logo", "social_media", "poster", "campaign", "branding", "illustration", "ecommerce", "character", "mockup", "app_poster", "brand_guidelines". Choose the most appropriate for each asset.)
- platform: string
- dimensions: { width: number, height: number }
- priority: "high" | "medium" | "low"
- description: string
- content_requirements: { needs_headline: bool, needs_body: bool, needs_cta: bool, needs_image: bool }

DIMENSION RULES based on design_type:
- logo: 1024x1024 (1:1 square)
- social_media: 1080x1080 (1:1 square)
- poster: 768x1152 (2:3 portrait)
- campaign: 1920x1080 (16:9 landscape)
- branding: 1080x1080 (1:1 square)
- app_poster: 768x1365 (9:16 vertical)
- ecommerce: 1080x1080 (1:1 square)

${websiteJob ? `IMPORTANT FOR WEBSITE OBJECTIVES:
- DO NOT include cosmo_presentation assets.
- Plan supporting assets for a real coded website: hero visual, trust/social-proof visual, and at least one retargeting/promotional visual.
- Include at least 1 document and 2-3 supporting visuals.` : `IMPORTANT: include at least 1 document, 1 cosmo_presentation, and optionally canvas_video/brand_guidelines.`}`,
    JSON.stringify(strategy),
    4096,
  );

  let assets: any[];
  try {
    assets = JSON.parse(raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim());
    if (!Array.isArray(assets)) assets = [];
  } catch {
    console.error('[asset-planning] Failed to parse asset list JSON');
    assets = [];
  }

  if (websiteJob) {
    assets = assets.filter((asset: any) => asset?.content_type !== 'cosmo_presentation' && asset?.content_type !== 'presentation');

    const hasDocument = assets.some((asset: any) => asset?.content_type === 'document');
    const visualCount = assets.filter((asset: any) => asset?.content_type === 'visual').length;

    if (!hasDocument) {
      assets.push({
        asset_id: 'website-launch-brief',
        asset_type: 'website_brief',
        content_type: 'document',
        design_type: 'branding',
        platform: 'website',
        dimensions: { width: 1440, height: 1024 },
        priority: 'high',
        description: 'Enterprise website launch brief with messaging, hierarchy, and conversion notes',
        content_requirements: { needs_headline: true, needs_body: true, needs_cta: false, needs_image: false },
      });
    }

    if (visualCount < 3) {
      const fallbackVisuals = [
        {
          asset_id: 'website-hero-visual',
          asset_type: 'hero_visual',
          content_type: 'visual',
          design_type: 'campaign',
          platform: 'website',
          dimensions: { width: 1920, height: 1080 },
          priority: 'high',
          description: 'Hero visual supporting the website primary conversion moment',
          content_requirements: { needs_headline: false, needs_body: false, needs_cta: false, needs_image: true },
        },
        {
          asset_id: 'website-trust-visual',
          asset_type: 'social_proof_visual',
          content_type: 'visual',
          design_type: 'branding',
          platform: 'website',
          dimensions: { width: 1080, height: 1080 },
          priority: 'medium',
          description: 'Trust and proof visual for reviews, stats, or validation moments',
          content_requirements: { needs_headline: false, needs_body: false, needs_cta: false, needs_image: true },
        },
        {
          asset_id: 'website-promo-visual',
          asset_type: 'retargeting_visual',
          content_type: 'visual',
          design_type: 'social_media',
          platform: 'instagram',
          dimensions: { width: 1080, height: 1080 },
          priority: 'medium',
          description: 'Supporting promotional creative aligned to the website campaign',
          content_requirements: { needs_headline: true, needs_body: false, needs_cta: true, needs_image: true },
        },
      ];

      for (const visual of fallbackVisuals) {
        if (assets.filter((asset: any) => asset?.content_type === 'visual').length >= 3) break;
        if (!assets.some((asset: any) => asset?.asset_id === visual.asset_id)) assets.push(visual);
      }
    }
  }

  const assetSummary = Array.isArray(assets) 
    ? assets.map((a: any, i: number) => `${i+1}. [${a.content_type || 'visual'}/${a.design_type || 'design'}] ${a.asset_type} (${a.platform}) — ${a.dimensions?.width || '?'}×${a.dimensions?.height || '?'} [${a.priority}]`).join('\n')
    : '0 assets';

  await logAgent(job.id, 'Asset Structuring Agent', 'complete', {
    input: 'strategy output',
    output: `${Array.isArray(assets) ? assets.length : 0} assets planned:\n${assetSummary}`,
    confidence: 0.9,
    durationMs: Date.now() - start,
  });

  return Array.isArray(assets) ? assets : [];
}

async function projectCreationAgent(job: Job, strategy: Record<string, unknown>, assets: unknown[], websiteResult?: Record<string, unknown> | null): Promise<string> {
  const start = Date.now();
  const supabase = getServiceClient();

  const objectiveGoal = (job.objective as any)?.goal || (job.objective as any)?.title || 'Autonomous Campaign';

  const canvasData = {
    folders: [
      { name: '01 Strategy', items: [] },
      { name: '02 Assets', items: [] },
      { name: '03 Variations', items: [] },
      { name: '04 Exports', items: [] },
      { name: '05 Logs', items: [] },
    ],
    strategy_summary: strategy,
    asset_manifest: assets,
    ...(websiteResult?.siteData ? {
      website: websiteResult.siteData,
      rumi_campaign: { website: websiteResult },
    } : {}),
  };

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: job.user_id,
      title: `RUMi: ${objectiveGoal}`.slice(0, 100),
      description: `Autonomously generated campaign. Objective: ${objectiveGoal}`,
      brand_id: job.brand_id,
      canvas_data: canvasData,
    })
    .select('id')
    .single();

  if (error || !project) throw new Error(`Project creation failed: ${error?.message}`);

  await logAgent(job.id, 'Canvas Project Manager', 'complete', {
    input: 'strategy + assets',
    output: `project_id: ${project.id}`,
    confidence: 1.0,
    durationMs: Date.now() - start,
  });

  return project.id;
}

// ─── Brand Context Enforcement Helper ──────────────────
function buildBrandEnforcedPrompt(basePrompt: string, brandDNA: Record<string, unknown>): string {
  const brandName = (brandDNA.name as string) || '';
  const brandSystem = brandDNA.brand_system as any;
  const colorPalette = brandDNA.color_palette || brandSystem?.colors || brandSystem?.color_palette;
  const logoUrl = (brandDNA.logo_url as string) || '';
  
  const brandDirective = [
    `MANDATORY BRAND IDENTITY DIRECTIVE:`,
    `- Brand Name: "${brandName}" — include as visible text where applicable`,
    colorPalette ? `- Brand Colors (USE THESE EXACT COLORS): ${JSON.stringify(colorPalette)}` : '',
    logoUrl ? `- Brand Logo Reference: ${logoUrl}` : '',
    brandDNA.brand_voice ? `- Brand Voice/Tone: ${brandDNA.brand_voice}` : '',
    brandDNA.industry ? `- Industry: ${brandDNA.industry}` : '',
    `- CRITICAL: The design MUST use the brand's color palette as primary colors. Do NOT use random colors.`,
    '',
  ].filter(Boolean).join('\n');

  return `${brandDirective}\n\nDESIGN PROMPT:\n${basePrompt}`;
}

// ─── Format-Aware Design Prompt Templates ──────────────────
function getDesignTypePrompt(designType: string, enhancedPrompt: string): string {
  const brandFidelityRule = `Brand name must appear EXACTLY as written in the brief. Do not rename, abbreviate, or substitute it. Do not add text (taglines, slogans, descriptions) that was not explicitly requested.`;
  const antiTaglineRule = `TEXT RULE: Only render the exact brand NAME as text. Do NOT add any tagline, slogan, subtitle, description, or concept text.`;
  const antiGenericRule = `ANTI-GENERIC MANDATE: No clipart. No stock vector packs. No template aesthetics. Output must be indistinguishable from a top-tier design agency.`;

  const templates: Record<string, string> = {
    logo: `Generate a 1:1 square logo image. Center the logo with generous padding — minimum 15% clear space on ALL sides. Solid white (#FFFFFF) background.
NO 3D effects. NO glow. NO shadows. NO gradients. NO metallic/chrome effects. Flat, clean, vector-ready output ONLY.
${brandFidelityRule}
${antiTaglineRule}
${antiGenericRule}

QUALITY: Strong silhouette at favicon size. Typography feels engineered. Avoid literal industry icons.
COLOR RULE: Logo mark uses maximum 1-2 colors. Background: solid white. Total palette: 3 max. Must work in monochrome.

DESIGN BRIEF: ${enhancedPrompt}`,

    branding: `Generate a 1:1 square image. Professional brand identity system on white background.
${brandFidelityRule}
Cohesive brand identity layout: primary logo top-center, 4-5 color swatches with hex codes, typography specimen, one pattern element. Grid-based Swiss design composition. Business card or stationery preview. Unified system.

DESIGN BRIEF: ${enhancedPrompt}`,

    social_media: `Generate a 1:1 square image (1080×1080px).
${brandFidelityRule}
Professional social media post. Bold editorial composition with a single clear message. 10% safe zone padding on all edges. Mobile-readable typography — headline max 8 words, large and bold. Contemporary 2024-2026 design aesthetic. Clean, flat, high-contrast. Generous whitespace (40%+ breathing room).

DESIGN BRIEF: ${enhancedPrompt}`,

    poster: `Generate a 2:3 portrait image. Full-bleed poster composition.
${brandFidelityRule}
Exhibition-quality poster. Strong 3-level typographic hierarchy. Rule-of-thirds composition. Maximum 4 cohesive colors. Minimum 30% negative space. Headline readable from 3 meters.

DESIGN BRIEF: ${enhancedPrompt}`,

    campaign: `Generate a 16:9 landscape image. Advertising campaign key visual.
${brandFidelityRule}
Single strategic concept understood in under 5 seconds. One dominant hero visual, not a collage. Bold premium headline typography. Brand identity naturally integrated. Clear visual hierarchy: image → headline → subtext → CTA. Minimum 25% negative space.

DESIGN BRIEF: ${enhancedPrompt}`,

    ecommerce: `Generate a 1:1 square image. E-commerce product hero shot.
${brandFidelityRule}
Pure white (#FFFFFF) background. Product fills 85%+ of frame. Photorealistic. Professional studio lighting. Most flattering 3/4 angle. True-to-life colors. No text overlays.

DESIGN BRIEF: ${enhancedPrompt}`,

    app_poster: `Generate a 9:16 vertical image. App store promotional screenshot.
${brandFidelityRule}
Bold benefit-driven headline, max 6 words. Current-gen device mockup showing realistic app UI. Clean gradient or solid color background. Visual hierarchy: headline → device → text.

DESIGN BRIEF: ${enhancedPrompt}`,

    brand_guidelines: `Generate a 9:16 portrait image (768x1365px). Professional brand guideline document page.
${brandFidelityRule}
Clean editorial design with generous whitespace, professional typography, structured grid layout. Magazine-quality typographic hierarchy. Premium brand manual aesthetic.

DESIGN BRIEF: ${enhancedPrompt}`,
  };

  return templates[designType] || `Generate a professional design image.
${brandFidelityRule}

DESIGN BRIEF: ${enhancedPrompt}`;
}

// ─── Grid Layout Calculator ──────────────────
function calculateGridPosition(idx: number, itemWidth: number, itemHeight: number): { x: number; y: number } {
  const COLS = 3;
  const GAP = 60;
  const LABEL_HEIGHT = 50;
  const START_X = 50;
  const START_Y = 50;
  
  const col = idx % COLS;
  const row = Math.floor(idx / COLS);
  
  return {
    x: START_X + col * (itemWidth + GAP),
    y: START_Y + row * (itemHeight + GAP + LABEL_HEIGHT),
  };
}

// ─── Insert text label canvas object ──────────────────
async function insertCanvasLabel(
  supabase: any,
  projectId: string,
  userId: string,
  label: string,
  posX: number,
  posY: number,
  width: number,
  zIndex: number,
) {
  const objectId = `rumi_label_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await supabase.from('canvas_objects').insert({
    project_id: projectId,
    user_id: userId,
    object_id: objectId,
    object_type: 'text',
    object_data: {
      type: 'textbox',
      text: label,
      width: width,
      fontSize: 14,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#666666',
      textAlign: 'center',
      editable: true,
    },
    position_x: posX,
    position_y: posY,
    z_index: zIndex,
  });
}

// ─── Asset Generation with Cancellation Checks ──────────────────
async function assetGenerationAgentWithCancel(job: Job, assets: unknown[], brandDNA: Record<string, unknown>, strategy: Record<string, unknown>, projectId: string, fullCheckpoint: Record<string, unknown>, jobId: string): Promise<unknown[]> {
  const start = Date.now();
  const supabase = getServiceClient();
  
  const existingGenerated = ((job.checkpoint as any)?.generatedAssets as any[]) || [];
  const generatedAssets: unknown[] = [...existingGenerated];
  const startIdx = existingGenerated.length;
  
  if (startIdx > 0) {
    console.log(`[asset-gen] Resuming from asset ${startIdx}/${(assets as any[]).length}`);
  }

  let gridIdx = startIdx;

  for (let idx = startIdx; idx < (assets as any[]).length; idx++) {
    // Check for cancellation before each asset
    await checkCancelled(jobId);
    
    const asset = (assets as any[])[idx];
    const contentType = asset.content_type || 'visual';

    // Emit transparent action for each asset
    await emitAction(jobId, job.user_id, 'generate_asset', {
      step: `Generating ${contentType}: ${asset.asset_type || 'Asset'}`,
      assetIndex: idx,
      totalAssets: (assets as any[]).length,
      assetType: asset.asset_type,
      contentType,
      designType: asset.design_type,
      platform: asset.platform,
    });

    if (idx > startIdx && (contentType === 'visual' || contentType === 'brand_guidelines')) {
      console.log(`[asset-gen] Waiting 3s before next generation (rate limit protection)`);
      await delay(3000);
    }

    try {
      // Delegate to the original generation logic per content type
      const result = await generateSingleAsset(job, asset, idx, contentType, brandDNA, strategy, projectId, gridIdx, supabase);
      if (result.gridAdvanced) gridIdx++;
      generatedAssets.push(result.assetResult);
      
      await completeAction(jobId, 'generate_asset', { 
        assetId: asset.asset_id, 
        success: !!result.assetResult?.canvas_placed,
        assetIndex: idx,
      });
    } catch (assetErr) {
      if (assetErr instanceof CancelledError) throw assetErr;
      console.error(`[asset-gen] ❌ Asset ${asset.asset_id || idx} failed:`, assetErr);
      generatedAssets.push({ ...asset, generated_spec: null, error: assetErr instanceof Error ? assetErr.message : 'Unknown error' });
    }

    // Per-asset checkpoint save
    try {
      await updateJobState(job.id, 'ASSET_GENERATION', {
        checkpoint: { ...fullCheckpoint, generatedAssets },
      });
    } catch (cpErr) {
      console.warn(`[asset-gen] Checkpoint save failed:`, cpErr);
    }
  }

  const genSummary = generatedAssets.map((a: any, i: number) => {
    const ct = a.content_type || 'visual';
    if (!a.generated_spec && !a.canvas_placed) return `${i+1}. [${ct}] ${a.asset_type} — ❌ FAILED`;
    return `${i+1}. [${ct}] ${a.asset_type} (${a.platform}) ${a.canvas_placed ? '✅ ON CANVAS' : '⚠️ spec only'}`;
  }).join('\n');

  await logAgent(job.id, 'Creative Director', 'complete', {
    input: `${assets.length} assets (multi-format)`,
    output: `${generatedAssets.filter((a: any) => a.canvas_placed).length}/${assets.length} assets generated & placed:\n${genSummary}`,
    confidence: 0.85,
    durationMs: Date.now() - start,
  });

  return generatedAssets;
}

// ─── Single Asset Generation (extracted from original loop body) ──────
// (Old assetGenerationAgent removed — replaced by assetGenerationAgentWithCancel above)
// ─── Single asset generation helper (used by assetGenerationAgentWithCancel) ──────

async function generateSingleAsset(
  job: Job, asset: any, idx: number, contentType: string,
  brandDNA: Record<string, unknown>, strategy: Record<string, unknown>,
  projectId: string, gridIdx: number, supabase: any
): Promise<{ assetResult: any; gridAdvanced: boolean }> {
  if (contentType === 'visual') {
    const designType = asset.design_type || 'social_media';
    const raw = await callAI(
      `You are a creative director generating a complete asset specification.
Given brand DNA, strategy, and asset requirements, generate:
- headline: string
- body_copy: string (if needed)
- cta_text: string (if needed)
- image_prompt: string (CRITICAL: This prompt MUST explicitly reference the brand's exact color palette hex codes, brand name "${(brandDNA.name as string) || ''}", and brand visual identity. Include specific hex color codes from the brand palette in the prompt. This will be used for a "${designType}" format design.)
- layout_spec: { grid: string, hierarchy: string[], focal_point: string }
- color_map: { background, primary_text, accent, cta_bg, cta_text }
- typography_map: { headline_font, headline_size, body_font, body_size }
Return as JSON.`,
      JSON.stringify({ asset, brand: brandDNA, strategy, design_type: designType }),
      2048,
    );

    let spec: Record<string, unknown> | null = null;
    try { spec = parseJSON(raw); } catch {
      return { assetResult: { ...asset, generated_spec: null, error: 'Spec generation failed' }, gridAdvanced: false };
    }

    let imageUrl: string | null = null;
    let filePath: string | null = null;
    const width = asset.dimensions?.width || 1080;
    const height = asset.dimensions?.height || 1080;

    if (spec.image_prompt) {
      console.log(`[asset-gen] Generating ${designType} design for ${asset.asset_id}`);
      const formatPrompt = getDesignTypePrompt(designType, spec.image_prompt as string);
      const finalPrompt = buildBrandEnforcedPrompt(formatPrompt, brandDNA);
      const result = await generateImageDirect(finalPrompt, job.user_id, Math.min(width, 1920), Math.min(height, 1920));
      imageUrl = result.imageUrl;
      filePath = result.filePath;
    }

    let advanced = false;
    if (imageUrl && projectId) {
      const pos = calculateGridPosition(gridIdx, width, height);
      const objectId = `rumi_${asset.asset_id || idx}_${Date.now()}`;
      await supabase.from('canvas_objects').insert({
        project_id: projectId, user_id: job.user_id, object_id: objectId, object_type: 'image',
        object_data: { type: 'image', src: imageUrl, width, height, scaleX: 1, scaleY: 1, canvasFilePath: filePath, imageUrl },
        position_x: pos.x, position_y: pos.y, image_url: imageUrl, file_path: filePath, z_index: idx,
      });
      await insertCanvasLabel(supabase, projectId, job.user_id, `${asset.asset_type || 'Asset'} — ${asset.platform || 'General'}`, pos.x, pos.y + height + 10, width, idx + 1000);

      // Emit canvas_add_image command for live preview
      await emitAction(job.id, job.user_id, 'canvas_add_image', {
        step: `Placing ${asset.asset_type || 'image'} on canvas`,
        imageUrl,
        x: pos.x,
        y: pos.y,
        width,
        height,
        cursor_target: { x: pos.x + width / 2, y: pos.y + height / 2, label: `Adding ${asset.asset_type || 'image'}...` },
      });
      await completeAction(job.id, 'canvas_add_image', { objectId, placed: true });

      advanced = true;
    }

    return { assetResult: { ...asset, generated_spec: spec, image_url: imageUrl, file_path: filePath, canvas_placed: !!imageUrl }, gridAdvanced: advanced };

  } else if (contentType === 'document') {
    console.log(`[asset-gen] Generating document: ${asset.asset_id}`);
    const docHtml = await callAI(
      `You are a professional document designer. Generate a complete, beautifully styled HTML document.
The document should be a professional ${asset.asset_type || 'brand brief'} for brand "${(brandDNA.name as string) || ''}" with:
- Clean, modern CSS styling inline
- Professional typography (system fonts)
- Brand colors incorporated: ${JSON.stringify(brandDNA.color_palette || (brandDNA.brand_system as any)?.colors || {})}
- Sections with headings, paragraphs, bullet points
- A polished, print-ready appearance
Return ONLY the complete HTML (starting with <!DOCTYPE html>).`,
      JSON.stringify({ asset, brand: brandDNA, strategy }),
      8192,
    );

    const timestamp = Date.now();
    const docPath = `${job.user_id}/documents/${timestamp}-${asset.asset_id}.html`;
    const htmlContent = docHtml.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    const { error: uploadErr } = await supabase.storage.from('design-tool-uploads').upload(docPath, new Blob([htmlContent], { type: 'text/html' }), { contentType: 'text/html', upsert: true });
    if (uploadErr) {
      return { assetResult: { ...asset, generated_spec: null, error: 'Upload failed' }, gridAdvanced: false };
    }

    const { data: urlData } = await supabase.storage.from('design-tool-uploads').createSignedUrl(docPath, 86400);
    const docUrl = urlData?.signedUrl || '';

    const pos = calculateGridPosition(gridIdx, 300, 200);
    await supabase.from('canvas_objects').insert({
      project_id: projectId, user_id: job.user_id, object_id: `rumi_doc_${asset.asset_id || idx}_${timestamp}`,
      object_type: 'document', object_data: { type: 'document', title: asset.description || asset.asset_type || 'Document', url: docUrl, filePath: docPath, asset_type: asset.asset_type },
      position_x: pos.x, position_y: pos.y, image_url: docUrl, file_path: docPath, z_index: idx,
    });
    await insertCanvasLabel(supabase, projectId, job.user_id, `📄 ${asset.asset_type || 'Document'}`, pos.x, pos.y + 210, 300, idx + 1000);

    await emitAction(job.id, job.user_id, 'canvas_add_text', {
      step: `Placing ${asset.asset_type || 'document'} on canvas`,
      text: `📄 ${asset.description || asset.asset_type || 'Document'}`,
      x: pos.x,
      y: pos.y,
      width: 300,
      cursor_target: { x: pos.x + 150, y: pos.y + 100, label: `Adding ${asset.asset_type || 'document'}...` },
    });
    await completeAction(job.id, 'canvas_add_text', { placed: true, filePath: docPath });

    return { assetResult: { ...asset, generated_spec: { title: asset.description }, doc_url: docUrl, file_path: docPath, canvas_placed: true }, gridAdvanced: true };

  } else if (contentType === 'presentation' || contentType === 'cosmo_presentation') {
    console.log(`[asset-gen] Generating Cosmo presentation: ${asset.asset_id}`);
    const slidesRaw = await callAI(
      `You are a presentation content strategist. Generate slide content for a professional ${asset.asset_type || 'pitch deck'} for brand "${(brandDNA.name as string) || ''}".
Return JSON array of 6-10 slides, each with:
- title: string (bold headline)
- subtitle: string (optional)
- body: string (2-3 bullet points or short paragraph)
- layout: "title" | "content" | "two-column" | "image-text" | "quote" | "stats"
- notes: string (speaker notes)`,
      JSON.stringify({ asset, brand: brandDNA, strategy }),
      4096,
    );

    let slidesContent: any[];
    try {
      slidesContent = JSON.parse(slidesRaw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim());
      if (!Array.isArray(slidesContent)) slidesContent = [];
    } catch { slidesContent = [{ title: asset.description || 'Slide 1', body: 'Content generation in progress', layout: 'title' }]; }

    const slides = slidesContent.map((s: any, i: number) => ({
      id: crypto.randomUUID(), order: i,
      blocks: [{ id: crypto.randomUUID(), type: 'heading', content: s.title || `Slide ${i + 1}`, style: { fontSize: 32, fontWeight: 'bold' } },
        ...(s.body ? [{ id: crypto.randomUUID(), type: 'text', content: s.body, style: { fontSize: 16 } }] : [])],
      background: { type: 'solid', color: '#ffffff' }, layout: s.layout || 'content', notes: s.notes || '',
    }));

    const presTitle = `${(brandDNA.name as string) || ''} — ${asset.description || asset.asset_type || 'Presentation'}`;
    const { data: pres, error: presErr } = await supabase.from('presentations').insert({
      user_id: job.user_id, title: presTitle, slides, design_tokens: { primaryColor: '#000000', fontFamily: 'Inter' },
    }).select('id').single();

    if (presErr || !pres) {
      return { assetResult: { ...asset, generated_spec: null, error: 'Presentation creation failed' }, gridAdvanced: false };
    }

    const pos = calculateGridPosition(gridIdx, 300, 200);
    await supabase.from('canvas_objects').insert({
      project_id: projectId, user_id: job.user_id, object_id: `rumi_pres_${asset.asset_id || idx}_${Date.now()}`,
      object_type: 'cosmo_presentation', object_data: { type: 'cosmo_presentation', title: presTitle, presentation_id: pres.id, slide_count: slides.length, asset_type: asset.asset_type },
      position_x: pos.x, position_y: pos.y, z_index: idx,
    });
    await insertCanvasLabel(supabase, projectId, job.user_id, `🎯 ${asset.asset_type || 'Presentation'} (${slides.length} slides)`, pos.x, pos.y + 210, 300, idx + 1000);

    await emitAction(job.id, job.user_id, 'navigate_to_cosmo', {
      step: `Opening Cosmo presentation`,
      presentationId: pres.id,
      cursor_target: { x: 960, y: 180, label: 'Opening Cosmo...' },
    });
    await completeAction(job.id, 'navigate_to_cosmo', { presentationId: pres.id });
    await emitAction(job.id, job.user_id, 'cosmo_create_presentation', {
      step: `Created ${slides.length}-slide Cosmo deck`,
      presentationId: pres.id,
      title: presTitle,
      slideCount: slides.length,
    });
    await completeAction(job.id, 'cosmo_create_presentation', { presentationId: pres.id, slideCount: slides.length });

    return { assetResult: { ...asset, generated_spec: { title: asset.description, slide_count: slides.length }, cosmo_id: pres.id, canvas_placed: true }, gridAdvanced: true };

  } else if (contentType === 'video' || contentType === 'canvas_video') {
    console.log(`[asset-gen] Generating video: ${asset.asset_id}`);
    const videoSpecRaw = await callAI(
      `You are a video creative director. Generate a detailed video production spec for brand "${(brandDNA.name as string) || ''}".
Return JSON:
- title: string
- duration_seconds: number (4-10, keep short for AI generation)
- video_prompt: string (a single comprehensive prompt for AI video generation, max 200 words, cinematic and descriptive)
- music_direction: string
- color_grading: string`,
      JSON.stringify({ asset, brand: brandDNA, strategy }),
      2048,
    );

    const videoSpec = parseJSON(videoSpecRaw);
    const videoPrompt = (videoSpec.video_prompt as string) || asset.description || 'A professional brand video';
    const videoDuration = Math.min(Math.max(Number(videoSpec.duration_seconds) || 4, 4), 10);

    let videoPredictionId: string | null = null;
    try {
      const lumaRes = await fetch(`${SUPABASE_URL}/functions/v1/luma-generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', 'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '' },
        body: JSON.stringify({ prompt: videoPrompt, duration: videoDuration, aspectRatio: '16:9', action: 'generate', projectId }),
      });
      if (lumaRes.ok) { const lumaData = await lumaRes.json(); videoPredictionId = lumaData.jobId || null; }
    } catch (err) { console.warn(`[asset-gen] Video generation failed:`, err); }

    const pos = calculateGridPosition(gridIdx, 320, 180);
    await supabase.from('canvas_objects').insert({
      project_id: projectId, user_id: job.user_id, object_id: `rumi_vid_${asset.asset_id || idx}_${Date.now()}`,
      object_type: videoPredictionId ? 'video' : 'video_prompt',
      object_data: { type: videoPredictionId ? 'video' : 'video_prompt', title: (videoSpec.title as string) || asset.description || 'Video', video_prompt: videoPrompt, prediction_id: videoPredictionId, duration_seconds: videoDuration, music_direction: videoSpec.music_direction, color_grading: videoSpec.color_grading, asset_type: asset.asset_type, isVideo: !!videoPredictionId },
      position_x: pos.x, position_y: pos.y, z_index: idx,
    });
    await insertCanvasLabel(supabase, projectId, job.user_id, `🎬 ${(videoSpec.title as string) || asset.asset_type || 'Video'}`, pos.x, pos.y + 190, 320, idx + 1000);

    return { assetResult: { ...asset, generated_spec: videoSpec, prediction_id: videoPredictionId, canvas_placed: true }, gridAdvanced: true };

  } else if (contentType === 'brand_guidelines') {
    console.log(`[asset-gen] Generating brand guidelines: ${asset.asset_id}`);
    const brandName = (brandDNA.name as string) || 'Brand';
    const bgPages = [
      { name: 'COVER PAGE', prompt: buildBrandEnforcedPrompt(`BRAND GUIDELINES COVER PAGE. Large centered logo. Brand name "${brandName}" as elegant title. Subtitle "Brand Guidelines". 9:16 portrait.`, brandDNA) },
      { name: 'COLOR PALETTE', prompt: buildBrandEnforcedPrompt(`COLOR PALETTE page. Primary and secondary colors as large swatches with HEX, RGB, and CMYK codes. 9:16 portrait.`, brandDNA) },
      { name: 'TYPOGRAPHY SYSTEM', prompt: buildBrandEnforcedPrompt(`TYPOGRAPHY SYSTEM page. Primary and secondary fonts with weights and hierarchy. 9:16 portrait.`, brandDNA) },
      { name: 'LOGO USAGE', prompt: buildBrandEnforcedPrompt(`LOGO DO'S AND DON'TS page. Correct and incorrect usages. 9:16 portrait.`, brandDNA) },
      { name: 'BRAND APPLICATIONS', prompt: buildBrandEnforcedPrompt(`BRAND APPLICATION MOCKUPS. Logo on business card, letterhead, merchandise. 9:16 portrait.`, brandDNA) },
    ];

    const bgIterations: any[] = [];
    let advanced = false;
    for (const page of bgPages) {
      try {
        if (bgIterations.length > 0) await delay(3000);
        const result = await generateImageDirect(page.prompt, job.user_id, 768, 1365);
        if (result.imageUrl) {
          bgIterations.push({ name: page.name, url: result.imageUrl, filePath: result.filePath });
          const bgPos = calculateGridPosition(gridIdx, 768, 1365);
          await supabase.from('canvas_objects').insert({
            project_id: projectId, user_id: job.user_id, object_id: `rumi_bg_${idx}_${bgIterations.length}_${Date.now()}`,
            object_type: 'image', object_data: { type: 'image', src: result.imageUrl, width: 768, height: 1365, scaleX: 0.5, scaleY: 0.5, canvasFilePath: result.filePath, imageUrl: result.imageUrl },
            position_x: bgPos.x, position_y: bgPos.y, image_url: result.imageUrl, file_path: result.filePath, z_index: idx * 100 + bgIterations.length,
          });
          await insertCanvasLabel(supabase, projectId, job.user_id, `📘 ${page.name}`, bgPos.x, bgPos.y + 690, 384, idx * 100 + bgIterations.length + 1000);
          gridIdx++;
          advanced = true;
        }
      } catch (err) { console.warn(`[asset-gen] BG page ${page.name} failed:`, err); }
    }

    return { assetResult: { ...asset, generated_spec: { pages: bgIterations.length }, canvas_placed: bgIterations.length > 0 }, gridAdvanced: advanced };

  } else {
    return { assetResult: { ...asset, generated_spec: null, error: `Unknown content_type: ${contentType}` }, gridAdvanced: false };
  }
}

async function validationAgent(job: Job, assets: unknown[], brandDNA: Record<string, unknown>): Promise<{ assets: unknown[]; corrections: unknown[] }> {
  const start = Date.now();

  const raw = await callAI(
    `You are a brand guardrail agent. Review generated assets against brand DNA.
Check for: color deviations, typography violations, tone misalignment, spacing issues.
Return JSON with:
- validated_assets: array of { asset_id, status: "pass"|"corrected"|"flagged", corrections: string[] }
- summary: { total_checked, passed, corrected, flagged }`,
    JSON.stringify({ assets, brand: brandDNA }),
    4096,
  );

  const result = parseJSON(raw);

  const valSummary = [
    `Total: ${(result.summary as any)?.total_checked || 0}`,
    `Passed: ${(result.summary as any)?.passed || 0}`,
    `Corrected: ${(result.summary as any)?.corrected || 0}`,
    `Flagged: ${(result.summary as any)?.flagged || 0}`,
    ...(Array.isArray(result.validated_assets) ? result.validated_assets
      .filter((a: any) => a.status !== 'pass')
      .map((a: any) => `  ${a.asset_id}: ${a.status} — ${(a.corrections || []).join(', ')}`) : []),
  ].join('\n');

  await logAgent(job.id, 'Brand Guardrail Agent', 'complete', {
    input: `${(assets as any[]).length} assets + brand DNA`,
    output: valSummary,
    confidence: 0.9,
    durationMs: Date.now() - start,
  });

  return { assets, corrections: (result.validated_assets as unknown[]) || [] };
}

async function scoringAgent(job: Job, assets: unknown[]): Promise<Record<string, unknown>> {
  const start = Date.now();

  const raw = await callAI(
    `You are a performance prediction agent. Score each asset on creative effectiveness.
For each asset, provide scores (0-100):
- clarity_index
- attention_density
- cognitive_load (lower is better)
- emotional_alignment
- cta_visibility
- estimated_conversion_probability (0-1)
- overall_score (0-100)

Return JSON with:
- scores: array of { asset_id, clarity_index, attention_density, cognitive_load, emotional_alignment, cta_visibility, estimated_conversion_probability, overall_score }
- summary: { avg_score, top_performer_id, recommendation }`,
    JSON.stringify(assets),
    4096,
  );

  const scoring = parseJSON(raw);

  const scoreSummary = [
    `Average Score: ${(scoring.summary as any)?.avg_score || 'N/A'}`,
    `Top Performer: ${(scoring.summary as any)?.top_performer_id || 'N/A'}`,
    `Recommendation: ${(scoring.summary as any)?.recommendation || 'N/A'}`,
    ...(Array.isArray(scoring.scores) ? scoring.scores.map((s: any) => 
      `  ${s.asset_id}: Overall ${s.overall_score} | Clarity ${s.clarity_index} | Attention ${s.attention_density} | CTA ${s.cta_visibility}`
    ) : []),
  ].join('\n');

  await logAgent(job.id, 'Performance Prediction Agent', 'complete', {
    input: `${(assets as any[]).length} assets`,
    output: scoreSummary,
    confidence: 0.8,
    durationMs: Date.now() - start,
  });

  return scoring;
}

// ─── Landing Page Helpers ─────────────────────────────────

function buildFallbackSiteData(brandName: string, audience: string, ctaGoal: string, sections: string[], primary: string, accent: string) {
  const cta = ctaGoal || 'Get started';
  return {
    siteTitle: `${brandName} — Built for ${audience || 'people who care about quality'}`,
    metaDescription: `${brandName} helps ${audience || 'modern teams'} ${cta.toLowerCase()}.`,
    theme: { primary, accent, secondary: primary, background: '#fafaf9', foreground: '#0a0a0a', surface: '#f4f4f5' },
    brand: { name: brandName },
    sections: sections.map((type) => ({ type })),
  };
}

function ensureSectionContent(type: string, s: any, brandName: string, audience: string, ctaGoal: string): any {
  const out = { ...(s || {}), type };
  out.heading = out.heading || out.headline;
  if (type === 'hero') {
    out.kicker = out.kicker || (audience ? `For ${audience}` : 'Introducing');
    out.heading = out.heading || `${brandName}. Built for the work that matters.`;
    out.subheading = out.subheading || `A focused, premium experience designed for ${audience || 'modern teams'}.`;
    out.ctaText = out.ctaText || (ctaGoal ? ctaGoal.replace(/^./, (c: string) => c.toUpperCase()) : 'Get started');
    out.secondaryCtaText = out.secondaryCtaText || 'See how it works';
  } else if (type === 'problem' || type === 'pain') {
    out.heading = out.heading || 'The old way is breaking.';
    out.body = out.body || `Generic tools weren't built for ${audience || 'serious teams'}. The result: wasted hours, lost context, and work that never quite ships.`;
    out.bullets = (Array.isArray(out.bullets) && out.bullets.length ? out.bullets : ['Tools that don\'t talk to each other', 'Hours lost to manual work', 'Quality that depends on luck']);
  } else if (type === 'solution' || type === 'product') {
    out.heading = out.heading || `One platform. ${brandName} ships it.`;
    out.subheading = out.subheading || `Everything connected, nothing in your way.`;
  } else if (type === 'features') {
    out.heading = out.heading || 'Everything you need. Nothing you don\'t.';
    if (!Array.isArray(out.features) || out.features.length < 3) {
      out.features = [
        { title: 'Built for speed', description: 'Designed to move at the pace of your best work.' },
        { title: 'On‑brand by default', description: 'Your colors, type and voice — applied everywhere automatically.' },
        { title: 'Ready to ship', description: 'Launch in days, not quarters.' },
        { title: 'Insightful by design', description: 'Numbers that explain themselves.' },
      ];
    }
  } else if (type === 'social_proof' || type === 'testimonials') {
    out.heading = out.heading || `Loved by teams who care about craft.`;
    if (!Array.isArray(out.testimonials) || out.testimonials.length < 2) {
      out.testimonials = [
        { quote: `${brandName} replaced three tools and felt better than all of them.`, name: 'Priya Mehta', role: 'Head of Design, Lattice' },
        { quote: 'It just feels considered. Every detail.', name: 'James Okafor', role: 'Founder, Northwind' },
        { quote: 'Cut our time-to-ship in half within a week.', name: 'Sara Lindqvist', role: 'COO, Forma' },
      ];
    }
  } else if (type === 'stats' || type === 'metrics') {
    if (!Array.isArray(out.stats) || out.stats.length < 3) {
      out.stats = [{ value: '4.9★', label: 'Customer rating' }, { value: '2x', label: 'Faster shipping' }, { value: '60%', label: 'Less rework' }, { value: '12k+', label: 'Active users' }];
    }
  } else if (type === 'faq' || type === 'faqs') {
    out.heading = out.heading || 'Questions, answered.';
    if (!Array.isArray(out.faqs) || out.faqs.length < 3) {
      out.faqs = [
        { question: 'How fast can we get started?', answer: 'Most teams are live the same day.' },
        { question: 'Can we bring our brand?', answer: 'Yes — colors, fonts, voice and assets are all configurable.' },
        { question: 'Do you support our stack?', answer: 'We integrate with the tools you already use.' },
        { question: 'Is our data safe?', answer: 'Encrypted in transit and at rest, with role-based access controls.' },
        { question: 'What if we need help?', answer: 'Real humans on Slack and email, fast.' },
      ];
    }
  } else if (type === 'pricing') {
    if (!Array.isArray(out.pricing) || out.pricing.length === 0) {
      out.pricing = [
        { name: 'Starter', price: '$0', description: 'Try it free.', features: ['Core features', 'Community support'] },
        { name: 'Pro', price: '$29', description: 'For growing teams.', features: ['Everything in Starter', 'Brand customization', 'Priority support'], highlighted: true },
        { name: 'Scale', price: 'Custom', description: 'For larger orgs.', features: ['Custom integrations', 'Dedicated CSM', 'SLA'] },
      ];
    }
  } else if (type === 'final_cta' || type === 'cta' || type === 'closing') {
    out.heading = out.heading || `Ready when you are.`;
    out.subheading = out.subheading || `Join the teams using ${brandName} to ship better work.`;
    out.ctaText = out.ctaText || (ctaGoal ? ctaGoal.replace(/^./, (c: string) => c.toUpperCase()) : 'Get started');
    out.urgency = out.urgency || 'Free to start. No credit card required.';
  }
  return out;
}

type Composition = 'asymmetric' | 'centered' | 'editorial' | 'oversized' | 'split';
type TypeScale = 'modernist' | 'editorial' | 'kinetic' | 'brutalist' | 'minimal';
type Motion = 'subtle' | 'cinematic' | 'kinetic' | 'static';
type Surface = 'clean' | 'grainy' | 'duotone' | 'glassy' | 'paper';
type Rhythm = 'breathing' | 'dense' | 'staccato';
type Signature = 'marquee' | 'massiveMark' | 'dragGallery' | 'horizScroll' | 'videoLoop' | 'kineticType' | 'none';

type BackendArtDirection = {
  vector: { composition: Composition; type: TypeScale; motion: Motion; surface: Surface; rhythm: Rhythm; signature: Signature };
  tokens: { radius: { sm: string; lg: string; btn: string }; headingWeight: number; headingTracking: string; revealY: number; parallax: number; sectionPadY: string; grain: number; surfaceBg: 'background' | 'foreground' | 'surface' };
  seed: number;
  visualStyle: string;
};

function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function weightedPick<T extends string>(items: readonly T[], biases: Record<T, number>, seed: number): T {
  const weights = items.map((it) => Math.max(0, biases[it] ?? 1));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[(seed >>> 0) % items.length];
  let r = (((seed >>> 0) % 1000) / 1000) * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function deriveBackendArtDirection(input: { seedId?: string; voice?: string; industry?: string; tone?: string; audience?: string; objective?: string; sectionMix?: string[]; nonce?: number }): BackendArtDirection {
  const voice = String(input.voice || input.tone || '').toLowerCase();
  const industry = String(input.industry || '').toLowerCase();
  const audience = String(input.audience || '').toLowerCase();
  const objective = String(input.objective || '').toLowerCase();
  const seed = fnv1a(`${input.seedId || ''}|${voice}|${industry}|${audience}|${objective}|${(input.sectionMix || []).join(',')}|${input.nonce ?? 0}`);
  const comps = ['asymmetric', 'centered', 'editorial', 'oversized', 'split'] as const;
  const types = ['modernist', 'editorial', 'kinetic', 'brutalist', 'minimal'] as const;
  const motions = ['subtle', 'cinematic', 'kinetic', 'static'] as const;
  const surfaces = ['clean', 'grainy', 'duotone', 'glassy', 'paper'] as const;
  const rhythms = ['breathing', 'dense', 'staccato'] as const;
  const signatures = ['marquee', 'massiveMark', 'dragGallery', 'horizScroll', 'videoLoop', 'kineticType'] as const;

  const compBias: Record<Composition, number> = { asymmetric: 1, centered: 1, editorial: 1, oversized: 1, split: 1 };
  if (/luxur|fashion|atelier|jewel|hotel|spa|gallery|studio/.test(voice + industry)) compBias.editorial += 2;
  if (/bold|brutal|launch|disrupt|manifesto/.test(voice + objective)) compBias.oversized += 2;
  if (/saas|platform|tool|app|api|developer|cloud/.test(industry)) compBias.split += 2;
  if (/minimal|clean|calm|essential/.test(voice)) compBias.centered += 1;
  const composition = weightedPick(comps, compBias, seed);

  const typeBias: Record<TypeScale, number> = { modernist: 1, editorial: 1, kinetic: 1, brutalist: 1, minimal: 1 };
  if (/luxur|atelier|gallery|fashion/.test(voice + industry)) typeBias.editorial += 2;
  if (/bold|disrupt|brutal/.test(voice)) typeBias.brutalist += 2;
  if (/playful|fun|launch|bold/.test(voice + objective)) typeBias.kinetic += 1;
  if (/minimal|clean|enterprise/.test(voice)) typeBias.minimal += 1;
  const type = weightedPick(types, typeBias, seed >> 3);

  const motionBias: Record<Motion, number> = { subtle: 1, cinematic: 1, kinetic: 1, static: 0.5 };
  if (/saas|enterprise|finance|health/.test(industry)) motionBias.subtle += 2;
  if (/luxur|fashion|gallery/.test(voice + industry)) motionBias.cinematic += 2;
  if (/playful|launch|bold/.test(voice + objective)) motionBias.kinetic += 2;
  const motion = weightedPick(motions, motionBias, seed >> 7);

  const surfaceBias: Record<Surface, number> = { clean: 1, grainy: 1, duotone: 1, glassy: 1, paper: 1 };
  if (/saas|tech|cloud|ai/.test(industry)) { surfaceBias.glassy += 2; surfaceBias.clean += 1; }
  if (/editorial|magazine|fashion|paper|print/.test(voice + industry)) { surfaceBias.paper += 2; surfaceBias.grainy += 1; }
  if (/bold|brutal/.test(voice)) surfaceBias.grainy += 2;
  if (/luxury|hotel|spa/.test(voice + industry)) surfaceBias.duotone += 2;
  const surface = weightedPick(surfaces, surfaceBias, seed >> 11);

  const rhythmBias: Record<Rhythm, number> = { breathing: 1, dense: 1, staccato: 1 };
  if ((input.sectionMix?.length ?? 0) > 7) rhythmBias.dense += 2;
  if (/luxury|minimal|gallery/.test(voice + industry)) rhythmBias.breathing += 2;
  if (/bold|launch|brutal/.test(voice)) rhythmBias.staccato += 2;
  const rhythm = weightedPick(rhythms, rhythmBias, seed >> 17);

  const sigBias: Record<Signature, number> = { marquee: 1, massiveMark: 1, dragGallery: 1, horizScroll: 1, videoLoop: 0.6, kineticType: 1, none: 0 };
  if (composition === 'oversized') sigBias.massiveMark += 2;
  if (type === 'kinetic') sigBias.kineticType += 2;
  if (motion === 'cinematic') sigBias.videoLoop += 1;
  if (composition === 'editorial') sigBias.marquee += 1;
  if (/portfolio|studio|gallery|fashion/.test(industry + voice)) { sigBias.dragGallery += 2; sigBias.horizScroll += 1; }
  const signature = weightedPick(signatures, sigBias, seed >> 19);

  const radius = type === 'brutalist' || composition === 'oversized' ? { sm: '2px', lg: '4px', btn: '4px' }
    : type === 'editorial' ? { sm: '8px', lg: '20px', btn: '999px' }
    : type === 'kinetic' ? { sm: '20px 8px 20px 8px', lg: '40px 12px 40px 12px', btn: '999px' }
    : type === 'minimal' ? { sm: '6px', lg: '14px', btn: '999px' }
    : { sm: '12px', lg: '24px', btn: '14px' };
  const visualStyle = `${type} ${composition} ${surface} ${motion}`.replace(/\s+/g, ' ');
  return {
    vector: { composition, type, motion, surface, rhythm, signature },
    tokens: {
      radius,
      headingWeight: type === 'brutalist' ? 800 : type === 'editorial' ? 500 : type === 'minimal' ? 400 : 600,
      headingTracking: type === 'brutalist' ? '-0.045em' : type === 'editorial' ? '-0.02em' : type === 'kinetic' ? '-0.035em' : '-0.025em',
      revealY: motion === 'kinetic' ? 48 : motion === 'cinematic' ? 32 : motion === 'subtle' ? 16 : 0,
      parallax: motion === 'kinetic' ? 220 : motion === 'cinematic' ? 140 : motion === 'subtle' ? 60 : 0,
      sectionPadY: rhythm === 'dense' ? '4rem' : rhythm === 'staccato' ? '6rem' : '8rem',
      grain: surface === 'grainy' ? 0.12 : surface === 'paper' ? 0.06 : 0,
      surfaceBg: surface === 'duotone' ? 'foreground' : 'background',
    },
    seed,
    visualStyle,
  };
}

function pickHeroVariantFromArt(art: BackendArtDirection): string {
  if (art.vector.signature === 'kineticType') return 'kinetic_type';
  if (art.vector.signature === 'massiveMark') return 'oversized_mark';
  if (art.vector.signature === 'dragGallery') return 'drag_gallery';
  if (art.vector.signature === 'videoLoop') return 'video_loop';
  if (art.vector.signature === 'horizScroll') return 'split_scroll';
  if (art.vector.composition === 'split') return 'split';
  if (art.vector.composition === 'oversized') return 'oversized_mark';
  if (art.vector.composition === 'centered') return 'fullbleed';
  return 'asymmetric';
}

function pickFeatureVariantFromArt(art: BackendArtDirection, position: number): string {
  const seedMix = ((art.seed >> 5) ^ position * 31) >>> 0;
  const candidates = art.vector.signature === 'horizScroll' ? ['horiz_scroll', 'split_image', 'bento_media']
    : art.vector.signature === 'marquee' ? ['marquee_wall', 'split_image', 'bento_media']
    : art.vector.composition === 'editorial' ? ['split_image', 'magazine', 'bento_media']
    : art.vector.composition === 'split' ? ['bento_media', 'split_image', 'sticky_scroll']
    : art.vector.type === 'brutalist' ? ['bento_media', 'horiz_scroll', 'magazine']
    : art.vector.type === 'minimal' ? ['split_image', 'magazine', 'bento']
    : ['bento_media', 'sticky_scroll', 'split_image'];
  return candidates[seedMix % candidates.length];
}

function buildLayoutPlan(sectionTypes: string[], art: BackendArtDirection): Array<{ layoutVariant?: string; animationStyle?: string }> {
  let lastVariant: string | undefined;
  return sectionTypes.map((sectionType, index) => {
    let layoutVariant: string | undefined;
    let animationStyle = 'fade-up';
    if (sectionType === 'hero' || sectionType === 'header') layoutVariant = pickHeroVariantFromArt(art);
    else if (sectionType === 'features' || sectionType === 'solution' || sectionType === 'product') { layoutVariant = pickFeatureVariantFromArt(art, index); animationStyle = 'stagger'; }
    else if (sectionType === 'problem' || sectionType === 'pain') layoutVariant = art.vector.composition === 'editorial' ? 'split_image' : 'magazine';
    else if (sectionType === 'social_proof' || sectionType === 'testimonials') { layoutVariant = 'marquee'; animationStyle = 'stagger'; }
    else if (sectionType === 'stats' || sectionType === 'metrics') layoutVariant = 'band';
    else if (sectionType === 'faq' || sectionType === 'faqs') layoutVariant = 'accordion';
    else if (sectionType === 'pricing' || sectionType === 'plans') { layoutVariant = 'tiers'; animationStyle = 'stagger'; }
    else if (sectionType === 'final_cta' || sectionType === 'cta' || sectionType === 'closing') layoutVariant = art.vector.composition === 'oversized' || art.vector.type === 'brutalist' ? 'cta_oversized' : 'banner';

    if (layoutVariant && layoutVariant === lastVariant && (sectionType === 'features' || sectionType === 'solution' || sectionType === 'product')) {
      const alts = ['bento_media', 'split_image', 'horiz_scroll', 'sticky_scroll', 'magazine', 'marquee_wall'].filter((x) => x !== layoutVariant);
      layoutVariant = alts[(index + art.seed) % alts.length];
    }
    if (layoutVariant) lastVariant = layoutVariant;
    return { layoutVariant, animationStyle };
  });
}

// ─── Landing Page Generation Agent ────────────────────────

async function landingPageGenerationAgent(
  job: Job,
  brandDNA: Record<string, unknown>,
  strategy: Record<string, unknown>,
): Promise<{ siteData: Record<string, unknown>; sectionCount: number } | null> {
  const start = Date.now();
  const websitePrefs = (job.objective as any)?.websitePreferences;
  if (!isWebsiteRequest(job)) return null;

  console.log('[landing-page] Generating landing page...');
  await emitAction(job.id, job.user_id, 'navigate_to_website', {
    step: 'Opening live website preview',
    jobId: job.id,
    previewPath: `/site-preview?jobId=${encodeURIComponent(job.id)}&agentMode=true`,
    cursor_target: { x: 960, y: 140, label: 'Opening website preview...' },
  });

  const brandName = (brandDNA.name as string) || '';
  const audience = websitePrefs?.audience || (brandDNA.target_audience as string) || '';
  const tone = websitePrefs?.tone || 'professional';
  const ctaGoal = websitePrefs?.cta_goal || 'sign up';
  const sections = websitePrefs?.sections || ['hero', 'problem', 'solution', 'features', 'social_proof', 'faq', 'final_cta'];

  const brandSystem = brandDNA.brand_system as any;
  const snapshot = (brandDNA.brand_system_snapshot as any) || brandSystem || {};
  const colorsObj = snapshot?.colors || {};
  const colorEntries = typeof colorsObj === 'object' && !Array.isArray(colorsObj)
    ? Object.entries(colorsObj).map(([name, v]: [string, any]) => ({ name, hex: typeof v === 'string' ? v : v?.hex }))
    : Array.isArray(colorsObj) ? colorsObj.map((c: any) => ({ name: c.name, hex: c.hex })) : [];
  const palette = colorEntries.filter(c => c.hex);
  const resolvedPrimary = (palette[0]?.hex || brandSystem?.color_palette?.[0] || '#0f172a') as string;
  const resolvedAccent = (palette[1]?.hex || palette[0]?.hex || brandSystem?.color_palette?.[1] || '#d97706') as string;
  const resolvedSurface = (palette[2]?.hex || '#f4f4f5') as string;

  // Resolve typography pair
  const typoObj = snapshot?.typography || {};
  const typoEntries = typeof typoObj === 'object' && !Array.isArray(typoObj) ? Object.keys(typoObj) : [];
  const headingFont = snapshot?.typography_heading || typoEntries[0] || brandSystem?.typography?.heading_font || 'Inter';
  const bodyFont = snapshot?.typography_body || typoEntries[1] || typoEntries[0] || brandSystem?.typography?.body_font || 'Inter';

  // Logo URL
  const logoUrl = (brandDNA.logo_primary_url as string) || snapshot?.logo_variants?.[0]?.url || '';

  const brandContext = `BRAND ENFORCEMENT (use these exactly):
- Brand name: "${brandName}" — must appear in hero headline area, nav, and footer
- Logo URL: ${logoUrl || '(none)'}
- Color palette: ${JSON.stringify(palette)}
- Heading font: ${headingFont}
- Body font: ${bodyFont}
- Brand voice: ${brandDNA.brand_voice || 'professional'}
- Industry: ${brandDNA.industry || 'general'}
- Target audience: ${audience}
- Tone: ${tone}
- CTA goal: ${ctaGoal}`;

  const artDirection = deriveBackendArtDirection({
    seedId: `${brandDNA.id || job.brand_id || brandName || job.id}`,
    voice: String(brandDNA.brand_voice || tone || 'professional'),
    tone,
    industry: String(brandDNA.industry || ''),
    audience,
    objective: JSON.stringify(job.objective || {}),
    sectionMix: sections,
    nonce: Number((job.objective as any)?.variationIndex || (job.objective as any)?.nonce || 0),
  });

  const layoutPlan = buildLayoutPlan(sections, artDirection);

  await emitAction(job.id, job.user_id, 'agent_observation', {
    step: `Art direction: ${artDirection.visualStyle}`,
    observation: `${artDirection.vector.signature} signature, ${artDirection.vector.composition} composition, ${artDirection.vector.type} type. Layouts mapped for ${layoutPlan.length}/${sections.length} sections.`,
  });
  await emitAction(job.id, job.user_id, 'agent_tool_call', {
    step: 'Writing premium copy',
    tool: 'gemini-2.5-flash',
    purpose: 'Conversion-focused, brand-voice copy with anti-cliché rules',
  });

  // PASS B: Copywriter — premium, brand-voice copy
  const siteDataRaw = await callAI(
    `You are an elite conversion copywriter (Mailchimp, Stripe, Linear, Apple, Pentagram calibre) writing premium landing page copy for "${brandName}".

${brandContext}
Visual style: ${artDirection.visualStyle}.

ABSOLUTE RULES:
- Brand name "${brandName}" MUST appear in hero heading, kicker, or subheading.
- Theme colors MUST use brand hex codes: primary=${resolvedPrimary}, accent=${resolvedAccent}, surface=${resolvedSurface}.
- Hero headline: 4-9 words, benefit-driven, specific. Banned clichés: "transform", "unlock", "revolutionize", "leverage", "synergy", "seamless", "elevate", "empower", "next-generation", "game-changing", "cutting-edge", "world-class", "unparalleled", "supercharge", "10x".
- Subheadings: confident, specific, audience-aware (1-2 sentences max).
- Problem: name 3 specific, emotional pain points the audience actually feels.
- Solution body: shows the after-state, not feature dump.
- Features: 4-6 features, sharp benefit-led titles + 1-sentence descriptions.
- Social proof: 3 realistic testimonials (real-sounding names + roles + companies) and 4 stats with concrete numbers.
- FAQ: 5 objection-handling questions with confident, brief answers.
- Final CTA: urgent + restate the core promise.
- Write in the brand voice (${brandDNA.brand_voice || 'professional'}). Be specific, not generic. Never write "Coming soon" or placeholder text.

Return ONE JSON object only (no prose, no markdown fences) with this exact shape:
{
  "siteTitle": string,
  "metaDescription": string,
  "theme": { "primary": "${resolvedPrimary}", "secondary": "${palette[1]?.hex || resolvedPrimary}", "accent": "${resolvedAccent}", "background": "#fafaf9", "foreground": "#0a0a0a", "surface": "${resolvedSurface}", "headingFont": "${headingFont}", "bodyFont": "${bodyFont}" },
  "brand": { "name": "${brandName}", "logoUrl": "${logoUrl}", "headingFont": "${headingFont}", "bodyFont": "${bodyFont}" },
  "sections": [ /* one per type in order: ${sections.join(', ')} */ ]
}

Each section schema:
{ "type": string, "kicker"?: string, "heading"?: string, "subheading"?: string, "body"?: string, "bullets"?: string[], "features"?: [{title, description}], "testimonials"?: [{quote, name, role}], "stats"?: [{label, value}], "pricing"?: [{name, price, description, features:string[], highlighted:boolean}], "faqs"?: [{question, answer}], "ctaText"?: string, "secondaryCtaText"?: string, "urgency"?: string }`,
    JSON.stringify({ brand: brandDNA, strategy, objective: job.objective, artDirection: artDirection.vector, layoutPlan }),
    8192,
  );

  let siteData: any = safeParseJSON(siteDataRaw);
  if (!siteData) {
    console.error('[landing-page] Failed to parse site data — using premium local fallback');
    siteData = buildFallbackSiteData(brandName, audience, ctaGoal, sections, resolvedPrimary, resolvedAccent);
  }

  const normalizedSections = Array.isArray(siteData?.sections) ? siteData.sections : [];

  // Generate hero + solution images IN PARALLEL (was sequential — major speed win)
  await emitAction(job.id, job.user_id, 'agent_thought_summary', {
    step: 'Composing visuals in parallel',
    thought: `Generating hero + supporting imagery simultaneously to cut wait time.`,
  });

  const solutionSection = normalizedSections.find((section: any) => section?.type === 'solution');
  const heroPrompt = buildBrandEnforcedPrompt(
    `Landing page hero image for "${brandName}". ${audience ? `Target audience: ${audience}.` : ''} Visual direction: ${artDirection.visualStyle}, premium, aspirational, editorial composition. Wide landscape 16:9. No text overlays, no logos, no UI mockups.`,
    brandDNA,
  );
  const solutionPrompt = solutionSection
    ? buildBrandEnforcedPrompt(
        `Website supporting section image for "${brandName}". Visualize the transformation: ${solutionSection.heading || solutionSection.body || ''}. Style: ${artDirection.visualStyle}, premium product-marketing aesthetic. No text overlays.`,
        brandDNA,
      )
    : null;

  const [heroSettled, solutionSettled] = await Promise.allSettled([
    generateImageDirect(heroPrompt, job.user_id, 1920, 1080),
    solutionPrompt ? generateImageDirect(solutionPrompt, job.user_id, 1200, 1200) : Promise.resolve(null as any),
  ]);

  const heroImageUrl: string | null = heroSettled.status === 'fulfilled' && heroSettled.value ? heroSettled.value.imageUrl : null;
  const solutionImageUrl: string | null = solutionSettled.status === 'fulfilled' && solutionSettled.value ? solutionSettled.value.imageUrl : null;
  if (heroSettled.status === 'rejected') console.warn('[landing-page] Hero image failed:', heroSettled.reason);
  if (solutionSettled.status === 'rejected') console.warn('[landing-page] Solution image failed:', solutionSettled.reason);

  const theme = {
    primary: siteData?.theme?.primary || resolvedPrimary,
    secondary: siteData?.theme?.secondary || resolvedPrimary,
    accent: siteData?.theme?.accent || resolvedAccent,
    background: siteData?.theme?.background || '#fffdf8',
    foreground: siteData?.theme?.foreground || '#111827',
    surface: siteData?.theme?.surface || resolvedSurface,
  };

  const finalSections = sections.map((sectionType: string, index: number) => {
    const section = normalizedSections.find((candidate: any) => candidate?.type === sectionType) || { type: sectionType };
    const layoutHint = layoutPlan[index] || {};
    const enriched = ensureSectionContent(sectionType, section, brandName, audience, ctaGoal);
    return {
      type: sectionType,
      layoutVariant: enriched.layoutVariant || layoutHint.layoutVariant,
      animationStyle: enriched.animationStyle || layoutHint.animationStyle,
      kicker: enriched.kicker,
      heading: enriched.heading,
      subheading: enriched.subheading,
      body: enriched.body,
      bullets: Array.isArray(enriched.bullets) ? enriched.bullets : undefined,
      features: Array.isArray(enriched.features) ? enriched.features : undefined,
      testimonials: Array.isArray(enriched.testimonials) ? enriched.testimonials : undefined,
      stats: Array.isArray(enriched.stats) ? enriched.stats : undefined,
      pricing: Array.isArray(enriched.pricing) ? enriched.pricing : undefined,
      faqs: Array.isArray(enriched.faqs) ? enriched.faqs : undefined,
      ctaText: enriched.ctaText,
      secondaryCtaText: enriched.secondaryCtaText,
      urgency: enriched.urgency,
      imageUrl: sectionType === 'hero' ? heroImageUrl : sectionType === 'solution' ? solutionImageUrl : enriched.imageUrl || null,
    };
  });

  const websiteData = {
    siteTitle: siteData?.siteTitle || `${brandName} Landing Page`,
    metaDescription: siteData?.metaDescription || `${brandName} — ${ctaGoal}`,
    theme: { ...theme, headingFont, bodyFont },
    brand: { name: brandName, logoUrl, headingFont, bodyFont },
    brandVoice: brandDNA.brand_voice || tone,
    industry: brandDNA.industry || '',
    artDirection,
    sections: finalSections,
  };

  await emitAction(job.id, job.user_id, 'website_set_data', {
    step: 'Laying out website structure',
    websiteData: {
      siteTitle: websiteData.siteTitle,
      metaDescription: websiteData.metaDescription,
      theme: websiteData.theme,
      artDirection,
      sections: finalSections.map((section: any) => ({ type: section.type, layoutVariant: section.layoutVariant, animationStyle: section.animationStyle })),
    },
    cursor_target: { x: 960, y: 200, label: 'Creating page structure...' },
  });

  for (let index = 0; index < finalSections.length; index++) {
    const section = finalSections[index];
    await emitAction(job.id, job.user_id, 'website_update_section', {
      step: `Designing ${section.type.replace(/_/g, ' ')}`,
      sectionIndex: index,
      section,
      cursor_target: { x: 960, y: 220 + index * 100, label: `Designing ${section.type.replace(/_/g, ' ')}...` },
    });
  }

  console.log(`[landing-page] ✅ Native website created (${finalSections.length} sections)`);

  await logAgent(job.id, 'Landing Page Generator', 'complete', {
    input: `Brand: ${brandName}, Audience: ${audience}, Tone: ${tone}, CTA: ${ctaGoal}`,
    output: `Native coded website with ${finalSections.length} sections and live preview updates.`,
    confidence: 0.9,
    durationMs: Date.now() - start,
  });

  return { siteData: websiteData, sectionCount: finalSections.length };
}

// ─── State Machine ────────────────────────────────────────

async function executeStateMachine(jobId: string) {
  const supabase = getServiceClient();

  const { data: job, error } = await supabase
    .from('rumi_autonomous_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !job) throw new Error(`Job not found: ${jobId}`);

  // Determine pipeline: website-only requests use a short 3-step path
  const isWebsite = isWebsiteRequest(job as any);
  const pipeline = isWebsite ? WEBSITE_ONLY_STATES : STATES;
  const pipelineLabel = isWebsite ? 'website-only' : 'full';
  const executionMode = isWebsite ? 'website_only' : 'full_campaign';

  console.log(`[state-machine] Pipeline: ${pipelineLabel} (${pipeline.length} states)`);

  // Persist pipeline mode into checkpoint so the UI doesn't have to infer it
  const existingCheckpoint = (job.checkpoint || {}) as Record<string, unknown>;
  if (existingCheckpoint.executionMode !== executionMode || existingCheckpoint.pipeline === undefined) {
    await updateJobState(jobId, job.state as JobState, {
      checkpoint: { ...existingCheckpoint, executionMode, pipeline: [...pipeline] },
    });
  }

  let stateIndex = pipeline.indexOf(job.state as any);
  if (stateIndex === -1 || job.state === 'FAILED') {
    stateIndex = 0;
  }

  if (job.state === 'COMPLETE') return;

  if (!job.started_at) {
    await updateJobState(jobId, job.state as JobState, { started_at: new Date().toISOString() });
  }

  try {
    let brandDNA = (job.checkpoint as any)?.brandDNA || null;
    let marketResearch = (job.checkpoint as any)?.marketResearch || null;
    let competitiveAnalysisData = (job.checkpoint as any)?.competitiveAnalysis || null;
    let strategy = (job.checkpoint as any)?.strategy || null;
    let assetList = (job.checkpoint as any)?.assetList || null;
    let projectId = job.project_id;
    let generatedAssets = (job.checkpoint as any)?.generatedAssets || null;
    let validationResult = (job.checkpoint as any)?.validationResult || null;
    let websiteResult = (job.checkpoint as any)?.websiteResult || null;

    // BRAND_RESOLUTION
    if (stateIndex <= STATES.indexOf('BRAND_RESOLUTION')) {
      await checkCancelled(jobId);
      await updateJobState(jobId, 'BRAND_RESOLUTION');
      await emitAction(jobId, job.user_id, 'brand_resolution', { step: 'Resolving Brand DNA' });
      brandDNA = await withTimeout(brandResolutionAgent(job as any), STATE_TIMEOUT_MS, 'BRAND_RESOLUTION', jobId);
      await completeAction(jobId, 'brand_resolution', { brandName: (brandDNA as any)?.name });
      await updateJobState(jobId, 'BRAND_RESOLUTION', { checkpoint: { ...existingCheckpoint, executionMode, pipeline: [...pipeline], brandDNA } });
    }

    // MARKET_RESEARCH (skipped in website-only pipeline)
    if (!isWebsite && stateIndex <= STATES.indexOf('MARKET_RESEARCH')) {
      await checkCancelled(jobId);
      await updateJobState(jobId, 'MARKET_RESEARCH');
      await emitAction(jobId, job.user_id, 'market_research', { step: 'Researching Market & Competitors' });
      marketResearch = await withTimeout(marketResearchAgent(job as any, brandDNA), STATE_TIMEOUT_MS, 'MARKET_RESEARCH', jobId);
      await completeAction(jobId, 'market_research', { sourcesCount: (marketResearch as any)?.research_sources?.length || 0 });
      await updateJobState(jobId, 'MARKET_RESEARCH', {
        checkpoint: { brandDNA, marketResearch },
      });
    }

    // COMPETITIVE_ANALYSIS (skipped in website-only pipeline)
    if (!isWebsite && stateIndex <= STATES.indexOf('COMPETITIVE_ANALYSIS')) {
      await checkCancelled(jobId);
      await updateJobState(jobId, 'COMPETITIVE_ANALYSIS');
      await emitAction(jobId, job.user_id, 'competitive_analysis', { step: 'Analyzing Competitors & SWOT' });
      competitiveAnalysisData = await withTimeout(competitiveAnalysisAgent(job as any, brandDNA, marketResearch || {}), STATE_TIMEOUT_MS, 'COMPETITIVE_ANALYSIS', jobId);
      await completeAction(jobId, 'competitive_analysis', { competitorsCount: (competitiveAnalysisData as any)?.competitors?.length || 0 });
      await updateJobState(jobId, 'COMPETITIVE_ANALYSIS', {
        checkpoint: { executionMode, pipeline: [...pipeline], brandDNA, marketResearch, competitiveAnalysis: competitiveAnalysisData },
      });
    }

    // STRATEGY_BUILD
    if (stateIndex <= (isWebsite ? WEBSITE_ONLY_STATES : STATES).indexOf('STRATEGY_BUILD' as any)) {
      await checkCancelled(jobId);
      await updateJobState(jobId, 'STRATEGY_BUILD');
      await emitAction(jobId, job.user_id, 'strategy_build', { step: 'Building Creative Strategy' });
      strategy = await withTimeout(strategyBuildAgent(job as any, brandDNA, marketResearch || {}, competitiveAnalysisData || {}), STATE_TIMEOUT_MS, 'STRATEGY_BUILD', jobId);
      await completeAction(jobId, 'strategy_build', { pillars: (strategy as any)?.content_pillars?.length || 0 });
      await updateJobState(jobId, 'STRATEGY_BUILD', {
        checkpoint: { executionMode, pipeline: [...pipeline], brandDNA, marketResearch, competitiveAnalysis: competitiveAnalysisData, strategy },
        strategy_output: strategy,
      });
    }

    // ASSET_PLANNING (skipped in website-only pipeline)
    if (!isWebsite && stateIndex <= STATES.indexOf('ASSET_PLANNING')) {
      await checkCancelled(jobId);
      await updateJobState(jobId, 'ASSET_PLANNING');
      await emitAction(jobId, job.user_id, 'asset_planning', { step: 'Planning Asset Matrix' });
      assetList = await withTimeout(assetPlanningAgent(job as any, strategy), STATE_TIMEOUT_MS, 'ASSET_PLANNING', jobId);
      await completeAction(jobId, 'asset_planning', { assetsPlanned: Array.isArray(assetList) ? assetList.length : 0 });
      await updateJobState(jobId, 'ASSET_PLANNING', {
        checkpoint: { executionMode, pipeline: [...pipeline], brandDNA, marketResearch, competitiveAnalysis: competitiveAnalysisData, strategy, assetList },
        asset_matrix: assetList,
      });
    }

    // WEBSITE_GENERATION (runs for website requests in both pipelines)
    if (stateIndex <= (isWebsite ? WEBSITE_ONLY_STATES : STATES).indexOf('WEBSITE_GENERATION' as any)) {
      await checkCancelled(jobId);
      if (isWebsite) {
        await updateJobState(jobId, 'WEBSITE_GENERATION');
        // Website generation can stream large content — give it 3x normal timeout
        websiteResult = await withTimeout(landingPageGenerationAgent(job as any, brandDNA, strategy), STATE_TIMEOUT_MS * 3, 'WEBSITE_GENERATION', jobId);
        if (websiteResult) {
          await updateJobState(jobId, 'WEBSITE_GENERATION', {
            checkpoint: { executionMode, pipeline: [...pipeline], brandDNA, marketResearch, competitiveAnalysis: competitiveAnalysisData, strategy, assetList, websiteResult },
          });
        }
      }
    }

    // For website-only pipeline, skip straight to COMPLETE
    if (isWebsite) {
      await updateJobState(jobId, 'COMPLETE', {
        checkpoint: { executionMode, pipeline: [...pipeline], brandDNA, strategy, websiteResult },
      });
      return; // Done — no further steps needed
    }

    // PROJECT_CREATION
    if (stateIndex <= STATES.indexOf('PROJECT_CREATION')) {
      await checkCancelled(jobId);
      await updateJobState(jobId, 'PROJECT_CREATION');
      await emitAction(jobId, job.user_id, 'project_creation', { step: 'Creating Canvas Project' });
      projectId = await withTimeout(projectCreationAgent(job as any, strategy, assetList, websiteResult), STATE_TIMEOUT_MS, 'PROJECT_CREATION', jobId);
      await completeAction(jobId, 'project_creation', { projectId });
      
      // Emit navigate_to_canvas command so the live preview opens
      await emitAction(jobId, job.user_id, 'navigate_to_canvas', {
        step: 'Opening Canvas',
        projectId,
        cursor_target: { x: 960, y: 540, label: 'Opening project...' },
      });
      await completeAction(jobId, 'navigate_to_canvas', { projectId });

      await updateJobState(jobId, 'PROJECT_CREATION', {
        project_id: projectId,
        checkpoint: { executionMode, pipeline: [...pipeline], brandDNA, marketResearch, competitiveAnalysis: competitiveAnalysisData, strategy, assetList, websiteResult },
      });
    }

    // ASSET_GENERATION (multi-format) — check cancellation inside the loop too
    if (stateIndex <= STATES.indexOf('ASSET_GENERATION')) {
      await checkCancelled(jobId);
      await updateJobState(jobId, 'ASSET_GENERATION');
      const accumulatedCheckpoint = { executionMode, pipeline: [...pipeline], brandDNA, marketResearch, competitiveAnalysis: competitiveAnalysisData, strategy, assetList, websiteResult };
      // Asset generation is multi-step; per-asset timeouts are enforced inside the loop helper
      generatedAssets = await assetGenerationAgentWithCancel(job as any, assetList, brandDNA, strategy, projectId!, accumulatedCheckpoint, jobId);
      await updateJobState(jobId, 'ASSET_GENERATION', {
        checkpoint: { executionMode, pipeline: [...pipeline], brandDNA, marketResearch, competitiveAnalysis: competitiveAnalysisData, strategy, assetList, websiteResult, generatedAssets },
      });
    }

    // VALIDATION
    if (stateIndex <= STATES.indexOf('VALIDATION')) {
      await checkCancelled(jobId);
      await updateJobState(jobId, 'VALIDATION');
      await emitAction(jobId, job.user_id, 'validation', { step: 'Validating Brand Compliance' });
      validationResult = await withTimeout(validationAgent(job as any, generatedAssets, brandDNA), STATE_TIMEOUT_MS, 'VALIDATION', jobId);
      await completeAction(jobId, 'validation', { validated: true });
      await updateJobState(jobId, 'VALIDATION', {
        checkpoint: { executionMode, pipeline: [...pipeline], brandDNA, marketResearch, competitiveAnalysis: competitiveAnalysisData, strategy, assetList, websiteResult, generatedAssets, validationResult },
      });
    }

    // SCORING + COMPLETE
    if (stateIndex <= STATES.indexOf('SCORING')) {
      await checkCancelled(jobId);
      await updateJobState(jobId, 'SCORING');
      await emitAction(jobId, job.user_id, 'scoring', { step: 'Scoring Performance' });
      const scoring = await withTimeout(scoringAgent(job as any, generatedAssets), STATE_TIMEOUT_MS, 'SCORING', jobId);
      await completeAction(jobId, 'scoring', { avgScore: (scoring as any)?.summary?.avg_score });

      if (projectId) {
        await supabase.from('projects').update({
          canvas_data: {
            folders: [
              { name: '01 Strategy', items: [strategy] },
              { name: '02 Assets', items: generatedAssets },
              { name: '03 Variations', items: [] },
              { name: '04 Exports', items: [] },
              { name: '05 Logs', items: [validationResult] },
            ],
            rumi_campaign: {
              brand_dna: brandDNA,
              market_research: marketResearch,
              competitive_analysis: competitiveAnalysisData,
              strategy,
              asset_matrix: assetList,
              website: websiteResult || null,
              generated_assets: generatedAssets,
              validation: validationResult,
              scoring,
              completed_at: new Date().toISOString(),
            },
            ...(websiteResult?.siteData ? { website: websiteResult.siteData } : {}),
          },
        }).eq('id', projectId);
      }

      await updateJobState(jobId, 'COMPLETE', {
        scoring_output: scoring,
        checkpoint: { executionMode, pipeline: [...pipeline], brandDNA, marketResearch, competitiveAnalysis: competitiveAnalysisData, strategy, assetList, websiteResult, generatedAssets, validationResult, scoring },
      });
    }
  } catch (err) {
    if (err instanceof CancelledError) {
      console.log(`Job ${jobId} cancelled by user`);
      await logAgent(jobId, 'Orchestrator', 'cancelled', { output: 'Job cancelled by user' });
      return;
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Job ${jobId} failed:`, message);
    await updateJobState(jobId, 'FAILED', { error_message: message });
    await logAgent(jobId, 'Orchestrator', 'failed', { output: message });
  }
}

// ─── Handler ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, objective, brandId } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    
    // Use getClaims for fast local JWT validation (no network call to auth API)
    const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) throw new Error('Unauthorized');
    
    const user = { id: claimsData.claims.sub as string };

    let targetJobId = jobId;

    if (!targetJobId) {
      if (!objective) throw new Error('objective is required');

      const { data: newJob, error: insertError } = await supabase
        .from('rumi_autonomous_jobs')
        .insert({
          user_id: user.id,
          brand_id: brandId || null,
          objective,
          state: 'QUEUED',
        })
        .select('id')
        .single();

      if (insertError || !newJob) throw new Error(`Job creation failed: ${insertError?.message}`);
      targetJobId = newJob.id;

      await logAgent(targetJobId, 'Orchestrator', 'job_created', {
        input: JSON.stringify(objective).slice(0, 500),
      });
    }

    // Stream response to keep isolate alive while state machine runs
    const finalJobId = targetJobId;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let heartbeat: number | undefined;
        // Send initial response immediately so client gets jobId
        controller.enqueue(encoder.encode(JSON.stringify({ jobId: finalJobId, status: 'started' }) + '\n'));
        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify({ jobId: finalJobId, status: 'running', ts: Date.now() }) + '\n'));
          } catch {
            if (heartbeat) clearInterval(heartbeat);
          }
        }, STREAM_HEARTBEAT_MS) as unknown as number;

        try {
          // CRITICAL: await the full state machine — this keeps the isolate alive
          await executeStateMachine(finalJobId);
          controller.enqueue(encoder.encode(JSON.stringify({ jobId: finalJobId, status: 'complete' }) + '\n'));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          console.error('[stream] State machine error:', msg);
          controller.enqueue(encoder.encode(JSON.stringify({ jobId: finalJobId, status: 'failed', error: msg }) + '\n'));
        }
        if (heartbeat) clearInterval(heartbeat);
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('Handler error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: message === 'Unauthorized' ? 401 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

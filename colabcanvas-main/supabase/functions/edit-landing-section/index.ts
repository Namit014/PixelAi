import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

/** Set a value at a dot/bracket path inside an object, e.g. "features[2].title" */
function setAtPath(obj: any, path: string, value: any) {
  const parts: Array<string | number> = [];
  path.replace(/([^.[\]]+)|\[(\d+)\]/g, (_m, key, idx) => {
    parts.push(key !== undefined ? key : Number(idx));
    return '';
  });
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k as any] == null) cur[k as any] = typeof parts[i + 1] === 'number' ? [] : {};
    cur = cur[k as any];
  }
  cur[parts[parts.length - 1] as any] = value;
}

function getAtPath(obj: any, path: string): any {
  const parts: Array<string | number> = [];
  path.replace(/([^.[\]]+)|\[(\d+)\]/g, (_m, key, idx) => {
    parts.push(key !== undefined ? key : Number(idx));
    return '';
  });
  let cur = obj;
  for (const k of parts) {
    if (cur == null) return undefined;
    cur = cur[k as any];
  }
  return cur;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { jobId, presentationId, sectionIndex, instruction, fieldPath, manualText } = body;

    // ─── PRESENTATION MODE (legacy) ───────────────────────────────
    if (presentationId && !jobId) {
      const { data: pres } = await supabase.from('presentations').select('*').eq('id', presentationId).eq('user_id', userId).single();
      if (!pres) return new Response(JSON.stringify({ error: 'Presentation not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const slides = pres.slides as any[];
      const currentSlide = slides[sectionIndex];
      const editResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You edit a slide. Return ONLY valid JSON matching the slide structure.' },
            { role: 'user', content: `Current:\n${JSON.stringify(currentSlide)}\nInstruction: "${instruction}"` },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });
      const editData = await editResponse.json();
      const cleaned = (editData.choices?.[0]?.message?.content || '').replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const updatedSlide = JSON.parse(cleaned);
      updatedSlide.id = currentSlide.id;
      updatedSlide.order = currentSlide.order;
      const updatedSlides = [...slides];
      updatedSlides[sectionIndex] = updatedSlide;
      await supabase.from('presentations').update({ slides: updatedSlides }).eq('id', presentationId);
      return new Response(JSON.stringify({ success: true, updatedSlide, sectionIndex }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── JOB MODE (landing page sections) ─────────────────────────
    if (!jobId || sectionIndex === undefined) {
      return new Response(JSON.stringify({ error: 'jobId and sectionIndex required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: job, error: jobErr } = await supabase
      .from('rumi_autonomous_jobs')
      .select('id, user_id, checkpoint')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const checkpoint = (job.checkpoint || {}) as any;
    const websiteResult = checkpoint.websiteResult || {};
    const siteData = websiteResult.siteData || {};
    const sections = Array.isArray(siteData.sections) ? siteData.sections : [];
    if (sectionIndex < 0 || sectionIndex >= sections.length) {
      return new Response(JSON.stringify({ error: 'Invalid section index' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const currentSection = sections[sectionIndex];
    let updatedSection = { ...currentSection };

    // ─── FIELD-LEVEL EDIT ─────────────────────────────────────────
    if (fieldPath) {
      let newValue: any = manualText;

      // If no manual text but instruction provided → ask AI to rewrite just that field
      if ((newValue == null || newValue === '') && instruction) {
        const currentValue = getAtPath(currentSection, fieldPath);
        const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a premium landing-page copywriter. Rewrite ONE text field per the instruction. Return ONLY the new text — no quotes, no JSON, no commentary.' },
              { role: 'user', content: `Current text:\n"""${currentValue ?? ''}"""\n\nInstruction: ${instruction}\n\nReturn only the rewritten text.` },
            ],
            temperature: 0.7,
            max_tokens: 512,
          }),
        });
        if (!aiResp.ok) {
          return new Response(JSON.stringify({ error: 'AI service error' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const aiData = await aiResp.json();
        newValue = (aiData.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '');
      }

      if (newValue == null) {
        return new Response(JSON.stringify({ error: 'No new value' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      setAtPath(updatedSection, fieldPath, newValue);
    } else {
      // ─── FULL SECTION REWRITE ─────────────────────────────────────
      const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a premium landing-page editor. Update the section JSON per the instruction. Preserve structure and the type/layoutVariant fields. Return ONLY valid JSON.' },
            { role: 'user', content: `Current:\n${JSON.stringify(currentSection, null, 2)}\n\nInstruction: "${instruction}"` },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });
      if (!aiResp.ok) {
        return new Response(JSON.stringify({ error: 'AI service error' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const aiData = await aiResp.json();
      const cleaned = (aiData.choices?.[0]?.message?.content || '').replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      try { updatedSection = { ...currentSection, ...JSON.parse(cleaned) }; }
      catch {
        return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Preserve identity
    updatedSection.type = currentSection.type;
    if (currentSection.layoutVariant) updatedSection.layoutVariant = currentSection.layoutVariant;

    const updatedSections = [...sections];
    updatedSections[sectionIndex] = updatedSection;
    const updatedSiteData = { ...siteData, sections: updatedSections };
    const updatedCheckpoint = { ...checkpoint, websiteResult: { ...websiteResult, siteData: updatedSiteData } };

    await supabase.from('rumi_autonomous_jobs').update({ checkpoint: updatedCheckpoint }).eq('id', jobId);

    // Emit live update so iframe re-renders the section instantly
    await supabase.from('rumi_agent_actions').insert({
      job_id: jobId,
      user_id: userId,
      action_type: 'website_update_section',
      action_data: { sectionIndex, section: updatedSection, step: `Updated ${currentSection.type}` },
      status: 'pending',
    });

    return new Response(JSON.stringify({ success: true, updatedSection, sectionIndex }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[edit-landing-section] Error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

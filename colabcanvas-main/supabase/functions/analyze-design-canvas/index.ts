 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageUrl, detectTypeOnly, designType, brandId, targetAudience, geography, ageRange, userId } = await req.json();
 
     if (!imageUrl) {
       return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
     if (!LOVABLE_API_KEY) {
       throw new Error('LOVABLE_API_KEY is not configured');
     }
 
     // Type detection only (lightweight call)
     if (detectTypeOnly) {
       const detectPrompt = `Analyze this design image and identify what type of design it is.
 
 Respond with ONLY a JSON object in this format:
 {"designType": "one of: logo, poster, social_media, banner, flyer, brochure, business_card, packaging, website, app_ui, illustration, campaign, advertisement, infographic, presentation, general"}
 
 Choose the most specific type that applies. If uncertain, use "general".`;
 
       const detectResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${LOVABLE_API_KEY}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           model: 'google/gemini-2.5-flash',
           messages: [
             {
               role: 'user',
               content: [
                 { type: 'text', text: detectPrompt },
                 { type: 'image_url', image_url: { url: imageUrl } },
               ],
             },
           ],
           max_tokens: 150,
         }),
       });
 
       if (!detectResponse.ok) {
         console.error('Detection API error:', await detectResponse.text());
         return new Response(JSON.stringify({ designType: 'general' }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
       }
 
       const detectData = await detectResponse.json();
       const content = detectData.choices?.[0]?.message?.content || '';
       
       try {
         const jsonMatch = content.match(/\{[\s\S]*\}/);
         if (jsonMatch) {
           const parsed = JSON.parse(jsonMatch[0]);
           return new Response(JSON.stringify({ designType: parsed.designType || 'general' }), {
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
           });
         }
       } catch (e) {
         console.error('Failed to parse detection response:', e);
       }
 
       return new Response(JSON.stringify({ designType: 'general' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     // Full analysis
     const contextParts = [];
     if (designType) contextParts.push(`Design Type: ${designType}`);
     if (targetAudience) contextParts.push(`Target Audience: ${targetAudience}`);
     if (geography) contextParts.push(`Geography/Location: ${geography}`);
     if (ageRange) contextParts.push(`Age Demographics: ${ageRange}`);
 
     const contextString = contextParts.length > 0 
       ? `\n\nContext provided by user:\n${contextParts.join('\n')}`
       : '';
 
     const analysisPrompt = `You are an expert design analyst. Analyze this design image and provide a comprehensive evaluation.${contextString}
 
 Evaluate the design based on:
 1. Visual hierarchy - how well elements guide the eye
 2. Color usage - harmony, contrast, brand alignment
 3. Typography - readability, hierarchy, appropriateness
 4. Balance & composition - layout effectiveness
 5. Spacing - use of whitespace
 6. Overall attention-grabbing potential
 
 Provide your analysis as a JSON object with this exact structure:
 {
   "attentionScore": <number 0-100 representing overall design effectiveness>,
   "summary": "<1-2 sentence summary of the design's strengths and areas for improvement>",
   "strengths": ["<strength 1>", "<strength 2>", ...],
   "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
   "improvements": [
     {
       "id": "<unique_id>",
       "x": <normalized 0-1 x position where improvement is needed>,
       "y": <normalized 0-1 y position where improvement is needed>,
       "title": "<short title>",
       "suggestion": "<actionable suggestion>",
       "severity": "<high|medium|low>",
       "category": "<contrast|hierarchy|balance|spacing|typography|color>"
     }
   ]
 }
 
 Provide 3-6 specific improvement suggestions with precise x,y coordinates (0-1 normalized) pointing to the exact area that needs improvement.
 Be specific and actionable in your suggestions.`;
 
     const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${LOVABLE_API_KEY}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         model: 'google/gemini-2.5-pro',
         messages: [
           {
             role: 'user',
             content: [
               { type: 'text', text: analysisPrompt },
               { type: 'image_url', image_url: { url: imageUrl } },
             ],
           },
         ],
         max_tokens: 2000,
       }),
     });
 
     if (!analysisResponse.ok) {
       const errText = await analysisResponse.text();
       console.error('Analysis API error:', errText);
       throw new Error('Analysis API failed');
     }
 
     const analysisData = await analysisResponse.json();
     const analysisContent = analysisData.choices?.[0]?.message?.content || '';
 
     let result = {
       attentionScore: 50,
       designType: designType || 'general',
       summary: 'Analysis completed.',
       strengths: [],
       weaknesses: [],
       improvements: [],
     };
 
     try {
       const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
       if (jsonMatch) {
         const parsed = JSON.parse(jsonMatch[0]);
         result = {
           attentionScore: Math.min(100, Math.max(0, parsed.attentionScore || 50)),
           designType: designType || 'general',
           summary: parsed.summary || 'Analysis completed.',
           strengths: parsed.strengths || [],
           weaknesses: parsed.weaknesses || [],
           improvements: (parsed.improvements || []).map((imp: any, idx: number) => ({
             id: imp.id || `imp_${idx}`,
             x: Math.min(1, Math.max(0, parseFloat(imp.x) || 0.5)),
             y: Math.min(1, Math.max(0, parseFloat(imp.y) || 0.5)),
             title: imp.title || 'Improvement',
             suggestion: imp.suggestion || '',
             severity: ['high', 'medium', 'low'].includes(imp.severity) ? imp.severity : 'medium',
             category: ['contrast', 'hierarchy', 'balance', 'spacing', 'typography', 'color'].includes(imp.category) 
               ? imp.category 
               : 'hierarchy',
           })),
         };
       }
     } catch (e) {
       console.error('Failed to parse analysis response:', e);
     }
 
     // Save to rumi_learning_events for AI training
     if (userId) {
       try {
         const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
         const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
         const supabase = createClient(supabaseUrl, supabaseKey);
 
         await supabase.from('rumi_learning_events').insert({
           user_id: userId,
           brand_id: brandId || null,
           signal_type: 'design_analysis',
           signal_data: {
             designType: result.designType,
             attentionScore: result.attentionScore,
             improvements: result.improvements,
             context: { targetAudience, geography, ageRange },
           },
           context_snapshot: {
             imageUrl: imageUrl.substring(0, 100) + '...', // Truncate for storage
             timestamp: new Date().toISOString(),
           },
         });
         console.log('[analyze-design-canvas] Saved to rumi_learning_events');
       } catch (dbError) {
         console.error('Failed to save learning event:', dbError);
       }
     }
 
     return new Response(JSON.stringify(result), {
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
 
   } catch (error) {
     console.error('[analyze-design-canvas] Error:', error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const publishSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  description: z.string().max(2000, 'Description too long').trim().optional(),
  category: z.enum(['image-generation', 'video-generation', 'automation', 'design'], {
    errorMap: () => ({ message: 'Invalid category' })
  }).optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).max(10, 'Too many tags').optional()
});

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) throw new Error('Unauthorized');
    const user = { id: claimsData.claims.sub as string };

    // Validate and sanitize input
    const rawData = await req.json();
    const validated = publishSchema.parse(rawData);
    const { workflowId, title, description, category, tags } = validated;

    // Verify ownership
    const { data: workflow } = await supabase
      .from('workflows')
      .select('user_id')
      .eq('id', workflowId)
      .single();

    if (!workflow || workflow.user_id !== user.id) {
      throw new Error('Unauthorized');
    }

    // Update workflow as template
    const { error: updateError } = await supabase
      .from('workflows')
      .update({
        is_template: true,
        is_public: true,
        template_category: category,
        template_description: description,
        tags: tags || [],
      })
      .eq('id', workflowId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error publishing template:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

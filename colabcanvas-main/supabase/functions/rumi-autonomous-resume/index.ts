import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const body = await req.json().catch(() => ({}));
    const { jobId } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If jobId provided, resume that specific job
    if (jobId) {
      // Verify ownership if auth provided
      if (authHeader) {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const jwt = (authHeader ?? '').replace('Bearer ', '');
        const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(jwt);
        if (claimsError || !claimsData?.claims?.sub) throw new Error('Unauthorized');
        const user = { id: claimsData.claims.sub as string };

        const { data: job } = await supabase
          .from('rumi_autonomous_jobs')
          .select('id, user_id, state')
          .eq('id', jobId)
          .single();

        if (!job || job.user_id !== user.id) throw new Error('Job not found');
        if (job.state === 'COMPLETE') {
          return new Response(
            JSON.stringify({ message: 'Job already complete' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      // Re-invoke the execute function
      const res = await fetch(`${SUPABASE_URL}/functions/v1/rumi-autonomous-execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader || `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ jobId }),
      });

      if (!res.ok) throw new Error(await res.text());
      const reader = res.body?.getReader();
      let result: Record<string, unknown> = { jobId, status: 'resumed' };
      if (reader) {
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          for (const line of buffer.split('\n').filter(Boolean)) {
            try { result = JSON.parse(line); } catch { /* ignore heartbeat */ }
          }
          buffer = buffer.endsWith('\n') ? '' : buffer.split('\n').pop() || '';
        }
      }
      return new Response(
        JSON.stringify({ resumed: true, ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // No jobId — scan for stalled jobs (for cron usage)
    const { data: stalledJobs } = await supabase
      .from('rumi_autonomous_jobs')
      .select('id')
      .not('state', 'in', '("COMPLETE","FAILED")')
      .lt('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(5);

    const resumed: string[] = [];
    for (const job of stalledJobs || []) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/rumi-autonomous-execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ jobId: job.id }),
        });
        resumed.push(job.id);
      } catch (err) {
        console.error(`Failed to resume job ${job.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ scanned: stalledJobs?.length || 0, resumed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: message === 'Unauthorized' ? 401 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

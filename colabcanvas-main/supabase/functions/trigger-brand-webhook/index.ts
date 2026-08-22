import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';

interface WebhookPayload {
  event: string;
  brand_id: string;
  timestamp: string;
  changes?: Record<string, any>;
  mcp_server_url?: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Verify internal secret to prevent unauthorized webhook triggers
    const internalSecret = req.headers.get('X-Internal-Secret');
    const expectedSecret = Deno.env.get('WEBHOOK_TRIGGER_SECRET');
    
    if (!internalSecret || !expectedSecret || internalSecret !== expectedSecret) {
      console.error('Unauthorized webhook trigger attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { brand_id, event_type, changes } = await req.json();

    // Get all active webhooks for this brand
    const { data: webhooks, error: webhooksError } = await supabase
      .from('brand_mcp_webhooks')
      .select('*')
      .eq('brand_id', brand_id)
      .eq('is_active', true);

    if (webhooksError) throw webhooksError;
    if (!webhooks || webhooks.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No webhooks configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send webhook to each configured endpoint
    const deliveries = await Promise.all(
      webhooks
        .filter(webhook => {
          const events = webhook.events as string[];
          return events.includes(event_type);
        })
        .map(async (webhook) => {
          const payload: WebhookPayload = {
            event: event_type,
            brand_id,
            timestamp: new Date().toISOString(),
            changes,
            mcp_server_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mcp-brand-server`,
          };

          // Generate HMAC signature if secret exists
          let signature = '';
          if (webhook.secret) {
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
              'raw',
              encoder.encode(webhook.secret),
              { name: 'HMAC', hash: 'SHA-256' },
              false,
              ['sign']
            );
            const signatureBuffer = await crypto.subtle.sign(
              'HMAC',
              key,
              encoder.encode(JSON.stringify(payload))
            );
            signature = Array.from(new Uint8Array(signatureBuffer))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
          }

          try {
            const response = await fetch(webhook.webhook_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(signature && { 'X-Webhook-Signature': signature }),
              },
              body: JSON.stringify(payload),
            });

            const responseBody = await response.text();
            const status = response.ok ? 'success' : 'failed';

            // Log delivery
            await supabase.from('brand_mcp_webhook_deliveries').insert({
              webhook_id: webhook.id,
              event_type,
              payload,
              status,
              response_code: response.status,
              response_body: responseBody.substring(0, 1000), // Truncate
            });

            // Update webhook stats
            if (!response.ok) {
              await supabase
                .from('brand_mcp_webhooks')
                .update({
                  failure_count: (webhook.failure_count || 0) + 1,
                  last_triggered_at: new Date().toISOString(),
                })
                .eq('id', webhook.id);
            } else {
              await supabase
                .from('brand_mcp_webhooks')
                .update({
                  failure_count: 0,
                  last_triggered_at: new Date().toISOString(),
                })
                .eq('id', webhook.id);
            }

            return { webhook_id: webhook.id, status, response_code: response.status };
          } catch (error) {
            // Log failed delivery
            await supabase.from('brand_mcp_webhook_deliveries').insert({
              webhook_id: webhook.id,
              event_type,
              payload,
              status: 'failed',
              response_body: error instanceof Error ? error.message : 'Unknown error',
            });

            return { webhook_id: webhook.id, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' };
          }
        })
    );

    return new Response(
      JSON.stringify({ success: true, deliveries }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook trigger error:', error);
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

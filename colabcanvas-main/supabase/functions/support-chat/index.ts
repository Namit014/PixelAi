import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation schema
const SupportChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().trim().min(1).max(2000)
  })).min(1).max(50),
  ticketId: z.string().uuid().nullish()
});

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user from JWT
    const jwt = (authHeader ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Auth verification failed:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    // Validate and parse request body
    const body = await req.json();
    const validated = SupportChatRequestSchema.parse(body);
    const { messages, ticketId } = validated;
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }), 
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an intelligent AI support agent for Colab, a design platform.

CAPABILITIES:
- Answer user questions about the platform clearly and concisely
- Create support tickets for complex issues that require human attention
- View and manage the user's existing tickets
- Escalate urgent issues automatically
- Provide helpful guidance on using the platform features

ESCALATION RULES:
- Automatically escalate if user mentions: "urgent", "critical", "broken", "can't work", "payment issue", "billing problem"
- Suggest escalation if same issue is reported multiple times
- Always escalate billing/payment issues immediately

CONTEXT AWARENESS:
- When user asks about their tickets, use get_user_tickets tool
- Reference ticket numbers when discussing issues
- Proactively offer to escalate if issue is serious
- Be empathetic and solution-focused

AVAILABLE TOOLS:
- create_ticket: Create a new support ticket for issues requiring human attention
- get_user_tickets: Retrieve all tickets for the current user
- escalate_ticket: Escalate a ticket to high priority for urgent issues  
- update_ticket_status: Update the status of an existing ticket

Be friendly, professional, and proactive about helping users resolve their issues.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_ticket',
              description: 'Create a support ticket for issues requiring human attention',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Brief title of the issue' },
                  description: { type: 'string', description: 'Detailed description of the issue' },
                  category: { type: 'string', description: 'Category: bug, feature, question, billing, other' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }
                },
                required: ['title', 'description', 'category', 'priority']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'get_user_tickets',
              description: 'Retrieve all support tickets for the current user',
              parameters: {
                type: 'object',
                properties: {
                  status_filter: { 
                    type: 'string', 
                    enum: ['all', 'open', 'in_progress', 'resolved', 'closed'],
                    description: 'Filter tickets by status' 
                  }
                }
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'escalate_ticket',
              description: 'Escalate a ticket to high priority for urgent issues',
              parameters: {
                type: 'object',
                properties: {
                  ticket_id: { type: 'string', description: 'The ID of the ticket to escalate' },
                  reason: { type: 'string', description: 'Reason for escalation' }
                },
                required: ['ticket_id', 'reason']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'update_ticket_status',
              description: 'Update the status of an existing ticket',
              parameters: {
                type: 'object',
                properties: {
                  ticket_id: { type: 'string', description: 'The ID of the ticket to update' },
                  status: { 
                    type: 'string', 
                    enum: ['open', 'in_progress', 'resolved', 'closed'],
                    description: 'New status for the ticket' 
                  }
                },
                required: ['ticket_id', 'status']
              }
            }
          }
        ],
        tool_choice: 'auto'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', { status: response.status, error: errorText, userId: user.id });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(
        JSON.stringify({ error: 'An error occurred. Please try again or contact support.' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message;

    // Handle tool calls
    if (aiResponse?.tool_calls && aiResponse.tool_calls.length > 0) {
      const toolResults = [];

      for (const toolCall of aiResponse.tool_calls) {
        const funcName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        try {
          if (funcName === 'get_user_tickets') {
            // Fetch user's tickets
            let query = supabase
              .from('support_tickets')
              .select('id, title, status, priority, category, created_at, updated_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (args.status_filter && args.status_filter !== 'all') {
              query = query.eq('status', args.status_filter);
            }

            const { data: tickets, error } = await query.limit(10);
            
            if (error) {
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                content: JSON.stringify({ error: 'Failed to fetch tickets' })
              });
            } else {
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                content: JSON.stringify({ 
                  tickets: tickets || [],
                  count: tickets?.length || 0
                })
              });
            }
          } else if (funcName === 'escalate_ticket') {
            // Escalate a ticket
            const { error } = await supabase
              .from('support_tickets')
              .update({ 
                priority: 'urgent',
                escalated_at: new Date().toISOString(),
                escalated_reason: args.reason,
                updated_at: new Date().toISOString()
              })
              .eq('id', args.ticket_id)
              .eq('user_id', user.id);

            if (error) {
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                content: JSON.stringify({ success: false, error: 'Failed to escalate ticket' })
              });
            } else {
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                content: JSON.stringify({ 
                  success: true, 
                  message: 'Ticket has been escalated to urgent priority'
                })
              });
            }
          } else if (funcName === 'update_ticket_status') {
            // Update ticket status
            const { error } = await supabase
              .from('support_tickets')
              .update({ 
                status: args.status,
                updated_at: new Date().toISOString()
              })
              .eq('id', args.ticket_id)
              .eq('user_id', user.id);

            if (error) {
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                content: JSON.stringify({ success: false, error: 'Failed to update ticket' })
              });
            } else {
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                content: JSON.stringify({ 
                  success: true, 
                  message: `Ticket status updated to ${args.status}`
                })
              });
            }
          } else if (funcName === 'create_ticket') {
            // This is handled in the frontend - pass through the tool call
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify({ 
                action: 'create_ticket',
                args: args
              })
            });
          }
        } catch (toolError) {
          console.error(`Tool error for ${funcName}:`, toolError);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify({ error: 'Tool execution failed' })
          });
        }
      }

      // If we have tool results (except create_ticket), make another AI call to format the response
      const hasNonCreateTicketResults = toolResults.some(r => {
        const content = JSON.parse(r.content);
        return content.action !== 'create_ticket';
      });

      if (hasNonCreateTicketResults) {
        // Make follow-up call with tool results
        const followUpResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GEMINI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
              aiResponse,
              ...toolResults
            ]
          }),
        });

        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json();
          return new Response(JSON.stringify(followUpData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Support chat error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    const status = error instanceof z.ZodError ? 400 : 500;
    const message = error instanceof z.ZodError 
      ? 'Invalid request format' 
      : 'An error occurred. Please try again or contact support.';
    
    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

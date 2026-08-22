import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EarlyAccessEmail } from "./_templates/early-access-email.tsx";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getSafeErrorMessage } from "../_shared/errors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface EarlyAccessRequest {
  email: string;
  full_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { email, full_name }: EarlyAccessRequest = await req.json();

    // Validate required fields
    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email and full name are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate full name length
    if (full_name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Full name must be at least 2 characters' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for duplicate signup
    const { data: existingSignup } = await supabase
      .from('design_tool_early_access')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingSignup) {
      return new Response(
        JSON.stringify({ 
          error: "You're already on the list!",
          message: "This email is already registered for early access." 
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Get current user if authenticated
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Insert into database
    const { error: insertError } = await supabase
      .from('design_tool_early_access')
      .insert({
        email: email.toLowerCase(),
        full_name: full_name.trim(),
        user_id: userId,
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save signup');
    }

    console.log('Early access signup saved:', { email, full_name });

    // Render email template
    const html = await renderAsync(
      React.createElement(EarlyAccessEmail, {
        fullName: full_name.trim(),
      })
    );

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Colab Design Tool <hello@letscolab.in>',
      to: [email],
      replyTo: 'support@letscolab.in',
      subject: "You're on the Design Tool early access list! 🎉",
      html,
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      // Don't fail the request if email fails - signup is saved
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Signup saved successfully, but email notification failed. We will contact you when we launch.',
          warning: 'Email delivery issue'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Successfully added to early access list! Check your email for confirmation.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in send-early-access-email function:', error);
    const errorMessage = getSafeErrorMessage(error);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);

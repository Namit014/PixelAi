import { Resend } from 'npm:resend@4';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { AuthEmail } from "./_templates/auth-email.tsx";
import { Webhook } from 'npm:standardwebhooks@1';
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") as string;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Colab Auth Email v2.0 - Webhook verified, OTP-only flow");
    console.log("Processing auth email request...");
    
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    // Verify webhook signature
    const wh = new Webhook(hookSecret);
    const verifiedPayload = wh.verify(payload, headers) as {
      user: {
        email: string;
        id: string;
      };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
      };
    };
    
    console.log("Webhook verified successfully");
    
    const { user, email_data } = verifiedPayload;

    if (!user || !user.email || !user.id) {
      console.error("Missing user or email in payload");
      return new Response(
        JSON.stringify({ error: "Missing user email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Apply rate limiting (3 emails per hour per IP)
    const identifier = getRateLimitIdentifier(req);
    const rateLimitConfig = { requests: 3, window: 3600000 }; // 3 emails per hour
    
    if (!checkRateLimit(identifier, rateLimitConfig)) {
      console.error(`Rate limit exceeded for ${identifier}`);
      return new Response(
        JSON.stringify({ error: "Too many email requests. Please try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      token,
      token_hash,
      redirect_to,
      email_action_type,
    } = email_data;

    console.log(`Sending ${email_action_type} email to user ${user.id.substring(0, 8)}`);

    // Render the React email template
    const emailHtml = await renderAsync(
      React.createElement(AuthEmail, {
        email: user.email,
        token,
        token_hash,
        redirect_to: redirect_to || `${supabaseUrl}/`,
        email_action_type,
        supabase_url: supabaseUrl,
      })
    );

    // Determine email subject
    let subject = "Sign in to Colab";
    switch (email_action_type) {
      case "recovery":
        subject = "Reset your Colab password";
        break;
      case "email_change":
        subject = "Confirm your email change";
        break;
      case "signup":
        subject = "Confirm your Colab account";
        break;
      case "magiclink":
        subject = "Sign in to Colab";
        break;
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: "Colab Team <hello@letscolab.in>",
      to: [user.email],
      subject,
      html: emailHtml,
      replyTo: "support@letscolab.in",
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

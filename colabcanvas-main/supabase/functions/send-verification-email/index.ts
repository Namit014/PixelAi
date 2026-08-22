import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, userId } = await req.json();

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: "Email and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating verification token for user: ${userId.substring(0, 8)}`);

    // Generate a secure random token
    const token = crypto.randomUUID();
    const verificationUrl = `${req.headers.get("origin") || supabaseUrl}/verify?token=${token}`;

    // Store verification token in database
    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        user_id: userId,
        token: token,
        verified: false,
      });

    if (insertError) {
      console.error("Error storing verification token:", insertError);
      throw insertError;
    }

    console.log("Verification token stored, sending email via Resend");

    // Use Supabase Storage URLs for email assets (PNG files)
    const storageBaseUrl = `${supabaseUrl}/storage/v1/object/public/email-assets`;
    const logoLightUrl = `${storageBaseUrl}/colab_logo_light.png`;
    const logoDarkUrl = `${storageBaseUrl}/colab_logo_dark.png`;
    const signatureUrl = `${storageBaseUrl}/signature.png`;

    // Send verification email directly using Resend
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light dark">
          <meta name="supported-color-schemes" content="light dark">
          <style>
            :root {
              color-scheme: light dark;
              supported-color-schemes: light dark;
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; 
              line-height: 1.6; 
              color: #333;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
              background-color: #ffffff;
            }
            .logo { 
              text-align: center; 
              margin-bottom: 40px;
              padding-top: 30px;
            }
            .logo img {
              height: 50px;
              width: auto;
              display: block;
              margin: 0 auto;
            }
            .logo-light { display: block !important; }
            .logo-dark { display: none !important; }
            
            @media (prefers-color-scheme: dark) {
              .logo-light { display: none !important; }
              .logo-dark { display: block !important; }
            }
            
            .content { 
              background: #ffffff; 
              padding: 30px; 
              border-radius: 8px; 
            }
            .content h2 {
              color: #1a1a1a;
              font-size: 24px;
              margin-bottom: 16px;
            }
            .content p {
              color: #4b5563;
              font-size: 16px;
              margin-bottom: 16px;
            }
            .button { 
              display: inline-block; 
              padding: 14px 36px; 
              background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%);
              color: #ffffff !important; 
              text-decoration: none; 
              border-radius: 8px; 
              margin: 24px 0;
              font-weight: 600;
              box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
            }
            .button:hover {
              opacity: 0.9;
            }
            .footer { 
              text-align: center; 
              margin-top: 40px; 
              padding-top: 30px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px; 
              color: #6b7280; 
            }
            .footer img {
              height: 30px;
              width: auto;
              display: block;
              margin: 0 auto 15px auto;
            }
            .footer p {
              margin: 8px 0;
              color: #6b7280;
            }
            .footer a {
              color: #8B5CF6;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="${logoLightUrl}" alt="Colab" class="logo-light" />
              <img src="${logoDarkUrl}" alt="Colab" class="logo-dark" />
            </div>
            <div class="content">
              <h2>Verify Your Email Address</h2>
              <p>Thank you for signing up! Please verify your email address to complete your registration and start using Colab.</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                Or copy and paste this link into your browser:<br>
                <a href="${verificationUrl}" style="color: #8B5CF6; word-break: break-all; text-decoration: underline;">${verificationUrl}</a>
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">
                This verification link expires in 24 hours. If you didn't create an account with Colab, you can safely ignore this email.
              </p>
            </div>
            <div class="footer">
              <img src="${signatureUrl}" alt="think . design . colab" />
              <p>© 2024 Colab. All rights reserved.</p>
              <p>Questions? Contact us at <a href="mailto:hello@letscolab.in">hello@letscolab.in</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "Colab <hello@letscolab.in>",
      to: [email],
      subject: "Verify your Colab account",
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending verification email:", emailError);
      throw emailError;
    }

    console.log("Verification email sent successfully via Resend");

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

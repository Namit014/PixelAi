import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { WelcomeEmail } from "./_templates/welcome-email.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function fetchEmailSettings(supabaseClient: any): Promise<Record<string, any> | null> {
  try {
    const { data, error } = await supabaseClient
      .from("email_settings")
      .select("*")
      .limit(1)
      .single();
    if (error) {
      console.error("Failed to fetch email_settings:", error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error("Error fetching email settings:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing welcome email request...");

    const { email, full_name, user_id } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let fullName = full_name || "";

    if (!fullName && user_id) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("full_name")
        .eq("id", user_id)
        .single();
      if (profile) fullName = profile.full_name || "";
    }

    // Fetch email customization settings
    const settings = await fetchEmailSettings(supabaseClient);
    const settingsProps: Record<string, string> = {};
    if (settings) {
      if (settings.logo_url) settingsProps.logoUrl = settings.logo_url;
      if (settings.brand_name) settingsProps.brandName = settings.brand_name;
      if (settings.primary_color) settingsProps.primaryColor = settings.primary_color;
      if (settings.button_radius) settingsProps.buttonRadius = settings.button_radius;
      if (settings.footer_text) settingsProps.footerText = settings.footer_text;
      if (settings.support_email) settingsProps.supportEmail = settings.support_email;
      if (settings.welcome_heading) settingsProps.headingOverride = settings.welcome_heading;
      if (settings.welcome_body) settingsProps.bodyOverride = settings.welcome_body;
    }

    const brandName = settings?.brand_name || 'Colab';

    console.log(`Sending welcome email to ${email}`);

    const emailHtml = await renderAsync(
      React.createElement(WelcomeEmail, {
        fullName,
        email,
        ...settingsProps,
      })
    );

    const { data, error } = await resend.emails.send({
      from: `${brandName} Team <hello@letscolab.in>`,
      to: [email],
      subject: `Welcome to ${brandName}${fullName ? `, ${fullName.split(' ')[0]}` : ''}! 🎉`,
      html: emailHtml,
      replyTo: settings?.support_email || "support@letscolab.in",
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Welcome email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

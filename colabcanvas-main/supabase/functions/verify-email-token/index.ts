import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token } = await req.json();

    if (!token) {
      console.error("No token provided in request");
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Verifying email token:", token.substring(0, 8) + "...");

    // Check if token exists and hasn't expired
    const { data: verification, error: fetchError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !verification) {
      console.error("Token not found or fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Token found for user:", verification.user_id.substring(0, 8), "verified:", verification.verified);

    // Check if already verified
    if (verification.verified) {
      console.log("Token already verified, returning success");
      return new Response(
        JSON.stringify({ success: true, message: "Email already verified" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token has expired (24 hours from creation)
    const expiresAt = new Date(verification.expires_at);
    const now = new Date();
    if (expiresAt < now) {
      console.error("Token has expired. Expires at:", expiresAt, "Current time:", now);
      return new Response(
        JSON.stringify({ error: "Verification token has expired. Please request a new verification email." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as verified
    console.log("Marking token as verified for user:", verification.user_id.substring(0, 8));
    const { error: updateError } = await supabase
      .from("email_verifications")
      .update({ verified: true })
      .eq("token", token);

    if (updateError) {
      console.error("Error updating verification status:", updateError);
      throw updateError;
    }

    console.log("Email verified successfully for user:", verification.user_id.substring(0, 8));

    return new Response(
      JSON.stringify({ success: true, message: "Email verified successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in verify-email-token:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting email assets upload...");

    // SVG files as strings
    const logoLightSvg = `<svg width="120" height="32" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(16 16) rotate(90) scale(16)">
<stop stop-color="#8B5CF6"/>
<stop offset="1" stop-color="#6366F1"/>
</radialGradient>
</defs>
<path d="M8 4C5.79086 4 4 5.79086 4 8V24C4 26.2091 5.79086 28 8 28H24C26.2091 28 28 26.2091 28 24V8C28 5.79086 26.2091 4 24 4H8Z" fill="url(#paint0_radial)"/>
<path d="M12 12C12 10.8954 12.8954 10 14 10H18C19.1046 10 20 10.8954 20 12V20C20 21.1046 19.1046 22 18 22H14C12.8954 22 12 21.1046 12 20V12Z" fill="white"/>
<text x="36" y="22" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1F2937">Colab</text>
</svg>`;

    const logoDarkSvg = `<svg width="120" height="32" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="paint0_radial_dark" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(16 16) rotate(90) scale(16)">
<stop stop-color="#A78BFA"/>
<stop offset="1" stop-color="#818CF8"/>
</radialGradient>
</defs>
<path d="M8 4C5.79086 4 4 5.79086 4 8V24C4 26.2091 5.79086 28 8 28H24C26.2091 28 28 26.2091 28 24V8C28 5.79086 26.2091 4 24 4H8Z" fill="url(#paint0_radial_dark)"/>
<path d="M12 12C12 10.8954 12.8954 10 14 10H18C19.1046 10 20 10.8954 20 12V20C20 21.1046 19.1046 22 18 22H14C12.8954 22 12 21.1046 12 20V12Z" fill="white"/>
<text x="36" y="22" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#F9FAFB">Colab</text>
</svg>`;

    // For signature.png, we'll create a simple placeholder since we can't embed the actual PNG
    // In production, you'd want to properly encode the PNG file
    const signaturePng = await fetch("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==").then(r => r.blob());

    // Upload logo-light.svg
    console.log("Uploading colab-logo-light.svg...");
    const { error: lightError } = await supabase.storage
      .from("email-assets")
      .upload("colab-logo-light.svg", new Blob([logoLightSvg], { type: "image/svg+xml" }), {
        contentType: "image/svg+xml",
        upsert: true,
      });

    if (lightError) {
      console.error("Error uploading light logo:", lightError);
      throw lightError;
    }

    // Upload logo-dark.svg
    console.log("Uploading colab-logo-dark.svg...");
    const { error: darkError } = await supabase.storage
      .from("email-assets")
      .upload("colab-logo-dark.svg", new Blob([logoDarkSvg], { type: "image/svg+xml" }), {
        contentType: "image/svg+xml",
        upsert: true,
      });

    if (darkError) {
      console.error("Error uploading dark logo:", darkError);
      throw darkError;
    }

    // Upload signature.png
    console.log("Uploading signature.png...");
    const { error: signatureError } = await supabase.storage
      .from("email-assets")
      .upload("signature.png", signaturePng, {
        contentType: "image/png",
        upsert: true,
      });

    if (signatureError) {
      console.error("Error uploading signature:", signatureError);
      throw signatureError;
    }

    console.log("All email assets uploaded successfully!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "All email assets uploaded successfully",
        files: [
          "colab-logo-light.svg",
          "colab-logo-dark.svg",
          "signature.png"
        ]
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error uploading email assets:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
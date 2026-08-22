import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const shareToken = url.searchParams.get("token");

  if (!shareToken) {
    return new Response("Missing token", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("presentations")
    .select("title, meta_title, meta_description, og_image_url, slides, is_public")
    .eq("share_token", shareToken)
    .single();

  if (error || !data) {
    return new Response("Not found", { status: 404, headers: corsHeaders });
  }

  const title = data.meta_title || data.title || "Presentation";
  const description =
    data.meta_description ||
    `${Array.isArray(data.slides) ? data.slides.length : 0} slides • Created with Colab`;
  const ogImage = data.og_image_url || "";

  // Determine the app origin from the request's Referer or fallback
  const appOrigin = url.origin.replace("/functions/v1/presentation-og", "");
  // Build the actual SPA URL the browser should land on
  const spaUrl = `${appOrigin}/cosmo/view/${shareToken}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} — Colab</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : ""}
  <meta property="og:url" content="${escapeHtml(spaUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />` : ""}
  <link rel="icon" type="image/svg+xml" href="https://storage.googleapis.com/gpt-engineer-file-uploads/rMeZiFDkUAMEDbul17mX6ExSlgV2/uploads/1761124097893-colab%20fvicon.svg">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(spaUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(spaUrl)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

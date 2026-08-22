// Renders a signed letterhead contract PDF for a talent project.
// Letterhead = Colab brand mark + circular Colab Seal as authorised stamp.
// Uses Browserless /pdf to render HTML.
import { createClient } from "npm:@supabase/supabase-js@2";
import { COLAB_LETTERHEAD_DATA_URL, COLAB_SEAL_DATA_URL } from "./brand-assets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Tiny markdown -> HTML (headings, bold, italics, lists, paragraphs, line breaks)
function md(src: string): string {
  if (!src) return "";
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  const flushLists = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };
  const inline = (t: string) =>
    escapeHtml(t)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushLists(); continue; }
    let m;
    if ((m = line.match(/^######\s+(.*)$/))) { flushLists(); out.push(`<h6>${inline(m[1])}</h6>`); continue; }
    if ((m = line.match(/^#####\s+(.*)$/))) { flushLists(); out.push(`<h5>${inline(m[1])}</h5>`); continue; }
    if ((m = line.match(/^####\s+(.*)$/))) { flushLists(); out.push(`<h4>${inline(m[1])}</h4>`); continue; }
    if ((m = line.match(/^###\s+(.*)$/))) { flushLists(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
    if ((m = line.match(/^##\s+(.*)$/))) { flushLists(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
    if ((m = line.match(/^#\s+(.*)$/))) { flushLists(); out.push(`<h1>${inline(m[1])}</h1>`); continue; }
    if ((m = line.match(/^[-*]\s+(.*)$/))) {
      if (!inUl) { flushLists(); out.push("<ul>"); inUl = true; }
      out.push(`<li>${inline(m[1])}</li>`); continue;
    }
    if ((m = line.match(/^\d+\.\s+(.*)$/))) {
      if (!inOl) { flushLists(); out.push("<ol>"); inOl = true; }
      out.push(`<li>${inline(m[1])}</li>`); continue;
    }
    flushLists();
    out.push(`<p>${inline(line)}</p>`);
  }
  flushLists();
  return out.join("\n");
}

function buildHtml(opts: {
  contractMd: string;
  scopeMd: string | null;
  clientName: string;
  clientEmail: string;
  projectTitle: string;
  projectId: string;
  generatedAt: string;
  signatureDataUrl: string | null;
  signedAt: string | null;
  pricing: { currency?: string; total?: number };
}): string {
  const dateLong = new Date(opts.generatedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const signedDateLong = opts.signedAt
    ? new Date(opts.signedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const projRef = `COL-${opts.projectId.slice(0, 8).toUpperCase()}`;
  const total = `${opts.pricing.currency || "INR"} ${(opts.pricing.total ?? 0).toLocaleString("en-IN")}`;

  const scopeBlock = opts.scopeMd
    ? `<h2 style="margin-top:32px;">Schedule A — Scope of Work</h2>${md(opts.scopeMd)}`
    : "";

  const signatureImg = opts.signatureDataUrl
    ? `<img src="${escapeHtml(opts.signatureDataUrl)}" alt="Client signature" style="max-width:200px;max-height:60px;display:block;" />`
    : `<div style="border-bottom:1px solid #18181b;width:200px;height:60px;"></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Services Agreement — ${escapeHtml(projRef)}</title>
<style>
  @page { size: A4; margin: 22mm 18mm 22mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #18181b;
    font-size: 11pt;
    line-height: 1.55;
    margin: 0;
  }
  .letterhead {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #18181b;
    padding-bottom: 12px;
    margin-bottom: 28px;
  }
  .brand img { height: 48px; display: block; }
  .meta { text-align: right; font-size: 9pt; color: #3f3f46; }
  .meta .ref { font-weight: 700; color: #18181b; font-size: 10pt; }
  h1 { font-size: 18pt; font-weight: 700; letter-spacing: -0.01em; margin: 12px 0 18px; }
  h2 { font-size: 12pt; font-weight: 700; margin: 22px 0 8px; color: #18181b; border-left: 3px solid #18181b; padding-left: 8px; }
  h3 { font-size: 11pt; font-weight: 700; margin: 18px 0 6px; }
  p { margin: 0 0 10px; }
  ul, ol { margin: 0 0 12px 22px; padding: 0; }
  li { margin-bottom: 4px; }
  .summary {
    background: #fafafa;
    border: 1px solid #e4e4e7;
    border-radius: 8px;
    padding: 14px 16px;
    margin: 16px 0 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 24px;
    font-size: 10pt;
  }
  .summary div span { display: block; color: #71717a; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
  .summary div b { font-weight: 600; color: #18181b; }
  .signatures {
    margin-top: 48px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 36px;
    page-break-inside: avoid;
  }
  .sig-block { border-top: 1px solid #d4d4d8; padding-top: 10px; }
  .sig-block .label { font-size: 8.5pt; text-transform: uppercase; color: #71717a; letter-spacing: 0.05em; margin-bottom: 14px; }
  .sig-block .name { font-weight: 600; margin-top: 14px; }
  .sig-block .role { font-size: 9pt; color: #52525b; }
  .sig-block .date { font-size: 9pt; color: #52525b; margin-top: 4px; }
  .colab-seal-img {
    width: 130px; height: 130px;
    display: block;
    transform: rotate(-6deg);
    margin: 4px 0 8px;
    opacity: 0.95;
  }
  footer {
    position: fixed;
    bottom: -14mm;
    left: 0; right: 0;
    text-align: center;
    font-size: 7.5pt;
    color: #a1a1aa;
  }
  code { background: #f4f4f5; padding: 1px 4px; border-radius: 3px; font-size: 9.5pt; }
</style>
</head>
<body>
  <div class="letterhead">
    <div class="brand">
      <img src="${COLAB_LETTERHEAD_DATA_URL}" alt="Colab" />
    </div>
    <div class="meta">
      <div class="ref">Ref: ${escapeHtml(projRef)}</div>
      <div>Date: ${escapeHtml(dateLong)}</div>
      <div style="margin-top:6px;">Project: ${escapeHtml(opts.projectTitle || "Untitled")}</div>
    </div>
  </div>

  <h1>Services Agreement &amp; Statement of Work</h1>

  <div class="summary">
    <div><span>Service Provider</span><b>Cohyve Tech Private Limited (Colab)</b></div>
    <div><span>Client</span><b>${escapeHtml(opts.clientName || opts.clientEmail || "Client")}</b></div>
    <div><span>Project</span><b>${escapeHtml(opts.projectTitle || "—")}</b></div>
    <div><span>Total Engagement Value</span><b>${escapeHtml(total)}</b></div>
    <div><span>Governing Law</span><b>India · Mumbai, Maharashtra jurisdiction</b></div>
    <div><span>Effective Date</span><b>${escapeHtml(dateLong)}</b></div>
  </div>

  ${md(opts.contractMd)}

  ${scopeBlock}

  <div class="signatures">
    <div class="sig-block">
      <div class="label">For Cohyve Tech Pvt Ltd ("Colab")</div>
      <img src="${COLAB_SEAL_DATA_URL}" alt="Colab Authorised Seal" class="colab-seal-img" />
      <div class="name">Authorised Signatory</div>
      <div class="role">Cohyve Tech Private Limited</div>
      <div class="date">Date: ${escapeHtml(dateLong)}</div>
    </div>
    <div class="sig-block">
      <div class="label">For the Client</div>
      ${signatureImg}
      <div class="name">${escapeHtml(opts.clientName || opts.clientEmail || "Client")}</div>
      <div class="role">${escapeHtml(opts.clientEmail || "")}</div>
      <div class="date">Signed: ${escapeHtml(signedDateLong)}</div>
    </div>
  </div>

  <footer>
    Cohyve Tech Private Limited · Colab · Confidential · Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </footer>
</body>
</html>`;
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/png";
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return `data:${ct};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.slice("Bearer ".length);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const browserlessKey = Deno.env.get("BROWSERLESS_API_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) throw new Error("Server misconfigured");
    if (!browserlessKey) throw new Error("BROWSERLESS_API_KEY not configured");

    const admin = createClient(supabaseUrl, serviceKey);

    // Validate user
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "";

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load project (RLS-safe via owner check)
    const { data: project, error: projErr } = await admin
      .from("talent_projects")
      .select("*")
      .eq("id", project_id)
      .single();
    if (projErr || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (project.user_id !== userId) {
      // Allow admins
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (!project.contract_md) {
      return new Response(JSON.stringify({ error: "No contract drafted yet" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get client name from profile
    const { data: profile } = await admin.from("profiles").select("full_name, email").eq("id", project.user_id).single();
    const clientName = profile?.full_name || profile?.email || "Client";
    const clientEmail = profile?.email || "";

    // Embed signature as data URL so PDF is self-contained
    const sigDataUrl = project.client_signature_url ? await fetchAsDataUrl(project.client_signature_url) : null;

    const html = buildHtml({
      contractMd: project.contract_md,
      scopeMd: project.scope_md ?? null,
      clientName,
      clientEmail,
      projectTitle: project.title || "Untitled project",
      projectId: project.id,
      generatedAt: project.contract_meta?.generated_at || project.updated_at || new Date().toISOString(),
      signatureDataUrl: sigDataUrl,
      signedAt: project.client_signed_at,
      pricing: project.pricing || {},
    });

    // Render via Browserless
    const blResp = await fetch(`https://chrome.browserless.io/pdf?token=${browserlessKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html,
        options: {
          format: "A4",
          printBackground: true,
          displayHeaderFooter: false,
          margin: { top: "22mm", bottom: "22mm", left: "18mm", right: "18mm" },
        },
      }),
    });
    if (!blResp.ok) {
      const t = await blResp.text();
      console.error("browserless error", blResp.status, t);
      throw new Error(`PDF render failed (${blResp.status})`);
    }
    const pdfBytes = new Uint8Array(await blResp.arrayBuffer());

    // Upload to private bucket talent-contracts/{user_id}/{project_id}-signed.pdf
    const path = `${project.user_id}/${project.id}-signed.pdf`;
    const { error: upErr } = await admin.storage
      .from("talent-contracts")
      .upload(path, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) {
      console.error("upload error", upErr);
      throw new Error("Failed to store contract");
    }

    // Signed URL valid 7 days; UI can re-mint
    const { data: signed, error: signErr } = await admin.storage
      .from("talent-contracts")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signErr || !signed) throw new Error("Failed to sign URL");

    await admin
      .from("talent_projects")
      .update({ signed_contract_url: signed.signedUrl })
      .eq("id", project.id);

    return new Response(JSON.stringify({ signed_contract_url: signed.signedUrl, url: signed.signedUrl, path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("talent-render-contract-pdf error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

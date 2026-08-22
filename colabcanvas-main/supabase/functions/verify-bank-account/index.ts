// Free, automatic bank-account verification.
// US: ABA checksum + routingnumbers.info lookup
// IN: IFSC checksum + ifsc.razorpay.com lookup
// EU/UK: IBAN MOD-97
// SWIFT-only: structural regex, marks as `pending` for admin review.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---------- ABA (US) ----------
function isValidAba(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false;
  const d = routing.split("").map(Number);
  const sum =
    3 * (d[0] + d[3] + d[6]) +
    7 * (d[1] + d[4] + d[7]) +
    1 * (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}

async function lookupAba(routing: string) {
  try {
    const r = await fetch(`https://www.routingnumbers.info/api/data.json?rn=${routing}`);
    if (!r.ok) return null;
    const d = await r.json();
    if (d?.code !== 200) return null;
    return {
      bank: d.customer_name as string,
      address: `${d.address ?? ""}, ${d.city ?? ""}, ${d.state ?? ""} ${d.zip ?? ""}`.trim(),
    };
  } catch { return null; }
}

// ---------- IFSC (India) ----------
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
async function lookupIfsc(ifsc: string) {
  if (!IFSC_RE.test(ifsc)) return null;
  try {
    const r = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
    if (!r.ok) return null;
    const d = await r.json();
    return {
      bank: d.BANK as string,
      branch: d.BRANCH as string,
      address: d.ADDRESS as string,
      city: d.CITY as string,
    };
  } catch { return null; }
}

// ---------- IBAN (EU/UK) ----------
function isValidIban(raw: string): boolean {
  const s = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  // Move first 4 chars to end, convert letters → numbers (A=10..Z=35), check mod 97 = 1
  const rearranged = s.slice(4) + s.slice(0, 4);
  let n = "";
  for (const ch of rearranged) {
    n += /[A-Z]/.test(ch) ? (ch.charCodeAt(0) - 55).toString() : ch;
  }
  // mod-97 in chunks
  let rem = 0;
  for (let i = 0; i < n.length; i += 7) {
    rem = parseInt(String(rem) + n.slice(i, i + 7), 10) % 97;
  }
  return rem === 1;
}

const SWIFT_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { account_id } = await req.json();
    if (!account_id) return json({ error: "account_id required" }, 400);

    const { data: acct } = await service
      .from("talent_payout_accounts")
      .select("*")
      .eq("id", account_id)
      .maybeSingle();
    if (!acct) return json({ error: "Account not found" }, 404);
    if (acct.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    // Daily rate-limit (5/day per user)
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    if ((acct.last_verification_at && acct.last_verification_at > since && acct.verification_attempts >= 5)) {
      return json({ error: "Too many attempts. Try again tomorrow." }, 429);
    }

    const country = (acct.country || "").toUpperCase();
    const currency = (acct.currency || "").toUpperCase();
    const routing = (acct.routing_or_ifsc || "").trim();
    const swift = (acct.swift || "").trim();

    let status: "verified" | "pending" | "failed" = "failed";
    let method = "manual";
    let details: Record<string, unknown> = {};
    let resolvedBank: string | null = null;

    if (country === "US" || currency === "USD") {
      method = "routing_lookup";
      if (!isValidAba(routing)) {
        details = { error: "Invalid US routing number checksum" };
      } else {
        const lk = await lookupAba(routing);
        if (lk) {
          resolvedBank = lk.bank;
          details = { source: "routingnumbers.info", ...lk };
          status = "verified";
        } else {
          status = "pending";
          details = { note: "Routing checksum valid; bank lookup unavailable. Pending review." };
        }
      }
    } else if (country === "IN" || currency === "INR") {
      method = "ifsc_lookup";
      const lk = await lookupIfsc(routing.toUpperCase());
      if (lk) {
        resolvedBank = lk.bank;
        details = { source: "ifsc.razorpay.com", ...lk };
        status = "verified";
      } else {
        details = { error: "IFSC not found or invalid" };
      }
    } else if (routing && isValidIban(routing)) {
      method = "iban_checksum";
      details = { source: "iban_mod97", iban_country: routing.slice(0, 2) };
      status = "verified";
    } else if (swift && SWIFT_RE.test(swift.toUpperCase())) {
      method = "swift_manual";
      status = "pending";
      details = { note: "SWIFT format valid; awaiting manual review.", swift };
    } else {
      details = { error: "Could not auto-verify. Please check routing/IFSC/IBAN/SWIFT." };
    }

    await service.from("talent_payout_accounts").update({
      verification_status: status,
      verification_method: method,
      verification_details: details,
      verification_attempts: (acct.verification_attempts ?? 0) + 1,
      last_verification_at: new Date().toISOString(),
      verified: status === "verified",
      verified_at: status === "verified" ? new Date().toISOString() : null,
      bank_name: resolvedBank ?? acct.bank_name,
    }).eq("id", account_id);

    // Mirror to credits.bank_status
    await service.from("credits")
      .update({ bank_status: status })
      .eq("user_id", user.id);

    return json({ status, method, details, bank_name: resolvedBank ?? acct.bank_name });
  } catch (e) {
    console.error("[verify-bank-account]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

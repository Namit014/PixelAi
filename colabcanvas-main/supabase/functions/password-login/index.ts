const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiter
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60_000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    const { email, password } = await req.json();

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return Response.json(
        { ok: false, error: "Email and password are required" },
        { status: 200, headers: corsHeaders }
      );
    }

    const rateLimitKey = email.toLowerCase().trim();
    if (isRateLimited(rateLimitKey)) {
      return Response.json(
        { ok: false, error: "Too many login attempts. Please wait a moment." },
        { status: 200, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    console.log("password-login: auth request starting");

    // Direct REST call with timeout — no SDK, no stalling
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    let authRes: Response;
    try {
      authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "apikey": anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const isTimeout = fetchErr.name === "AbortError";
      console.error("password-login: auth fetch failed", isTimeout ? "TIMEOUT" : fetchErr.message);
      return Response.json(
        { ok: false, error: isTimeout ? "Login timed out. Please try again." : "Authentication service unavailable." },
        { status: 200, headers: corsHeaders }
      );
    }
    clearTimeout(timeout);

    console.log("password-login: auth response status", authRes.status);

    const body = await authRes.json();

    if (!authRes.ok) {
      // Map known auth errors
      const msg = body?.error_description || body?.msg || body?.error || "Login failed";
      console.log("password-login: auth error", msg);
      return Response.json(
        { ok: false, error: msg },
        { status: 200, headers: corsHeaders }
      );
    }

    if (!body.access_token) {
      return Response.json(
        { ok: false, error: "Login succeeded but no session was returned" },
        { status: 200, headers: corsHeaders }
      );
    }

    console.log("password-login: success");

    return Response.json(
      {
        ok: true,
        session: {
          access_token: body.access_token,
          refresh_token: body.refresh_token,
          expires_in: body.expires_in,
          expires_at: body.expires_at,
          token_type: body.token_type,
        },
        user: {
          id: body.user?.id,
          email: body.user?.email,
          user_metadata: body.user?.user_metadata,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("password-login: unexpected error", err);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 200, headers: corsHeaders }
    );
  }
});

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_scope: "The app requested permissions that aren't approved yet. Your Meta/Facebook app likely needs App Review approval for the requested scopes.",
  access_denied: "You denied access. Please try again and approve the permissions.",
  unauthorized_client: "The app is not authorized. Check that the Client ID and Redirect URI match exactly in the developer console.",
  server_error: "The provider encountered an error. Please try again later.",
  user_denied: "You cancelled the authorization. Please try again if you'd like to connect.",
  redirect_uri_mismatch: "The redirect URI doesn't match what's registered in the developer console. Ensure https://app.letscolab.tech/oauth/social/callback is registered.",
};

function friendlyError(raw: string): string {
  const key = raw.toLowerCase().replace(/\s+/g, "_");
  for (const [k, v] of Object.entries(ERROR_MESSAGES)) {
    if (key.includes(k)) return v;
  }
  return raw;
}

export default function SocialOAuthCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [rawError, setRawError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const errorDescription = params.get("error_description");
    const errorReason = params.get("error_reason");

    console.log("[SocialOAuthCallback] params:", { code: !!code, state: !!state, error, errorDescription, errorReason });

    if (error || !code || !state) {
      const raw = errorDescription || error || "Missing authorization code or state parameter";
      setStatus("error");
      setMessage(friendlyError(raw));
      setRawError(`error=${error || 'none'}, error_description=${errorDescription || 'none'}, error_reason=${errorReason || 'none'}`);
      notifyOpener("error", raw);
      return;
    }

    (async () => {
      try {
        const res = await supabase.functions.invoke("social-oauth-callback", {
          body: { code, state },
        });

        if (res.error || res.data?.error) {
          const errMsg = res.data?.error || res.error?.message || "Token exchange failed";
          setStatus("error");
          setMessage(friendlyError(errMsg));
          setRawError(errMsg);
          notifyOpener("error", errMsg);
          return;
        }

        setStatus("success");
        setMessage(`${res.data.platform_username || res.data.platform} connected!`);
        notifyOpener("success", res.data.platform);
      } catch (e: any) {
        setStatus("error");
        setMessage(friendlyError(e.message || "Unexpected error"));
        setRawError(e.message || "Unknown");
        notifyOpener("error", e.message);
      }
    })();
  }, []);

  function notifyOpener(result: "success" | "error", detail: string) {
    if (window.opener) {
      window.opener.postMessage({ type: "social-oauth-result", result, detail }, "*");
      setTimeout(() => window.close(), 1500);
    } else {
      setTimeout(() => {
        window.location.href = `/dashboard?social_auth=${result}&platform=${encodeURIComponent(detail)}`;
      }, 2000);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Connecting your account...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-foreground font-medium">{message}</p>
            <p className="text-xs text-muted-foreground">This window will close automatically.</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-foreground font-medium">Connection failed</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            {rawError && (
              <details className="text-left mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer">Technical details</summary>
                <pre className="text-[10px] text-muted-foreground bg-muted p-2 rounded mt-1 whitespace-pre-wrap break-all">{rawError}</pre>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

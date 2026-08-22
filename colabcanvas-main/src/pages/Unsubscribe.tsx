import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Mail } from 'lucide-react';

type State =
  | { kind: 'loading' }
  | { kind: 'valid' }
  | { kind: 'already' }
  | { kind: 'invalid'; message?: string }
  | { kind: 'submitting' }
  | { kind: 'done' }
  | { kind: 'error'; message?: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setState({ kind: 'invalid', message: 'Missing unsubscribe token.' });
        return;
      }
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } },
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: 'invalid', message: data?.error || 'Invalid or expired link.' });
          return;
        }
        if (data.valid === false && data.reason === 'already_unsubscribed') {
          setState({ kind: 'already' });
          return;
        }
        if (data.valid) {
          setState({ kind: 'valid' });
          return;
        }
        setState({ kind: 'invalid' });
      } catch (e: any) {
        if (!cancelled) setState({ kind: 'error', message: e?.message ?? 'Network error' });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: 'submitting' });
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if ((data as any)?.success === false && (data as any)?.reason === 'already_unsubscribed') {
        setState({ kind: 'already' });
      } else if ((data as any)?.success) {
        setState({ kind: 'done' });
      } else {
        setState({ kind: 'error', message: 'Could not unsubscribe.' });
      }
    } catch (e: any) {
      setState({ kind: 'error', message: e?.message ?? 'Could not unsubscribe.' });
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-5">
          <Mail className="w-5 h-5 text-zinc-600" />
        </div>

        {state.kind === 'loading' && (
          <>
            <h1 className="text-xl font-semibold text-zinc-900 mb-1">Checking your link…</h1>
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400 mx-auto mt-3" />
          </>
        )}

        {state.kind === 'valid' && (
          <>
            <h1 className="text-xl font-semibold text-zinc-900 mb-1">Unsubscribe from emails</h1>
            <p className="text-sm text-zinc-500 mb-6">
              Click below to stop receiving non-essential emails from Colab. You can re-subscribe later
              from your account settings.
            </p>
            <Button onClick={confirm} className="rounded-full bg-zinc-900 hover:bg-zinc-800 px-6">
              Confirm unsubscribe
            </Button>
          </>
        )}

        {state.kind === 'submitting' && (
          <>
            <h1 className="text-xl font-semibold text-zinc-900 mb-1">Unsubscribing…</h1>
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400 mx-auto mt-3" />
          </>
        )}

        {state.kind === 'done' && (
          <>
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <h1 className="text-xl font-semibold text-zinc-900 mb-1">You're unsubscribed</h1>
            <p className="text-sm text-zinc-500">
              We won't send you these emails any more. Sorry to see you go.
            </p>
          </>
        )}

        {state.kind === 'already' && (
          <>
            <CheckCircle2 className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
            <h1 className="text-xl font-semibold text-zinc-900 mb-1">Already unsubscribed</h1>
            <p className="text-sm text-zinc-500">
              Looks like this address is already opted out — nothing more to do.
            </p>
          </>
        )}

        {(state.kind === 'invalid' || state.kind === 'error') && (
          <>
            <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <h1 className="text-xl font-semibold text-zinc-900 mb-1">Link can't be used</h1>
            <p className="text-sm text-zinc-500">{state.message || 'This unsubscribe link is invalid or has expired.'}</p>
          </>
        )}
      </div>
    </div>
  );
}

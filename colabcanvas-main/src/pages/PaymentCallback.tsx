import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Clock, ArrowRight, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import colabLogo from "@/assets/colab-logo.svg";

type PaymentStatus = "processing" | "success" | "failure" | "timeout";

interface PaymentDetails {
  planName?: string;
  credits?: number;
  amount?: number;
  type?: string;
}

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("processing");
  const [message, setMessage] = useState("Verifying your payment…");
  const [retryCount, setRetryCount] = useState(0);
  const [details, setDetails] = useState<PaymentDetails>({});
  const [secondsLeft, setSecondsLeft] = useState(6);

  const fireConfetti = useCallback(() => {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => {
      confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.6 } });
      confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.6 } });
    }, 250);
  }, []);

  const checkPaymentStatus = useCallback(async (txnid: string): Promise<boolean> => {
    try {
      const { data: payment, error } = await supabase
        .from("payments")
        .select("status, amount, plan_id, metadata, subscription_plans(name, credits_monthly)")
        .eq("id", txnid)
        .single();
      if (error) return false;

      const meta = (payment?.metadata as any) || {};
      const plan = (payment as any)?.subscription_plans;

      if (payment?.status === "completed" || payment?.status === "success") {
        const isTopUp = meta?.type === 'topup';
        setDetails({
          planName: plan?.name,
          credits: isTopUp ? meta?.credits : plan?.credits_monthly,
          amount: payment.amount,
          type: isTopUp ? 'topup' : 'subscription',
        });
        setStatus("success");
        setMessage(isTopUp
          ? `${meta?.credits || 0} credits added to your account.`
          : `Your ${plan?.name || ''} plan is now active.`);
        fireConfetti();
        return true;
      }
      if (payment?.status === "failed") {
        setStatus("failure");
        setMessage(meta?.failure_reason || "Your payment couldn't be processed.");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [fireConfetti]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    const verifyPayment = async () => {
      const paymentStatus = searchParams.get("status");
      const paymentType = searchParams.get("type");
      const txnid = searchParams.get("txnid") || searchParams.get("paymentId");

      if (paymentStatus === "success" && paymentType === "free") {
        setStatus("success");
        setDetails({ type: 'free' });
        setMessage("Your subscription is now active.");
        fireConfetti();
        return;
      }
      if (paymentStatus === "failure") {
        setStatus("failure");
        setMessage("Payment was cancelled or didn't go through.");
        return;
      }
      if (paymentStatus === "success" && txnid) {
        setMessage("Confirming payment with our servers…");
        const callbackPayload = Object.fromEntries(searchParams.entries());
        if (callbackPayload.hash && callbackPayload.amount) {
          await supabase.functions.invoke('verify-payment', { body: callbackPayload }).catch(() => null);
        }
        if (await checkPaymentStatus(txnid)) return;
        let attempts = 0;
        const maxAttempts = 10;
        pollInterval = setInterval(async () => {
          attempts++;
          setRetryCount(attempts);
          const done = await checkPaymentStatus(txnid);
          if (done || attempts >= maxAttempts) {
            if (pollInterval) clearInterval(pollInterval);
            if (!done && attempts >= maxAttempts) {
              setStatus("timeout");
              setMessage("Verification is taking longer than usual. If your payment went through, credits will appear within a few minutes.");
            }
          }
        }, 2000);
      } else if (!txnid && paymentStatus === "success") {
        setStatus("success");
        setMessage("Your subscription is now active.");
        fireConfetti();
      } else if (!paymentStatus) {
        setStatus("failure");
        setMessage("Invalid payment callback. Please try again.");
      }
    };

    verifyPayment();
    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [searchParams, checkPaymentStatus, fireConfetti]);

  // Auto-redirect countdown for success
  useEffect(() => {
    if (status !== 'success') return;
    setSecondsLeft(6);
    const i = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    redirectTimerRef.current = setTimeout(() => navigate('/dashboard'), 6000);
    return () => {
      clearInterval(i);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl p-8 md:p-10">
        <div className="flex items-center gap-2 mb-8">
          <img src={colabLogo} alt="Colab" className="w-7 h-7" />
          <span className="text-sm font-medium text-zinc-900">Colab</span>
        </div>

        {status === "processing" && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Verifying payment</h1>
            <p className="text-sm text-zinc-500">{message}</p>
            {retryCount > 0 && (
              <p className="text-xs text-zinc-400 mt-3">Attempt {retryCount} of 10</p>
            )}
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
              {details.type === 'topup' ? 'Credits added' : 'Payment successful'}
            </h1>
            <p className="text-sm text-zinc-500 mb-6">{message}</p>

            {(details.planName || details.credits) && (
              <div className="text-left bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-6">
                {details.planName && (
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-200 last:border-0">
                    <span className="text-xs text-zinc-500">Plan</span>
                    <span className="text-sm font-medium text-zinc-900">{details.planName}</span>
                  </div>
                )}
                {details.credits ? (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-zinc-500">Credits added</span>
                    <span className="text-sm font-medium text-zinc-900">{details.credits.toLocaleString()}</span>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => navigate('/dashboard')} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white">
                Go to dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => navigate('/settings?tab=billing')} className="flex-1">
                View receipt
              </Button>
            </div>
            <p className="text-[11px] text-zinc-400 mt-4">Auto-redirecting in {secondsLeft}s…</p>
          </div>
        )}

        {status === "failure" && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-7 h-7 text-red-600" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Payment unsuccessful</h1>
            <p className="text-sm text-zinc-500 mb-6">{message}</p>
            <div className="text-left bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-6 text-xs text-zinc-600 leading-relaxed">
              No charges were made if the payment didn't complete. If money was deducted from your account, it will be auto-refunded by your bank within 5–7 business days.
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/pricing')} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white">
                Try again
              </Button>
              <Button
                variant="outline"
                onClick={() => { window.location.href = 'mailto:hello@letscolab.in?subject=Payment%20issue'; }}
                className="flex-1"
              >
                <LifeBuoy className="w-4 h-4 mr-2" /> Contact support
              </Button>
            </div>
          </div>
        )}

        {status === "timeout" && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-7 h-7 text-amber-600" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Verification pending</h1>
            <p className="text-sm text-zinc-500 mb-6">{message}</p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/dashboard')} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white">
                Go to dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/pricing')} className="flex-1">
                Back to pricing
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;

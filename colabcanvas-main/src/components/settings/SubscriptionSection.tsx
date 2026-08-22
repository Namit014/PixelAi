import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCogentRunsAllocation, getDisplayPlanName } from "@/lib/planUtils";

interface SubscriptionSectionProps {
  credits: any;
}

export const SubscriptionSection = ({ credits }: SubscriptionSectionProps) => {
  const navigate = useNavigate();
  const [cogentUsed, setCogentUsed] = useState<number>(credits?.cogent_runs_used ?? 0);
  const [cogentLimit, setCogentLimit] = useState<number>(
    credits?.cogent_runs_limit ?? getCogentRunsAllocation(credits?.subscription_tier),
  );

  useEffect(() => {
    // Pull live values in case the parent didn't include them
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('credits')
        .select('cogent_runs_used, cogent_runs_limit, subscription_tier')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setCogentUsed(data.cogent_runs_used ?? 0);
        setCogentLimit(
          data.cogent_runs_limit ?? getCogentRunsAllocation(data.subscription_tier),
        );
      }
    })();
  }, [credits?.subscription_tier]);

  const cogentUnlimited = cogentLimit === -1;
  const cogentPct = cogentUnlimited
    ? 100
    : cogentLimit > 0
      ? Math.min(100, (cogentUsed / cogentLimit) * 100)
      : 0;

  return (
    <div className="bg-white p-6 rounded-lg border border-zinc-200">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-zinc-600" />
        <h2 className="text-xl font-semibold text-zinc-900">Subscription</h2>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-zinc-600 mb-2">Current Plan</p>
          <div className="flex items-center gap-3">
            <Badge className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100 capitalize text-base px-4 py-1">
              {getDisplayPlanName(credits?.subscription_tier, !!credits?.subscription_expires_at)}
            </Badge>
          </div>
        </div>

        <div>
          <p className="text-sm text-zinc-600 mb-2">Credits Balance</p>
          <div className="p-4 bg-gradient-to-r from-zinc-50 to-zinc-100 rounded-lg border border-zinc-200">
            <p className="text-3xl font-bold text-zinc-900">{credits?.balance || 0}</p>
            <p className="text-sm text-zinc-600 mt-1">Available credits</p>
          </div>
        </div>

        {/* Cogent runs usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Sparkles className="w-4 h-4 text-violet-600" />
              Cogent autonomous runs
            </div>
            <span className="text-sm text-zinc-700">
              {cogentUnlimited
                ? `${cogentUsed} used · Unlimited`
                : `${cogentUsed} / ${cogentLimit} this month`}
            </span>
          </div>
          <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${cogentPct}%` }}
            />
          </div>
          {!cogentUnlimited && cogentLimit === 0 && (
            <p className="text-xs text-zinc-500 mt-2">
              Your plan doesn't include Cogent autonomous runs.{' '}
              <button
                onClick={() => navigate('/pricing')}
                className="text-violet-600 hover:underline"
              >
                Upgrade
              </button>{' '}
              to unlock.
            </p>
          )}
        </div>

        {credits?.subscription_expires_at && (
          <div>
            <p className="text-sm text-zinc-600 mb-2">Expires On</p>
            <p className="text-base font-medium text-zinc-900">
              {new Date(credits.subscription_expires_at).toLocaleDateString()}
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-zinc-200">
          <h3 className="font-semibold text-zinc-900 mb-3">Credit Usage</h3>
          <ul className="space-y-2 text-sm text-zinc-600">
            <li>• Canvas action: 5–20 credits</li>
            <li>• Cosmo doc/slide: 20–50 credits</li>
            <li>• Covex workflow: 30–100 credits</li>
            <li>• Cogent full execution: 200–500 credits + 1 run</li>
          </ul>
        </div>

        <Button
          className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
          onClick={() => navigate("/pricing")}
        >
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
};

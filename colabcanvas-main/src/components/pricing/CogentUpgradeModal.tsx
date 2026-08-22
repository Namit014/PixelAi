import { useNavigate } from "react-router-dom";
import { Sparkles, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CogentUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional context-specific message, e.g. "Generate full brand workflow" */
  actionLabel?: string;
  /** Reason for showing — quota exhausted vs. tier doesn't include Cogent */
  reason?: 'no_access' | 'quota_exhausted';
  runsUsed?: number;
  runsLimit?: number;
}

/**
 * Paywall preview shown when a user attempts a Cogent action
 * they cannot run (no plan access or monthly quota exhausted).
 */
export function CogentUpgradeModal({
  open,
  onOpenChange,
  actionLabel,
  reason = 'no_access',
  runsUsed,
  runsLimit,
}: CogentUpgradeModalProps) {
  const navigate = useNavigate();

  const title =
    reason === 'quota_exhausted'
      ? 'Cogent monthly quota reached'
      : 'Cogent is a premium action';

  const description =
    reason === 'quota_exhausted'
      ? `You've used ${runsUsed ?? '?'} of ${runsLimit ?? '?'} autonomous runs this month. Upgrade to unlock more.`
      : 'Cogent runs entire creative workflows for you — strategist, art director, copy and QC working together. Upgrade to Pro to unlock 5 autonomous runs per month.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-zinc-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        {actionLabel && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-zinc-500" />
            {actionLabel}
          </div>
        )}

        <ul className="space-y-2 text-sm text-zinc-700">
          <li>• Pro — 5 autonomous runs/month</li>
          <li>• Business — 25 runs + advanced agent stack</li>
          <li>• Enterprise — unlimited runs (fair use)</li>
        </ul>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button
            className="bg-zinc-900 hover:bg-zinc-800 text-white"
            onClick={() => {
              onOpenChange(false);
              navigate('/pricing');
            }}
          >
            View plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

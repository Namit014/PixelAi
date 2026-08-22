import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: 'no_plan' | 'no_credits' | null;
}

/**
 * Shown when a user tries to run an AI tool but has no active plan and no
 * credits. Two CTAs: upgrade plan or buy a credit top-up.
 */
export function NoCreditsUpgradeModal({ open, onOpenChange, reason }: Props) {
  const navigate = useNavigate();

  const isNoPlan = reason === 'no_plan';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-zinc-200 rounded-2xl">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-zinc-700" />
          </div>
          <DialogTitle className="text-xl font-normal text-zinc-900">
            {isNoPlan ? 'Upgrade to use AI tools' : 'You\u2019re out of credits'}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-600 leading-relaxed">
            {isNoPlan
              ? 'AI generation, Cosmo, Covex and Cogent require a paid plan or credits. Pick a plan or buy credits to keep working.'
              : 'You\u2019ve used all the credits in your current plan. Top up credits or upgrade to a higher tier to continue.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            className="w-full bg-zinc-900 text-white hover:bg-zinc-800"
            onClick={() => {
              onOpenChange(false);
              navigate('/pricing');
            }}
          >
            {isNoPlan ? 'See plans' : 'Upgrade plan'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              navigate('/pricing?topup=1');
            }}
          >
            Buy credits
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

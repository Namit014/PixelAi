import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Wallet, ArrowDown, ArrowUp, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  currentTotal: number;
  currency?: string;
  /** Total amount already paid into escrow (locked + released). */
  paidToDate?: number;
  onUpdated?: () => void;
}

export const AdjustBudgetSheet = ({
  open, onOpenChange, projectId, currentTotal, currency = 'USD',
  paidToDate = 0, onUpdated,
}: Props) => {
  const [target, setTarget] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const amt = Number(target);
  const hasAmt = !!amt && amt >= 1;
  const delta = hasAmt ? amt - currentTotal : 0;
  const isCut = delta < 0;
  const isAdd = delta > 0;

  const { actionKind, actionAmount, helper } = useMemo(() => {
    if (!hasAmt || paidToDate <= 0) {
      return {
        actionKind: 'none' as const,
        actionAmount: 0,
        helper: paidToDate > 0
          ? 'Nothing changes financially yet — you have not paid for this scope.'
          : 'No payment has been taken yet — pricing simply updates.',
      };
    }
    if (amt < paidToDate) {
      return {
        actionKind: 'refund' as const,
        actionAmount: paidToDate - amt,
        helper: `Decrease detected. We'll refund ${currency} ${(paidToDate - amt).toLocaleString()} back to your wallet — withdraw to bank or reuse on another project. You never lose money on a scope cut.`,
      };
    }
    if (amt > paidToDate) {
      return {
        actionKind: 'topup' as const,
        actionAmount: amt - paidToDate,
        helper: `Increase detected. You only pay the difference of ${currency} ${(amt - paidToDate).toLocaleString()} — never the full new total again. Existing escrow stays locked.`,
      };
    }
    return { actionKind: 'none' as const, actionAmount: 0, helper: 'No money movement needed.' };
  }, [hasAmt, amt, paidToDate, currency]);

  const submit = async () => {
    if (!hasAmt) { toast.error('Enter a target amount'); return; }
    setLoading(true);
    try {
      // 1) Re-curate to the new target
      const { error } = await supabase.functions.invoke('talent-recurate', {
        body: { project_id: projectId, target_budget_usd: amt, notes: notes.trim() || undefined },
      });
      if (error) throw error;

      // 2) Settle the financial delta automatically.
      if (actionKind === 'refund') {
        const { error: rErr } = await supabase.functions.invoke('talent-budget-refund', {
          body: { project_id: projectId },
        });
        if (rErr) {
          // Refund being unavailable (e.g. all released) is informational, not fatal.
          toast.message('Plan updated. Some funds were already released and can\'t auto-refund.');
        } else {
          toast.success(`Plan updated. ${currency} ${actionAmount.toLocaleString()} refunded to wallet.`);
        }
      } else if (actionKind === 'topup') {
        const { data: tData, error: tErr } = await supabase.functions.invoke('talent-budget-topup', {
          body: { project_id: projectId },
        });
        if (tErr) throw tErr;
        if ((tData as any)?.needs_topup) {
          toast.message(`Plan updated. Top up ${currency} ${(tData as any).shortfall.toLocaleString()} to lock the new scope.`);
        } else {
          toast.success(`Plan updated. ${currency} ${actionAmount.toLocaleString()} locked in escrow.`);
        }
      } else {
        toast.success('Plan updated.');
      }

      onUpdated?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Adjust amount
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Current total</div>
              <div className="text-lg font-semibold text-zinc-900">
                {currency} {currentTotal.toLocaleString()}
              </div>
            </div>
            <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Paid to date</div>
              <div className="text-lg font-semibold text-zinc-900">
                {currency} {paidToDate.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="target">New target ({currency})</Label>
            <Input
              id="target"
              type="number"
              min={1}
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="e.g. 500"
            />
            <p className="text-[11px] text-zinc-500">
              No floor cap. RUMi will rotate seniorities, trim scope, and explain trade-offs.
            </p>
          </div>

          {hasAmt && (
            <div className={`rounded-xl border p-3 space-y-2 ${
              isCut ? 'border-emerald-200 bg-emerald-50'
              : isAdd ? 'border-amber-200 bg-amber-50'
              : 'border-zinc-200 bg-zinc-50'
            }`}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-700">Difference</span>
                <span className={`font-semibold inline-flex items-center gap-1 ${
                  isCut ? 'text-emerald-700' : isAdd ? 'text-amber-700' : 'text-zinc-700'
                }`}>
                  {isCut && <ArrowDown className="w-3.5 h-3.5" />}
                  {isAdd && <ArrowUp className="w-3.5 h-3.5" />}
                  {delta >= 0 ? '+' : '−'} {currency} {Math.abs(delta).toLocaleString()}
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-zinc-700">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{helper}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Must-haves, deadline shifts, scope to cut…"
            />
          </div>

          <Button
            onClick={submit}
            disabled={loading || !hasAmt}
            className="w-full bg-zinc-900 hover:bg-zinc-800"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Update plan
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

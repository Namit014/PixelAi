import { Coins, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import type { ReferralEarnings as ReferralEarningsType } from '@/hooks/useReferralData';

interface ReferralEarningsProps {
  earnings: ReferralEarningsType | null;
}

export const ReferralEarnings = ({ earnings }: ReferralEarningsProps) => {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6">
      <h3 className="text-lg font-semibold text-zinc-900 mb-5">Earnings Breakdown</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Coins className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-sm text-zinc-700">Total Credits Earned</span>
          </div>
          <span className="font-semibold text-zinc-900">{earnings?.total_credits_earned ?? 0}</span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-violet-600" />
            </div>
            <span className="text-sm text-zinc-700">Total Revenue Share</span>
          </div>
          <span className="font-semibold text-zinc-900">${Number(earnings?.total_revenue_earned ?? 0).toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-sm text-zinc-700">Pending Payout</span>
          </div>
          <span className="font-semibold text-amber-600">${Number(earnings?.pending_payout ?? 0).toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-sm text-zinc-700">Total Paid Out</span>
          </div>
          <span className="font-semibold text-emerald-600">${Number(earnings?.paid_out ?? 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Reward info */}
      <div className="mt-6 p-4 bg-zinc-50 rounded-xl">
        <p className="text-xs font-medium text-zinc-600 mb-2">Reward Structure</p>
        <ul className="text-xs text-zinc-500 space-y-1">
          <li>• <strong>50 credits</strong> when someone signs up with your link</li>
          <li>• <strong>100 credits + 10% revenue share</strong> when they purchase a plan</li>
        </ul>
      </div>
    </div>
  );
};

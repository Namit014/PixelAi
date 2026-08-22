import { Users, ArrowUpRight, Coins, DollarSign } from 'lucide-react';
import type { ReferralEarnings } from '@/hooks/useReferralData';

interface ReferralStatsProps {
  earnings: ReferralEarnings | null;
}

const stats = (e: ReferralEarnings | null) => [
  {
    label: 'Total Referrals',
    value: e?.total_referrals ?? 0,
    icon: Users,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    label: 'Conversions',
    value: e?.successful_conversions ?? 0,
    icon: ArrowUpRight,
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    label: 'Credits Earned',
    value: e?.total_credits_earned ?? 0,
    icon: Coins,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    label: 'Revenue Earned',
    value: `$${Number(e?.total_revenue_earned ?? 0).toFixed(2)}`,
    icon: DollarSign,
    color: 'text-violet-600 bg-violet-50',
  },
];

export const ReferralStats = ({ earnings }: ReferralStatsProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats(earnings).map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="bg-white rounded-2xl border border-zinc-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
            <p className="text-sm text-zinc-500 mt-1">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
};

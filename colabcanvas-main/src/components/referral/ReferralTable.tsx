import { format } from 'date-fns';
import type { Referral } from '@/hooks/useReferralData';

interface ReferralTableProps {
  referrals: Referral[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-zinc-100 text-zinc-600' },
  signed_up: { label: 'Signed Up', className: 'bg-blue-50 text-blue-700' },
  converted: { label: 'Converted', className: 'bg-emerald-50 text-emerald-700' },
};

export const ReferralTable = ({ referrals }: ReferralTableProps) => {
  if (referrals.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center">
        <p className="text-zinc-500">No referrals yet. Share your link to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100">
        <h3 className="text-lg font-semibold text-zinc-900">Your Referrals</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 text-left">
              <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Credits</th>
              <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Revenue Share</th>
              <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {referrals.map((ref) => {
              const status = statusConfig[ref.status] || statusConfig.pending;
              return (
                <tr key={ref.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-zinc-700">
                    {format(new Date(ref.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                    +{ref.credited_amount}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-700">
                    {Number(ref.revenue_share_amount) > 0 ? `$${Number(ref.revenue_share_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-700">
                    {ref.plan_purchased || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

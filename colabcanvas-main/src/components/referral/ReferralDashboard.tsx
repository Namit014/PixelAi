import { ReferralStats } from './ReferralStats';
import { ReferralLinkShare } from './ReferralLinkShare';
import { ReferralTable } from './ReferralTable';
import { ReferralEarnings } from './ReferralEarnings';
import { useReferralData } from '@/hooks/useReferralData';

export const ReferralDashboard = () => {
  const { referralCode, referrals, earnings, isLoading } = useReferralData();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-zinc-100 rounded-2xl h-28" />
          ))}
        </div>
        <div className="bg-zinc-100 rounded-2xl h-48" />
        <div className="bg-zinc-100 rounded-2xl h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReferralStats earnings={earnings} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ReferralLinkShare referralCode={referralCode} />
        </div>
        <ReferralEarnings earnings={earnings} />
      </div>
      <ReferralTable referrals={referrals} />
    </div>
  );
};

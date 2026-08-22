import { ReferralDashboard } from '@/components/referral/ReferralDashboard';

const Referral = () => {
  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Referral Program</h1>
        <p className="text-zinc-500 mt-1">Invite friends, earn credits & revenue share on every conversion.</p>
      </div>
      <ReferralDashboard />
    </div>
  );
};

export default Referral;

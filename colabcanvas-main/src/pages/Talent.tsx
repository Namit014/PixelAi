import { Loader2 } from 'lucide-react';
import { useUserIntent } from '@/hooks/useUserIntent';
import { ClientTalentView } from '@/components/talent/ClientTalentView';
import { FreelancerTalentView } from '@/components/talent/FreelancerTalentView';
import { AgencyTalentView } from '@/components/talent/AgencyTalentView';
import { UndecidedTalentView } from '@/components/talent/UndecidedTalentView';

const Talent = () => {
  const { intent, freelancerProfile, loading, refresh } = useUserIntent();

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (intent === 'client') return <ClientTalentView />;
  if (intent === 'freelancer') return <FreelancerTalentView freelancerProfile={freelancerProfile} />;
  if (intent === 'agency') return <AgencyTalentView />;
  return <UndecidedTalentView onPicked={() => refresh()} />;
};

export default Talent;

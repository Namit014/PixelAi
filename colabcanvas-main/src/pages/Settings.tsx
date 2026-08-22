import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { User, CreditCard, History, Shield, Receipt, TrendingUp, Brain, Gift, Briefcase, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOBILE_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'talent', label: 'Talent', icon: Briefcase },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'credit-history', label: 'Credits', icon: TrendingUp },
  { id: 'payment-history', label: 'Payments', icon: Receipt },
  { id: 'saved-cards', label: 'Cards', icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'activity', label: 'Activity', icon: History },
  { id: 'ai-audit', label: 'AI Audit', icon: Brain },
  { id: 'referral', label: 'Referral', icon: Gift },
];

const MobileSectionTabs = ({ activeSection, onSectionChange }: { activeSection: string; onSectionChange: (s: string) => void }) => (
  <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide">
    {MOBILE_SECTIONS.map((s) => {
      const Icon = s.icon;
      const active = activeSection === s.id;
      return (
        <button
          key={s.id}
          onClick={() => onSectionChange(s.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors',
            active ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-200'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {s.label}
        </button>
      );
    })}
  </div>
);
import { ProfileSection } from '@/components/settings/ProfileSection';
import { SubscriptionSection } from '@/components/settings/SubscriptionSection';
import { CreditHistorySection } from '@/components/settings/CreditHistorySection';
import { PaymentHistorySection } from '@/components/settings/PaymentHistorySection';
import { SavedCardsSection } from '@/components/settings/SavedCardsSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { ActivitySection } from '@/components/settings/ActivitySection';
import { RumiAuditLog } from '@/components/settings/RumiAuditLog';
import { TalentSettingsSection } from '@/components/settings/TalentSettingsSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';

import { ReferralSection } from '@/components/settings/ReferralSection';

const Settings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialSection = searchParams.get('section') || 'profile';
  const [activeSection, setActiveSection] = useState(initialSection);

  useEffect(() => {
    const s = searchParams.get('section');
    if (s && s !== activeSection) setActiveSection(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSearchParams({ section }, { replace: true });
  };
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setUser(session.user);
    try {
      const [profileRes, creditsRes] = await Promise.all([supabase.from('profiles').select('*').eq('id', session.user.id).single(), supabase.from('credits').select('*').eq('user_id', session.user.id).single()]);
      if (profileRes.data) setProfile(profileRes.data);
      if (creditsRes.data) setCredits(creditsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };
  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileSection user={user} profile={profile} onProfileUpdate={loadData} />;
      case "subscription":
        return <SubscriptionSection credits={credits} />;
      case "credit-history":
        return <CreditHistorySection />;
      case "payment-history":
        return <PaymentHistorySection />;
      case "saved-cards":
        return <SavedCardsSection />;
      case "security":
        return <SecuritySection />;
      case "activity":
        return <ActivitySection />;
      case "ai-audit":
        return <RumiAuditLog />;
      case "referral":
        return <ReferralSection />;
      case "talent":
        return <TalentSettingsSection />;
      case "notifications":
        return <NotificationsSection />;
      default:
        return <ProfileSection user={user} profile={profile} onProfileUpdate={loadData} />;
    }
  };
  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>;
  }
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-50">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="gap-2 text-zinc-700 hover:text-zinc-900 text-sm md:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </header>

      <div className="md:flex">
        <div className="hidden md:block">
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
          />
        </div>

        {/* Mobile horizontal section pills */}
        <div className="md:hidden sticky top-[57px] z-40 bg-zinc-50/95 backdrop-blur border-b border-zinc-200">
          <MobileSectionTabs activeSection={activeSection} onSectionChange={handleSectionChange} />
        </div>

        <main className="flex-1 p-4 md:p-8 max-w-4xl pb-32 md:pb-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
export default Settings;
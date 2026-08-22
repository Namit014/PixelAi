import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowRight, Shield, Star, Clock, Zap, Users, Lock } from 'lucide-react';
import { FreelancerFlow } from '@/components/onboarding/FreelancerFlow';
import { AgencyFlow } from '@/components/onboarding/AgencyFlow';
import { useUserIntent, type IntentValue } from '@/hooks/useUserIntent';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import FeatureIcon1 from '@/assets/icons/companion-feature-1.svg?react';
import FeatureIcon2 from '@/assets/icons/companion-feature-2.svg?react';
import FeatureIcon3 from '@/assets/icons/companion-feature-3.svg?react';


interface Props {
  onPicked?: (intent: IntentValue) => void;
}

const TRUST_CHIPS = [
  { icon: Shield, label: 'Top 1% vetted talent' },
  { icon: Star, label: '4.9 Avg. Performance' },
  { icon: Clock, label: '99% On-time delivery' },
  { icon: Zap, label: 'Same Day Proposal' },
  { icon: Users, label: 'Vetted Companions only' },
  { icon: Lock, label: 'Escrow Protected' },
];

// Decorative purple sparkle
const Sparkle = ({ className = '', size = 14 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2L13.5 9.5L21 11L13.5 12.5L12 20L10.5 12.5L3 11L10.5 9.5L12 2Z" fill="currentColor" />
  </svg>
);

const FeatureIcon = ({ d, className }: { d: 'sparkle' | 'crown' | 'wave'; className?: string }) => {
  if (d === 'sparkle')
    return (
      <svg viewBox="0 0 32 32" className={className} fill="none">
        <path d="M16 3v8M16 21v8M3 16h8M21 16h8M7 7l5 5M20 20l5 5M25 7l-5 5M12 20l-5 5"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  if (d === 'crown')
    return (
      <svg viewBox="0 0 32 32" className={className} fill="none">
        <path d="M4 22l3-12 5 6 4-10 4 10 5-6 3 12H4z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="6" cy="8" r="1.5" fill="currentColor" />
        <circle cx="16" cy="4" r="1.5" fill="currentColor" />
        <circle cx="26" cy="8" r="1.5" fill="currentColor" />
      </svg>
    );
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <path d="M3 20c2-6 4-6 6 0s4 6 6 0 4-6 6 0 4 6 6 0 2-6 2-6"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const UndecidedTalentView = ({ onPicked }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setIntent, refresh } = useUserIntent();
  const [busy, setBusy] = useState(false);
  const [openApply, setOpenApply] = useState(false);
  const [openAgency, setOpenAgency] = useState(false);

  const startProject = async () => {
    setBusy(true);
    try {
      await setIntent('client').catch(() => {});
      onPicked?.('client');
      navigate('/talent/new');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not continue');
    } finally {
      setBusy(false);
    }
  };

  return (

    <div className="relative container mx-auto px-6 py-16">
      {/* Decorative sparkles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Sparkle className="absolute top-[80px] left-[18%] text-purple-500" size={16} />
        <Sparkle className="absolute top-[60px] left-[32%] text-purple-400" size={20} />
        <Sparkle className="absolute top-[100px] right-[28%] text-purple-500" size={14} />
        <Sparkle className="absolute top-[40px] right-[14%] text-purple-400" size={18} />
        <Sparkle className="absolute top-[200px] right-[8%] text-purple-500" size={22} />
        <Sparkle className="absolute top-[180px] left-[8%] text-purple-300" size={12} />
        <Sparkle className="absolute top-[280px] left-[24%] text-purple-400" size={14} />
        <Sparkle className="absolute top-[260px] right-[24%] text-purple-300" size={10} />
        <Sparkle className="absolute top-[320px] left-[42%] text-purple-400" size={12} />
        <Sparkle className="absolute top-[440px] right-[6%] text-purple-300" size={14} />
      </div>

      {/* Hero */}
      <div className="relative text-center mb-10">
        <div className="text-base text-zinc-700 mb-2">Introducing</div>
        <h1 className="text-5xl md:text-6xl font-normal tracking-tight">
          <span
            className="bg-clip-text text-transparent animate-gradient-shift"
            style={{
              backgroundImage: 'linear-gradient(90deg, #7D22FF, #FF8870, #FFDEDE, #C196FF, #7D22FF)',
              backgroundSize: '200% 200%',
            }}
          >
            Colab Companion
          </span>
        </h1>
        <p className="text-zinc-500 mt-5 max-w-xl mx-auto text-sm leading-relaxed">
          Hand off any canvas, brand kit or presentation to vetted colab companions. They polish, refine and ship while you keep working in the AI.
        </p>
      </div>

      {/* Trust chips */}
      <div className="relative flex flex-wrap items-center justify-center gap-2.5 mb-12 max-w-3xl mx-auto">
        {TRUST_CHIPS.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-zinc-200 text-xs text-zinc-600 bg-white"
            >
              <Icon className="w-3.5 h-3.5 text-zinc-500" />
              {c.label}
            </div>
          );
        })}
      </div>

      {/* Feature cards */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-zinc-50 rounded-2xl p-7">
          <FeatureIcon1 className="w-12 h-12 mb-6" />
          <h3 className="font-medium text-zinc-900 text-lg leading-snug mb-3">Power your big ideas</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            For ambitious projects — product launches, brand campaigns, web experiences, and more.
          </p>
        </div>
        <div className="bg-zinc-50 rounded-2xl p-7">
          <FeatureIcon2 className="w-12 h-12 mb-6" />
          <h3 className="font-medium text-zinc-900 text-lg leading-snug mb-3">Work with curated top teams</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Access elite designers, art directors, copywriters, and strategists assembled specifically for your project needs.
          </p>
        </div>
        <div className="bg-zinc-50 rounded-2xl p-7">
          <FeatureIcon3 className="w-12 h-12 mb-6" />
          <h3 className="font-medium text-zinc-900 text-lg leading-snug mb-3">Managed from start to finish</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            We handle project flow, timelines, revisions, and quality — you focus on your vision.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="relative text-center">
        <Button
          onClick={startProject}
          disabled={busy}
          className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full h-11 px-7 text-sm"
        >
          {busy ? 'Loading…' : (
            <>Start a project <ArrowRight className="ml-2 w-4 h-4" /></>
          )}
        </Button>

        <div className="mt-8 text-sm text-zinc-500 space-y-2">
          <div>
            Are you a companion?{' '}
            <button onClick={() => setOpenApply(true)} className="text-zinc-900 font-medium underline underline-offset-4 hover:text-zinc-700">
              Join as freelancer
            </button>
          </div>
          <div>
            Run a studio?{' '}
            <button onClick={() => setOpenAgency(true)} className="text-zinc-900 font-medium underline underline-offset-4 hover:text-zinc-700">
              Join as agency
            </button>
          </div>
        </div>
      </div>

      <Dialog open={openApply} onOpenChange={setOpenApply}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply to join as a Colab Companion</DialogTitle>
          </DialogHeader>
          {user && (
            <FreelancerFlow
              userId={user.id}
              onComplete={async () => {
                await setIntent('freelancer').catch(() => {});
                await refresh();
                setOpenApply(false);
                toast.success("Application submitted — we'll review within 48 hours.");
              }}
              onSkipToApp={async () => {
                setOpenApply(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openAgency} onOpenChange={setOpenAgency}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply to join as an Agency</DialogTitle>
          </DialogHeader>
          {user && (
            <AgencyFlow
              userId={user.id}
              onComplete={async () => {
                await setIntent('agency').catch(() => {});
                await refresh();
                setOpenAgency(false);
                toast.success("Application submitted — we'll review within 48 hours.");
              }}
              onSkipToApp={async () => { setOpenAgency(false); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

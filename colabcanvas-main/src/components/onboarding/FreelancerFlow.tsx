import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FreelancerFlowProps {
  userId: string;
  onComplete: () => Promise<void>;
  onSkipToApp: () => Promise<void>;
}

const DOMAINS = ['Brand Design', 'UI/UX', 'Illustration', 'Motion', 'Video', '3D', 'Copywriting', 'Web Dev', 'Photography'];
const LEVELS = ['Junior (0-2 yrs)', 'Mid (3-5 yrs)', 'Senior (6-10 yrs)', 'Lead (10+ yrs)'];
const TOOLS = ['Figma', 'Photoshop', 'Illustrator', 'After Effects', 'Blender', 'Webflow', 'Framer', 'Cinema 4D', 'Premiere', 'Notion'];
const AVAILABILITY = ['Full-time (40h/wk)', 'Part-time (20h/wk)', 'Project-based', 'Limited availability'];

export const FreelancerFlow = ({ userId, onComplete, onSkipToApp }: FreelancerFlowProps) => {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [domains, setDomains] = useState<string[]>([]);
  const [level, setLevel] = useState('');
  const [tools, setTools] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState('');
  const [availability, setAvailability] = useState('');
  const [evalCase, setEvalCase] = useState('');

  const toggle = (arr: string[], v: string, setter: (s: string[]) => void) =>
    setter(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const submit = async (skipEval = false) => {
    setBusy(true);
    try {
      const { error: fpErr } = await supabase.from('freelancer_profiles').upsert({
        user_id: userId,
        domain: domains,
        role_level: level,
        tools,
        portfolio_urls: portfolio.split(/\s+/).map(s => s.trim()).filter(Boolean),
        availability,
        vetting_status: skipEval ? 'pending' : 'in_review',
        evaluation_submission: skipEval ? {} : { case: evalCase, submitted_at: new Date().toISOString() },
      }, { onConflict: 'user_id' });
      if (fpErr) throw fpErr;

      const { error: pErr } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);
      if (pErr) throw pErr;

      try {
        sessionStorage.removeItem('onboarding_status');
        sessionStorage.removeItem('onboarding_status_timestamp');
      } catch {}
      await supabase.auth.refreshSession();
      toast.success(skipEval ? "Saved. Complete your evaluation any time from Settings." : "Submitted for review. We'll be in touch within 48 hours.");
      await onComplete();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save your profile');
    } finally {
      setBusy(false);
    }
  };

  const Skip = () => (
    <Button variant="ghost" disabled={busy} onClick={onSkipToApp} className="text-zinc-500 hover:text-zinc-900">
      Skip — finish later
    </Button>
  );

  const Header = ({ title, sub }: { title: string; sub: string }) => (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
      <p className="text-sm text-zinc-600 mt-1">{sub}</p>
    </div>
  );

  const ChipGrid = ({ values, selected, onToggle }: { values: string[]; selected: string[]; onToggle: (v: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      {values.map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onToggle(v)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm border transition-all",
            selected.includes(v)
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-900"
          )}
        >
          {selected.includes(v) && <Check className="inline w-3 h-3 mr-1" />}
          {v}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-500">Step {step} of 5</div>
        <Skip />
      </div>

      {step === 1 && (
        <>
          <Header title="What's your craft?" sub="Pick everything you'd take on." />
          <ChipGrid values={DOMAINS} selected={domains} onToggle={(v) => toggle(domains, v, setDomains)} />
          <Button onClick={() => setStep(2)} disabled={domains.length === 0} className="w-full">
            Continue <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          <Header title="What's your level?" sub="Be honest — it helps us match you well." />
          <div className="space-y-2">
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border text-sm transition-all",
                  level === l ? "bg-zinc-900 text-white border-zinc-900" : "bg-white border-zinc-300 hover:border-zinc-900"
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1"><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
            <Button onClick={() => setStep(3)} disabled={!level} className="flex-1">Continue <ChevronRight className="ml-2 w-4 h-4" /></Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Header title="Your toolkit" sub="Tools you use comfortably." />
          <ChipGrid values={TOOLS} selected={tools} onToggle={(v) => toggle(tools, v, setTools)} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1"><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
            <Button onClick={() => setStep(4)} disabled={tools.length === 0} className="flex-1">Continue <ChevronRight className="ml-2 w-4 h-4" /></Button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <Header title="Portfolio + availability" sub="Links to your best work, and how much time you have." />
          <div className="space-y-3">
            <div>
              <Label className="text-zinc-700">Portfolio links (one per line)</Label>
              <Textarea value={portfolio} onChange={e => setPortfolio(e.target.value)} placeholder="https://yourwebsite.com&#10;https://dribbble.com/you" rows={3} />
            </div>
            <div>
              <Label className="text-zinc-700">Availability</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {AVAILABILITY.map(a => (
                  <button
                    key={a}
                    onClick={() => setAvailability(a)}
                    className={cn(
                      "p-2 rounded-lg border text-xs transition-all",
                      availability === a ? "bg-zinc-900 text-white border-zinc-900" : "bg-white border-zinc-300 hover:border-zinc-900"
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)} className="flex-1"><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
            <Button onClick={() => setStep(5)} disabled={!availability || !portfolio.trim()} className="flex-1">Continue <ChevronRight className="ml-2 w-4 h-4" /></Button>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <Header title="Quick evaluation" sub="Tell us about a project you're proud of — what you did, and what made it good." />
          <Textarea value={evalCase} onChange={e => setEvalCase(e.target.value)} rows={6} placeholder="Project name, your role, what made it succeed, and one tough decision you made..." />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(4)} className="flex-1" disabled={busy}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
            <Button variant="outline" onClick={() => submit(true)} disabled={busy} className="flex-1">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit later'}
            </Button>
            <Button onClick={() => submit(false)} disabled={busy || evalCase.trim().length < 30} className="flex-1">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for review'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgencyFlowProps {
  userId: string;
  onComplete: () => Promise<void>;
  onSkipToApp: () => Promise<void>;
}

const DOMAINS = ['Brand Design', 'UI/UX', 'Illustration', 'Motion', 'Video', '3D', 'Copywriting', 'Web Dev', 'Photography', 'Strategy'];
const TOOLS = ['Figma', 'Photoshop', 'Illustrator', 'After Effects', 'Blender', 'Webflow', 'Framer', 'Cinema 4D', 'Premiere', 'Notion'];
const TEAM_SIZES = ['2–5', '6–15', '16–50', '50+'];

export const AgencyFlow = ({ userId, onComplete, onSkipToApp }: AgencyFlowProps) => {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [agencyName, setAgencyName] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [minEngagement, setMinEngagement] = useState('');
  const [pitch, setPitch] = useState('');

  const toggle = (arr: string[], v: string, setter: (s: string[]) => void) =>
    setter(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const submit = async (skipReview = false) => {
    if (!agencyName.trim()) { toast.error('Agency name required'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('agency_profiles').upsert({
        user_id: userId,
        agency_name: agencyName.trim(),
        website_url: website || null,
        country: country || null,
        team_size: teamSize ? parseInt(teamSize.split(/[–\-+]/)[0], 10) : null,
        domains,
        tools,
        hourly_blended_rate: hourlyRate ? Number(hourlyRate) : null,
        min_engagement_usd: minEngagement ? parseInt(minEngagement, 10) : null,
        case_studies: pitch ? [{ pitch }] : [],
        vetting_status: 'pending',
        completion_state: skipReview ? 'partial' : 'complete',
      } as any, { onConflict: 'user_id' });
      if (error) throw error;

      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId);

      try {
        sessionStorage.removeItem('onboarding_status');
        sessionStorage.removeItem('onboarding_status_timestamp');
      } catch {}
      await supabase.auth.refreshSession();

      toast.success(skipReview ? 'Saved. Finish later from Settings.' : 'Submitted for review. We respond within 48 hours.');
      await onComplete();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save your agency');
    } finally {
      setBusy(false);
    }
  };

  const Header = ({ title, sub }: { title: string; sub: string }) => (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
      <p className="text-sm text-zinc-600 mt-1">{sub}</p>
    </div>
  );

  const Skip = () => (
    <Button variant="ghost" disabled={busy} onClick={onSkipToApp} className="text-zinc-500 hover:text-zinc-900">
      Skip — finish later
    </Button>
  );

  return (
    <div className="space-y-6 py-2">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={cn('h-1.5 w-10 rounded-full', s <= step ? 'bg-zinc-900' : 'bg-zinc-200')} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <Header title="Your agency" sub="Tell us who you are" />
          <div><Label>Agency name *</Label><Input value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder="Studio Acme" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Website</Label><Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" /></div>
            <div><Label>Country</Label><Input value={country} onChange={e => setCountry(e.target.value)} placeholder="US" /></div>
          </div>
          <div>
            <Label>Team size</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {TEAM_SIZES.map(t => (
                <button key={t} onClick={() => setTeamSize(t)} className={cn('px-3 py-1.5 rounded-full text-xs border', teamSize === t ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-300 hover:border-zinc-900')}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Header title="What you do" sub="Pick all that apply" />
          <div>
            <Label>Domains</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DOMAINS.map(d => (
                <button key={d} onClick={() => toggle(domains, d, setDomains)} className={cn('px-3 py-1.5 rounded-full text-xs border', domains.includes(d) ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-300 hover:border-zinc-900')}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Tools</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {TOOLS.map(t => (
                <button key={t} onClick={() => toggle(tools, t, setTools)} className={cn('px-3 py-1.5 rounded-full text-xs border', tools.includes(t) ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-300 hover:border-zinc-900')}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Header title="Pricing" sub="Help us match you to the right briefs" />
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Blended hourly rate (USD)</Label><Input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="120" /></div>
            <div><Label>Minimum engagement (USD)</Label><Input type="number" value={minEngagement} onChange={e => setMinEngagement(e.target.value)} placeholder="5000" /></div>
          </div>
          <div>
            <Label>Pitch (optional)</Label>
            <Textarea value={pitch} onChange={e => setPitch(e.target.value)} placeholder="Tell us about your studio, signature work, and the kind of projects you love…" rows={5} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 text-center">
          <Header title="Submit for review" sub="We respond within 48 hours" />
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-left text-sm space-y-1">
            <div><span className="text-zinc-500">Agency:</span> {agencyName || '—'}</div>
            <div><span className="text-zinc-500">Domains:</span> {domains.join(', ') || '—'}</div>
            <div><span className="text-zinc-500">Tools:</span> {tools.join(', ') || '—'}</div>
            <div><span className="text-zinc-500">Rate:</span> {hourlyRate ? `$${hourlyRate}/h blended` : '—'}</div>
            <div><span className="text-zinc-500">Min:</span> {minEngagement ? `$${minEngagement}` : '—'}</div>
          </div>
          <Button onClick={() => submit(false)} disabled={busy} className="w-full bg-zinc-900 hover:bg-zinc-800">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Submit application'}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1 || busy} className="text-zinc-600">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Skip />
        {step < 4 && (
          <Button onClick={() => setStep(step + 1)} disabled={busy} className="bg-zinc-900 hover:bg-zinc-800">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

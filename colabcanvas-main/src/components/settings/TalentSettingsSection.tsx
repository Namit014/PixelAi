import { useEffect, useState } from 'react';
import { useUserIntent, type IntentValue } from '@/hooks/useUserIntent';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Briefcase, CheckCircle2, AlertCircle, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const COMPANY_TYPES = ['Startup', 'Agency', 'Brand', 'Solo founder', 'Enterprise'];
const STAGES = ['Idea', 'Pre-launch', 'Early traction', 'Scaling', 'Mature'];
const NEEDS = ['Branding', 'Web design', 'Social content', 'Video', 'Product design', 'Motion', 'Copywriting'];
const BUDGETS = ['Under $2k', '$2k–$10k', '$10k–$50k', '$50k+'];

const DOMAINS = ['Brand Design', 'UI/UX', 'Illustration', 'Motion', 'Video', '3D', 'Copywriting', 'Web Dev', 'Photography'];
const LEVELS = ['Junior (0-2 yrs)', 'Mid (3-5 yrs)', 'Senior (6-10 yrs)', 'Lead (10+ yrs)'];
const TOOLS = ['Figma', 'Photoshop', 'Illustrator', 'After Effects', 'Blender', 'Webflow', 'Framer', 'Cinema 4D', 'Premiere', 'Notion'];
const AVAILABILITY = ['Full-time (40h/wk)', 'Part-time (20h/wk)', 'Project-based', 'Limited availability'];
const AGENCY_AVAILABILITY = ['Available', 'Limited', 'Booked'];

const Chip = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-3 py-1.5 rounded-full text-sm border transition-all',
      active ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-900',
    )}
  >
    {children}
  </button>
);

export const TalentSettingsSection = () => {
  const { user } = useAuth();
  const { intent, clientProfile, freelancerProfile, agencyProfile, loading, refresh, setIntent } = useUserIntent();
  const [savingIntent, setSavingIntent] = useState<IntentValue | null>(null);

  // Client form state
  const [companyType, setCompanyType] = useState('');
  const [stage, setStage] = useState('');
  const [industry, setIndustry] = useState('');
  const [needs, setNeeds] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  // Freelancer form state
  const [domains, setDomains] = useState<string[]>([]);
  const [level, setLevel] = useState('');
  const [tools, setTools] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState('');
  const [availability, setAvailability] = useState('');
  const [evalCase, setEvalCase] = useState('');
  const [savingFreelancer, setSavingFreelancer] = useState(false);

  // Agency form state
  const [agencyName, setAgencyName] = useState('');
  const [teamSize, setTeamSize] = useState<string>('');
  const [aDomains, setADomains] = useState<string[]>([]);
  const [aTools, setATools] = useState<string[]>([]);
  const [aAvailability, setAAvailability] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [minEngagement, setMinEngagement] = useState<string>('');
  const [caseStudies, setCaseStudies] = useState('');
  const [savingAgency, setSavingAgency] = useState(false);

  useEffect(() => {
    const c = clientProfile.data;
    if (c) {
      setCompanyType(c.company_type ?? '');
      setStage(c.stage ?? '');
      setIndustry(c.industry ?? '');
      setNeeds(c.typical_needs ?? []);
      setBudget(c.budget_range ?? '');
    }
    const f = freelancerProfile.data;
    if (f) {
      setDomains(f.domain ?? []);
      setLevel(f.role_level ?? '');
      setTools(f.tools ?? []);
      setPortfolio((f.portfolio_urls ?? []).join('\n'));
      setAvailability(f.availability ?? '');
      setEvalCase(f.evaluation_submission?.case ?? '');
    }
    const a: any = (agencyProfile as any)?.data;
    if (a) {
      setAgencyName(a.agency_name ?? '');
      setTeamSize(a.team_size != null ? String(a.team_size) : '');
      setADomains(a.domains ?? []);
      setATools(a.tools ?? []);
      setAAvailability(a.availability ? a.availability.charAt(0).toUpperCase() + a.availability.slice(1) : '');
      setWebsiteUrl(a.website_url ?? '');
      setCountry(a.country ?? '');
      setCurrency(a.currency ?? 'USD');
      setHourlyRate(a.hourly_blended_rate != null ? String(a.hourly_blended_rate) : '');
      setMinEngagement(a.min_engagement_usd != null ? String(a.min_engagement_usd) : '');
      const cs = Array.isArray(a.case_studies) ? a.case_studies : [];
      setCaseStudies(cs.map((c: any) => (c.title ? `${c.title} | ${c.url ?? ''}` : c.url ?? '')).join('\n'));
    }
  }, [clientProfile.data, freelancerProfile.data, agencyProfile?.data]);

  const toggle = (arr: string[], v: string, setter: (s: string[]) => void) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const switchIntent = async (value: IntentValue) => {
    if (value === intent) return;
    setSavingIntent(value);
    try {
      await setIntent(value);
      toast.success(value === 'undecided' ? 'Reset — you can choose again any time.' : `Switched to ${value} mode.`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not update');
    } finally {
      setSavingIntent(null);
    }
  };

  const saveClientProfile = async () => {
    if (!user?.id) return;
    setSavingClient(true);
    try {
      const completion: 'pending' | 'partial' | 'complete' =
        companyType && stage && industry && needs.length > 0 && budget ? 'complete' : 'partial';
      const { error } = await supabase.from('client_profiles').upsert(
        {
          user_id: user.id,
          company_type: companyType || null,
          stage: stage || null,
          industry: industry || null,
          typical_needs: needs,
          budget_range: budget || null,
          completion_state: completion,
        },
        { onConflict: 'user_id' },
      );
      if (error) throw error;
      // Mark intent complete if not already
      if (intent !== 'client') await setIntent('client');
      toast.success(completion === 'complete' ? 'Client profile saved' : 'Saved — finish remaining fields any time');
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save');
    } finally {
      setSavingClient(false);
    }
  };

  const saveFreelancerProfile = async (submitForReview: boolean) => {
    if (!user?.id) return;
    setSavingFreelancer(true);
    try {
      const portfolioUrls = portfolio
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const baseComplete =
        domains.length > 0 && level && tools.length > 0 && portfolioUrls.length > 0 && availability;
      const completion: 'pending' | 'partial' | 'complete' = baseComplete && evalCase.trim().length >= 30 ? 'complete' : 'partial';

      const { error } = await supabase.from('freelancer_profiles').upsert(
        {
          user_id: user.id,
          domain: domains,
          role_level: level || null,
          tools,
          portfolio_urls: portfolioUrls,
          availability: availability || null,
          completion_state: completion,
          vetting_status:
            submitForReview && completion === 'complete'
              ? 'in_review'
              : freelancerProfile.vetting_status === 'approved'
              ? 'approved'
              : completion === 'complete'
              ? 'in_review'
              : 'pending',
          evaluation_submission: evalCase
            ? { case: evalCase, submitted_at: new Date().toISOString() }
            : freelancerProfile.data?.evaluation_submission ?? {},
        },
        { onConflict: 'user_id' },
      );
      if (error) throw error;
      if (intent !== 'freelancer') await setIntent('freelancer');
      toast.success(submitForReview ? 'Submitted for review' : 'Saved');
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save');
    } finally {
      setSavingFreelancer(false);
    }
  };

  const saveAgencyProfile = async (submitForReview: boolean) => {
    if (!user?.id) return;
    if (submitForReview && !agencyName.trim()) {
      toast.error('Agency name is required');
      return;
    }
    setSavingAgency(true);
    try {
      const cs = caseStudies
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const [t, u] = line.split('|').map((s) => s.trim());
          return u ? { title: t, url: u } : { title: '', url: t };
        });

      const baseComplete =
        !!agencyName.trim() &&
        aDomains.length > 0 &&
        aTools.length > 0 &&
        !!aAvailability &&
        !!websiteUrl.trim() &&
        !!country.trim();
      const completion: 'pending' | 'partial' | 'complete' = baseComplete ? 'complete' : 'partial';

      const currentVetting = (agencyProfile as any)?.vetting_status ?? 'pending';
      const nextVetting =
        submitForReview && completion === 'complete'
          ? 'pending'
          : currentVetting === 'approved'
          ? 'approved'
          : 'pending';

      const { error } = await supabase.from('agency_profiles').upsert(
        {
          user_id: user.id,
          agency_name: agencyName.trim(),
          team_size: teamSize ? parseInt(teamSize, 10) || null : null,
          domains: aDomains,
          tools: aTools,
          availability: aAvailability ? aAvailability.toLowerCase() : 'available',
          website_url: websiteUrl || null,
          country: country || null,
          currency: currency || 'USD',
          hourly_blended_rate: hourlyRate ? Number(hourlyRate) || null : null,
          min_engagement_usd: minEngagement ? parseInt(minEngagement, 10) || null : null,
          case_studies: cs,
          completion_state: completion,
          vetting_status: nextVetting,
        },
        { onConflict: 'user_id' },
      );
      if (error) throw error;
      if (intent !== 'agency') await setIntent('agency');
      toast.success(submitForReview ? 'Submitted for review' : 'Saved');
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save');
    } finally {
      setSavingAgency(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-12 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </Card>
    );
  }

  const intentLabel =
    intent === 'client'
      ? 'Client · Hiring'
      : intent === 'freelancer'
      ? 'Freelancer · Available for work'
      : intent === 'agency'
      ? 'Agency · Studio'
      : 'Not set';

  return (
    <div className="space-y-6">
      {/* Header / intent picker */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Talent setup</h2>
            <p className="text-sm text-zinc-600 mt-1">
              Choose how you want to use Talent. Switch any time.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">{intentLabel}</Badge>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-5">
          <Button
            variant={intent === 'client' ? 'default' : 'outline'}
            disabled={savingIntent !== null}
            onClick={() => switchIntent('client')}
            className={cn(intent === 'client' ? 'bg-zinc-900 hover:bg-zinc-800' : '', 'justify-start h-auto py-3')}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            <span className="text-left">
              <div className="text-sm font-medium">Hire talent</div>
              <div className="text-[11px] opacity-70">AI-assembled team</div>
            </span>
          </Button>
          <Button
            variant={intent === 'freelancer' ? 'default' : 'outline'}
            disabled={savingIntent !== null}
            onClick={() => switchIntent('freelancer')}
            className={cn(intent === 'freelancer' ? 'bg-zinc-900 hover:bg-zinc-800' : '', 'justify-start h-auto py-3')}
          >
            <Briefcase className="w-4 h-4 mr-2" />
            <span className="text-left">
              <div className="text-sm font-medium">Join as creative</div>
              <div className="text-[11px] opacity-70">Receive matched briefs</div>
            </span>
          </Button>
          <Button
            variant={intent === 'agency' ? 'default' : 'outline'}
            disabled={savingIntent !== null}
            onClick={() => switchIntent('agency')}
            className={cn(intent === 'agency' ? 'bg-zinc-900 hover:bg-zinc-800' : '', 'justify-start h-auto py-3')}
          >
            <Building className="w-4 h-4 mr-2" />
            <span className="text-left">
              <div className="text-sm font-medium">Run a studio</div>
              <div className="text-[11px] opacity-70">Receive matched briefs as a team</div>
            </span>
          </Button>
          <Button
            variant={intent === 'undecided' ? 'default' : 'outline'}
            disabled={savingIntent !== null}
            onClick={() => switchIntent('undecided')}
            className={cn(intent === 'undecided' ? 'bg-zinc-900 hover:bg-zinc-800' : '', 'justify-start h-auto py-3')}
          >
            <span className="text-left">
              <div className="text-sm font-medium">Just exploring</div>
              <div className="text-[11px] opacity-70">Decide later</div>
            </span>
          </Button>
        </div>
      </Card>

      {/* Client profile setup */}
      {(intent === 'client' || intent === 'undecided') && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zinc-700" />
            <h3 className="font-semibold text-zinc-900">Client profile</h3>
            {clientProfile.completion_state === 'complete' ? (
              <Badge variant="outline" className="ml-auto text-emerald-700 border-emerald-200 bg-emerald-50 text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-auto text-amber-700 border-amber-200 bg-amber-50 text-[10px]">
                <AlertCircle className="w-3 h-3 mr-1" /> {clientProfile.exists ? 'Partial' : 'Not started'}
              </Badge>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-700">Company type</Label>
              <div className="flex flex-wrap gap-2">
                {COMPANY_TYPES.map((t) => (
                  <Chip key={t} active={companyType === t} onClick={() => setCompanyType(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-700">Stage</Label>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((t) => (
                  <Chip key={t} active={stage === t} onClick={() => setStage(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-700">Industry</Label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Fintech, Fashion, SaaS" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-700">Budget comfort range</Label>
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((t) => (
                  <Chip key={t} active={budget === t} onClick={() => setBudget(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-700">Typical needs</Label>
            <div className="flex flex-wrap gap-2">
              {NEEDS.map((n) => (
                <Chip key={n} active={needs.includes(n)} onClick={() => toggle(needs, n, setNeeds)}>
                  {n}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveClientProfile} disabled={savingClient} className="bg-zinc-900 hover:bg-zinc-800">
              {savingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save client profile'}
            </Button>
          </div>
        </Card>
      )}

      {/* Freelancer profile setup */}
      {(intent === 'freelancer' || intent === 'undecided') && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-zinc-700" />
            <h3 className="font-semibold text-zinc-900">Freelancer profile</h3>
            <Badge
              variant="outline"
              className={cn(
                'ml-auto text-[10px]',
                freelancerProfile.vetting_status === 'approved'
                  ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                  : freelancerProfile.vetting_status === 'in_review'
                  ? 'text-amber-700 border-amber-200 bg-amber-50'
                  : 'text-zinc-700 border-zinc-200 bg-zinc-50',
              )}
            >
              {freelancerProfile.vetting_status === 'approved'
                ? 'Approved'
                : freelancerProfile.vetting_status === 'in_review'
                ? 'In review'
                : 'Not submitted'}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-700">Craft</Label>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map((d) => (
                <Chip key={d} active={domains.includes(d)} onClick={() => toggle(domains, d, setDomains)}>
                  {d}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-700">Level</Label>
              <div className="flex flex-col gap-2">
                {LEVELS.map((l) => (
                  <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
                    {l}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-700">Availability</Label>
              <div className="flex flex-col gap-2">
                {AVAILABILITY.map((a) => (
                  <Chip key={a} active={availability === a} onClick={() => setAvailability(a)}>
                    {a}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-700">Toolkit</Label>
            <div className="flex flex-wrap gap-2">
              {TOOLS.map((t) => (
                <Chip key={t} active={tools.includes(t)} onClick={() => toggle(tools, t, setTools)}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-700">Portfolio links (one per line)</Label>
            <Textarea
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              rows={3}
              placeholder={`https://yourwebsite.com\nhttps://dribbble.com/you`}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-700">Quick evaluation</Label>
            <Textarea
              value={evalCase}
              onChange={(e) => setEvalCase(e.target.value)}
              rows={5}
              placeholder="Project name, your role, what made it succeed, and one tough decision you made…"
            />
            <p className="text-[11px] text-zinc-500">Min 30 characters required to submit for review.</p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => saveFreelancerProfile(false)} disabled={savingFreelancer}>
              {savingFreelancer ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save draft'}
            </Button>
            <Button
              className="bg-zinc-900 hover:bg-zinc-800"
              onClick={() => saveFreelancerProfile(true)}
              disabled={savingFreelancer || domains.length === 0 || !level || tools.length === 0 || !availability || evalCase.trim().length < 30}
            >
              {savingFreelancer ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for review'}
            </Button>
          </div>
        </Card>
      )}

      {/* Agency profile setup */}
      {(intent === 'agency' || intent === 'undecided') && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-zinc-700" />
            <h3 className="font-semibold text-zinc-900">Agency profile</h3>
            <Badge
              variant="outline"
              className={cn(
                'ml-auto text-[10px]',
                (agencyProfile as any)?.vetting_status === 'approved'
                  ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                  : (agencyProfile as any)?.vetting_status === 'rejected'
                  ? 'text-red-700 border-red-200 bg-red-50'
                  : (agencyProfile as any)?.completion_state === 'complete'
                  ? 'text-amber-700 border-amber-200 bg-amber-50'
                  : 'text-zinc-700 border-zinc-200 bg-zinc-50',
              )}
            >
              {(agencyProfile as any)?.vetting_status === 'approved'
                ? 'Approved'
                : (agencyProfile as any)?.vetting_status === 'rejected'
                ? 'Not approved'
                : (agencyProfile as any)?.completion_state === 'complete'
                ? 'In review'
                : (agencyProfile as any)?.exists
                ? 'Partial'
                : 'Not started'}
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-700">Agency name *</Label>
              <Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Studio name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-700">Team size</Label>
              <Input
                type="number"
                min={1}
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                placeholder="e.g. 8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-700">Specialties</Label>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map((d) => (
                <Chip key={d} active={aDomains.includes(d)} onClick={() => toggle(aDomains, d, setADomains)}>
                  {d}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-700">Toolkit</Label>
            <div className="flex flex-wrap gap-2">
              {TOOLS.map((t) => (
                <Chip key={t} active={aTools.includes(t)} onClick={() => toggle(aTools, t, setATools)}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-700">Availability</Label>
              <div className="flex flex-wrap gap-2">
                {AGENCY_AVAILABILITY.map((a) => (
                  <Chip key={a} active={aAvailability === a} onClick={() => setAAvailability(a)}>
                    {a}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-700">Website</Label>
              <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourstudio.com" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-700">Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. India, USA" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-700">Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} placeholder="USD" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-700">Blended hourly rate</Label>
              <Input
                type="number"
                min={0}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="120"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-700">Minimum engagement (USD)</Label>
            <Input
              type="number"
              min={0}
              value={minEngagement}
              onChange={(e) => setMinEngagement(e.target.value)}
              placeholder="5000"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-700">Case studies (one per line: <span className="font-mono">Title | https://link</span>)</Label>
            <Textarea
              value={caseStudies}
              onChange={(e) => setCaseStudies(e.target.value)}
              rows={4}
              placeholder={`Acme rebrand | https://yourstudio.com/work/acme\nFintech app launch | https://yourstudio.com/work/fintech`}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => saveAgencyProfile(false)} disabled={savingAgency}>
              {savingAgency ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save draft'}
            </Button>
            <Button
              className="bg-zinc-900 hover:bg-zinc-800"
              onClick={() => saveAgencyProfile(true)}
              disabled={
                savingAgency ||
                !agencyName.trim() ||
                aDomains.length === 0 ||
                aTools.length === 0 ||
                !aAvailability ||
                !websiteUrl.trim() ||
                !country.trim()
              }
            >
              {savingAgency ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for review'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

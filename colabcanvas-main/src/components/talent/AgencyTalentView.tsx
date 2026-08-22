import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Clock, Loader2, ShieldCheck, AlertCircle, Building, Users } from 'lucide-react';
import { EscrowWalletCard } from '@/components/talent/wallet/EscrowWalletCard';


interface AgencyProfile {
  agency_name: string;
  vetting_status: string;
  domains: string[];
  team_size: number | null;
}

interface OpportunityRow {
  id: string;
  title: string | null;
  brief: any;
  extracted: any;
  team_composition: any;
  timeline: any;
  status: string;
  created_at: string;
  provider_preference?: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'approved': return { label: 'Approved · receiving briefs', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'pending': return { label: 'In review', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'rejected': return { label: 'Not approved', tone: 'bg-red-50 text-red-700 border-red-200' };
    default: return { label: 'Setup pending', tone: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
  }
};

export const AgencyTalentView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [opps, setOpps] = useState<OpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      const [pRes, oRes] = await Promise.all([
        supabase.from('agency_profiles').select('agency_name, vetting_status, domains, team_size').eq('user_id', user.id).maybeSingle(),
        supabase.from('talent_projects')
          .select('id, title, brief, extracted, team_composition, timeline, status, created_at, provider_preference')
          .eq('assigned_agency_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (!cancelled) {
        setProfile(pRes.data as any);
        setOpps((oRes.data ?? []) as any);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  const badge = statusBadge(profile?.vetting_status ?? 'pending');

  return (

    <div className="container mx-auto px-6 py-10 max-w-5xl space-y-6">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Agency dashboard</div>
          <h1 className="text-3xl font-medium text-zinc-900 inline-flex items-center gap-2">
            <Building className="w-7 h-7" /> {profile?.agency_name || 'Your agency'}
          </h1>
          <div className="mt-2 inline-flex items-center gap-2">
            <Badge variant="outline" className={badge.tone}>{badge.label}</Badge>
            {profile?.team_size && <span className="text-xs text-zinc-500 inline-flex items-center gap-1"><Users className="w-3 h-3" /> {profile.team_size}+ people</span>}
          </div>
        </div>
        <Button onClick={() => navigate('/settings')} variant="outline" className="rounded-full">Edit profile</Button>
      </div>

      {/* Wallet */}
      <EscrowWalletCard />

      {/* Opportunities */}
      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-zinc-900 inline-flex items-center gap-2">
            <Briefcase className="w-5 h-5" /> Briefs assigned to your agency
          </h2>
          <span className="text-xs text-zinc-500">{opps.length} active</span>
        </div>

        {opps.length === 0 ? (
          <div className="text-center py-12">
            {profile?.vetting_status === 'approved' ? (
              <>
                <Clock className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                <div className="text-sm text-zinc-700 font-medium">No briefs yet</div>
                <div className="text-xs text-zinc-500 mt-1">Clients who request agencies in your domains will see your studio.</div>
              </>
            ) : profile?.vetting_status === 'pending' ? (
              <>
                <ShieldCheck className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                <div className="text-sm text-zinc-700 font-medium">Application under review</div>
                <div className="text-xs text-zinc-500 mt-1">We'll notify you within 48 hours.</div>
              </>
            ) : (
              <>
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <div className="text-sm text-zinc-700 font-medium">Application not approved</div>
                <div className="text-xs text-zinc-500 mt-1">Reach out to support to discuss.</div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {opps.map(o => (
              <button
                key={o.id}
                onClick={() => navigate(`/talent/projects/${o.id}`)}
                className="w-full text-left p-4 rounded-lg border border-zinc-200 bg-white hover:border-zinc-900 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-900 truncate">{o.title || 'Untitled brief'}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {new Date(o.created_at).toLocaleDateString()} · {o.team_composition?.roles?.length ?? 0} roles · {o.timeline?.total_weeks ?? '—'} weeks
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

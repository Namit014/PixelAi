import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Clock, Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { FreelancerProfileState } from '@/hooks/useUserIntent';
import { EscrowWalletCard } from '@/components/talent/wallet/EscrowWalletCard';

interface FreelancerTalentViewProps {
  freelancerProfile: FreelancerProfileState;
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
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return { label: 'Approved · receiving briefs', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'in_review':
      return { label: 'In review', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'rejected':
      return { label: 'Not approved', tone: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return { label: 'Setup pending', tone: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
  }
};

export const FreelancerTalentView = ({ freelancerProfile }: FreelancerTalentViewProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opps, setOpps] = useState<OpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('talent_projects')
        .select('id, title, brief, extracted, team_composition, timeline, status, created_at')
        .eq('assigned_freelancer_id', user.id)
        .eq('freelancer_visible', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!cancelled) {
        setOpps((data ?? []) as OpportunityRow[]);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const status = statusBadge(freelancerProfile.vetting_status);
  const setupIncomplete = !freelancerProfile.exists || freelancerProfile.completion_state !== 'complete';

  return (

    <div className="container mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Talent · Freelancer</div>
          <h1 className="text-3xl font-medium text-zinc-900 tracking-tight">Your project briefs</h1>
          <p className="text-zinc-600 mt-1 text-sm">
            Curated opportunities matched to your craft and availability.
          </p>
        </div>
        <Badge variant="outline" className={`px-3 py-1 text-xs font-medium ${status.tone}`}>
          <ShieldCheck className="w-3 h-3 mr-1.5 inline" />
          {status.label}
        </Badge>
      </div>

      <EscrowWalletCard />

      {setupIncomplete && (
        <Card className="p-5 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-zinc-900">Finish your freelancer profile</div>
              <p className="text-sm text-zinc-700 mt-1">
                Complete your craft, level, tools and a short evaluation to start receiving curated briefs.
              </p>
            </div>
            <Button onClick={() => navigate('/settings?section=talent')} className="bg-zinc-900 hover:bg-zinc-800">
              Continue setup
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        </div>
      ) : opps.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <Briefcase className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
          <div className="font-semibold text-zinc-900">No briefs yet</div>
          <p className="text-sm text-zinc-600 mt-1 max-w-md mx-auto">
            When a client matches your craft, the producer will route the brief here. You will get a notification.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {opps.map((o) => {
            const roles: any[] = o.team_composition?.roles ?? [];
            const weeks = o.timeline?.total_weeks;
            return (
              <Card key={o.id} className="p-5 hover:border-zinc-900 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-semibold text-zinc-900 text-sm leading-snug">
                    {o.title || 'Untitled brief'}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {o.status}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-600 line-clamp-3">
                  {o.extracted?.style_direction || o.extracted?.audience || 'Brief details available after acceptance.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-600">
                  {roles.slice(0, 3).map((r, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-zinc-100">
                      {r.seniority} {r.role}
                    </span>
                  ))}
                  {weeks && (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {weeks}w
                    </span>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/talent/projects/${o.id}`)}>
                    View brief
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {freelancerProfile.vetting_status === 'approved' && opps.length > 0 && (
        <div className="text-xs text-emerald-700 inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> You'll be notified when a new brief is routed to you.
        </div>
      )}
    </div>
  );
};

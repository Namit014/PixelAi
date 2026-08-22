import { useParams, useNavigate } from 'react-router-dom';
import { useTalentProject } from '@/hooks/useTalentProject';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

const TalentConfirm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, loading, update } = useTalentProject(id);
  const [busy, setBusy] = useState(false);

  if (loading || !project) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  const lock = async () => {
    setBusy(true);
    try {
      await update({ status: 'locked' });
      toast.success('Project locked. Redirecting to payment…');
      // Hand off to existing PayU flow
      setTimeout(() => navigate('/pricing', { state: { talentProjectId: id, amount: project.pricing?.total } }), 600);
    } catch (e: any) {
      toast.error(e.message ?? 'Could not confirm');
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 text-white mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-medium text-zinc-900">Ready to ship.</h1>
        <p className="text-zinc-600 mt-2">Review the final summary, then confirm to start.</p>
      </div>

      <Card className="p-6 space-y-4">
        <Row label="Project" value={project.title || '—'} />
        <Row label="Team size" value={`${project.team_composition?.roles?.reduce((s: number, r: any) => s + (r.count || 0), 0) ?? 0} people`} />
        <Row label="Timeline" value={`${project.timeline?.total_weeks ?? '—'} weeks`} />
        <Row label="Total cost" value={`${project.pricing?.currency || 'USD'} ${(project.pricing?.total ?? 0).toLocaleString()}`} highlight />
      </Card>

      <Card className="p-5 bg-zinc-50">
        <div className="font-medium text-zinc-900 mb-1">Briefing call (optional)</div>
        <p className="text-sm text-zinc-600">After payment, our producer will email you a 30-min slot to align on kickoff details.</p>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(`/talent/projects/${id}`)} disabled={busy} className="flex-1">Back</Button>
        <Button onClick={lock} disabled={busy} className="flex-1 bg-zinc-900 hover:bg-zinc-800 h-12">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirm & pay <ArrowRight className="ml-2 w-4 h-4" /></>}
        </Button>
      </div>
    </div>
  );
};

const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex justify-between items-center">
    <div className="text-sm text-zinc-600">{label}</div>
    <div className={highlight ? 'text-xl font-semibold text-zinc-900' : 'text-sm font-medium text-zinc-900'}>{value}</div>
  </div>
);

export default TalentConfirm;

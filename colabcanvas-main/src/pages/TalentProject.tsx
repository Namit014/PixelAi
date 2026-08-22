import { useParams, useNavigate } from 'react-router-dom';
import { useTalentProject } from '@/hooks/useTalentProject';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Loader2, ArrowRight, ArrowLeft, Users, Calendar, DollarSign, Lightbulb, FileText, PenLine, Edit3, Download, Clock } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { TeamEditor } from '@/components/talent/TeamEditor';
import { SignaturePad } from '@/components/talent/SignaturePad';
import { ActiveProjectWorkspace } from '@/components/talent/ActiveProjectWorkspace';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

const TalentProject = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, loading, update, refresh } = useTalentProject(id);
  const [recosting, setRecosting] = useState(false);
  const [scope, setScope] = useState(1);
  const [timeline, setTimeline] = useState(1);
  const [editingTeam, setEditingTeam] = useState(false);
  const [editingScope, setEditingScope] = useState(false);
  const [scopeDraft, setScopeDraft] = useState('');
  const [draftingContract, setDraftingContract] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (loading || !project) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  // Once payment is locked, flip to active project workspace
  if (['paid', 'active', 'completed'].includes(project.status)) {
    return <ActiveProjectWorkspace project={project} onChange={refresh} />;
  }

  const recost = async (s: number, t: number) => {
    setRecosting(true);
    try {
      const { data, error } = await supabase.functions.invoke('talent-recost', {
        body: {
          team_composition: project.team_composition,
          timeline: project.timeline,
          pricing: project.pricing,
          controls: { scope_factor: s, timeline_factor: t },
        },
      });
      if (error) throw error;
      await update({
        team_composition: (data as any).team_composition,
        timeline: (data as any).timeline,
        pricing: (data as any).pricing,
        controls: { scope_factor: s, timeline_factor: t },
      });
    } catch (e: any) {
      toast.error(e.message ?? 'Recalculation failed');
    } finally {
      setRecosting(false);
    }
  };

  const draftContract = async () => {
    setDraftingContract(true);
    try {
      const { data, error } = await supabase.functions.invoke('talent-draft-contract', {
        body: { project, scope_md: (project as any).scope_md || derivedScopeMd || project.title },
      });
      if (error) throw error;
      await update({ contract_md: (data as any).contract_md, status: 'contracted' } as any);
      toast.success('Contract drafted');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not draft contract');
    } finally {
      setDraftingContract(false);
    }
  };

  const onSign = async (signatureUrl: string) => {
    await update({
      client_signature_url: signatureUrl,
      client_signed_at: new Date().toISOString(),
    } as any);
    toast.success('Signed — proceed to payment');
    refresh();
  };

  const downloadSignedPdf = async () => {
    setDownloadingPdf(true);
    try {
      // If we already have a stored signed url, just open it
      const existing = (project as any).signed_contract_url;
      if (existing) {
        window.open(existing, '_blank');
        return;
      }
      const { data, error } = await supabase.functions.invoke('talent-render-contract-pdf', {
        body: { project_id: project.id },
      });
      if (error) throw error;
      const url = (data as any)?.signed_contract_url ?? (data as any)?.url;
      if (!url) throw new Error('No PDF URL returned');
      await update({ signed_contract_url: url } as any);
      window.open(url, '_blank');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not download contract PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const roles = project.team_composition?.roles ?? [];
  const phases = project.timeline?.phases ?? [];
  const pricing = project.pricing ?? {};
  const expl = project.explanation ?? {};
  const scopeMd = (project as any).scope_md;
  const contractMd = (project as any).contract_md;
  const signed = !!(project as any).client_signed_at;

  // Auto-derive Scope of Work from timeline deliverables when no manual scope is set
  const derivedScopeMd = (() => {
    if (!phases.length) return '';
    const lines: string[] = ['## Deliverables by phase', ''];
    phases.forEach((p: any) => {
      const dels: string[] = (p.deliverables ?? []).filter(Boolean);
      if (!dels.length) return;
      lines.push(`### ${p.name}${p.duration_weeks ? ` · ${p.duration_weeks} week${p.duration_weeks === 1 ? '' : 's'}` : ''}`);
      dels.forEach((d) => lines.push(`- ${d}`));
      lines.push('');
    });
    return lines.join('\n').trim();
  })();
  const effectiveScopeMd = scopeMd || derivedScopeMd;

  // Helper for the slider label (Lite / Recommended / Full · Rush / Recommended / Relaxed)
  const scopeLabel = scope < 1 ? 'LITE' : scope > 1 ? 'FULL' : 'RECOMMENDED';
  const timelineLabel = timeline < 1 ? 'RUSH' : timeline > 1 ? 'RELAXED' : 'RECOMMENDED';

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 space-y-8">
        {/* Header — back button + eyebrow + title */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/talent')}
            className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Payment</div>
            <h1 className="text-2xl font-medium text-zinc-900 leading-tight mt-0.5 truncate">
              {project.title || 'Your project plan'}
            </h1>
          </div>
        </div>

        {/* Two-column: Your Team + Cost */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Your Team */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-sm text-zinc-700">
                <Users className="w-4 h-4" /> Your Team
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-3 rounded-full bg-zinc-100 hover:bg-zinc-200" onClick={() => setEditingTeam(v => !v)}>
                {editingTeam ? 'Done' : 'Edit'}
              </Button>
            </div>
            {editingTeam ? (
              <div className="rounded-2xl bg-zinc-50 p-4">
                <TeamEditor
                  roles={roles}
                  teamComposition={project.team_composition}
                  timeline={project.timeline}
                  pricing={pricing}
                  controls={project.controls}
                  projectId={project.id}
                  onUpdated={(next) => update(next as any)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                {roles.length === 0 && (
                  <div className="rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-500 italic">No team yet.</div>
                )}
                {roles.map((r: any, i: number) => (
                  <div key={i} className="rounded-2xl bg-zinc-50 p-4 relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium text-zinc-900 text-sm leading-snug pr-16">
                        {r.count} x {r.seniority} {r.role}
                      </div>
                      {typeof r.hours === 'number' && (
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-zinc-900 text-white">
                          <Clock className="w-3 h-3" /> {r.hours} Hrs
                        </span>
                      )}
                    </div>
                    {r.rationale && (
                      <div className="text-xs text-zinc-500 mt-2 leading-relaxed">{r.rationale}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cost */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-sm text-zinc-700">
                <DollarSign className="w-4 h-4" /> Cost
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-3 rounded-full bg-zinc-100 hover:bg-zinc-200" onClick={() => setEditingTeam(v => !v)}>
                Edit
              </Button>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-3xl font-semibold text-zinc-900">
                {pricing.currency || 'USD'} {(pricing.total ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-zinc-500 mt-1">All Inclusive</div>
              <div className="mt-4 pt-4 border-t border-zinc-200/70 space-y-1.5 text-xs text-zinc-700 max-h-32 overflow-y-auto">
                {(pricing.line_items ?? []).map((li: any, i: number) => (
                  <div key={i} className="flex justify-between gap-2">
                    <span className="truncate">{li.label}</span>
                    <span className="font-medium text-zinc-900">${li.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-sm text-zinc-700">
              <Calendar className="w-4 h-4" /> Timeline
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-zinc-900 text-white">
              <Clock className="w-3 h-3" /> {project.timeline?.total_weeks ?? '—'} Week{(project.timeline?.total_weeks ?? 0) === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {phases.map((p: any, i: number) => (
              <div key={i} className="shrink-0 w-[200px] rounded-2xl border border-zinc-200 p-4">
                <div className="font-medium text-sm text-zinc-900 leading-snug">{p.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{p.duration_weeks} Week{p.duration_weeks === 1 ? '' : 's'}</div>
                <div className="text-[11px] text-zinc-500 mt-3 leading-relaxed">
                  {(p.deliverables ?? []).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Adjust */}
        <div>
          <div className="flex items-center gap-1.5 text-sm text-zinc-700 mb-3">
            <Lightbulb className="w-4 h-4" /> Adjust
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Slider value={[scope]} min={0.6} max={1.3} step={0.05} onValueChange={(v) => setScope(v[0])} onValueCommit={(v) => recost(v[0], timeline)} />
              <div className="flex justify-between text-[10px] tracking-wider text-zinc-500 mt-2">
                <span>SCOPE</span>
                <span>{scopeLabel}</span>
              </div>
            </div>
            <div>
              <Slider value={[timeline]} min={0.7} max={1.4} step={0.05} onValueChange={(v) => setTimeline(v[0])} onValueCommit={(v) => recost(scope, v[0])} />
              <div className="flex justify-between text-[10px] tracking-wider text-zinc-500 mt-2">
                <span>TIMELINE</span>
                <span>{timelineLabel}</span>
              </div>
            </div>
          </div>
          {recosting && <div className="text-xs text-zinc-500 flex items-center gap-1 mt-2"><Loader2 className="w-3 h-3 animate-spin" />Recalculating…</div>}
        </div>

        {/* Scope of work */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-sm text-zinc-700">
              <FileText className="w-4 h-4" /> Scope of work
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-3 rounded-full bg-zinc-100 hover:bg-zinc-200" onClick={() => { setScopeDraft(scopeMd || derivedScopeMd || ''); setEditingScope(v => !v); }}>
              {editingScope ? 'Cancel' : 'Edit'}
            </Button>
          </div>
          {editingScope ? (
            <div className="space-y-2">
              <Textarea value={scopeDraft} onChange={e => setScopeDraft(e.target.value)} rows={8} className="font-mono text-sm" placeholder="Describe what's in scope, deliverables, revisions, exclusions…" />
              <Button onClick={async () => { await update({ scope_md: scopeDraft } as any); setEditingScope(false); toast.success('Scope updated'); }} className="bg-zinc-900 hover:bg-zinc-800">Save scope</Button>
            </div>
          ) : (
            effectiveScopeMd ? (
              <>
                <div className="prose prose-sm max-w-none text-zinc-700">
                  <ReactMarkdown>{effectiveScopeMd}</ReactMarkdown>
                </div>
                {!scopeMd && (
                  <p className="text-[11px] text-zinc-400 mt-2 italic">
                    Auto-generated from your timeline deliverables. Click Edit to customise.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-400">No scope yet. Add one to lock in deliverables before contract.</p>
            )
          )}
        </div>

        {/* Contract */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-sm text-zinc-700">
              <PenLine className="w-4 h-4" /> Contract
            </div>
            <div className="flex items-center gap-2">
              {signed && (
                <Button onClick={downloadSignedPdf} disabled={downloadingPdf} variant="ghost" size="sm" className="h-7 text-xs px-3 rounded-full bg-zinc-100 hover:bg-zinc-200">
                  {downloadingPdf ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Preparing…</> : <><Download className="w-3.5 h-3.5 mr-1" /> Download PDF</>}
                </Button>
              )}
              {!contractMd && (
                <Button onClick={draftContract} disabled={draftingContract} variant="ghost" size="sm" className="h-7 text-xs px-3 rounded-full bg-zinc-100 hover:bg-zinc-200">
                  {draftingContract ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Drafting…</> : 'Generate Contract'}
                </Button>
              )}
            </div>
          </div>
          {contractMd && (
            <>
              <div className="prose prose-sm max-w-none text-zinc-700 max-h-[400px] overflow-y-auto p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
                <ReactMarkdown>{contractMd}</ReactMarkdown>
              </div>
              <div className="mt-4">
                <SignaturePad
                  onSigned={onSign}
                  existingSignatureUrl={(project as any).client_signature_url}
                  signedAt={(project as any).client_signed_at}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer CTAs */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => navigate('/talent')}
            className="flex-1 h-12 rounded-full bg-zinc-100 border-0 hover:bg-zinc-200 text-zinc-900"
          >
            Back
          </Button>
          <Button
            onClick={() => navigate(`/talent/projects/${id}/pay`)}
            disabled={!signed}
            className="flex-[2] h-12 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50"
          >
            {signed ? <>Lock in escrow <ArrowRight className="ml-2 w-4 h-4" /></> : 'Sign contract to continue'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TalentProject;

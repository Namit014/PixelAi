import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Clock, Circle, Wallet, Lock, Users, FileText,
  Download, Loader2, Calendar, TrendingUp, Tag, MessageSquare,
  Video as VideoIcon, LayoutGrid, ExternalLink, ArrowLeft, ListTodo,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TalentChatRoom } from './TalentChatRoom';
import { TalentVideoCall } from './TalentVideoCall';
import { AdjustBudgetSheet } from './AdjustBudgetSheet';
import { TimelineFeed } from './TimelineFeed';
import { UpcomingSessionsStrip } from './UpcomingSessionsStrip';
import { cn } from '@/lib/utils';

interface EscrowRow {
  id: string;
  amount: number;
  status: 'scheduled' | 'locked' | 'released' | 'refunded' | 'cancelled';
  milestone_label: string | null;
  scheduled_for: string | null;
  released_at: string | null;
  locked_at: string | null;
}

const TABS = [
  { key: 'track', label: 'Track', icon: Calendar },
  { key: 'timeline', label: 'Timeline', icon: ListTodo },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'call', label: 'Call', icon: VideoIcon },
  { key: 'workspace', label: 'Workspace', icon: LayoutGrid },
] as const;

type TabKey = typeof TABS[number]['key'];

export const ActiveProjectWorkspace = ({ project, onChange }: { project: any; onChange?: () => void }) => {
  const navigate = useNavigate();
  const [escrows, setEscrows] = useState<EscrowRow[]>([]);
  const [loadingEscrow, setLoadingEscrow] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [creatingWs, setCreatingWs] = useState(false);
  const [tab, setTab] = useState<TabKey>('track');
  const [activeRoom, setActiveRoom] = useState<{ code: string; meetingId?: string } | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);

  // Lock body scroll while in active workspace; only inner content scrolls.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingEscrow(true);
      const { data } = await supabase
        .from('talent_escrow')
        .select('id, amount, status, milestone_label, scheduled_for, released_at, locked_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });
      if (!cancelled) {
        setEscrows((data as any) || []);
        setLoadingEscrow(false);
      }
    })();
    return () => { cancelled = true; };
  }, [project.id]);

  const wsAttemptedRef = useRef<string | null>(null);
  useEffect(() => {
    if (project.linked_project_id) return;
    if (!['paid', 'active'].includes(project.status)) return;
    if (wsAttemptedRef.current === project.id) return;
    wsAttemptedRef.current = project.id;
    setCreatingWs(true);
    supabase.functions.invoke('talent-create-workspace', {
      body: { project_id: project.id },
    }).then(() => onChange?.()).catch(() => {}).finally(() => setCreatingWs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.linked_project_id, project.status]);

  const totalLocked = escrows.filter((e) => e.status === 'locked').reduce((s, e) => s + e.amount, 0);
  const totalReleased = escrows.filter((e) => e.status === 'released').reduce((s, e) => s + e.amount, 0);
  const totalScheduled = escrows.filter((e) => e.status === 'scheduled').reduce((s, e) => s + e.amount, 0);
  const phases = project.timeline?.phases ?? [];
  const roles = project.team_composition?.roles ?? [];
  const totalCost = project.pricing?.total ?? 0;
  const currency = project.pricing?.currency || 'USD';
  const discount = Number(project.discount_amount ?? 0);
  const promoCode = project.promo_code;
  // All deliverables across phases — used for the Scope of Work card.
  const allDeliverables: { phase: string; items: string[] }[] = phases
    .map((p: any) => ({ phase: p.name, items: (p.deliverables ?? []).filter(Boolean) }))
    .filter((p: any) => p.items.length > 0);

  const releasedCount = escrows.filter((e) => e.status === 'released').length;
  const phaseStatus = (i: number): 'done' | 'in_progress' | 'upcoming' => {
    if (i < releasedCount) return 'done';
    if (i === releasedCount) return 'in_progress';
    return 'upcoming';
  };

  const downloadContract = async () => {
    setDownloadingPdf(true);
    try {
      const existing = project.signed_contract_url;
      if (existing) { window.open(existing, '_blank'); return; }
      const { data, error } = await supabase.functions.invoke('talent-render-contract-pdf', {
        body: { project_id: project.id },
      });
      if (error) throw error;
      const url = (data as any)?.signed_contract_url ?? (data as any)?.url;
      if (url) window.open(url, '_blank');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not download contract');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleJoinCall = (code: string, meetingId?: string) => {
    setActiveRoom({ code, meetingId });
    setTab('call');
  };

  const createWorkspaceManually = async () => {
    setCreatingWs(true);
    try {
      const { error } = await supabase.functions.invoke('talent-create-workspace', {
        body: { project_id: project.id },
      });
      if (error) throw error;
      toast.success('Workspace ready');
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not create workspace');
    } finally {
      setCreatingWs(false);
    }
  };

  return (
    // Fixed height: viewport minus header (~73px). Page itself does not scroll.
    <div className="h-[calc(100vh-73px)] flex flex-col overflow-hidden">
      <div className="container mx-auto px-6 pt-8 pb-2 shrink-0">
        {/* Project header */}
        <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/talent')}
              className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 mt-1"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-700" />
            </button>
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Project</div>
              <h1 className="text-3xl font-medium text-zinc-900 tracking-tight">{project.title || 'Your project'}</h1>
              <p className="text-sm text-zinc-500 mt-1.5">
                Locked into escrow - releases as milestones complete.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBudgetOpen(true)}
              className="rounded-md border-zinc-200 text-zinc-700 hover:border-zinc-400 text-xs font-normal"
            >
              Adjust Amount
            </Button>
            <div className="text-right">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">Total</div>
              <div className="text-3xl font-semibold text-zinc-900 leading-tight">
                {currency} {Number(totalCost).toLocaleString()}
              </div>
              {discount > 0 && (
                <div className="text-xs text-emerald-600 mt-0.5">
                  · $ {discount.toLocaleString()} {promoCode ? `(${promoCode})` : ''}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs — attached to the workspace container below */}
        <div className="flex items-end gap-1 -mb-px relative z-10">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 text-sm transition-colors rounded-t-xl border',
                  active
                    ? 'bg-white border-zinc-200 border-b-white text-zinc-900 font-medium'
                    : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-600',
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace shell — only this scrolls (its content) */}
      <div className="flex-1 min-h-0 container mx-auto px-6 pb-8">
        <div className="h-full rounded-3xl rounded-tl-none border border-zinc-200 bg-white overflow-hidden flex flex-col">
          {tab === 'track' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-7">
              <div className="space-y-8">
                <div className="grid lg:grid-cols-[1fr_280px] gap-10">
                  {/* TRACK */}
                  <div>
                    <div className="flex items-center gap-2 mb-5 text-zinc-700">
                      <Calendar className="w-4 h-4" />
                      <h2 className="font-medium text-zinc-900">Track</h2>
                      <span className="text-xs text-zinc-500">· {project.timeline?.total_weeks ?? '—'} weeks</span>
                    </div>
                    {phases.length === 0 ? (
                      <p className="text-sm text-zinc-400 italic">No phases defined.</p>
                    ) : (
                      <div className="space-y-5">
                        {phases.map((p: any, i: number) => {
                          const s = phaseStatus(i);
                          return (
                            <div key={i} className="flex gap-3 items-start">
                              <div className="mt-0.5">
                                {s === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                                {s === 'in_progress' && <Clock className="w-5 h-5 text-amber-500" />}
                                {s === 'upcoming' && <Circle className="w-5 h-5 text-zinc-300" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <div className="font-medium text-sm text-zinc-900">{p.name}</div>
                                  <div className="text-xs text-zinc-400">{p.duration_weeks}w</div>
                                </div>
                                <div className="text-xs text-zinc-500 mt-1">
                                  {(p.deliverables ?? []).join(' · ')}
                                </div>
                                {s === 'in_progress' && (
                                  <div className="text-[10px] text-amber-600 mt-1.5 uppercase tracking-wider font-medium">In progress</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ANALYSE + TEAM */}
                  <div className="space-y-7">
                    <div>
                      <div className="flex items-center gap-2 mb-4 text-zinc-700">
                        <TrendingUp className="w-4 h-4" />
                        <h2 className="font-medium text-zinc-900">Analyse</h2>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-600 inline-flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-zinc-400" /> In escrow
                          </span>
                          <span className="text-zinc-900 font-medium">${totalLocked.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-600 inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Released
                          </span>
                          <span className="text-zinc-900 font-medium">${totalReleased.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-600 inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" /> Scheduled
                          </span>
                          <span className="text-zinc-900 font-medium">${totalScheduled.toLocaleString()}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex items-center justify-between pt-3 mt-2 border-t border-zinc-100">
                            <span className="text-emerald-600 inline-flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5" /> Discount
                            </span>
                            <span className="text-emerald-600 font-medium">${discount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3 text-zinc-700">
                        <Users className="w-4 h-4" />
                        <h2 className="font-medium text-zinc-900">Your team</h2>
                      </div>
                      <div className="space-y-2.5 text-sm">
                        {roles.length === 0 && <div className="text-zinc-400 italic">No team yet</div>}
                        {roles.map((r: any, i: number) => {
                          const a = r.assignee;
                          const name = a?.name || a?.full_name || `${r.seniority} ${r.role}`;
                          const avatar = a?.avatar_url
                            || (a?.user_id ? `https://api.dicebear.com/9.x/notionists/svg?seed=${a.user_id}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf` : null);
                          return (
                            <div key={i} className="flex items-center gap-2.5">
                              {avatar ? (
                                <img src={avatar} alt="" className="w-7 h-7 rounded-full bg-zinc-100 object-cover border border-zinc-200" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-200" />
                              )}
                              <div className="min-w-0">
                                <div className="text-zinc-900 text-sm leading-tight truncate">{name}</div>
                                <div className="text-[11px] text-zinc-500 leading-tight truncate">
                                  {r.count > 1 ? `${r.count}× ` : ''}{r.seniority} {r.role}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MILESTONES */}
                <div>
                  <div className="flex items-center gap-2 mb-4 text-zinc-700">
                    <FileText className="w-4 h-4" />
                    <h2 className="font-medium text-zinc-900">Milestone payments</h2>
                  </div>
                  {loadingEscrow ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-zinc-400" /></div>
                  ) : escrows.length === 0 ? (
                    <p className="text-sm text-zinc-400 italic">No milestones recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {escrows.map((e) => {
                        const cls =
                          e.status === 'released' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : e.status === 'locked' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : e.status === 'scheduled' ? 'bg-zinc-50 text-zinc-600 border border-zinc-200'
                          : 'bg-zinc-100 text-zinc-600 border border-zinc-200';
                        return (
                          <div key={e.id} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                              <span className={cn('text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full', cls)}>
                                {e.status}
                              </span>
                              <span className="text-sm text-zinc-800">{e.milestone_label || 'Full payment'}</span>
                            </div>
                            <span className="font-medium text-sm text-zinc-900">${e.amount.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* UPCOMING SESSIONS */}
                <UpcomingSessionsStrip projectId={project.id} />

                {/* SCOPE OF WORK */}
                <div>
                  <div className="flex items-center gap-2 mb-4 text-zinc-700">
                    <ListTodo className="w-4 h-4" />
                    <h2 className="font-medium text-zinc-900">Scope of work</h2>
                  </div>
                  {allDeliverables.length === 0 ? (
                    <p className="text-sm text-zinc-400 italic">No deliverables defined yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {allDeliverables.map((p, i) => (
                        <div key={i}>
                          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1.5">{p.phase}</div>
                          <ul className="space-y-1">
                            {p.items.map((it, j) => (
                              <li key={j} className="text-sm text-zinc-800 flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-zinc-400 mt-2 shrink-0" />
                                <span>{it}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DOCUMENTS */}
                <div>
                  <div className="flex items-center gap-2 mb-4 text-zinc-700">
                    <FileText className="w-4 h-4" />
                    <h2 className="font-medium text-zinc-900">Documents & wallet</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      onClick={downloadContract}
                      disabled={downloadingPdf}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 hover:border-zinc-400 transition-colors text-sm text-zinc-900"
                    >
                      {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-zinc-500" />}
                      Signed contract
                    </button>
                    <button
                      onClick={() => navigate('/pricing')}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 hover:border-zinc-400 transition-colors text-sm text-zinc-900"
                    >
                      <Wallet className="w-4 h-4 text-zinc-500" />
                      Top up wallet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'timeline' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-7">
              <div className="flex items-center gap-2 mb-5 text-zinc-700">
                <ListTodo className="w-4 h-4" />
                <h2 className="font-medium text-zinc-900">Timeline</h2>
                <span className="text-xs text-zinc-500">· updates, invites & milestones</span>
              </div>
              <TimelineFeed projectId={project.id} />
            </div>
          )}

          {tab === 'chat' && (
            <TalentChatRoom
              projectId={project.id}
              roles={roles}
              onJoinCall={(code) => handleJoinCall(code)}
            />
          )}

          {tab === 'call' && (
            activeRoom ? (
              <TalentVideoCall
                projectId={project.id}
                roomCode={activeRoom.code}
                meetingId={activeRoom.meetingId}
                onLeave={() => { setActiveRoom(null); setTab('chat'); }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <VideoIcon className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                <h3 className="font-medium text-zinc-900 mb-1">No active call</h3>
                <p className="text-sm text-zinc-500 mb-4 max-w-sm">
                  Start a call from the Chat tab to begin a working session with your team and RUMi.
                </p>
                <Button onClick={() => setTab('chat')} className="bg-zinc-900 hover:bg-zinc-800 rounded-full">
                  <MessageSquare className="w-4 h-4 mr-2" /> Open chat
                </Button>
              </div>
            )
          )}

          {tab === 'workspace' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-7">
              <div className="flex items-center gap-2 mb-4 text-zinc-700">
                <LayoutGrid className="w-4 h-4" />
                <h2 className="font-medium text-zinc-900">Linked workspace</h2>
              </div>
              {project.linked_project_id ? (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-500">
                    Your designer works in this Canvas file. You can open it anytime to see live progress.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => navigate(`/canvas?project=${project.linked_project_id}`)}
                      className="bg-zinc-900 hover:bg-zinc-800 rounded-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" /> Open Canvas
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-500">No workspace linked yet.</p>
                  <Button
                    onClick={createWorkspaceManually}
                    disabled={creatingWs}
                    variant="outline"
                    className="rounded-full"
                  >
                    {creatingWs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LayoutGrid className="w-4 h-4 mr-2" />}
                    Create workspace
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AdjustBudgetSheet
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        projectId={project.id}
        currentTotal={Number(totalCost) || 0}
        currency={currency}
        paidToDate={totalLocked + totalReleased}
        onUpdated={() => onChange?.()}
      />
    </div>
  );
};

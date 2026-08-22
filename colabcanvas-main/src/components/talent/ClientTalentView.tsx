import { useEffect, useMemo, useState, useRef } from 'react';

import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Loader2, Plus, ArrowRight, Clock, ChevronDown, MoreHorizontal,
  Trash2, ExternalLink, Copy as CopyIcon,
  Paperclip, FolderOpen, Upload, X, Mic,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { NewProjectCard } from '@/components/dashboard/NewProjectCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { AttachmentPicker, type Attachment } from '@/components/talent/AttachmentPicker';

interface ProjectRow {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
  pricing: any;
  timeline: any;
  team_composition: any;
}

const STAGE_COUNT = 4;
const stageIndexFor = (status: string) => {
  if (status === 'intake') return 0;
  if (status === 'proposal') return 2;
  if (status === 'locked') return 3;
  if (status === 'paid' || status === 'active' || status === 'completed') return 3;
  return 0;
};

const statusLabel = (status: string) => {
  if (status === 'intake') return 'Intake';
  if (status === 'proposal') return 'Proposal';
  if (status === 'locked' || status === 'paid') return 'Payment';
  if (status === 'active') return 'Active';
  if (status === 'completed') return 'Completed';
  return status;
};

type StatusFilter = 'all' | 'intake' | 'proposal' | 'payment' | 'active' | 'completed';
type SortKey = 'recent' | 'date' | 'cost' | 'team';

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'intake', label: 'Intake' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'payment', label: 'Payment' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'date', label: 'Date Created' },
  { key: 'cost', label: 'Cost' },
  { key: 'team', label: 'Team Size' },
];

const matchesStatus = (s: string, f: StatusFilter) => {
  if (f === 'all') return true;
  if (f === 'payment') return s === 'locked' || s === 'paid';
  if (f === 'active') return s === 'active';
  return s === f;
};

export const ClientTalentView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [intakeText, setIntakeText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('talent_projects')
        .select('id, title, status, created_at, pricing, timeline, team_composition')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(48);
      if (!cancelled) {
        setProjects((data ?? []) as ProjectRow[]);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const startNew = (opening?: string) => {
    const payload: any = {};
    if (opening?.trim()) payload.opening = opening.trim();
    if (attachments.length) payload.attachments = attachments;
    if (Object.keys(payload).length) navigate('/talent/new', { state: payload });
    else navigate('/talent/new');
  };

  const onAttach = (picks: Attachment[]) => setAttachments((a) => [...a, ...picks]);
  const removeAttachment = (i: number) => setAttachments((a) => a.filter((_, idx) => idx !== i));

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const f of files) {
        if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} exceeds 20MB`); continue; }
        const path = `${user.id}/talent-refs/landing/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from('design-assets').upload(path, f);
        if (error) { toast.error(error.message); continue; }
        const { data: urlData } = supabase.storage.from('design-assets').getPublicUrl(path);
        uploaded.push({ type: 'upload', name: f.name, url: urlData.publicUrl });
      }
      if (uploaded.length) onAttach(uploaded);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const visible = useMemo(() => {
    const filtered = projects.filter((p) => matchesStatus(p.status, statusFilter));
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortBy === 'cost') return (b.pricing?.total ?? 0) - (a.pricing?.total ?? 0);
      if (sortBy === 'team') {
        const ta = (a.team_composition?.roles ?? []).reduce((s: number, r: any) => s + (r.count || 0), 0);
        const tb = (b.team_composition?.roles ?? []).reduce((s: number, r: any) => s + (r.count || 0), 0);
        return tb - ta;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return sorted;
  }, [projects, statusFilter, sortBy]);

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Delete this project? This cannot be undone.');
    if (!ok) return;
    const prev = projects;
    setProjects((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from('talent_projects').delete().eq('id', id);
    if (error) {
      setProjects(prev);
      toast.error(error.message);
    } else {
      toast.success('Project deleted');
    }
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/talent/projects/${id}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied'),
      () => toast.error('Could not copy link'),
    );
  };

  const statusLabelActive = STATUS_OPTIONS.find((s) => s.key === statusFilter)?.label ?? 'All';
  const sortLabelActive = SORT_OPTIONS.find((s) => s.key === sortBy)?.label ?? 'Recent';

  return (

    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-10 bg-white">
      {/* Hero */}
      <div className="text-center mb-4 sm:mb-8">
        <div className="text-xs sm:text-sm text-zinc-700 mb-1">Introducing</div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight">
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
        <p className="text-zinc-500 mt-2 sm:mt-3 max-w-md mx-auto text-xs sm:text-sm leading-relaxed px-2">
          Get expert help on a project. Describe what you need refined, scaled or shipped. Our AI curates the right team.
        </p>
      </div>

      {/* Intake card — symmetric padding (p-3) matching dashboard composer */}
      <div className="max-w-[614px] mx-auto rounded-3xl border border-zinc-200 bg-white p-3">
        {(attachments.length > 0 || uploading) && (
          <div className="flex flex-wrap gap-1.5 mb-2 px-1">
            {attachments.map((a, i) => (
              <div key={i} className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 inline-flex items-center gap-1.5">
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[160px]">{a.name}</span>
                <button onClick={() => removeAttachment(i)} className="text-zinc-400 hover:text-zinc-900"><X className="w-3 h-3" /></button>
              </div>
            ))}
            {uploading && (
              <div className="text-xs px-2.5 py-1 rounded-full bg-zinc-50 border border-dashed border-zinc-300 inline-flex items-center gap-1.5 text-zinc-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
              </div>
            )}
          </div>
        )}
        <input
          value={intakeText}
          onChange={(e) => setIntakeText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); startNew(intakeText); } }}
          placeholder="What shall we colab on today ?"
          className="w-full bg-transparent border-0 outline-none text-base text-zinc-900 placeholder:text-zinc-400 mb-10 px-2"
        />
        <div className="flex items-center justify-between">
          <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
            <PopoverTrigger asChild>
              <button
                className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-500 hover:border-zinc-400"
                aria-label="Attach"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-1.5" sideOffset={8}>
              <button
                onClick={() => { setAttachMenuOpen(false); setPickerOpen(true); }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-sm rounded-md hover:bg-zinc-100 text-zinc-900"
              >
                <FolderOpen className="w-4 h-4 text-zinc-500" />
                Attach a project as reference
              </button>
              <button
                onClick={() => { setAttachMenuOpen(false); fileRef.current?.click(); }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-sm rounded-md hover:bg-zinc-100 text-zinc-900"
              >
                <Upload className="w-4 h-4 text-zinc-500" />
                Upload from device
              </button>
            </PopoverContent>
          </Popover>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={onFileUpload} accept="image/*,application/pdf,video/*" />
          <div className="flex items-center gap-2">
            <button
              className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-500 hover:border-zinc-400"
              aria-label="Voice"
              type="button"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={() => startNew(intakeText)}
              className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800"
              aria-label="Send"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AttachmentPicker open={pickerOpen} onOpenChange={setPickerOpen} onAttach={onAttach} />

      {/* Filters row — dashboard control style */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-xs font-normal">
                Status: <span className="text-foreground">{statusLabelActive}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {STATUS_OPTIONS.map((o) => (
                <DropdownMenuItem key={o.key} onClick={() => setStatusFilter(o.key)} className="cursor-pointer">
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-xs font-normal">
                Sort: <span className="text-foreground">{sortLabelActive}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {SORT_OPTIONS.map((o) => (
                <DropdownMenuItem key={o.key} onClick={() => setSortBy(o.key)} className="cursor-pointer">
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button size="sm" variant="outline" onClick={() => startNew()} className="gap-2 text-xs font-normal">
          <Plus className="w-3 h-3" /> Start a project
        </Button>
      </div>

      {/* Projects grid — same as dashboard: 4 cols on desktop */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        </div>
      ) : (
        <TooltipProvider delayDuration={150}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          <NewProjectCard onClick={() => startNew()} />

          {visible.map((p) => {
            const stageIdx = stageIndexFor(p.status);
            const total = p.pricing?.total;
            const weeks = p.timeline?.total_weeks;
            const teamCount =
              (p.team_composition?.roles ?? []).reduce((s: number, r: any) => s + (r.count || 0), 0) || 0;

            return (
              <Card
                key={p.id}
                className="group relative cursor-pointer overflow-hidden border border-zinc-200 bg-white hover-lift transition-all duration-300"
                onClick={() => navigate(`/talent/projects/${p.id}`)}
              >
                {/* Square top section to match dashboard cards */}
                <div className="aspect-square relative p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500">Project</span>
                    <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-zinc-200 text-zinc-700 bg-white">
                      {statusLabel(p.status)}
                    </span>
                  </div>

                  <div className="mt-3 font-medium text-zinc-900 text-base leading-snug line-clamp-2">
                    {p.title || 'Untitled brief'}
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="mt-4 flex items-center gap-1 cursor-default">
                        {Array.from({ length: STAGE_COUNT }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${i <= stageIdx ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                          />
                        ))}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="text-xs">
                      Stage {stageIdx + 1} of {STAGE_COUNT} · {statusLabel(p.status)}
                    </TooltipContent>
                  </Tooltip>

                  <div className="mt-auto grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-zinc-100/80 px-3 py-2">
                      <div className="text-[10px] text-zinc-500">Team</div>
                      <div className="text-sm text-zinc-900 font-medium mt-0.5">
                        {teamCount ? `0${teamCount}`.slice(-2) : '—'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-100/80 px-3 py-2">
                      <div className="text-[10px] text-zinc-500">Weeks</div>
                      <div className="text-sm text-zinc-900 font-medium mt-0.5">
                        {weeks ? `0${weeks}`.slice(-2) : '—'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-100/80 px-3 py-2">
                      <div className="text-[10px] text-zinc-500">Cost</div>
                      <div className="text-sm text-zinc-900 font-medium mt-0.5 truncate">
                        {total ? `$${Number(total).toLocaleString()}` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer — matches dashboard card info bar height */}
                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 min-w-0">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">{format(new Date(p.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="w-7 h-7 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0"
                        aria-label="More"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => navigate(`/talent/projects/${p.id}`)} className="cursor-pointer">
                        <ExternalLink className="w-4 h-4 mr-2" /> Open project
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyLink(p.id)} className="cursor-pointer">
                        <CopyIcon className="w-4 h-4 mr-2" /> Copy link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(p.id)}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
        </TooltipProvider>
      )}
    </div>
  );
};

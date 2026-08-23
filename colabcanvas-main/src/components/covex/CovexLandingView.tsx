import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2, Plus, ArrowRight, Clock, ChevronDown, Trash2, Archive,
} from 'lucide-react';
import CovexNavIcon from '@/assets/icons/covex-nav.svg?react';
import { toast } from 'sonner';
import { NewProjectCard } from '@/components/dashboard/NewProjectCard';
import { LandingPromptBox } from '@/components/landing/LandingPromptBox';

interface CovexRow {
  id: string;
  title: string | null;
  created_at: string;
  is_template?: boolean;
  is_public?: boolean;
}

type StatusFilter = 'all' | 'private' | 'public' | 'template';
type SortKey = 'recent' | 'date' | 'title';

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'private', label: 'Private' },
  { key: 'public', label: 'Public' },
  { key: 'template', label: 'Templates' },
];
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'date', label: 'Date Created' },
  { key: 'title', label: 'Title' },
];

const matches = (p: CovexRow, f: StatusFilter) => {
  if (f === 'all') return true;
  if (f === 'public') return !!p.is_public;
  if (f === 'template') return !!p.is_template;
  if (f === 'private') return !p.is_public && !p.is_template;
  return true;
};

export const CovexLandingView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<CovexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [intakeText, setIntakeText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('workflows')
        .select('id, title, created_at, is_template, is_public')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(48);
      if (!cancelled) {
        setProjects((data ?? []) as any);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const startNew = async (opening?: string) => {
    if (!user) return;
    setCreating(true);
    try {
      const title = opening?.trim()?.slice(0, 60) || 'Untitled Covex';
      const { data, error } = await supabase
        .from('workflows')
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (error) throw error;
      const params = new URLSearchParams({ id: data.id });
      if (opening?.trim()) params.set('prompt', opening.trim());
      navigate(`/covex/editor?${params.toString()}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Could not create covex');
    } finally {
      setCreating(false);
    }
  };

  const visible = useMemo(() => {
    const filtered = projects.filter((p) => matches(p, statusFilter));
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return sorted;
  }, [projects, statusFilter, sortBy]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this covex? This cannot be undone.')) return;
    const prev = projects;
    setProjects((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from('workflows').delete().eq('id', id);
    if (error) {
      setProjects(prev);
      toast.error(error.message);
    } else {
      toast.success('Covex deleted');
    }
  };

  const statusLabelActive = STATUS_OPTIONS.find((s) => s.key === statusFilter)?.label ?? 'All';
  const sortLabelActive = SORT_OPTIONS.find((s) => s.key === sortBy)?.label ?? 'Recent';

  return (
    <div className="container mx-auto px-6 py-12 space-y-10 bg-white">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="text-sm text-zinc-700 mb-1">Introducing</div>
        <h1 className="text-4xl md:text-5xl font-normal tracking-tight">
          <span
            className="bg-clip-text text-transparent animate-gradient-shift"
            style={{
              backgroundImage: 'linear-gradient(90deg, #7D22FF, #FF8870, #FFDEDE, #C196FF, #7D22FF)',
              backgroundSize: '200% 200%',
            }}
          >
            Covex
          </span>
        </h1>
        <p className="text-zinc-500 mt-3 max-w-md mx-auto text-sm leading-relaxed">
          Build AI workflows visually — chain models, design tools and data into one canvas.
        </p>
      </div>

      {/* Intake card */}
      <LandingPromptBox
        value={intakeText}
        onChange={setIntakeText}
        onSubmit={() => startNew(intakeText)}
        placeholder="Describe the workflow you want to build…"
        busy={creating}
        actionLabel="Start Covex"
        showModeToggle={false}
        showSendModeDropdown={false}
      />

      {/* Filters row */}
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
                <Archive className="w-3 h-3" />
                {sortLabelActive}
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
          <Plus className="w-3 h-3" /> New Covex
        </Button>
      </div>

      {/* Projects grid — matches Canvas dashboard card style */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <NewProjectCard onClick={() => startNew()} />
          {visible.map((p, index) => (
            <Card
              key={p.id}
              className="group relative cursor-pointer overflow-hidden border border-zinc-200 bg-white hover-lift transition-all duration-300 animate-in fade-in-0"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={async () => {
                try {
                  const { data: orig, error: fetchErr } = await supabase
                    .from('workflows')
                    .select('*')
                    .eq('id', p.id)
                    .single();
                  if (fetchErr || !orig) throw fetchErr || new Error('Could not find original workflow');

                  const { data: newWf, error: insertErr } = await supabase
                    .from('workflows')
                    .insert({
                      user_id: user?.id,
                      title: orig.title ? `${orig.title} (Copy)` : 'Untitled Workflow (Copy)',
                      description: orig.description,
                      is_public: orig.is_public,
                      is_template: orig.is_template,
                    })
                    .select()
                    .single();
                  if (insertErr || !newWf) throw insertErr || new Error('Could not create cloned workflow');

                  // Copy nodes
                  const { data: nodes } = await supabase.from('workflow_nodes').select('*').eq('workflow_id', p.id);
                  if (nodes && nodes.length > 0) {
                    const clonedNodes = nodes.map(n => {
                      const { id, created_at, updated_at, ...rest } = n;
                      return { ...rest, workflow_id: newWf.id };
                    });
                    await supabase.from('workflow_nodes').insert(clonedNodes);
                  }

                  // Copy edges
                  const { data: edges } = await supabase.from('workflow_edges').select('*').eq('workflow_id', p.id);
                  if (edges && edges.length > 0) {
                    const clonedEdges = edges.map(e => {
                      const { id, created_at, ...rest } = e;
                      return { ...rest, workflow_id: newWf.id };
                    });
                    await supabase.from('workflow_edges').insert(clonedEdges);
                  }

                  toast.success('Cloned into new Covex session!');
                  navigate(`/covex/editor?id=${newWf.id}`);
                } catch (e: any) {
                  console.error(e);
                  toast.error(e.message || 'Failed to copy workflow');
                }
              }}
            >
              {/* Delete button (hover) */}
              <button
                onClick={(e) => handleDelete(e, p.id)}
                className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md p-1.5"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {/* Source badge */}
              <div className="absolute top-2 right-2 z-[5] transition-opacity duration-200 group-hover:opacity-0 bg-background/80 backdrop-blur-sm rounded-md p-1.5">
                <CovexNavIcon className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="aspect-square flex items-center justify-center p-1">
                <div className="w-full h-full rounded-lg bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center">
                  <CovexNavIcon className="w-10 h-10 text-zinc-400" />
                </div>
              </div>
              <div className="p-3">
                <h3 className="truncate font-normal text-sm text-foreground">
                  {p.title || 'Untitled Covex'}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs font-light flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last refined on {new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

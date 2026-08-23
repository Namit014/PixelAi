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
  Loader2, Plus, Clock, ChevronDown, Trash2, Archive,
} from 'lucide-react';
import CosmoNavIcon from '@/assets/icons/cosmo-nav.svg?react';
import { toast } from 'sonner';
import { NewProjectCard } from '@/components/dashboard/NewProjectCard';
import { LandingPromptBox } from '@/components/landing/LandingPromptBox';

interface PresentationRow {
  id: string;
  title: string | null;
  created_at: string;
  is_public?: boolean | null;
  og_image_url?: string | null;
  slides?: any;
}

type StatusFilter = 'all' | 'private' | 'public';
type SortKey = 'recent' | 'date' | 'title';

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'private', label: 'Private' },
  { key: 'public', label: 'Public' },
];
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'date', label: 'Date Created' },
  { key: 'title', label: 'Title' },
];

const matches = (p: PresentationRow, f: StatusFilter) => {
  if (f === 'all') return true;
  if (f === 'public') return !!p.is_public;
  if (f === 'private') return !p.is_public;
  return true;
};

// Mini slide preview matching Dashboard.tsx CosmoSlidePreview
function CosmoSlidePreview({ slide }: { slide: any }) {
  const bg = slide?.background?.value || '#f8f8f8';
  const titleBlock = slide?.contentBlocks?.find(
    (b: any) => b.type === 'title' || b.type === 'subtitle',
  );
  const titleText = titleBlock?.text || '';

  return (
    <div
      className="w-full h-full rounded-lg flex items-center justify-center p-4 overflow-hidden"
      style={{ background: bg }}
    >
      {titleText ? (
        <p className="text-[10px] text-center font-medium line-clamp-3 text-foreground/70">
          {titleText.slice(0, 80)}
        </p>
      ) : (
        <CosmoNavIcon className="w-10 h-10 text-muted-foreground/30" />
      )}
    </div>
  );
}

export const CosmoLandingView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<PresentationRow[]>([]);
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
        .from('presentations')
        .select('id, title, created_at, is_public, og_image_url, slides')
        .eq('user_id', user.id)
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
      const title = opening?.trim()?.slice(0, 60) || 'Untitled Presentation';
      const { data, error } = await supabase
        .from('presentations')
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (error) throw error;
      const params = new URLSearchParams({ presentationId: data.id });
      if (opening?.trim()) params.set('prompt', opening.trim());
      navigate(`/cosmo/editor?${params.toString()}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Could not create presentation');
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
    if (!window.confirm('Delete this presentation? This cannot be undone.')) return;
    const prev = projects;
    setProjects((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from('presentations').delete().eq('id', id);
    if (error) {
      setProjects(prev);
      toast.error(error.message);
    } else {
      toast.success('Presentation deleted');
    }
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
            Cosmo
          </span>
        </h1>
        <p className="text-zinc-500 mt-3 max-w-md mx-auto text-sm leading-relaxed">
          Turn raw product photos into stunning 4K professional images — powered by AI.
        </p>
      </div>

      {/* Rich intake */}
      <LandingPromptBox
        value={intakeText}
        onChange={setIntakeText}
        onSubmit={() => startNew(intakeText)}
        placeholder="What kind of product shoot do you want to create?"
        busy={creating}
        actionLabel="Open Studio"
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
          <Plus className="w-3 h-3" /> New Studio Session
        </Button>
      </div>

      {/* Projects grid — matches Canvas dashboard card style */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          <NewProjectCard onClick={() => startNew()} />
          {visible.map((p, index) => (
            <Card
              key={p.id}
              className="group relative cursor-pointer overflow-hidden border border-zinc-200 bg-white hover-lift transition-all duration-300 animate-in fade-in-0"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={async () => {
                try {
                  const { data: orig, error: fetchErr } = await supabase
                    .from('presentations')
                    .select('*')
                    .eq('id', p.id)
                    .single();
                  if (fetchErr || !orig) throw fetchErr || new Error('Could not find original presentation');

                  const { data: newPres, error: insertErr } = await supabase
                    .from('presentations')
                    .insert({
                      user_id: user?.id,
                      title: orig.title ? `${orig.title} (Copy)` : 'Untitled Presentation (Copy)',
                      theme_id: orig.theme_id,
                      design_tokens: orig.design_tokens,
                      slides: orig.slides,
                    })
                    .select()
                    .single();
                  if (insertErr || !newPres) throw insertErr || new Error('Could not create cloned presentation');

                  toast.success('Cloned into new Studio session!');
                  navigate(`/cosmo/editor?presentationId=${newPres.id}`);
                } catch (e: any) {
                  console.error(e);
                  toast.error(e.message || 'Failed to copy presentation');
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
                <CosmoNavIcon className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="aspect-square flex items-center justify-center p-1">
                {p.og_image_url ? (
                  <img src={p.og_image_url} alt={p.title || ''} className="w-full h-full rounded-lg object-cover" />
                ) : Array.isArray(p.slides) && p.slides[0] ? (
                  <CosmoSlidePreview slide={p.slides[0]} />
                ) : (
                  <div className="w-full h-full rounded-lg bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center">
                    <CosmoNavIcon className="w-10 h-10 text-zinc-400" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="truncate font-normal text-sm text-foreground">
                  {p.title || 'Untitled Studio Session'}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs font-light flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

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
import ThinkIcon from '@/assets/icons/think.svg?react';
import { toast } from 'sonner';
import { NewProjectCard } from '@/components/dashboard/NewProjectCard';
import { LandingPromptBox, LandingMode } from '@/components/landing/LandingPromptBox';

interface ThinkRow {
  id: string;
  title: string | null;
  created_at: string;
  updated_at?: string | null;
}

type SortKey = 'recent' | 'date' | 'title';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'date', label: 'Date Created' },
  { key: 'title', label: 'Title' },
];

export const ThinkLandingView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<ThinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [intakeText, setIntakeText] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [mode, setMode] = useState<LandingMode>('creative-intelligence');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('think_conversations')
        .select('id, title, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(48);
      if (!cancelled) {
        setProjects((data ?? []) as any);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const startNew = (opening?: string) => {
    if (opening?.trim()) {
      localStorage.setItem('thinkPrompt', opening.trim());
    }
    localStorage.setItem('cogentMode', mode);
    navigate('/cogent/chat');
  };

  const openConversation = (id: string) => {
    navigate(`/cogent/chat?conversationId=${id}`);
  };

  const visible = useMemo(() => {
    const sorted = [...projects];
    sorted.sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      const aT = sortBy === 'recent' ? new Date(a.updated_at || a.created_at).getTime() : new Date(a.created_at).getTime();
      const bT = sortBy === 'recent' ? new Date(b.updated_at || b.created_at).getTime() : new Date(b.created_at).getTime();
      return bT - aT;
    });
    return sorted;
  }, [projects, sortBy]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    const prev = projects;
    setProjects((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from('think_conversations').delete().eq('id', id);
    if (error) {
      setProjects(prev);
      toast.error(error.message);
    } else {
      toast.success('Conversation deleted');
    }
  };

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
            Cogent
          </span>
        </h1>
        <p className="text-zinc-500 mt-3 max-w-md mx-auto text-sm leading-relaxed">
          Your creative intelligence — research, brainstorm and plan with AI that understands your brand.
        </p>
      </div>

      {/* Rich intake */}
      <LandingPromptBox
        value={intakeText}
        onChange={setIntakeText}
        onSubmit={() => startNew(intakeText)}
        placeholder="What do you want to think about today…"
        actionLabel="Cogent"
        mode={mode}
        onModeChange={setMode}
      />

      {/* Filters row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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

        <Button size="sm" variant="outline" onClick={() => startNew()} className="gap-2 text-xs font-normal">
          <Plus className="w-3 h-3" /> New Conversation
        </Button>
      </div>

      {/* Projects grid — matches Canvas dashboard card style */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          <NewProjectCard onClick={() => startNew()} />
          {visible.map((p, index) => (
            <Card
              key={p.id}
              className="group relative cursor-pointer overflow-hidden border border-zinc-200 bg-white hover-lift transition-all duration-300 animate-in fade-in-0"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => openConversation(p.id)}
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
                <ThinkIcon className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="aspect-square flex items-center justify-center p-1">
                <div className="w-full h-full rounded-lg bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center">
                  <ThinkIcon className="w-10 h-10 text-zinc-400" />
                </div>
              </div>
              <div className="p-3">
                <h3 className="truncate font-normal text-sm text-foreground">
                  {p.title || 'Untitled Conversation'}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs font-light flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last refined on {new Date(p.updated_at || p.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

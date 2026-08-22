import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePresentationStore } from '@/stores/presentationStore';
import type { ContentBlock } from '@/types/presentation';
import { useToast } from '@/hooks/use-toast';

interface SavedComponent {
  id: string;
  name: string;
  category: string | null;
  block_data: any;
  description: string | null;
  tags: string[] | null;
  usage_count: number;
}

export function ComponentsPanel({ onClose }: { onClose?: () => void }) {
  const [components, setComponents] = useState<SavedComponent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const activeSlideId = usePresentationStore((s) => s.activeSlideId);
  const addBlockToSlide = usePresentationStore((s) => s.addBlockToSlide);

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) { setLoading(false); return; }

    const { data } = await supabase
      .from('cosmo_components')
      .select('*')
      .eq('user_id', session.session.user.id)
      .order('usage_count', { ascending: false });

    if (data) setComponents(data as SavedComponent[]);
    setLoading(false);
  };

  const insertComponent = async (comp: SavedComponent) => {
    if (!activeSlideId) {
      toast({ title: 'Select a slide first', variant: 'destructive' });
      return;
    }

    const block: ContentBlock = {
      ...comp.block_data,
      id: crypto.randomUUID(),
      componentId: comp.id,
    };
    addBlockToSlide(activeSlideId, block);

    // Increment usage count
    await supabase
      .from('cosmo_components')
      .update({ usage_count: comp.usage_count + 1 })
      .eq('id', comp.id);

    toast({ title: `Inserted "${comp.name}"` });
  };

  const deleteComponent = async (id: string) => {
    await supabase.from('cosmo_components').delete().eq('id', id);
    setComponents((prev) => prev.filter((c) => c.id !== id));
    toast({ title: 'Component deleted' });
  };

  const filtered = components.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase()) ||
    c.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="absolute left-16 top-4 bottom-[100px] w-[260px] z-40 bg-white dark:bg-card rounded-xl border border-border/50 shadow-lg flex flex-col animate-in slide-in-from-left-2 duration-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" /> Components
        </span>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components..."
            className="h-7 text-[10px] pl-7 bg-muted/30 border-0"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 pb-3 space-y-1">
          {loading ? (
            <p className="text-[10px] text-muted-foreground text-center py-4">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <Package className="w-8 h-8 mx-auto text-muted-foreground/30" />
              <p className="text-[10px] text-muted-foreground">
                {components.length === 0
                  ? 'No saved components yet. Select a block and use "Save as Component" to create one.'
                  : 'No matches found.'}
              </p>
            </div>
          ) : (
            filtered.map((comp) => (
              <div
                key={comp.id}
                className="group flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => insertComponent(comp)}
              >
                <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                  {comp.block_data?.type?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-foreground truncate">{comp.name}</div>
                  <div className="text-[9px] text-muted-foreground truncate">
                    {comp.category || comp.block_data?.type} · {comp.usage_count} uses
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteComponent(comp.id); }}
                  className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

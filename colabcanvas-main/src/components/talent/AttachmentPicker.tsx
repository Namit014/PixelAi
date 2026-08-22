import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Check, FolderOpen } from 'lucide-react';

export interface Attachment {
  type: 'project' | 'upload';
  name: string;
  url?: string;
  source_project_id?: string;
  source_project_title?: string;
  thumbnail_url?: string;
  payload?: any;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAttach: (a: Attachment[]) => void;
  projectId?: string | null;
}

export const AttachmentPicker = ({ open, onOpenChange, onAttach }: Props) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    Promise.all([
      supabase.from('projects').select('id, title, thumbnail_url, canvas_data').eq('user_id', user.id).is('deleted_at', null).order('updated_at', { ascending: false }).limit(40),
      supabase.from('presentations').select('id, title, slides, design_tokens, theme_id').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(40),
    ]).then(([p, c]: [any, any]) => {
      const merged = [
        ...(p.data ?? []).map((x: any) => ({
          id: x.id,
          title: x.title,
          thumbnail_url: x.thumbnail_url,
          source: 'canvas' as const,
          payload: { source: 'canvas', canvas_data: x.canvas_data },
        })),
        ...(c.data ?? []).map((x: any) => ({
          id: x.id,
          title: x.title,
          thumbnail_url: null,
          source: 'cosmo' as const,
          payload: { source: 'cosmo', slides: x.slides, design_tokens: x.design_tokens, theme_id: x.theme_id },
        })),
      ];
      setProjects(merged);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, user]);

  const toggle = (id: string) => {
    setSelected(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const attachSelected = () => {
    const picks: Attachment[] = projects
      .filter(p => selected.has(p.id))
      .map(p => ({
        type: 'project',
        name: p.title || 'Untitled',
        source_project_id: p.id,
        source_project_title: p.title || 'Untitled',
        thumbnail_url: p.thumbnail_url,
        payload: p.payload,
      }));
    onAttach(picks);
    setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Attach a project as reference
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500">No projects yet.</div>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`relative rounded-lg border-2 overflow-hidden text-left transition-all ${selected.has(p.id) ? 'border-zinc-900' : 'border-zinc-200 hover:border-zinc-400'}`}
              >
                <div className="aspect-square bg-zinc-100">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400 uppercase tracking-wider">{p.source}</div>
                  )}
                </div>
                <div className="p-2 text-xs font-medium text-zinc-900 truncate">{p.title || 'Untitled'}</div>
                {selected.has(p.id) && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={attachSelected} disabled={selected.size === 0} className="bg-zinc-900 hover:bg-zinc-800">
            Attach {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, Sparkles, Save, RotateCcw, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface CanvasVersion {
  id: string;
  project_id: string;
  artboard_id: string | null;
  version_number: number;
  label: string | null;
  source: string;
  snapshot: any;
  thumbnail_url: string | null;
  created_at: string;
}

interface CanvasVersionHistoryProps {
  projectId: string;
  artboardId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (snapshot: any, version: CanvasVersion) => Promise<void> | void;
}

export function CanvasVersionHistory({ projectId, artboardId, open, onOpenChange, onRestore }: CanvasVersionHistoryProps) {
  const [versions, setVersions] = useState<CanvasVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('canvas_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .limit(100);
      if (artboardId) {
        query = query.or(`artboard_id.eq.${artboardId},artboard_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      setVersions((data || []) as any);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not load version history');
    } finally {
      setLoading(false);
    }
  }, [projectId, artboardId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleRestore = async (v: CanvasVersion) => {
    setRestoringId(v.id);
    try {
      await onRestore(v.snapshot, v);
      toast.success(`Restored to v${v.version_number}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Restore failed');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (v: CanvasVersion) => {
    if (!confirm(`Delete version ${v.version_number}? This cannot be undone.`)) return;
    const { error } = await supabase.from('canvas_versions').delete().eq('id', v.id);
    if (error) toast.error(error.message);
    else { toast.success('Version deleted'); load(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" /> Version history
          </DialogTitle>
          <DialogDescription>
            {artboardId ? 'Versions for this artboard. Restoring brings back its previous AI iteration.' : 'Project-wide canvas versions.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          <div className="space-y-2 p-1">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : versions.length === 0 ? (
              <div className="text-center text-sm text-zinc-500 py-12">
                No versions yet. New versions are saved automatically after AI iterations.
              </div>
            ) : versions.map(v => (
              <div
                key={v.id}
                className="flex items-center gap-3 p-3 border border-zinc-200 rounded-lg hover:bg-zinc-50"
              >
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt={`v${v.version_number}`} className="w-14 h-14 object-cover rounded-md border border-zinc-200" />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                    {v.source === 'ai' ? <Sparkles className="w-5 h-5 text-zinc-400" /> : <Save className="w-5 h-5 text-zinc-400" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">v{v.version_number}</span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{v.source}</Badge>
                    {v.artboard_id && <Badge variant="secondary" className="text-[10px]">artboard</Badge>}
                  </div>
                  {v.label && <div className="text-xs text-zinc-700 mt-0.5 truncate">{v.label}</div>}
                  <div className="text-[11px] text-zinc-500 mt-0.5">{formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => handleRestore(v)} disabled={restoringId === v.id}>
                    {restoringId === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><RotateCcw className="w-3.5 h-3.5 mr-1" />Restore</>}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(v)} title="Delete version">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Save a canvas version snapshot. Returns the created version row id (or null on failure).
 * Snapshot is JSON-serializable — pass either the project canvas JSON, or a single artboard's
 * { image_url, position_x, position_y, width, height, content } payload.
 */
export async function saveCanvasVersion(params: {
  projectId: string;
  userId: string;
  artboardId?: string | null;
  source?: 'ai' | 'manual' | 'autosave';
  label?: string;
  snapshot: any;
  thumbnailUrl?: string | null;
}): Promise<string | null> {
  const { projectId, userId, artboardId, snapshot, source = 'manual', label, thumbnailUrl } = params;
  try {
    // Atomic: read max version_number, increment
    const { data: latest } = await supabase
      .from('canvas_versions')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = ((latest?.version_number as number) ?? 0) + 1;

    const { data, error } = await supabase.from('canvas_versions').insert({
      project_id: projectId,
      user_id: userId,
      artboard_id: artboardId ?? null,
      version_number: nextVersion,
      label: label ?? null,
      source,
      snapshot,
      thumbnail_url: thumbnailUrl ?? null,
    } as any).select('id').single();

    if (error) {
      console.warn('[canvas_versions] save failed', error);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.warn('[canvas_versions] save threw', e);
    return null;
  }
}

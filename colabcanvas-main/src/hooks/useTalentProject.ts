import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TalentProject {
  id: string;
  user_id: string;
  title: string | null;
  brief: any;
  extracted: any;
  team_composition: any;
  timeline: any;
  pricing: any;
  explanation: any;
  controls: any;
  status: string;
  created_at: string;
}

export const useTalentProject = (projectId?: string) => {
  const [project, setProject] = useState<TalentProject | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (showLoader = false) => {
    if (!projectId) return;
    if (showLoader) setLoading(true);
    const { data, error } = await supabase.from('talent_projects').select('*').eq('id', projectId).maybeSingle();
    if (error) toast.error(error.message);
    else setProject(data as any);
    if (showLoader) setLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    refresh(false).finally(() => setLoading(false));
  }, [projectId, refresh]);

  const update = useCallback(async (patch: Partial<TalentProject>) => {
    if (!projectId) return;
    setProject(p => p ? { ...p, ...patch } as TalentProject : p);
    const { error } = await supabase.from('talent_projects').update(patch as any).eq('id', projectId);
    if (error) toast.error(error.message);
  }, [projectId]);

  return { project, loading, refresh, update };
};

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TalentMessage {
  id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'ai' | 'system';
  kind: 'text' | 'file' | 'link' | 'question' | 'meeting' | 'system_link' | 'ai_note' | 'budget_change';
  content: string;
  metadata: any;
  created_at: string;
}

export const useTalentMessages = (projectId?: string) => {
  const [messages, setMessages] = useState<TalentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data } = await supabase
      .from('talent_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (data) {
      seenIds.current = new Set(data.map((m: any) => m.id));
      setMessages(data as any);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`talent_messages:${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'talent_messages',
        filter: `project_id=eq.${projectId}`,
      }, (payload) => {
        const m = payload.new as TalentMessage;
        if (seenIds.current.has(m.id)) return;
        seenIds.current.add(m.id);
        setMessages(prev => [...prev, m]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const send = useCallback(async (content: string, kind: TalentMessage['kind'] = 'text', metadata: any = {}) => {
    if (!projectId || !content.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    await supabase.from('talent_messages').insert({
      project_id: projectId,
      user_id: u.user.id,
      role: 'user',
      kind,
      content: content.trim(),
      metadata,
    } as any);
  }, [projectId]);

  return { messages, loading, refresh, send };
};

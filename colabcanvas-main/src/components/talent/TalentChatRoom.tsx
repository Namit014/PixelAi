import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, Video, Calendar, FileText, ArrowRight, Users, LayoutGrid, Download, Mail, Paperclip,
} from 'lucide-react';
import { useTalentMessages, type TalentMessage } from '@/hooks/useTalentMessages';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScheduleCallSheet } from './ScheduleCallSheet';

interface Props {
  projectId: string;
  onJoinCall?: (roomCode: string) => void;
  roles?: any[];
}

const PLACEHOLDER_MEMBERS = [
  { name: 'Magic Wander', role: 'Junior Graphic Designer' },
  { name: 'Wonder Woman', role: 'Art Director' },
];

export const TalentChatRoom = ({ projectId, onJoinCall, roles = [] }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, loading, send } = useTalentMessages(projectId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await send(text);
      setText('');
    } finally {
      setSending(false);
    }
  };

  const startCallNow = async () => {
    setStarting(true);
    try {
      // Omit scheduled_for so the edge function treats it as instant.
      const { data, error } = await supabase.functions.invoke('talent-create-meeting', {
        body: {
          project_id: projectId,
          title: 'Working session',
          duration_min: 30,
        },
      });
      if (error) throw error;
      const code = (data as any)?.meeting?.room_code ?? (data as any)?.room_code;
      if (code) onJoinCall?.(code);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not start call');
    } finally {
      setStarting(false);
    }
  };

  const onAttach = async (file: File | null) => {
    if (!file) return;
    try {
      const path = `${projectId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('talent-contracts').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from('talent-contracts').createSignedUrl(path, 60 * 60 * 24 * 7);
      await send(`📎 Attached: ${file.name}\n${signed?.signedUrl ?? ''}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not attach file');
    }
  };

  // Use real assigned freelancers from curation when present (`assignee: { name, avatar_url }`).
  const teamMembers = roles.length > 0
    ? roles.flatMap((r: any) => {
        const a = r.assignee || r.freelancer;
        const fallbackName = `${r.seniority ?? ''} ${r.role ?? 'Designer'}`.trim();
        return Array.from({ length: r.count || 1 }).map(() => ({
          name: a?.name || a?.full_name || fallbackName,
          role: r.role || 'Designer',
          avatar_url: a?.avatar_url ?? null,
        }));
      }).slice(0, 6)
    : PLACEHOLDER_MEMBERS.map((p) => ({ ...p, avatar_url: null }));

  const renderMessage = (m: TalentMessage) => {
    const mine = m.user_id === user?.id;

    if (m.kind === 'meeting') {
      const code = m.metadata?.room_code;
      return (
        <div key={m.id} className="flex justify-start">
          <div className="rounded-2xl bg-zinc-50 border border-zinc-200 px-4 py-3 flex items-center justify-between gap-4 max-w-md w-full">
            <div className="text-sm text-zinc-700">{m.content || 'Your shared design workspace is ready.'}</div>
            {code && (
              <button
                onClick={() => onJoinCall?.(code)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 text-xs text-zinc-900 hover:border-zinc-400 shrink-0"
              >
                <Video className="w-3.5 h-3.5" /> Join Call
              </button>
            )}
          </div>
        </div>
      );
    }

    if (m.kind === 'budget_change') {
      const md = m.metadata || {};
      const cur = md.currency || 'USD';
      const isCut = (md.delta ?? 0) < 0;
      const isAdd = (md.delta ?? 0) > 0;
      const action = md.action_required as 'refund' | 'top_up' | 'none' | undefined;
      return (
        <div key={m.id} className="flex justify-start">
          <div className="rounded-2xl bg-white border border-zinc-200 px-4 py-3 max-w-md w-full space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Plan updated</div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-zinc-400 line-through">{cur} {Number(md.old_total ?? 0).toLocaleString()}</span>
              <span className="text-lg font-semibold text-zinc-900">{cur} {Number(md.new_total ?? 0).toLocaleString()}</span>
              <span className={`text-xs font-medium ${isCut ? 'text-emerald-600' : isAdd ? 'text-amber-600' : 'text-zinc-500'}`}>
                {isCut ? '−' : isAdd ? '+' : ''} {cur} {Math.abs(Number(md.delta ?? 0)).toLocaleString()}
              </span>
            </div>
            {Array.isArray(md.team) && md.team.length > 0 && (
              <div className="text-xs text-zinc-600">
                {md.team.map((r: any, i: number) => (
                  <span key={i}>{i > 0 ? ' · ' : ''}{r.count}× {r.seniority} {r.role}</span>
                ))}
                {md.timeline_weeks ? ` · ${md.timeline_weeks}w` : ''}
              </div>
            )}
            {md.tradeoffs && (
              <div className="text-xs text-zinc-600 leading-relaxed">{md.tradeoffs}</div>
            )}
            {action === 'refund' && (
              <div className="text-xs text-emerald-700 bg-emerald-50 rounded-md px-2.5 py-1.5">
                {cur} {Number(md.action_amount ?? 0).toLocaleString()} refunded to your wallet — withdraw or reuse anytime.
              </div>
            )}
            {action === 'top_up' && (
              <div className="text-xs text-amber-700 bg-amber-50 rounded-md px-2.5 py-1.5">
                Pay only the extra {cur} {Number(md.action_amount ?? 0).toLocaleString()} to lock the new scope.
              </div>
            )}
            {action === 'none' && (
              <div className="text-xs text-zinc-500">No payment yet — pricing simply updated.</div>
            )}
          </div>
        </div>
      );
    }

    if (m.kind === 'system_link') {
      const linkedId = m.metadata?.project_id;
      return (
        <div key={m.id} className="flex justify-start">
          <div className="rounded-2xl bg-zinc-50 border border-zinc-200 px-4 py-3 flex items-center justify-between gap-4 max-w-md w-full">
            <div className="text-sm text-zinc-700">{m.content || 'Your shared design workspace is ready.'}</div>
            {linkedId && (
              <button
                onClick={() => navigate(`/canvas?project=${linkedId}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 text-white text-xs hover:bg-zinc-800 shrink-0"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Open Workspace
              </button>
            )}
          </div>
        </div>
      );
    }

    if ((m.kind as string) === 'mom_document') {
      const md = m.metadata || {};
      const url = md.document_url;
      const title = md.title || 'Minutes of meeting';
      const emailedTo = Array.isArray(md.emailed_to) ? md.emailed_to.length : 0;
      return (
        <div key={m.id} className="flex justify-start">
          <div className="rounded-2xl bg-white border border-zinc-200 px-4 py-3 max-w-md w-full space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-700" />
              <div className="text-sm font-medium text-zinc-900">{title}</div>
            </div>
            {m.content && (
              <div className="text-xs text-zinc-600 leading-relaxed line-clamp-3">{m.content}</div>
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 text-xs text-zinc-900 hover:border-zinc-400"
                >
                  <Download className="w-3.5 h-3.5" /> Download MoM
                </a>
              ) : <span />}
              {emailedTo > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                  <Mail className="w-3 h-3" /> Emailed to {emailedTo} {emailedTo === 1 ? 'person' : 'people'}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (m.kind === 'ai_note') {
      return (
        <div key={m.id} className="flex justify-start">
          <div className="rounded-2xl bg-zinc-100 px-4 py-3 max-w-2xl text-sm text-zinc-800 whitespace-pre-wrap">
            {m.content}
            {Array.isArray(m.metadata?.action_items) && m.metadata.action_items.length > 0 && (
              <div className="mt-2 pt-2 border-t border-zinc-200">
                <div className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Action items</div>
                <ul className="text-xs text-zinc-700 space-y-0.5 list-disc pl-4">
                  {m.metadata.action_items.slice(0, 6).map((a: any, i: number) => (
                    <li key={i}>{typeof a === 'string' ? a : a.text || a.title}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
        <div
          className={cn(
            'max-w-[75%] px-4 py-3 rounded-2xl text-sm',
            mine ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-800',
          )}
        >
          {m.content}
        </div>
      </div>
    );
  };

  return (
    // Fills the workspace shell; only the messages list scrolls.
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_280px]">
      {/* CHAT COLUMN */}
      <div className="flex flex-col min-h-0 p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h3 className="font-medium text-zinc-900">Project Chat</h3>
          <div className="flex items-center gap-5">
            <button
              onClick={() => setScheduleOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-700 hover:text-zinc-900"
            >
              <Calendar className="w-4 h-4" /> Schedule
            </button>
            <button
              onClick={startCallNow}
              disabled={starting}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-700 hover:text-zinc-900"
            >
              {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
              Start Call
            </button>
          </div>
        </div>

        {/* Scrolling message list */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-sm text-zinc-500">
              <FileText className="w-6 h-6 text-zinc-300 mb-2" />
              Say hi to your team. They'll respond here.
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          <div ref={endRef} />
        </div>

        {/* Sticky composer pinned to the bottom of the chat panel.
            Padding is symmetric (p-2) so left/right matches bottom — fixes the asymmetric padding bug. */}
        <div className="mt-4 shrink-0 rounded-3xl border border-zinc-200 bg-white p-2 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => { onAttach(e.target.files?.[0] ?? null); e.target.value = ''; }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-500 hover:border-zinc-400 shrink-0"
            aria-label="Attach a project as reference"
            title="Attach a project as reference"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message your team"
            rows={1}
            className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-1 min-h-[40px] max-h-[120px] bg-transparent text-sm placeholder:text-zinc-400"
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 disabled:opacity-40 shrink-0"
            aria-label="Send"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* TEAM PANEL */}
      <div className="border-t lg:border-t-0 lg:border-l border-zinc-100 p-7 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="inline-flex items-center gap-2 text-zinc-700">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium text-zinc-900">Your team</span>
          </div>
          <button className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-700 hover:border-zinc-400">
            Reassign team
          </button>
        </div>
        <div className="space-y-4">
          {teamMembers.map((m, i) => (
            <div key={i} className="flex items-center gap-3">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.name} className="w-9 h-9 rounded-lg object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-600">
                  {m.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-zinc-900">{m.name}</div>
                <div className="text-xs text-zinc-500">{m.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ScheduleCallSheet
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        projectId={projectId}
      />
    </div>
  );
};

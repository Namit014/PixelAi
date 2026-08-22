import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, Calendar, Video, FileText, CheckCircle2, MessageSquare, Tag, Copy, ExternalLink, CalendarPlus,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { buildIcs, downloadIcs, googleCalUrl, meetingJoinUrl } from '@/lib/ics';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TimelineEvent {
  id: string;
  ts: string;
  kind: 'meeting' | 'mom' | 'message' | 'budget' | 'milestone' | 'system';
  title: string;
  body?: string;
  meta?: any;
}

export const TimelineFeed = ({ projectId }: { projectId: string }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: msgs }, { data: meetings }, { data: escrows }] = await Promise.all([
        supabase
          .from('talent_messages')
          .select('id, kind, content, metadata, created_at, role')
          .eq('project_id', projectId)
          .in('kind', ['meeting', 'mom_document', 'budget_change', 'system_link'])
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('talent_meetings')
          .select('id, title, status, scheduled_for, started_at, ended_at, room_code, duration_min, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('talent_escrow')
          .select('id, amount, status, milestone_label, locked_at, released_at, refunded_at, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
      ]);

      const evs: TimelineEvent[] = [];

      (meetings ?? []).forEach((m: any) => {
        const future = m.scheduled_for && new Date(m.scheduled_for) > new Date();
        evs.push({
          id: `meet-${m.id}`,
          ts: m.scheduled_for || m.created_at,
          kind: 'meeting',
          title: future ? `Upcoming: ${m.title}` : m.ended_at ? `Call ended · ${m.title}` : m.title,
          body: m.scheduled_for ? format(new Date(m.scheduled_for), 'PPp') : undefined,
          meta: {
            room_code: m.room_code,
            status: m.status,
            ended: !!m.ended_at,
            scheduled_for: m.scheduled_for,
            duration_min: m.duration_min || 30,
            meeting_id: m.id,
            meeting_title: m.title,
          },
        });
      });

      (msgs ?? []).forEach((m: any) => {
        if (m.kind === 'mom_document') {
          evs.push({
            id: `mom-${m.id}`,
            ts: m.created_at,
            kind: 'mom',
            title: m.metadata?.title || 'Minutes of meeting',
            body: m.content || undefined,
            meta: m.metadata,
          });
        } else if (m.kind === 'budget_change') {
          const md = m.metadata || {};
          const cur = md.currency || 'USD';
          const delta = Number(md.delta ?? 0);
          evs.push({
            id: `bg-${m.id}`,
            ts: m.created_at,
            kind: 'budget',
            title: `Budget ${delta >= 0 ? 'increased' : 'reduced'} by ${cur} ${Math.abs(delta).toLocaleString()}`,
            body: md.tradeoffs,
          });
        } else if (m.kind === 'system_link') {
          evs.push({ id: `sys-${m.id}`, ts: m.created_at, kind: 'system', title: m.content || 'Workspace updated' });
        }
      });

      (escrows ?? []).forEach((e: any) => {
        if (e.locked_at) {
          evs.push({
            id: `esc-l-${e.id}`,
            ts: e.locked_at,
            kind: 'milestone',
            title: `Locked $${Number(e.amount).toLocaleString()} in escrow`,
            body: e.milestone_label || undefined,
          });
        }
        if (e.released_at) {
          evs.push({
            id: `esc-r-${e.id}`,
            ts: e.released_at,
            kind: 'milestone',
            title: `Released $${Number(e.amount).toLocaleString()} to designer`,
            body: e.milestone_label || undefined,
          });
        }
      });

      evs.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      if (!cancelled) {
        setEvents(evs);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const Icon = (k: TimelineEvent['kind']) => {
    if (k === 'meeting') return Video;
    if (k === 'mom') return FileText;
    if (k === 'budget') return Tag;
    if (k === 'milestone') return CheckCircle2;
    if (k === 'message') return MessageSquare;
    return Calendar;
  };

  const copyJoin = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Join link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const renderMeetingActions = (e: TimelineEvent) => {
    const meta = e.meta || {};
    if (!meta.room_code) return null;
    const url = meetingJoinUrl(projectId, meta.room_code);
    const startISO = meta.scheduled_for || new Date().toISOString();
    const isUpcoming = !meta.ended && (meta.status === 'scheduled' || (meta.scheduled_for && new Date(meta.scheduled_for) > new Date()));
    const ev = {
      uid: meta.meeting_id || meta.room_code,
      title: meta.meeting_title || e.title,
      description: `Join the call: ${url}`,
      startISO,
      durationMin: Number(meta.duration_min) || 30,
      url,
      location: url,
    };

    return (
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {!meta.ended && (
          <a
            href={url}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-zinc-200 text-[11px] text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50"
          >
            <Video className="w-3 h-3" /> Join call
          </a>
        )}
        <button
          onClick={() => copyJoin(url)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-zinc-200 text-[11px] text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50"
        >
          <Copy className="w-3 h-3" /> Copy link
        </button>
        {isUpcoming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-zinc-200 text-[11px] text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50">
                <CalendarPlus className="w-3 h-3" /> Add to calendar
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              <DropdownMenuItem onClick={() => window.open(googleCalUrl(ev), '_blank')}>
                <ExternalLink className="w-3 h-3 mr-2" /> Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadIcs(`meeting-${ev.uid}.ics`, buildIcs(ev))}>
                <FileText className="w-3 h-3 mr-2" /> Apple / Outlook (.ics)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>;
  }
  if (!events.length) {
    return (
      <div className="text-center py-12 text-sm text-zinc-500">
        <Calendar className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
        Updates, invites and milestones appear here as they happen.
      </div>
    );
  }
  return (
    <div className="space-y-1 relative pl-6">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-100" />
      {events.map((e) => {
        const I = Icon(e.kind);
        return (
          <div key={e.id} className="relative py-3">
            <div className="absolute -left-[18px] top-3.5 w-5 h-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center">
              <I className="w-2.5 h-2.5 text-zinc-500" />
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-sm text-zinc-900 font-medium">{e.title}</div>
              <div className="text-[11px] text-zinc-400 shrink-0">
                {formatDistanceToNow(new Date(e.ts), { addSuffix: true })}
              </div>
            </div>
            {e.body && <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{e.body}</div>}
            {e.kind === 'meeting' && renderMeetingActions(e)}
            {e.kind === 'mom' && e.meta?.url && (
              <div className="mt-2">
                <a
                  href={e.meta.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-zinc-200 text-[11px] text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50"
                >
                  <FileText className="w-3 h-3" /> Open minutes
                </a>
                {Array.isArray(e.meta.emailed_to) && e.meta.emailed_to.length > 0 && (
                  <div className="text-[10px] text-zinc-400 mt-1">
                    Emailed to {e.meta.emailed_to.length} {e.meta.emailed_to.length === 1 ? 'person' : 'people'}
                    {e.meta.cc_rumi ? ' · CC RUMi' : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

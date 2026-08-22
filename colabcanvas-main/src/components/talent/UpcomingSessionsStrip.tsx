import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Video, Copy, CalendarPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { buildIcs, downloadIcs, googleCalUrl, meetingJoinUrl } from '@/lib/ics';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UpcomingMeeting {
  id: string;
  title: string;
  scheduled_for: string;
  duration_min: number | null;
  room_code: string;
}

export const UpcomingSessionsStrip = ({ projectId }: { projectId: string }) => {
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('talent_meetings')
        .select('id, title, scheduled_for, duration_min, room_code, ended_at')
        .eq('project_id', projectId)
        .gt('scheduled_for', new Date().toISOString())
        .is('ended_at', null)
        .order('scheduled_for', { ascending: true })
        .limit(5);
      if (cancelled) return;
      setMeetings(((data as any[]) ?? []).map(m => ({
        id: m.id,
        title: m.title,
        scheduled_for: m.scheduled_for,
        duration_min: m.duration_min ?? 30,
        room_code: m.room_code,
      })));
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  if (meetings.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-zinc-700">
        <Calendar className="w-4 h-4" />
        <h2 className="font-medium text-zinc-900">Upcoming sessions</h2>
      </div>
      <div className="space-y-2">
        {meetings.map((m) => {
          const startDate = new Date(m.scheduled_for);
          const dur = m.duration_min || 30;
          const join = meetingJoinUrl(projectId, m.room_code);
          const ev = {
            uid: `meeting-${m.id}`,
            title: m.title,
            description: `Talent meeting · Join: ${join}`,
            startISO: m.scheduled_for,
            durationMin: dur,
            url: join,
          };
          return (
            <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-900 truncate">{m.title}</div>
                  <div className="text-xs text-zinc-500">
                    {formatDistanceToNow(startDate, { addSuffix: true })} · {dur} min
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={join}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
                >
                  <Video className="w-3 h-3" /> Join
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(join);
                    toast.success('Link copied');
                  }}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                      <CalendarPlus className="w-3 h-3" /> Calendar
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href={googleCalUrl(ev)} target="_blank" rel="noreferrer">Google Calendar</a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadIcs(`${m.title}.ics`, buildIcs(ev))}>
                      Apple / Outlook (.ics)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * iCal (.ics) + Google Calendar URL helpers for meeting export.
 * Pure client-side — no third-party deps.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Format Date → ICS UTC: YYYYMMDDTHHmmssZ */
export function toIcsUtc(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/** Escape ICS text per RFC5545 */
function esc(s: string): string {
  return (s || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export interface CalendarEvent {
  uid: string;
  title: string;
  description?: string;
  startISO: string;
  durationMin: number;
  url?: string;
  location?: string;
}

export function buildIcs(ev: CalendarEvent): string {
  const start = new Date(ev.startISO);
  const end = new Date(start.getTime() + Math.max(5, ev.durationMin) * 60_000);
  const stamp = toIcsUtc(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Colab Companion//Talent Meetings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.uid}@colab`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${esc(ev.title)}`,
    ev.description ? `DESCRIPTION:${esc(ev.description)}` : '',
    ev.url ? `URL:${ev.url}` : '',
    ev.location ? `LOCATION:${esc(ev.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/** Build a Google Calendar event-creation URL */
export function googleCalUrl(ev: CalendarEvent): string {
  const start = new Date(ev.startISO);
  const end = new Date(start.getTime() + Math.max(5, ev.durationMin) * 60_000);
  const dates = `${toIcsUtc(start)}/${toIcsUtc(end)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates,
    details: ev.description || '',
    location: ev.location || ev.url || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Build the canonical join URL for a talent meeting */
export function meetingJoinUrl(projectId: string, roomCode: string, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://app.letscolab.tech');
  return `${base}/talent/projects/${projectId}?room=${encodeURIComponent(roomCode)}`;
}

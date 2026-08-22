import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import rumiIcon from '@/assets/icons/rumi-black.svg';

interface Note { id: string; text: string; ts: number; kind: 'ai' | 'user' }

interface Props {
  meetingId?: string;
  projectId: string;
  transcriptRef: React.MutableRefObject<string>;
  /** Number of remote peers currently on the call. */
  peerCount: number;
  /** True once webrtc has connected. */
  callConnected: boolean;
}

export const RumiCallSidebar = ({
  meetingId,
  projectId,
  transcriptRef,
  peerCount,
  callConnected,
}: Props) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [thinking, setThinking] = useState(false);
  const [question, setQuestion] = useState('');
  const [open, setOpen] = useState(true);
  const lastFlushRef = useRef<number>(0);
  const lastIndexRef = useRef<number>(0);
  const soloSinceRef = useRef<number | null>(null);
  const lastSoloTurnRef = useRef<number>(0);
  const openerSentRef = useRef(false);

  // Free, browser-native TTS — uses window.speechSynthesis.
  // Zero cost, no API key, no edge function. Falls back silently if unsupported.
  const ttsDisabledRef = useRef(false);
  const pickVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    // Prefer a natural English female voice when available.
    const preferred =
      voices.find((v) => /Samantha|Google US English|Jenny|Aria|Karen/i.test(v.name)) ||
      voices.find((v) => /en[-_](US|GB)/i.test(v.lang) && /female/i.test(v.name)) ||
      voices.find((v) => /en[-_]/i.test(v.lang)) ||
      voices[0];
    return preferred ?? null;
  };
  const speak = async (text: string) => {
    if (!text || ttsDisabledRef.current) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      ttsDisabledRef.current = true;
      return;
    }
    try {
      // Cancel anything in-flight so RUMi doesn't pile up overlapping speech.
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = 1.02;
      u.pitch = 1.0;
      u.volume = 1.0;
      window.speechSynthesis.speak(u);
    } catch {
      /* silent */
    }
  };

  // Some browsers load voices async; nudge them once on mount.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const w = window.speechSynthesis;
    if (!w.getVoices().length) {
      w.onvoiceschanged = () => { /* no-op; just trigger cache */ };
    }
    return () => { try { w.cancel(); } catch { /* noop */ } };
  }, []);

  const pushAi = (text: string, alsoSpeak = false) => {
    setNotes((n) => [...n, { id: `ai-${Date.now()}`, text, ts: Date.now(), kind: 'ai' }]);
    if (alsoSpeak) void speak(text);
  };

  // Background observation loop — silent flagging notes (existing behavior).
  useEffect(() => {
    if (!meetingId) return;
    const interval = setInterval(async () => {
      if (peerCount === 0) return; // quiet observer only useful with team present
      const now = Date.now();
      if (now - lastFlushRef.current < 25000) return;
      const full = transcriptRef.current;
      const chunk = full.slice(lastIndexRef.current);
      if (chunk.trim().length < 60) return;
      lastFlushRef.current = now;
      lastIndexRef.current = full.length;
      setThinking(true);
      try {
        const { data } = await supabase.functions.invoke('talent-rumi-meeting-assist', {
          body: { meeting_id: meetingId, project_id: projectId, transcript_chunk: chunk },
        });
        const reply = (data as any)?.note;
        if (reply && reply.trim()) pushAi(reply.trim());
      } catch {
        /* silent */
      } finally {
        setThinking(false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [meetingId, projectId, transcriptRef, peerCount]);

  // Solo takeover: when client is alone, RUMi proactively keeps them engaged.
  useEffect(() => {
    if (!callConnected) return;

    if (peerCount > 0) {
      soloSinceRef.current = null;
      return;
    }

    if (soloSinceRef.current == null) soloSinceRef.current = Date.now();

    const interval = setInterval(async () => {
      if (peerCount > 0) return;
      const aloneFor = Date.now() - (soloSinceRef.current ?? Date.now());

      // Opener after 18s alone
      if (!openerSentRef.current && aloneFor > 18000) {
        openerSentRef.current = true;
        lastSoloTurnRef.current = Date.now();
        setThinking(true);
        try {
          const { data } = await supabase.functions.invoke('talent-rumi-converse', {
            body: { project_id: projectId, meeting_id: meetingId, mode: 'opener' },
          });
          const reply = (data as any)?.reply?.trim();
          if (reply) pushAi(reply, true);
        } catch {
          /* silent */
        } finally {
          setThinking(false);
        }
        return;
      }

      // Subsequent fill turns every ~45s
      if (openerSentRef.current && Date.now() - lastSoloTurnRef.current > 45000) {
        lastSoloTurnRef.current = Date.now();
        setThinking(true);
        try {
          const recent = notes.slice(-4).map((n) => n.text);
          const { data } = await supabase.functions.invoke('talent-rumi-converse', {
            body: {
              project_id: projectId,
              meeting_id: meetingId,
              mode: 'fill',
              transcript_chunk: transcriptRef.current.slice(-1500),
              recent_notes: recent,
            },
          });
          const reply = (data as any)?.reply?.trim();
          if (reply) pushAi(reply, true);
        } catch {
          /* silent */
        } finally {
          setThinking(false);
        }
      }
    }, 4000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callConnected, peerCount, projectId, meetingId]);

  const ask = async () => {
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion('');
    setNotes((n) => [...n, { id: `u-${Date.now()}`, text: q, ts: Date.now(), kind: 'user' }]);
    setThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('talent-rumi-converse', {
        body: {
          project_id: projectId,
          meeting_id: meetingId,
          mode: 'answer',
          user_question: q,
          transcript_chunk: transcriptRef.current.slice(-2000),
        },
      });
      if (error) throw error;
      const reply = (data as any)?.reply?.trim();
      if (reply) pushAi(reply, peerCount === 0);
      else pushAi("Let me think about that — what's the most important constraint here?");
    } catch (e: any) {
      pushAi("I couldn't reach the AI just now. Try once more in a moment.");
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white flex flex-col">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-1 py-2"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center">
            <img src={rumiIcon} alt="" className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-zinc-900">RUMI AI Creative Director</div>
            <div className="text-[11px] text-zinc-500">
              {peerCount === 0 && callConnected ? 'On the call with you' : 'Listening.. Taking Notes'}
            </div>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      {open && (
        <>
          <div className="mt-1 rounded-2xl bg-zinc-100 px-3 py-3 min-h-[160px] space-y-2 flex flex-col">
            {notes.length === 0 && !thinking && (
              <div className="text-xs text-zinc-400 italic px-2 py-4 text-center m-auto">
                RUMi will surface short, actionable notes
                <br />as you talk. Or ask her anything below.
              </div>
            )}
            {notes.map((n) => (
              <div
                key={n.id}
                className={n.kind === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={
                    n.kind === 'user'
                      ? 'max-w-[85%] px-3 py-2 rounded-2xl text-xs bg-zinc-900 text-white'
                      : 'max-w-[85%] px-3 py-2 rounded-2xl text-xs bg-white text-zinc-800 border border-zinc-200'
                  }
                >
                  {n.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 px-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-full border border-zinc-200 bg-white pl-4 pr-1 py-1">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder="Ask RUMI"
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-0 h-9 text-sm"
            />
            <Button
              size="icon"
              onClick={ask}
              disabled={!question.trim() || thinking}
              className="h-8 w-8 rounded-full bg-zinc-900 hover:bg-zinc-800 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

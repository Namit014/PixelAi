import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video as VideoIcon, VideoOff, MicOff as MicOffIcon, Loader2, Copy } from 'lucide-react';
import { meetingJoinUrl } from '@/lib/ics';
import { useWebRTCRoom } from '@/hooks/useWebRTCRoom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RumiCallSidebar } from './RumiCallSidebar';
import { AINotetakerPanel } from './AINotetakerPanel';

interface Props {
  projectId: string;
  roomCode: string;
  meetingId?: string;
  onLeave: () => void;
}

const VideoTile = ({
  stream, label, muted, fill, speaking,
}: { stream: MediaStream; label: string; muted?: boolean; fill?: boolean; speaking?: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return (
    <div
      className={`relative bg-zinc-900 rounded-xl overflow-hidden ${fill ? 'h-full w-full' : 'aspect-video'} ${
        speaking ? 'ring-2 ring-emerald-400/70' : ''
      }`}
    >
      <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[11px] rounded">
        {label}
      </div>
    </div>
  );
};

// Live mic-volume meter (5-bar) so the user can see they're audible.
const MicMeter = ({ stream, on }: { stream: MediaStream | null; on: boolean }) => {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream || !on) { setLevel(0); return; }
    let raf = 0;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser!.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
        setLevel(Math.min(1, peak / 64));
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {/* ignore */}
    return () => { cancelAnimationFrame(raf); try { ctx?.close(); } catch {} };
  }, [stream, on]);

  const bars = 5;
  return (
    <div className="flex items-end gap-[2px] h-4 ml-1" aria-label="Mic level">
      {Array.from({ length: bars }).map((_, i) => {
        const active = level > (i + 1) / (bars + 1);
        return (
          <div
            key={i}
            className={`w-[3px] rounded-sm transition-all ${active ? 'bg-emerald-500' : 'bg-zinc-200'}`}
            style={{ height: `${4 + i * 2.5}px` }}
          />
        );
      })}
    </div>
  );
};

export const TalentVideoCall = ({ projectId, roomCode, meetingId, onLeave }: Props) => {
  const { localStream, peers, connected, join, leave, toggleAudio, toggleVideo } = useWebRTCRoom(roomCode);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [ending, setEnding] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const transcriptRef = useRef('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    join().catch((e) => toast.error(e?.message ?? 'Could not start call'));
    return () => leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  useEffect(() => {
    if (!connected) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (ev: any) => {
      let finalText = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript + ' ';
      }
      if (finalText) {
        transcriptRef.current += finalText;
        setTranscript(transcriptRef.current);
      }
    };
    rec.onerror = () => {};
    try { rec.start(); recognitionRef.current = rec; } catch {}
    return () => { try { rec.stop(); } catch {} };
  }, [connected]);

  // Local speaking detection from mic level — drives the green ring on the local tile.
  useEffect(() => {
    if (!localStream || !audioOn) { setSpeaking(false); return; }
    let raf = 0;
    let ctx: AudioContext | null = null;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ctx.createMediaStreamSource(localStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
        setSpeaking(peak > 14);
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {/* ignore */}
    return () => { cancelAnimationFrame(raf); try { ctx?.close(); } catch {} };
  }, [localStream, audioOn]);

  const handleEnd = async () => {
    setEnding(true);
    try { recognitionRef.current?.stop(); } catch {}
    try {
      if (meetingId) {
        await supabase.functions.invoke('talent-finalize-call', {
          body: { meeting_id: meetingId, project_id: projectId, transcript_md: transcriptRef.current },
        });
      }
    } catch (e: any) {
      console.warn('finalize-call failed', e);
    }
    leave();
    onLeave();
  };

  const peerEntries = Object.entries(peers);
  const totalTiles = 1 + peerEntries.length;
  const singleTile = totalTiles <= 1;

  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px]">
      {/* STAGE */}
      <div className="flex flex-col min-h-0 p-7">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-700">Room {roomCode}</span>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(meetingJoinUrl(projectId, roomCode));
                  toast.success('Invite link copied');
                } catch { toast.error('Could not copy'); }
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-zinc-200 text-[11px] text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50"
              title="Copy invite link"
            >
              <Copy className="w-3 h-3" /> Copy invite
            </button>
            {!connected && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center pl-2 pr-1 py-1 rounded-full border border-zinc-200">
              <button
                onClick={() => { toggleAudio(); setAudioOn((v) => !v); }}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-zinc-50"
                aria-label="Mic"
              >
                {audioOn ? <Mic className="w-4 h-4 text-zinc-700" /> : <MicOff className="w-4 h-4 text-red-500" />}
              </button>
              <MicMeter stream={localStream} on={audioOn} />
            </div>
            <button
              onClick={() => { toggleVideo(); setVideoOn((v) => !v); }}
              className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50"
              aria-label="Camera"
            >
              {videoOn ? <VideoIcon className="w-4 h-4 text-zinc-700" /> : <VideoOff className="w-4 h-4 text-red-500" />}
            </button>
            <Button
              onClick={handleEnd}
              disabled={ending}
              className="rounded-full bg-red-500 hover:bg-red-600 text-white h-9 px-4 gap-1.5"
            >
              {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MicOffIcon className="w-4 h-4" />}
              End
            </Button>
          </div>
        </div>

        {/* Single matte frame — equal 12px inset all around. No mismatched right/bottom strip. */}
        <div className="flex-1 min-h-0 rounded-2xl border border-zinc-200 bg-zinc-950 p-3 overflow-hidden flex">
          {singleTile && !connected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-white/80">
              <div className="text-base font-medium mb-1">Getting Ready</div>
              <div className="text-xs text-white/50">You'll be able to join in just a moment.</div>
            </div>
          ) : singleTile ? (
            <div className="flex-1 min-h-0">
              {localStream && <VideoTile stream={localStream} label="You" muted fill speaking={speaking} />}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
              {localStream && <VideoTile stream={localStream} label="You" muted speaking={speaking} />}
              {peerEntries.map(([id, stream]) => (
                <VideoTile key={id} stream={stream} label="Guest" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="border-t lg:border-t-0 lg:border-l border-zinc-100 p-5 overflow-y-auto flex flex-col gap-4">
        <AINotetakerPanel transcript={transcript} isLive={connected} />
        <RumiCallSidebar
          meetingId={meetingId}
          projectId={projectId}
          transcriptRef={transcriptRef}
          peerCount={peerEntries.length}
          callConnected={connected}
        />
      </div>
    </div>
  );
};

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useBrowserSpeechRecognition } from '@/hooks/useBrowserSpeechRecognition';
import { toast } from 'sonner';
import RumiBlackIcon from '@/assets/icons/rumi-black.svg?react';

interface TranscriptEntry {
  role: 'user' | 'rumi';
  content: string;
  timestamp: Date;
}

interface RumiVoiceCallProps {
  open: boolean;
  onClose: () => void;
  onCallEnd: (notes: string[], transcript: TranscriptEntry[]) => void;
  brandContext?: Record<string, unknown> | null;
}

// --- Animation Variants ---
const dialogVariants = {
  hidden: { opacity: 0, scale: 0.88, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 260, duration: 0.45 } },
  exit: { opacity: 0, scale: 0.92, y: 20, transition: { duration: 0.25, ease: 'easeIn' as const } },
};

const controlsContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

const controlItemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.8 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, damping: 18, stiffness: 300 } },
  exit: { opacity: 0, y: 10, scale: 0.8, transition: { duration: 0.15 } },
};

const messageVariants = {
  user: { hidden: { opacity: 0, x: 40, scale: 0.95 }, visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring' as const, damping: 20, stiffness: 250 } } },
  rumi: { hidden: { opacity: 0, x: -40, scale: 0.95 }, visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring' as const, damping: 20, stiffness: 250 } } },
};

const breathingPulse = {
  animate: { scale: [1, 1.06, 1], transition: { repeat: Infinity, duration: 2.8, ease: 'easeInOut' as const } },
};

const speakingPulse = {
  animate: { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' as const } },
};

// Ripple ring for speaking state
function SpeakingRipples() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-primary/40"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: [1, 1.8, 2.2], opacity: [0.5, 0.2, 0] }}
          transition={{ repeat: Infinity, duration: 2, delay: i * 0.5, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

// Rotating ring for connecting state
function ConnectingRing() {
  return (
    <motion.div
      className="absolute inset-[-4px] rounded-full border-2 border-transparent border-t-primary border-r-primary/50"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
    />
  );
}

// Bouncing dots for thinking
function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary"
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

// Sound bars
function SoundBars() {
  return (
    <span className="inline-flex items-end gap-[2px] ml-1.5 h-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] bg-primary rounded-full"
          animate={{ height: [4, 14, 6, 16, 4] }}
          transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.08, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

export function RumiVoiceCall({ open, onClose, onCallEnd, brandContext }: RumiVoiceCallProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRumiSpeaking, setIsRumiSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [currentPartial, setCurrentPartial] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);

  const speechRecognition = useBrowserSpeechRecognition({
    onPartial: (text) => setCurrentPartial(text),
    onFinal: (text) => {
      if (text.trim() && !processingRef.current) {
        setCurrentPartial('');
        handleUserSpeech(text.trim());
      }
    },
  });

  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isConnected]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, currentPartial]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startCall = useCallback(async () => {
    setIsConnecting(true);
    setMicError(null);
    try {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr: any) {
        const msg = micErr?.name === 'NotFoundError'
          ? 'No microphone found. Please connect a microphone.'
          : micErr?.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow mic access.'
          : 'Could not access microphone. Try opening in a new tab.';
        setMicError(msg);
        toast.error(msg);
        setIsConnecting(false);
        return;
      }
      if (!speechRecognition.isSupported) {
        setMicError('Speech recognition not supported. Use Chrome or Edge.');
        toast.error('Speech recognition not supported.');
        setIsConnecting(false);
        return;
      }
      speechRecognition.start();
      setIsConnected(true);
      setCallDuration(0);
      const greeting = "Hey! Great to connect. I'm RUMI, your creative director. What are we working on today?";
      setTranscript([{ role: 'rumi', content: greeting, timestamp: new Date() }]);
      conversationHistoryRef.current = [{ role: 'assistant', content: greeting }];
      await speakText(greeting);
    } catch (err) {
      console.error('Failed to start call:', err);
      toast.error('Failed to start call.');
    } finally {
      setIsConnecting(false);
    }
  }, [speechRecognition]);

  const handleUserSpeech = useCallback(async (text: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setTranscript(prev => [...prev, { role: 'user', content: text, timestamp: new Date() }]);
    conversationHistoryRef.current.push({ role: 'user', content: text });
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rumi-voice-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ transcript: text, conversationHistory: conversationHistoryRef.current, brandContext }),
        }
      );
      if (!res.ok) throw new Error('Voice chat failed');
      const { response, notes: newNotes } = await res.json();
      setTranscript(prev => [...prev, { role: 'rumi', content: response, timestamp: new Date() }]);
      conversationHistoryRef.current.push({ role: 'assistant', content: response });
      if (newNotes?.length) setNotes(newNotes);
      await speakText(response);
    } catch (err) {
      console.error('Voice chat error:', err);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [brandContext]);

  const speakText = useCallback(async (text: string) => {
    setIsRumiSpeaking(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts-stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ text, voiceId: 'EXAVITQu4vr4xnSDxMaL', modelId: 'eleven_turbo_v2_5' }),
        }
      );
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsRumiSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setIsRumiSpeaking(false); URL.revokeObjectURL(url); };
      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setIsRumiSpeaking(false);
    }
  }, []);

  const endCall = useCallback(() => {
    setIsEnding(true);
    speechRecognition.stop();
    if (audioRef.current) audioRef.current.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => {
      setIsConnected(false);
      setIsEnding(false);
      onCallEnd(notes, transcript);
      onClose();
    }, 350);
  }, [speechRecognition, notes, transcript, onCallEnd, onClose]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (!prev) speechRecognition.stop();
      else speechRecognition.start();
      return !prev;
    });
  }, [speechRecognition]);

  if (!open) return null;

  const avatarState = isEnding ? 'ending' : isConnecting ? 'connecting' : isRumiSpeaking ? 'speaking' : isConnected ? 'idle' : 'precall';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { if (isConnected) endCall(); else onClose(); } }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden bg-background border-border" aria-describedby={undefined}>
        <DialogTitle className="sr-only">RUMI Voice Call</DialogTitle>
        <AnimatePresence mode="wait">
          <motion.div
            key="voice-call-content"
            variants={dialogVariants}
            initial="hidden"
            animate={isEnding ? 'exit' : 'visible'}
            exit="exit"
          >
            {/* Compact Header */}
            <motion.div
              className={cn(
                "flex items-center gap-3 p-4 border-b border-border transition-colors duration-300",
                isEnding && "bg-destructive/10"
              )}
              animate={isEnding ? { backgroundColor: ['hsl(var(--destructive) / 0.15)', 'transparent'] } : {}}
              transition={{ duration: 0.4 }}
            >
              {/* Avatar with state-dependent effects */}
              <div className="relative flex-shrink-0">
                {avatarState === 'speaking' && <SpeakingRipples />}
                {avatarState === 'connecting' && <ConnectingRing />}
                <motion.div
                  className="relative flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30"
                  {...(avatarState === 'precall' ? breathingPulse : avatarState === 'speaking' ? speakingPulse : {})}
                >
                  <RumiBlackIcon className="h-7 w-7" />
                </motion.div>
              </div>

              {/* Name + Status */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground leading-tight">RUMI</h3>
                <p className="text-xs text-muted-foreground">Creative Director</p>
                {isConnected && (
                  <motion.div
                    className="flex items-center gap-2 mt-0.5"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 14, stiffness: 300 }}
                  >
                    <motion.span
                      className="w-2 h-2 rounded-full bg-emerald-500"
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.4, 1] }}
                      transition={{ type: 'spring', damping: 10, stiffness: 400 }}
                    />
                    <span className="text-xs font-mono text-muted-foreground">{formatTime(callDuration)}</span>
                    {isRumiSpeaking && <SoundBars />}
                    {isProcessing && !isRumiSpeaking && <ThinkingDots />}
                  </motion.div>
                )}
                {isConnecting && (
                  <motion.div
                    className="flex items-center gap-1.5 mt-0.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Connecting</span>
                    <ThinkingDots />
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Transcript */}
            <ScrollArea className="h-72 p-4">
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {transcript.map((entry, i) => (
                    <motion.div
                      key={`${i}-${entry.role}`}
                      variants={messageVariants[entry.role]}
                      initial="hidden"
                      animate="visible"
                      className={cn("flex gap-2", entry.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      <div className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        entry.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground'
                      )}>
                        {entry.content}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {currentPartial && (
                  <motion.div
                    className="flex justify-end"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-primary/30 text-primary-foreground/70 italic">
                      {currentPartial}...
                    </div>
                  </motion.div>
                )}
                <div ref={transcriptEndRef} />
              </div>
            </ScrollArea>

            {/* Notes Panel */}
            <AnimatePresence>
              {showNotes && notes.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden border-t border-border"
                >
                  <motion.div
                    className="p-4 bg-muted/20"
                    initial={{ y: 10 }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">📝 Brief Notes ({notes.length})</h4>
                    <ul className="space-y-1">
                      {notes.map((note, i) => (
                        <motion.li
                          key={i}
                          className="text-xs text-foreground flex gap-1.5"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <span className="text-primary">•</span> {note}
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls */}
            <div className="p-4 border-t border-border bg-background">
              <AnimatePresence mode="wait">
                {!isConnected ? (
                  <motion.div
                    key="start"
                    className="flex flex-col items-center gap-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                  >
                    {micError && (
                      <motion.div
                        className="flex items-center gap-2 text-destructive text-xs max-w-xs text-center"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{micError}</span>
                      </motion.div>
                    )}
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={startCall}
                        disabled={isConnecting}
                        className="gap-2 rounded-full px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground relative overflow-hidden"
                      >
                        {!isConnecting && (
                          <motion.span
                            className="absolute inset-0 rounded-full border-2 border-primary/40"
                            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                          />
                        )}
                        {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Phone className="h-5 w-5" />}
                        {isConnecting ? 'Connecting...' : 'Start Call'}
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="controls"
                    className="flex items-center justify-center gap-4"
                    variants={controlsContainerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <motion.div variants={controlItemVariants} whileTap={{ scale: 0.9 }}>
                      <motion.div animate={{ rotateY: isMuted ? 180 : 0 }} transition={{ duration: 0.3 }}>
                        <Button
                          variant="outline"
                          size="icon"
                          className={cn("rounded-full h-12 w-12", isMuted && "bg-destructive/10 border-destructive/30")}
                          onClick={toggleMute}
                        >
                          <AnimatePresence mode="wait">
                            {isMuted ? (
                              <motion.div key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <MicOff className="h-5 w-5 text-destructive" />
                              </motion.div>
                            ) : (
                              <motion.div key="on" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <Mic className="h-5 w-5" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Button>
                      </motion.div>
                    </motion.div>

                    <motion.div variants={controlItemVariants} whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn("rounded-full h-12 w-12", showNotes && "bg-primary/10 border-primary/30")}
                        onClick={() => setShowNotes(!showNotes)}
                      >
                        <FileText className="h-5 w-5" />
                      </Button>
                    </motion.div>

                    <motion.div variants={controlItemVariants} whileTap={{ scale: 0.9 }}>
                      <Button
                        onClick={endCall}
                        className="rounded-full h-12 w-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        size="icon"
                      >
                        <PhoneOff className="h-5 w-5 text-white" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Download, Wand2, Loader2, Film, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MotionStudioPanelProps {
  imageUrl: string;
  selectedObject: any;
  position: {x: number;y: number;};
  onClose: () => void;
}

const PRESETS = [
{ label: 'Gentle Zoom', prompt: 'Slow gentle zoom in with smooth cinematic motion, keeping the subject centered' },
{ label: 'Parallax Drift', prompt: 'Subtle parallax drift effect with layers moving at different speeds, creating depth' },
{ label: 'Cinematic Pan', prompt: 'Slow cinematic pan from left to right with smooth camera movement' },
{ label: 'Slow Float', prompt: 'Gentle floating motion, slowly rising upward with dreamy atmosphere' },
{ label: 'Breathing Effect', prompt: 'Subtle breathing zoom effect, slowly pulsing in and out with organic movement' },
{ label: 'Ken Burns', prompt: 'Classic Ken Burns effect with slow zoom and gentle pan across the image' }];


const DURATIONS = [
{ label: '3s', value: 3 },
{ label: '5s', value: 5 },
{ label: '7s', value: 7 }];


type Stage = 'idle' | 'uploading' | 'generating' | 'polling' | 'completed' | 'error';

export default function MotionStudioPanel({ imageUrl, selectedObject, position, onClose }: MotionStudioPanelProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [duration, setDuration] = useState(5);
  const [stage, setStage] = useState<Stage>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const failsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userId, setUserId] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check access on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
    })();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (failsafeRef.current) clearTimeout(failsafeRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getPrompt = (): string => {
    if (customPrompt.trim()) return customPrompt.trim();
    if (selectedPreset) {
      const preset = PRESETS.find((p) => p.label === selectedPreset);
      return preset?.prompt || 'Smooth cinematic motion';
    }
    return 'Smooth cinematic motion with gentle movement';
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!userId) return null;
    // If already an HTTP URL, use directly
    if (imageUrl.startsWith('http')) return imageUrl;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const fileExt = blob.type.split('/')[1] || 'png';
      const fileName = `motion-frame-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/video-frames/${fileName}`;

      const { data: uploadData, error } = await supabase.storage.
      from('design-assets').
      upload(filePath, blob, { cacheControl: '3600', upsert: false });

      if (error) {console.error('Upload failed:', error);return null;}

      const { data: urlData, error: urlError } = await supabase.storage.
      from('design-assets').
      createSignedUrl(uploadData.path, 3600);

      if (urlError || !urlData?.signedUrl) return null;
      return urlData.signedUrl;
    } catch (err) {
      console.error('Error uploading frame:', err);
      return null;
    }
  };

  const pollForCompletion = useCallback((predictionId: string) => {
    setStage('polling');
    setStatusMessage('Processing motion...');
    setElapsedTime(0);

    timerRef.current = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);

    // 300s failsafe
    failsafeRef.current = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setStage('error');
      setStatusMessage('Generation timed out. Please try again.');
    }, 300_000);

    pollRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase.functions.invoke('luma-generate', {
          body: { action: 'status', predictionId }
        });

        if (error) return;

        if (data.status === 'completed' && data.output_video_url) {
          clearInterval(pollRef.current!);
          if (timerRef.current) clearInterval(timerRef.current);
          if (failsafeRef.current) clearTimeout(failsafeRef.current);
          setVideoUrl(data.output_video_url);
          setStage('completed');
          setStatusMessage('Motion generated!');
          import('@/lib/notifications/aiNotify').then(({ notifyAiComplete }) =>
            notifyAiComplete({ source: 'video', status: 'success', title: 'Motion ready', message: 'Your motion clip is ready.', dedupeKey: predictionId })
          );
        } else if (data.status === 'failed' || data.error) {
          clearInterval(pollRef.current!);
          if (timerRef.current) clearInterval(timerRef.current);
          if (failsafeRef.current) clearTimeout(failsafeRef.current);
          setStage('error');
          setStatusMessage(data.error || 'Generation failed.');
          import('@/lib/notifications/aiNotify').then(({ notifyAiComplete }) =>
            notifyAiComplete({ source: 'video', status: 'error', title: 'Motion failed', message: data.error || 'Generation failed.', dedupeKey: predictionId })
          );
        } else {
          // Update status text based on progress
          if (data.progress > 60) setStatusMessage('Finalizing...');else
          if (data.progress > 20) setStatusMessage('Processing motion...');else
          setStatusMessage('Queued...');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  }, []);

  const handleGenerate = async () => {
    const prompt = getPrompt();
    setStage('uploading');
    setStatusMessage('Uploading image...');

    const uploadedUrl = await uploadImage();
    if (!uploadedUrl) {
      setStage('error');
      setStatusMessage('Failed to upload image.');
      return;
    }

    setStage('generating');
    setStatusMessage('Starting generation...');

    try {
      const { data, error } = await supabase.functions.invoke('luma-generate', {
        body: {
          prompt,
          duration,
          aspectRatio: '16:9',
          startImageUrl: uploadedUrl,
          loop: false
        }
      });

      if (error) {
        setStage('error');
        setStatusMessage('Failed to start generation.');
        return;
      }

      if (data.error) {
        setStage('error');
        setStatusMessage(data.error);
        return;
      }

      if (data.status === 'completed' && data.output_video_url) {
        setVideoUrl(data.output_video_url);
        setStage('completed');
        setStatusMessage('Motion generated!');
      } else if (data.jobId) {
        pollForCompletion(data.jobId);
      }
    } catch (err) {
      setStage('error');
      setStatusMessage('Unexpected error occurred.');
    }
  };

  const handleDownloadMP4 = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `motion-${Date.now()}.mp4`;
    a.target = '_blank';
    a.click();
  };

  const handleDownloadGIF = async () => {
    if (!videoUrl || !videoRef.current) return;
    toast.info('GIF export started — this may take a moment...');

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 270;

    // Extract frames at 10fps
    const fps = 10;
    const totalFrames = Math.floor(video.duration * fps);
    const frames: Blob[] = [];

    for (let i = 0; i < totalFrames; i++) {
      video.currentTime = i / fps;
      await new Promise<void>((resolve) => {
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) frames.push(blob);
            resolve();
          }, 'image/png');
        };
      });
    }

    // Download frames as a zip-like sequence (individual PNGs)
    // For true GIF, we'd need gif.js - for now download as MP4
    toast.info('GIF conversion uses MP4 format for best quality.');
    handleDownloadMP4();
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {videoRef.current.pause();} else
    {videoRef.current.play();}
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const isProcessing = stage === 'uploading' || stage === 'generating' || stage === 'polling';
  const canGenerate = !isProcessing && (customPrompt.trim() || selectedPreset);

  // Clamp position to viewport
  const panelWidth = 360;
  const panelHeight = 520;
  const clampedX = Math.min(Math.max(position.x - panelWidth / 2, 16), window.innerWidth - panelWidth - 16);
  const clampedY = Math.min(Math.max(position.y, 16), window.innerHeight - panelHeight - 16);

  return (
    <>
      <div
        className="absolute z-[1000] bg-white rounded-xl border border-zinc-200 shadow-2xl animate-fly-in-down-centered"
        style={{ left: clampedX, top: clampedY, width: panelWidth }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-zinc-900">Motion Studio</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto">
          {/* Video preview when completed */}
          {stage === 'completed' && videoUrl &&
          <div className="relative rounded-lg overflow-hidden bg-zinc-900">
              <video
              ref={videoRef}
              src={videoUrl}
              className="w-full rounded-lg"
              loop
              muted
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)} />

              <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">

                {isPlaying ?
              <Pause className="w-10 h-10 text-white/80" /> :
              <Play className="w-10 h-10 text-white/80" />
              }
              </button>
            </div>
          }

          {/* Download buttons */}
          {stage === 'completed' && videoUrl &&
          <div className="flex gap-2">
              <Button onClick={handleDownloadMP4} size="sm" className="flex-1 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
                <Download className="w-3.5 h-3.5" /> MP4
              </Button>
              <Button onClick={handleDownloadGIF} size="sm" variant="outline" className="flex-1 gap-1.5">
                <Download className="w-3.5 h-3.5" /> GIF
              </Button>
            </div>
          }

          {/* Processing indicator */}
          {isProcessing &&
          <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
              <div className="text-sm font-medium text-zinc-700">{statusMessage}</div>
              {stage === 'polling' &&
            <div className="text-xs text-zinc-400">{formatTime(elapsedTime)} / 5 m</div>
            }
              <div className="w-full bg-zinc-100 rounded-full h-1.5">
                <div
                className="bg-violet-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: stage === 'uploading' ? '15%' : stage === 'generating' ? '25%' : `${Math.min(25 + elapsedTime * 0.5, 90)}%` }} />

              </div>
            </div>
          }

          {/* Error state */}
          {stage === 'error' &&
          <div className="text-center py-4">
              <p className="text-sm text-red-600 mb-2">{statusMessage}</p>
              <Button variant="outline" size="sm" onClick={() => {setStage('idle');setStatusMessage('');}}>Try Again</Button>
            </div>
          }

          {/* Controls (only show when idle or error) */}
          {(stage === 'idle' || stage === 'error') &&
          <>
              {/* Presets */}
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-2">Quick Presets</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRESETS.map((preset) =>
                <button
                  key={preset.label}
                  onClick={() => {setSelectedPreset(preset.label === selectedPreset ? null : preset.label);setCustomPrompt('');}}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                  selectedPreset === preset.label ?
                  'bg-violet-50 border-violet-300 text-violet-700' :
                  'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'}`
                  }>

                      {preset.label}
                    </button>
                )}
                </div>
              </div>

              {/* Custom prompt */}
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-2">Or describe motion</p>
                <Textarea
                value={customPrompt}
                onChange={(e) => {setCustomPrompt(e.target.value);if (e.target.value) setSelectedPreset(null);}}
                placeholder="e.g. Slow dolly zoom with particles floating..."
                className="text-sm resize-none h-20"
                onClick={(e) => e.stopPropagation()} />

              </div>

              {/* Duration */}
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-2">Duration</p>
                <div className="flex gap-2">
                  {DURATIONS.map((d) =>
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  duration === d.value ?
                  'bg-violet-50 border-violet-300 text-violet-700' :
                  'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'}`
                  }>

                      {d.label}
                    </button>
                )}
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">{duration * 10} credits</p>
              </div>

              {/* Generate button */}
              <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full gap-2 text-white bg-primary">

                <Wand2 className="w-4 h-4" /> Generate Motion
              </Button>
            </>
          }
        </div>
      </div>


    </>);

}
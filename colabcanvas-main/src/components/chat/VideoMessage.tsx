import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Video, Download, Plus, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoMessageProps {
  videoUrl?: string;
  videoStatus?: 'queued' | 'processing' | 'completed' | 'failed';
  videoJobId?: string;
  videoDuration?: number;
  videoError?: string;
  onAddToCanvas?: (videoUrl: string) => void;
  onStatusUpdate?: (status: string, videoUrl?: string, error?: string) => void;
}

const VideoMessage = ({
  videoUrl,
  videoStatus = 'queued',
  videoJobId,
  videoDuration,
  videoError,
  onAddToCanvas,
  onStatusUpdate
}: VideoMessageProps) => {
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (videoStatus === 'queued' || videoStatus === 'processing') {
      // Simulate progress based on elapsed time
      const progressInterval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setProgress(prev => Math.min(prev + 1, 95)); // Max 95% until complete
      }, 1000);

      return () => clearInterval(progressInterval);
    }
  }, [videoStatus]);

  useEffect(() => {
    if (!videoJobId || videoStatus === 'completed' || videoStatus === 'failed') {
      return;
    }

    // Poll for video status
    const pollInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const { data, error } = await supabase.functions.invoke('sora-generate', {
          body: { action: 'status', jobId: videoJobId },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error) throw error;

        console.log('Video status:', data);

        if (data.status === 'completed' && data.video_url) {
          setProgress(100);
          onStatusUpdate?.('completed', data.video_url);
          clearInterval(pollInterval);
          toast({
            title: '✅ Video Ready!',
            description: 'Your AI-generated video is ready to view.',
          });
        } else if (data.status === 'failed') {
          onStatusUpdate?.('failed', undefined, data.error || 'Video generation failed');
          clearInterval(pollInterval);
          toast({
            title: '❌ Generation Failed',
            description: data.error || 'Something went wrong',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error polling video status:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [videoJobId, videoStatus, onStatusUpdate, toast]);

  const handleDownload = async () => {
    if (!videoUrl) return;
    
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sora-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Downloaded!',
        description: 'Video saved to your device.',
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Could not download the video.',
        variant: 'destructive',
      });
    }
  };

  // Queued State
  if (videoStatus === 'queued') {
    return (
      <div className="p-4 bg-secondary/30 rounded-lg border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary animate-pulse" />
          <div>
            <p className="text-sm font-medium">🎬 Video Queued</p>
            <p className="text-xs text-muted-foreground">
              Your video is queued for generation...
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground">
          Estimated time: 30-120 seconds
        </p>
      </div>
    );
  }

  // Processing State
  if (videoStatus === 'processing') {
    return (
      <div className="p-4 bg-secondary/30 rounded-lg border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <div>
            <p className="text-sm font-medium">🎬 Generating Video</p>
            <p className="text-xs text-muted-foreground">
              AI is creating your {videoDuration}s video... ({elapsedTime}s elapsed)
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Processing...</span>
          <Badge variant="secondary" className="text-xs">
            {Math.round(progress)}%
          </Badge>
        </div>
      </div>
    );
  }

  // Failed State
  if (videoStatus === 'failed') {
    return (
      <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Generation Failed</p>
            <p className="text-xs text-destructive/80">
              {videoError || 'Something went wrong during video generation'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Completed State
  if (videoStatus === 'completed' && videoUrl) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <p className="text-sm font-medium">✅ Video Ready!</p>
        </div>
        
        <div className="relative rounded-lg overflow-hidden border border-border bg-black">
          <video
            src={videoUrl}
            controls
            className="w-full max-h-[400px]"
            poster="/placeholder.svg"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          {onAddToCanvas && (
            <Button
              onClick={() => onAddToCanvas(videoUrl)}
              variant="default"
              size="sm"
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Canvas
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default VideoMessage;

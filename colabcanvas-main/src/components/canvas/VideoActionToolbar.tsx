import { Button } from '@/components/ui/button';
import { Download, Play, Sparkles } from 'lucide-react';
import { FabricImage } from 'fabric';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { downloadVideo } from '@/lib/videoDownloader';
import { toast } from 'sonner';

interface VideoActionToolbarProps {
  position: { x: number; y: number };
  videoUrl: string;
  videoTitle?: string;
  onPlayFullscreen?: () => void;
  onQuickEdit?: (e?: React.MouseEvent) => void;
}

const VideoActionToolbar = ({
  position,
  videoUrl,
  videoTitle = 'video',
  onPlayFullscreen,
  onQuickEdit,
}: VideoActionToolbarProps) => {
  const handleDownload = async () => {
    try {
      toast.info('Starting download...');
      await downloadVideo(videoUrl, videoTitle);
      toast.success('Video downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download video');
    }
  };

  const handlePlayFullscreen = () => {
    if (onPlayFullscreen) {
      onPlayFullscreen();
    } else {
      // Fallback: open in new tab
      window.open(videoUrl, '_blank');
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="absolute z-[999] flex items-center gap-1 p-1 bg-white/95 backdrop-blur-xl rounded-lg border border-zinc-200 animate-fly-in-down-centered"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onQuickEdit?.(e);
              }}
              className="gap-1.5 h-8 px-3 text-sm font-medium hover:bg-zinc-100"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Quick Edit
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Edit video with AI</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-zinc-200" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePlayFullscreen}
              className="gap-1.5 h-8 px-3 text-sm font-medium hover:bg-zinc-100"
            >
              <Play className="w-3.5 h-3.5" />
              Play
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Play video fullscreen</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-zinc-200" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              className="gap-1.5 h-8 px-3 text-sm font-medium hover:bg-zinc-100"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Download video file</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

// Helper function to check if object is a video and should show toolbar
export const shouldShowVideoToolbar = (selectedObject: any): boolean => {
  if (!selectedObject) return false;
  
  // Skip multi-selection
  const objType = selectedObject.type;
  if (objType === 'activeselection' || objType === 'ActiveSelection') return false;
  
  // Check if it's a video object
  return selectedObject.isVideo === true && !!selectedObject.videoUrl;
};

// Helper to calculate position (same formula as ImageActionToolbar)
export const getVideoToolbarPosition = (selectedObject: any, canvas: any): { x: number; y: number } | null => {
  if (!canvas || !selectedObject) return null;
  
  const bounds = selectedObject.getBoundingRect();
  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
  const zoom = vpt[0];
  
  // Position ABOVE and centered
  const x = (bounds.left + bounds.width / 2) * zoom + vpt[4];
  const y = bounds.top * zoom + vpt[5] - 48;
  
  // Check if visible on screen
  if (x < -100 || x > window.innerWidth + 100 || y < -100 || y > window.innerHeight + 100) {
    return null;
  }
  
  return { x, y };
};

export default VideoActionToolbar;

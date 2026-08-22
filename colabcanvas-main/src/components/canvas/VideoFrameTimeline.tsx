import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { extractVideoFrames, type VideoFrameData } from '@/utils/videoFrameExtractor';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface VideoFrameTimelineProps {
  videoUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectFrame: (frame: VideoFrameData) => void;
  selectedFrameIndex?: number | null;
}

export const VideoFrameTimeline = ({
  videoUrl,
  isOpen,
  onClose,
  onSelectFrame,
  selectedFrameIndex
}: VideoFrameTimelineProps) => {
  const [frames, setFrames] = useState<VideoFrameData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hoveredFrame, setHoveredFrame] = useState<VideoFrameData | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Extract frames when component opens
  useEffect(() => {
    if (!isOpen || !videoUrl) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setFrames([]);

    const extract = async () => {
      try {
        const extractedFrames = await extractVideoFrames(
          videoUrl,
          { targetFps: 30, maxFrames: 120, thumbnailSize: 200, quality: 0.7 },
          (progress) => {
            if (isMounted) setExtractionProgress(progress);
          }
        );
        
        if (isMounted) {
          setFrames(extractedFrames);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Frame extraction failed:', err);
        if (isMounted) {
          setError('Failed to extract frames from video');
          setIsLoading(false);
        }
      }
    };

    extract();

    return () => {
      isMounted = false;
    };
  }, [videoUrl, isOpen]);

  const handleFrameClick = (frame: VideoFrameData) => {
    onSelectFrame(frame);
  };

  const handleFrameHover = (frame: VideoFrameData, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredFrame(frame);
    setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleFrameLeave = () => {
    setHoveredFrame(null);
    setHoverPosition(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Timeline container */}
      <div className="w-full rounded-xl border border-border bg-muted/30 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
        {/* Header with close button */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
          <span className="text-xs text-muted-foreground">
            {isLoading 
              ? `Extracting frames... ${extractionProgress}%` 
              : `${frames.length} frames`
            }
          </span>
          <button 
            onClick={onClose}
            className="p-0.5 hover:bg-muted rounded transition-colors"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        {/* Frames scroll container */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-1 p-2 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ scrollBehavior: 'smooth' }}
        >
          {isLoading ? (
            // Loading skeletons
            <>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex-shrink-0">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                </div>
              ))}
              <div className="flex-shrink-0 flex items-center justify-center w-16 h-16">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            </>
          ) : error ? (
            <div className="flex items-center justify-center w-full h-16 text-xs text-destructive">
              {error}
            </div>
          ) : (
            // Frame thumbnails
            frames.map((frame) => (
              <div
                key={frame.index}
                className={cn(
                  "flex-shrink-0 relative cursor-pointer transition-all duration-150",
                  selectedFrameIndex === frame.index && "ring-4 ring-primary rounded-lg"
                )}
                onClick={() => handleFrameClick(frame)}
                onMouseEnter={(e) => handleFrameHover(frame, e)}
                onMouseLeave={handleFrameLeave}
              >
                <img
                  src={frame.dataUrl}
                  alt={`Frame ${frame.index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg"
                  draggable={false}
                />
                
                {/* Frame number badge - only visible when selected */}
                {selectedFrameIndex === frame.index && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-foreground/90 text-background text-xs px-2 py-1 rounded-lg font-medium">
                      {frame.index + 1}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hover preview portal */}
      {hoveredFrame && hoverPosition && createPortal(
        <div
          className="fixed z-[9999] bg-background rounded-lg border border-border p-2 pointer-events-none animate-in fade-in duration-100"
          style={{
            left: hoverPosition.x,
            top: hoverPosition.y - 12,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <img
            src={hoveredFrame.dataUrl}
            alt={`Frame ${hoveredFrame.index + 1}`}
            className="w-32 h-auto rounded object-cover max-h-24"
          />
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Frame {hoveredFrame.index + 1} • {hoveredFrame.timestamp.toFixed(2)}s
          </p>
        </div>,
        document.body
      )}
    </>
  );
};

export type { VideoFrameData };

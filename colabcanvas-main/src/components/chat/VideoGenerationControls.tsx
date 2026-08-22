import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Video, Clock, Maximize2, Coins } from 'lucide-react';

interface VideoGenerationControlsProps {
  duration: number;
  onDurationChange: (duration: number) => void;
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  estimatedCredits: number;
  userCredits: number;
}

const VideoGenerationControls = ({
  duration,
  onDurationChange,
  aspectRatio,
  onAspectRatioChange,
  estimatedCredits,
  userCredits
}: VideoGenerationControlsProps) => {
  const hasEnoughCredits = userCredits >= estimatedCredits;

  return (
    <div className="space-y-4 p-4 bg-secondary/20 rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <Video className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Video Generation Settings</h3>
      </div>

      {/* Duration Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Duration: {duration}s
          </Label>
          <Badge variant="outline" className="text-xs">
            {estimatedCredits} credits
          </Badge>
        </div>
        <Slider
          value={[duration]}
          onValueChange={(value) => onDurationChange(value[0])}
          min={5}
          max={20}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>5s</span>
          <span>10s</span>
          <span>15s</span>
          <span>20s</span>
        </div>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1">
          <Maximize2 className="w-3 h-3" />
          Aspect Ratio
        </Label>
        <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 border border-border rounded bg-background"></div>
                <span>16:9 Landscape</span>
              </div>
            </SelectItem>
            <SelectItem value="9:16">
              <div className="flex items-center gap-2">
                <div className="w-3 h-6 border border-border rounded bg-background"></div>
                <span>9:16 Portrait</span>
              </div>
            </SelectItem>
            <SelectItem value="1:1">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border border-border rounded bg-background"></div>
                <span>1:1 Square</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Credit Warning */}
      {!hasEnoughCredits && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-destructive" />
            <p className="text-xs text-destructive font-medium">
              Insufficient credits. Need {estimatedCredits}, have {userCredits}
            </p>
          </div>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-muted-foreground">
        💡 Generation takes 30-60 seconds with Luma Ray. You'll be notified when ready.
      </p>
    </div>
  );
};

export default VideoGenerationControls;

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { exportCanvasToVideo, downloadBlob } from '@/lib/videoExporter';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';

interface VideoExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvas: HTMLCanvasElement | null;
}

export function VideoExportDialog({ open, onOpenChange, canvas }: VideoExportDialogProps) {
  const [duration, setDuration] = useState(5);
  const [fps, setFps] = useState<'30' | '60'>('30');
  const [quality, setQuality] = useState(0.8);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    if (!canvas) {
      toast.error('No canvas available');
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      const blob = await exportCanvasToVideo(canvas, {
        duration,
        fps: parseInt(fps),
        format: 'webm',
        quality,
        width: canvas.width,
        height: canvas.height,
        onProgress: (p) => setProgress(p * 100),
      });

      const filename = `shader-${Date.now()}.webm`;
      downloadBlob(blob, filename);
      toast.success('Video exported successfully!');
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export video');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Shader as Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Duration: {duration}s</Label>
            <Slider
              value={[duration]}
              min={1}
              max={30}
              step={1}
              onValueChange={([v]) => setDuration(v)}
              disabled={isExporting}
            />
          </div>

          <div className="space-y-2">
            <Label>Frame Rate</Label>
            <RadioGroup value={fps} onValueChange={(v) => setFps(v as any)} disabled={isExporting}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="30" id="fps-30" />
                <Label htmlFor="fps-30" className="font-normal">30 FPS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="60" id="fps-60" />
                <Label htmlFor="fps-60" className="font-normal">60 FPS (Smooth)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Quality: {Math.round(quality * 100)}%</Label>
            <Slider
              value={[quality]}
              min={0.3}
              max={1}
              step={0.1}
              onValueChange={([v]) => setQuality(v)}
              disabled={isExporting}
            />
          </div>

          {isExporting && (
            <div className="space-y-2">
              <Label>Exporting...</Label>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

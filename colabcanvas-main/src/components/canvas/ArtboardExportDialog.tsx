import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Canvas as FabricCanvas } from 'fabric';
import jsPDF from 'jspdf';

interface ArtboardExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvas: FabricCanvas | null;
  artboard: any;
}

export function ArtboardExportDialog({ open, onOpenChange, canvas, artboard }: ArtboardExportDialogProps) {
  const [format, setFormat] = useState<'png' | 'jpg' | 'pdf'>('png');
  const [quality, setQuality] = useState(100);
  const [scale, setScale] = useState(2);

  const handleExport = useCallback(() => {
    if (!canvas || !artboard) return;

    try {
      const frame = artboard;
      const bounds = frame.getFrameBounds
        ? frame.getFrameBounds()
        : {
            left: frame.left ?? 0,
            top: frame.top ?? 0,
            width: (frame.width ?? 800) * (frame.scaleX || 1),
            height: (frame.height ?? 600) * (frame.scaleY || 1),
          };

      // Compute screen-space coordinates using current viewport transform
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = vpt[0];
      const panX = vpt[4];
      const panY = vpt[5];

      const sx = bounds.left * zoom + panX;
      const sy = bounds.top * zoom + panY;
      const sw = bounds.width * zoom;
      const sh = bounds.height * zoom;

      // Destination dimensions based on scale
      const dw = bounds.width * scale;
      const dh = bounds.height * scale;

      // Get the lower canvas element (the actual rendered pixels)
      const lowerCanvas = (canvas as any).lowerCanvasEl as HTMLCanvasElement;
      if (!lowerCanvas) {
        toast.error('Canvas element not found');
        return;
      }

      // Create offscreen canvas and draw cropped region
      const offscreen = document.createElement('canvas');
      offscreen.width = dw;
      offscreen.height = dh;
      const ctx = offscreen.getContext('2d');
      if (!ctx) {
        toast.error('Could not create export context');
        return;
      }

      // For JPG, fill white background first (no transparency)
      if (format === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, dw, dh);
      }

      // Draw the cropped region from the live canvas
      // Use device pixel ratio to handle retina displays
      const dpr = window.devicePixelRatio || 1;
      ctx.drawImage(
        lowerCanvas,
        sx * dpr, sy * dpr, sw * dpr, sh * dpr,
        0, 0, dw, dh
      );

      const title = frame.artboardTitle || 'artboard';
      const timestamp = Date.now();
      const q = quality / 100;

      if (format === 'pdf') {
        const imgData = offscreen.toDataURL('image/png', 1);
        const pdf = new jsPDF({
          orientation: dw > dh ? 'landscape' : 'portrait',
          unit: 'px',
          format: [dw, dh],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, dw, dh);
        pdf.save(`${title}-${timestamp}.pdf`);
      } else {
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const dataURL = offscreen.toDataURL(mimeType, q);
        const link = document.createElement('a');
        link.download = `${title}-${timestamp}.${format}`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast.success(`Exported as ${format.toUpperCase()}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export artboard');
    }
  }, [canvas, artboard, format, quality, scale, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            Export: {artboard?.artboardTitle || 'Artboard'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v: any) => setFormat(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG (with transparency)</SelectItem>
                <SelectItem value="jpg">JPG (smaller size)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {format !== 'png' && (
            <div className="space-y-2">
              <Label>Quality: {quality}%</Label>
              <Slider
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                min={1}
                max={100}
                step={1}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Scale: {scale}x</Label>
            <Slider
              value={[scale]}
              onValueChange={([v]) => setScale(v)}
              min={1}
              max={4}
              step={0.5}
            />
            <p className="text-xs text-muted-foreground">
              {artboard ? `${Math.round((artboard.width || 800) * scale)} × ${Math.round((artboard.height || 600) * scale)} px` : ''}
            </p>
          </div>

          <Button onClick={handleExport} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Export {format.toUpperCase()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

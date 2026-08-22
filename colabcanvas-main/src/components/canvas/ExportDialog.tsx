import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ExportIcon } from '@/components/icons/CustomIcons';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

interface ExportDialogProps {
  selectedObject: any;
}

export const ExportDialog = ({ selectedObject }: ExportDialogProps) => {
  const [format, setFormat] = useState<'PNG' | 'JPG' | 'SVG'>('PNG');
  const [quality, setQuality] = useState(100);
  const [scale, setScale] = useState(1);
  const [open, setOpen] = useState(false);

  const handleExport = () => {
    if (!selectedObject) return;

    try {
      let dataURL: string;

      if (format === 'SVG') {
        const rawSvg = selectedObject.toSVG();
        // Sanitize SVG output to prevent stored XSS (CVE-2026-27013)
        const sanitizedSvg = DOMPurify.sanitize(rawSvg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['use'],
        });
        // Wrap fragment in a valid SVG document for Figma/Illustrator compatibility
        const bounds = selectedObject.getBoundingRect();
        const svgWidth = bounds.width * scale;
        const svgHeight = bounds.height * scale;
        const svgDoc = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${bounds.width} ${bounds.height}">
  <g transform="translate(${-bounds.left},${-bounds.top})">
    ${sanitizedSvg}
  </g>
</svg>`;
        const blob = new Blob([svgDoc], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `export.svg`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        dataURL = selectedObject.toDataURL({
          format: format.toLowerCase(),
          quality: quality / 100,
          multiplier: scale
        });

        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `export.${format.toLowerCase()}`;
        link.click();
      }

      toast.success(`Exported as ${format}`);
      setOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9">
          <ExportIcon className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Object</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v: any) => setFormat(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PNG">PNG (Transparent)</SelectItem>
                <SelectItem value="JPG">JPG (Smaller size)</SelectItem>
                <SelectItem value="SVG">SVG (Vector)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quality Slider (for PNG/JPG) */}
          {format !== 'SVG' && (
            <div className="space-y-2">
              <Label>Quality: {quality}%</Label>
              <Slider
                value={[quality]}
                onValueChange={(v) => setQuality(v[0])}
                min={1}
                max={100}
              />
            </div>
          )}

          {/* Scale Multiplier */}
          <div className="space-y-2">
            <Label>Scale: {scale}x</Label>
            <Slider
              value={[scale]}
              onValueChange={(v) => setScale(v[0])}
              min={0.5}
              max={4}
              step={0.5}
            />
            <p className="text-xs text-muted-foreground">
              Higher scale = larger file size
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            Export {format}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

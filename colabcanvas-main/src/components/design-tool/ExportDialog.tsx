import { useState } from "react";
import { Canvas as FabricCanvas } from "fabric";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { FrameContainer } from "@/lib/canvas/FrameContainer";
import DOMPurify from "dompurify";
import jsPDF from "jspdf";

interface ExportDialogProps {
  canvas: FabricCanvas;
  projectTitle: string;
  onClose: () => void;
  frame?: FrameContainer | null;
}

export function ExportDialog({ canvas, projectTitle, onClose, frame }: ExportDialogProps) {
  const [format, setFormat] = useState<'png' | 'jpg' | 'svg' | 'pdf'>('png');
  const [quality, setQuality] = useState(100);
  const [scale, setScale] = useState(1);

  const exportName = frame ? (frame.artboardTitle || projectTitle) : projectTitle;

  const handleExport = () => {
    if (!canvas) return;

    try {
      const exportSource = frame || canvas;

      if (format === 'pdf') {
        const exportFormat = 'png' as const;
        const dataUrl = exportSource.toDataURL({
          format: exportFormat,
          quality: quality / 100,
          multiplier: scale,
        });

        const img = new Image();
        img.onload = () => {
          const pdf = new jsPDF({
            orientation: img.width > img.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [img.width, img.height],
          });
          pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
          pdf.save(`${exportName}.pdf`);
          toast.success('Design exported as PDF');
          onClose();
        };
        img.src = dataUrl;
        return;
      }

      const exportFormat = format === 'jpg' ? 'jpeg' : format === 'svg' ? 'png' : format;
      
      if (format === 'svg') {
        // SVG export — wrap in valid document for Figma/Illustrator compatibility
        const rawSvg = frame ? (frame as any).toSVG() : (canvas as any).toSVG();
        const sanitizedSvg = DOMPurify.sanitize(rawSvg, { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ['use'] });
        
        // Get dimensions from source
        let svgWidth: number, svgHeight: number, offsetX: number, offsetY: number;
        if (frame) {
          svgWidth = (frame.width || 100) * scale;
          svgHeight = (frame.height || 100) * scale;
          offsetX = -(frame.left || 0);
          offsetY = -(frame.top || 0);
        } else {
          const bounds = canvas.getObjects().length > 0 
            ? canvas.getObjects().reduce((acc, obj) => {
                const b = obj.getBoundingRect();
                return {
                  left: Math.min(acc.left, b.left),
                  top: Math.min(acc.top, b.top),
                  right: Math.max(acc.right, b.left + b.width),
                  bottom: Math.max(acc.bottom, b.top + b.height),
                };
              }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity })
            : { left: 0, top: 0, right: canvas.width || 800, bottom: canvas.height || 600 };
          svgWidth = (bounds.right - bounds.left) * scale;
          svgHeight = (bounds.bottom - bounds.top) * scale;
          offsetX = -bounds.left;
          offsetY = -bounds.top;
        }

        const svgDoc = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth / scale} ${svgHeight / scale}">
  <g transform="translate(${offsetX},${offsetY})">
    ${sanitizedSvg}
  </g>
</svg>`;

        const blob = new Blob([svgDoc], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${exportName}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Design exported as SVG');
        onClose();
        return;
      }

      const dataUrl = exportSource.toDataURL({
        format: exportFormat as 'png' | 'jpeg',
        quality: quality / 100,
        multiplier: scale,
      });

      const link = document.createElement('a');
      link.download = `${exportName}.${format}`;
      link.href = dataUrl;
      link.click();

      toast.success('Design exported successfully');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export design');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {frame ? `Export Frame: ${frame.artboardTitle}` : 'Export Design'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v: any) => setFormat(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG (with transparency)</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="svg">SVG (vector)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {format !== 'svg' && (
            <>
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

              <div className="space-y-2">
                <Label>Scale: {scale}x</Label>
                <Slider
                  value={[scale]}
                  onValueChange={([v]) => setScale(v)}
                  min={1}
                  max={4}
                  step={0.5}
                />
              </div>
            </>
          )}

          <Button onClick={handleExport} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Export {frame ? 'Frame' : 'Design'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

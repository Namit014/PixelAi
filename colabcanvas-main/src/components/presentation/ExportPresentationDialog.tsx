import { useState, useRef, useCallback } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import { SlideRenderer } from './SlideRenderer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Image, FileSpreadsheet, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ExportFormat = 'pdf' | 'png' | 'pptx';

interface ExportPresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export async function captureSlideAsImage(
  slide: any,
  tokens: any,
  width = 1920,
  height = 1080,
  showWatermark = false
): Promise<string> {
  // Create an offscreen container — keep in viewport but invisible for html-to-image
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.overflow = 'hidden';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-9999';
  container.style.backgroundColor = tokens.backgroundColor || '#ffffff';
  document.body.appendChild(container);

  // Use React to render SlideRenderer into it
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  
  await new Promise<void>((resolve) => {
    root.render(
      <SlideRenderer
        slide={slide}
        tokens={tokens}
        scale={1}
        isActive={false}
        onClick={() => {}}
        showWatermark={showWatermark}
      />
    );
    // Allow rendering — increased delay for complex slides
    setTimeout(resolve, 800);
  });

  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(container, {
    width,
    height,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: tokens.backgroundColor || '#ffffff',
  });

  root.unmount();
  document.body.removeChild(container);
  return dataUrl;
}

export function ExportPresentationDialog({ open, onOpenChange }: ExportPresentationDialogProps) {
  const slides = usePresentationStore((s) => s.slides);
  const tokens = usePresentationStore((s) => s.designTokens);
  const title = usePresentationStore((s) => s.title);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFreeUser, setIsFreeUser] = useState(true);

  // Check subscription tier on mount
  useState(() => {
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          supabase.from('credits').select('subscription_tier').eq('user_id', data.user.id).single().then(({ data: credits }) => {
            if (credits && credits.subscription_tier !== 'free') setIsFreeUser(false);
          });
        }
      });
    });
  });

  const handleExport = useCallback(async () => {
    if (slides.length === 0) {
      toast.error('No slides to export');
      return;
    }

    setExporting(true);
    setProgress(0);

    try {
      if (format === 'png') {
        // Export each slide as PNG
        for (let i = 0; i < slides.length; i++) {
          setProgress(Math.round(((i + 1) / slides.length) * 100));
          const dataUrl = await captureSlideAsImage(slides[i], tokens, 1920, 1080, isFreeUser);
          const link = document.createElement('a');
          link.download = `${title}-slide-${i + 1}.png`;
          link.href = dataUrl;
          link.click();
        }
        toast.success(`Exported ${slides.length} slides as PNG`);
      } else if (format === 'pdf') {
        const { default: jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });

        for (let i = 0; i < slides.length; i++) {
          setProgress(Math.round(((i + 1) / slides.length) * 100));
          if (i > 0) pdf.addPage([1920, 1080], 'landscape');
          const dataUrl = await captureSlideAsImage(slides[i], tokens, 1920, 1080, isFreeUser);
          pdf.addImage(dataUrl, 'PNG', 0, 0, 1920, 1080);
        }

        pdf.save(`${title}.pdf`);
        toast.success('Exported as PDF');
      } else if (format === 'pptx') {
        const pptxgenjs = await import('pptxgenjs');
        const PptxGenJS = pptxgenjs.default;
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE';

        for (let i = 0; i < slides.length; i++) {
          setProgress(Math.round(((i + 1) / slides.length) * 100));
          const pptxSlide = pptx.addSlide();
          const dataUrl = await captureSlideAsImage(slides[i], tokens, 1920, 1080, isFreeUser);
          pptxSlide.addImage({ data: dataUrl, x: 0, y: 0, w: '100%', h: '100%' });
        }

        await pptx.writeFile({ fileName: `${title}.pptx` });
        toast.success('Exported as PPTX');
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }, [slides, tokens, title, format, onOpenChange, isFreeUser]);

  const formats: { id: ExportFormat; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'pdf', label: 'PDF', icon: FileText, desc: 'Best for sharing & printing' },
    { id: 'png', label: 'PNG', icon: Image, desc: 'Individual slide images' },
    { id: 'pptx', label: 'PowerPoint', icon: FileSpreadsheet, desc: 'Editable in PowerPoint/Google Slides' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Export Presentation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-2">
            {formats.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    format === f.id
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border hover:border-foreground/30'
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{f.label}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{f.desc}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground">
            {slides.length} slide{slides.length !== 1 ? 's' : ''} • {title}
          </div>

          {exporting && (
            <div className="space-y-2">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Exporting... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleExport}
            disabled={exporting || slides.length === 0}
            className="w-full gap-2"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

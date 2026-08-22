import { slideLayouts } from './LayoutRegistry';
import { usePresentationStore } from '@/stores/presentationStore';
import { createEmptySlide } from './SlideThumbnailPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onClose: () => void;
}

export function LayoutPickerPanel({ onClose }: Props) {
  const addSlide = usePresentationStore((s) => s.addSlide);
  const activeSlideId = usePresentationStore((s) => s.activeSlideId);
  const tokens = usePresentationStore((s) => s.designTokens);

  const handleSelect = (layoutId: string) => {
    const slide = createEmptySlide(layoutId);
    addSlide(slide, activeSlideId ?? undefined);
  };

  return (
    <div className="absolute left-16 top-1/2 -translate-y-1/2 z-50 w-[240px] max-h-[70vh] rounded-xl border border-border bg-background animate-in slide-in-from-left-2 duration-200 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-medium text-foreground">Layouts</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-2 p-3">
          {slideLayouts.map((layout) => (
            <button
              key={layout.id}
              onClick={() => handleSelect(layout.id)}
              className="group flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {/* Mini layout preview */}
              <div
                className="w-full aspect-video rounded border border-border relative overflow-hidden"
                style={{ backgroundColor: tokens.surfaceColor }}
              >
                {layout.regions.map((r) => (
                  <div
                    key={r.id}
                    className="absolute bg-foreground/10 rounded-sm"
                    style={{
                      left: `${r.x}%`, top: `${r.y}%`,
                      width: `${r.width}%`, height: `${r.height}%`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                {layout.name}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

import { usePresentationStore } from '@/stores/presentationStore';
import { Button } from '@/components/ui/button';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const BREAKPOINTS = [
{ id: 'desktop' as const, label: 'Desktop', icon: Monitor, w: 1920, h: 1080 },
{ id: 'tablet' as const, label: 'Tablet', icon: Tablet, w: 1024, h: 768 },
{ id: 'mobile' as const, label: 'Mobile', icon: Smartphone, w: 390, h: 844 }];


export function BreakpointSwitcher() {
  const slideWidth = usePresentationStore((s) => s.slideWidth);
  const setSlideSize = usePresentationStore((s) => s.setSlideSize);

  const activeBreakpoint = BREAKPOINTS.find((b) => b.w === slideWidth)?.id || 'desktop';

  return (
    <div className="flex items-center bg-muted/80 backdrop-blur-sm rounded-lg border border-border/50 p-0.5">
      {BREAKPOINTS.map((bp) => {
        const Icon = bp.icon;
        const isActive = activeBreakpoint === bp.id;
        return (
          <Tooltip key={bp.id}>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 bg-primary-foreground"
                onClick={() => setSlideSize(bp.w, bp.h)}>
                
                <Icon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {bp.label} ({bp.w}×{bp.h})
            </TooltipContent>
          </Tooltip>);

      })}
    </div>);

}
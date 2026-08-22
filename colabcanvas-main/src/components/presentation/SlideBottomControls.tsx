import { usePresentationStore } from '@/stores/presentationStore';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Undo2, Redo2, Columns, Rows3, MousePointer2, Hand, LayoutGrid } from 'lucide-react';
import { BreakpointSwitcher } from './BreakpointSwitcher';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function SlideBottomControls() {
  const zoom = usePresentationStore((s) => s.zoom);
  const setZoom = usePresentationStore((s) => s.setZoom);
  const canUndo = usePresentationStore((s) => s.canUndo);
  const canRedo = usePresentationStore((s) => s.canRedo);
  const undo = usePresentationStore((s) => s.undo);
  const redo = usePresentationStore((s) => s.redo);
  const viewMode = usePresentationStore((s) => s.viewMode);
  const setViewMode = usePresentationStore((s) => s.setViewMode);
  const activeTool = usePresentationStore((s) => s.activeTool);
  const setActiveTool = usePresentationStore((s) => s.setActiveTool);
  const slides = usePresentationStore((s) => s.slides);
  const activeSlideId = usePresentationStore((s) => s.activeSlideId);

  const activeIndex = slides.findIndex((s) => s.id === activeSlideId) + 1;

  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5">
      {/* Undo/Redo group */}
      <div className="flex items-center bg-muted/80 backdrop-blur-sm rounded-lg border border-border/50 p-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={!canUndo}>
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Undo (⌘Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} disabled={!canRedo}>
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Redo (⌘⇧Z)</TooltipContent>
        </Tooltip>
      </div>

      {/* Select/Hand tool toggle — only in canvas mode */}
      {viewMode === 'canvas' &&
      <div className="flex items-center bg-muted/80 backdrop-blur-sm rounded-lg border border-border/50 p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
              variant={activeTool === 'select' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setActiveTool('select')}>
              
                <MousePointer2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Select (V)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
              variant={activeTool === 'hand' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setActiveTool('hand')}>
              
                <Hand className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Hand (H / Hold Space)</TooltipContent>
          </Tooltip>

        </div>
      }

      {/* Zoom group */}
      <div className="flex items-center bg-muted/80 backdrop-blur-sm rounded-lg border border-border/50 p-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(zoom - 0.1)}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(zoom + 0.1)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center bg-muted/80 backdrop-blur-sm rounded-lg border border-border/50 p-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'page' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7 bg-primary-foreground"
              onClick={() => setViewMode('page')}>
              
              <Rows3 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Page Mode</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'canvas' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7 bg-primary-foreground"
              onClick={() => setViewMode('canvas')}>
              
              <Columns className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Canvas Mode</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7 bg-primary-foreground"
              onClick={() => setViewMode('grid')}>
              
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Grid Overview (G)</TooltipContent>
        </Tooltip>
      </div>

      {/* Breakpoint switcher */}
      <BreakpointSwitcher />

      {/* Slide counter */}
      <span className="text-[11px] text-muted-foreground ml-1 font-mono">
        {activeIndex > 0 ? activeIndex : '–'}/{slides.length}
      </span>
    </div>);

}
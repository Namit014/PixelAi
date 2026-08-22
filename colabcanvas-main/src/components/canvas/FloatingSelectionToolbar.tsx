import { Button } from "@/components/ui/button";
import { RotateCw, Copy, Trash2, Lock, Sparkles } from "lucide-react";
import { DownloadToolbarIcon } from "@/components/icons/CustomIcons";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import DOMPurify from "dompurify";

interface FloatingSelectionToolbarProps {
  selectedObject: any;
  position: { x: number; y: number };
  onRotate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLock: () => void;
  fabricCanvas?: any;
  onShaderRemoved?: () => void;
  onAnimateToggle?: () => void;
  isAnimating?: boolean;
}

export function FloatingSelectionToolbar({
  selectedObject,
  position,
  onRotate,
  onDuplicate,
  onDelete,
  onLock,
  fabricCanvas,
  onShaderRemoved,
  onAnimateToggle,
  isAnimating = false,
}: FloatingSelectionToolbarProps) {
  if (!selectedObject) return null;

  const isArtboard = selectedObject?.isArtboard === true;
  const isSvgIcon = selectedObject?.isSvgIcon === true;
  const isBrushStroke = selectedObject?.isBrushStroke === true || selectedObject?.type === 'path';
  const isLocked = selectedObject?.lockMovementX && selectedObject?.lockMovementY;

  // Export frame using the FrameContainer's native toDataURL (no viewport hack)
  const handleExportFrame = async () => {
    if (!selectedObject?.isArtboard) {
      toast.error('No frame selected');
      return;
    }

    const loadingToast = toast.loading('Exporting frame...');

    try {
      const title = selectedObject.artboardTitle || selectedObject.fullTitle || 'frame';
      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

      // Use Fabric Group's toDataURL directly — respects clipPath, renders only children
      const dataUrl = selectedObject.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2,
      });

      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('Failed to generate image data');
      }

      const link = document.createElement('a');
      link.download = `${sanitizedTitle}-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Frame exported!', { id: loadingToast });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export frame', { id: loadingToast });
    }
  };

  // FIX #5: position.x and position.y are screen coordinates (from getBoundingRect + canvas offset)
  // The -60 offset positions it above the selection, centered with translateX(-50%)
  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="fixed z-50 flex items-center gap-1 bg-background/95 backdrop-blur-md border border-border rounded-lg p-1.5 animate-push-in"
        style={{
          left: `${position.x}px`,
          top: `${Math.max(10, position.y - 60)}px`,
          transform: 'translateX(-50%)',
        }}
      >
        {/* Export button for artboards/frames */}
        {isArtboard && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 gap-1.5 hover:bg-accent"
                  onClick={handleExportFrame}
                >
                  <DownloadToolbarIcon className="w-4 h-4" />
                  <span className="text-xs">Export</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Export Frame as PNG (2x)</TooltipContent>
            </Tooltip>
            <div className="w-px h-5 bg-border" />
          </>
        )}

        {/* Animate button for SVG icons */}
        {isSvgIcon && onAnimateToggle && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isAnimating ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3 gap-1.5 hover:bg-accent"
                  onClick={onAnimateToggle}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs">{isAnimating ? 'Stop' : 'Animate'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Toggle SVG Animation Mode</TooltipContent>
            </Tooltip>
            <div className="w-px h-5 bg-border" />
          </>
        )}


        {/* Rotation Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-primary/10"
              onClick={onRotate}
            >
              <RotateCw className="w-4 h-4 text-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Rotate 45°</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              onClick={onDuplicate}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Duplicate (Cmd/Ctrl + D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              onClick={onLock}
            >
              <Lock className={`w-4 h-4 ${isLocked ? 'text-primary' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{isLocked ? 'Unlock' : 'Lock'} Element</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Delete (Del/Backspace)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

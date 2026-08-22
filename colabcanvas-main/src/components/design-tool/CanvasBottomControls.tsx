import { Button } from "@/components/ui/button";
import { 
  MousePointer2, 
  Square, 
  Pen, 
  Type, 
  Smile, 
  Undo2, 
  Redo2,
  ZoomIn,
  ZoomOut,
  Crown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Tool = 'select' | 'frame' | 'rectangle' | 'pen' | 'text' | 'shapes';

interface CanvasBottomControlsProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function CanvasBottomControls({
  activeTool,
  onToolChange,
  zoom,
  onZoomChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasBottomControlsProps) {
  const zoomPresets = [25, 50, 75, 100, 125, 150, 200];

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
      <div className="flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border rounded-full shadow-lg px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            activeTool === 'select' && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => onToolChange('select')}
          title="Select (V)"
        >
          <MousePointer2 className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            activeTool === 'frame' && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => onToolChange('frame')}
          title="Frame (F)"
        >
          <Square className="w-4 h-4" strokeDasharray="4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            activeTool === 'rectangle' && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => onToolChange('rectangle')}
          title="Rectangle (R)"
        >
          <Square className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            activeTool === 'pen' && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => onToolChange('pen')}
          title="Pen (P)"
        >
          <Pen className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            activeTool === 'text' && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => onToolChange('text')}
          title="Text (T)"
        >
          <Type className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            activeTool === 'shapes' && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => onToolChange('shapes')}
          title="Shapes (S)"
        >
          <Smile className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          onClick={() => onZoomChange(Math.max(25, zoom - 25))}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full min-w-[60px]">
              {Math.round(zoom)}%
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {zoomPresets.map((preset) => (
              <DropdownMenuItem
                key={preset}
                onClick={() => onZoomChange(preset)}
              >
                {preset}%
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => onZoomChange(100)}>
              Fit to Screen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          onClick={() => onZoomChange(Math.min(200, zoom + 25))}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          size="sm"
          className="h-8 px-4 rounded-full bg-yellow-500 hover:bg-yellow-600 text-black"
        >
          <Crown className="w-4 h-4 mr-2" />
          Upgrade
        </Button>
      </div>
    </div>
  );
}
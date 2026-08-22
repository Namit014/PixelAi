import { FabricObject } from "fabric";
import { Button } from "@/components/ui/button";
import { Link, Wand2, Crop, Copy, Download, MoreHorizontal } from "lucide-react";

interface FloatingObjectToolbarProps {
  selectedObject: FabricObject | null;
  position: { x: number; y: number };
  onAction: (action: 'link' | 'edit' | 'crop' | 'duplicate' | 'download' | 'more') => void;
}

export function FloatingObjectToolbar({ selectedObject, position, onAction }: FloatingObjectToolbarProps) {
  if (!selectedObject) return null;

  return (
    <div
      className="absolute z-50 flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-1"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 50}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onAction('link')}
        title="Add Link"
      >
        <Link className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onAction('edit')}
        title="Edit with AI"
      >
        <Wand2 className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onAction('crop')}
        title="Crop"
      >
        <Crop className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onAction('duplicate')}
        title="Duplicate"
      >
        <Copy className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onAction('download')}
        title="Download"
      >
        <Download className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onAction('more')}
        title="More Options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    </div>
  );
}
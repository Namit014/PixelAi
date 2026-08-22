import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Check, Pencil } from 'lucide-react';

interface RealtimeSketchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  previewImageUrl: string | null;
  onPlaceOnCanvas: () => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
}

export function RealtimeSketchPanel({
  isOpen,
  onClose,
  previewImageUrl,
  onPlaceOnCanvas,
  prompt,
  onPromptChange,
}: RealtimeSketchPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-50 w-[300px] bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden pointer-events-auto">
      {/* Minimal header — close only */}
      <div className="flex items-center justify-end px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Preview — always show last image or placeholder */}
      <div className="px-3 pb-2">
        <div className="w-full aspect-square bg-muted/30 rounded-lg border border-border flex items-center justify-center overflow-hidden">
          {previewImageUrl ? (
            <img
              src={previewImageUrl}
              alt="AI Preview"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground/40 p-4 text-center">
              <Pencil className="w-5 h-5" />
              <p className="text-[11px]">Draw something</p>
            </div>
          )}
        </div>
      </div>

      {/* Prompt + Actions */}
      <div className="px-3 pb-3 space-y-2">
        <Input
          placeholder="Guide the AI (optional)..."
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="h-8 text-xs"
          onKeyDown={(e) => e.stopPropagation()}
        />
        {previewImageUrl && (
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={onPlaceOnCanvas}
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Place on Canvas
          </Button>
        )}
      </div>
    </div>
  );
}

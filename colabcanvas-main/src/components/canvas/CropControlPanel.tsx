import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, ChevronDown, Crop } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CropControlPanelProps {
  width: number;
  height: number;
  onUpdate: (width: number, height: number) => void;
  onApply: () => void;
  onCancel: () => void;
}

const CropControlPanel = ({ width, height, onUpdate, onApply, onCancel }: CropControlPanelProps) => {
  const [localWidth, setLocalWidth] = useState(Math.round(width).toString());
  const [localHeight, setLocalHeight] = useState(Math.round(height).toString());
  const [isLocked, setIsLocked] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(width / height);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const presetRatios = [
    { name: 'Custom', width: null, height: null },
    { name: '1:1', width: 1, height: 1 },
    { name: '16:9', width: 16, height: 9 },
    { name: '4:3', width: 4, height: 3 },
    { name: '3:2', width: 3, height: 2 },
    { name: '2:3', width: 2, height: 3 },
  ];

  useEffect(() => {
    setLocalWidth(Math.round(width).toString());
    setLocalHeight(Math.round(height).toString());
    setAspectRatio(width / height);
  }, [width, height]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        onApply();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, onApply]);

  const handleWidthChange = (value: string) => {
    setLocalWidth(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (isLocked) {
        const newHeight = Math.round(numValue / aspectRatio);
        setLocalHeight(newHeight.toString());
        onUpdate(numValue, newHeight);
      } else {
        onUpdate(numValue, parseInt(localHeight));
      }
    }
  };

  const handleHeightChange = (value: string) => {
    setLocalHeight(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (isLocked) {
        const newWidth = Math.round(numValue * aspectRatio);
        setLocalWidth(newWidth.toString());
        onUpdate(newWidth, numValue);
      } else {
        onUpdate(parseInt(localWidth), numValue);
      }
    }
  };

  const handleRatioSelect = (ratio: { width: number | null; height: number | null }) => {
    if (ratio.width && ratio.height) {
      const currentWidth = parseInt(localWidth);
      const newAspect = ratio.width / ratio.height;
      const newHeight = Math.round(currentWidth / newAspect);
      setLocalHeight(newHeight.toString());
      setAspectRatio(newAspect);
      setIsLocked(true);
      onUpdate(currentWidth, newHeight);
    }
    setIsPopoverOpen(false);
  };

  return (
    <>
      {/* Control Panel */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="glass-header rounded-lg border border-border/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2">
              <Crop className="h-4 w-4" />
              <span className="text-sm font-medium">Crop</span>
            </div>

            <div className="h-5 w-px bg-border/30" />
            
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-medium h-7 px-2">
                  Custom
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 bg-card/95 backdrop-blur-xl border-border/30" align="start">
                <div className="space-y-1">
                  {presetRatios.map((ratio) => (
                    <button
                      key={ratio.name}
                      onClick={() => handleRatioSelect(ratio)}
                      className="w-full px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left text-sm"
                    >
                      {ratio.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            <div className="h-5 w-px bg-border/30" />
            
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">W</span>
              <Input
                value={localWidth}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-20 h-7 text-center text-xs font-medium px-1"
                type="number"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${isLocked ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setIsLocked(!isLocked)}
              title={isLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
            >
              <Link2 className={`h-3.5 w-3.5 ${isLocked ? '' : 'opacity-50'}`} />
            </Button>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">H</span>
              <Input
                value={localHeight}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="w-20 h-7 text-center text-xs font-medium px-1"
                type="number"
              />
            </div>

            <div className="h-5 w-px bg-border/30 ml-1" />

            <Button
              onClick={onApply}
              className="h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
            >
              Crop
            </Button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 delay-100">
        <div className="glass-header rounded-lg border border-border/30 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <span>Drag to select the crop area.</span>
            <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Esc</kbd>
            <span>to exit.</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default CropControlPanel;

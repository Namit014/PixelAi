import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Paintbrush } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export interface BrushStyle {
  name: string;
  width: number;
  opacity: number;
  smoothness: number;
  variability: number;
  pressureSensitivity: number;
  preset: 'heist' | 'blockbuster' | 'grindhouse' | 'biopic' | 'spaghetti' | 'slasher';
}

const BRUSH_PRESETS: BrushStyle[] = [
  { name: 'Heist', width: 4, opacity: 0.9, smoothness: 0.8, variability: 0.1, pressureSensitivity: 0.8, preset: 'heist' },
  { name: 'Blockbuster', width: 8, opacity: 1, smoothness: 0.6, variability: 0, pressureSensitivity: 0.5, preset: 'blockbuster' },
  { name: 'Grindhouse', width: 5, opacity: 0.85, smoothness: 0.3, variability: 0.4, pressureSensitivity: 0.9, preset: 'grindhouse' },
  { name: 'Biopic', width: 2, opacity: 0.95, smoothness: 0.95, variability: 0.05, pressureSensitivity: 0.7, preset: 'biopic' },
  { name: 'Spaghetti Western', width: 3, opacity: 0.8, smoothness: 0.7, variability: 0.3, pressureSensitivity: 0.85, preset: 'spaghetti' },
  { name: 'Slasher', width: 6, opacity: 0.9, smoothness: 0.2, variability: 0.5, pressureSensitivity: 1.0, preset: 'slasher' },
];

interface BrushStyleSelectorProps {
  selectedStyle: BrushStyle;
  onStyleSelect: (style: BrushStyle) => void;
}

export const BrushStyleSelector = ({ selectedStyle, onStyleSelect }: BrushStyleSelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleSensitivityChange = (value: number[]) => {
    onStyleSelect({ ...selectedStyle, pressureSensitivity: value[0] });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Paintbrush className="w-4 h-4" />
          <span className="text-xs">{selectedStyle.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Brush Styles</p>
          {BRUSH_PRESETS.map((preset) => (
            <button
              key={preset.preset}
              onClick={() => {
                onStyleSelect(preset);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedStyle.preset === preset.preset
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{preset.name}</span>
                <span className="text-xs opacity-60">{preset.width}px</span>
              </div>
            </button>
          ))}
          
          {/* Pressure Sensitivity Slider */}
          <div className="pt-3 mt-2 border-t border-border px-1">
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              Pressure Sensitivity: {Math.round(selectedStyle.pressureSensitivity * 100)}%
            </Label>
            <Slider
              value={[selectedStyle.pressureSensitivity]}
              onValueChange={handleSensitivityChange}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Apple Pencil & stylus pressure response
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export { BRUSH_PRESETS };

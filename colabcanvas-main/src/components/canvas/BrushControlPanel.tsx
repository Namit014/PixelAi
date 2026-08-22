import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { BrushStyleSelector } from "./BrushStyleSelector";

interface BrushControlPanelProps {
  width: number;
  onWidthChange: (width: number) => void;
  brushStyle: any;
  onStyleChange: (style: any) => void;
}

export const BrushControlPanel = ({ 
  width, 
  onWidthChange, 
  brushStyle, 
  onStyleChange 
}: BrushControlPanelProps) => {
  return (
    <div className="fixed top-20 right-4 z-50 bg-background/95 backdrop-blur-sm border rounded-lg p-4 w-64 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Brush Width: {width}px
          </Label>
          <Slider
            value={[width]}
            onValueChange={([val]) => onWidthChange(val)}
            min={1}
            max={50}
            step={1}
            className="w-full"
          />
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Brush Style</Label>
          <BrushStyleSelector 
            selectedStyle={brushStyle}
            onStyleSelect={(style) => {
              onStyleChange(style);
              // Don't close parent panel
            }}
          />
        </div>
      </div>
    </div>
  );
};

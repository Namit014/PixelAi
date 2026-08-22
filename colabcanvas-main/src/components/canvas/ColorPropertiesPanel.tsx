import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FillColorDialog } from "./FillColorDialog";
import { StrokeColorDialog } from "./StrokeColorDialog";
import { Gradient } from "fabric";

interface ColorPropertiesPanelProps {
  selectedObject: any;
  onUpdate: (properties: any) => void;
  selectedChildIndex?: number | null;
  canvas?: any;
}

// Build a CSS gradient string from a Fabric Gradient object
function gradientToCSS(gradient: any): string {
  const stops = (gradient.colorStops || []).map((s: any) => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ");
  if (gradient.type === "radial") return `radial-gradient(circle, ${stops})`;
  return `linear-gradient(90deg, ${stops})`;
}

const ColorPropertiesPanel = ({ selectedObject, onUpdate, selectedChildIndex }: ColorPropertiesPanelProps) => {
  if (!selectedObject) return null;

  const isSvgGroup = !!(selectedObject as any)?.isSvgIcon && selectedObject?._objects?.length > 0;
  const targetObject =
  isSvgGroup && selectedChildIndex != null && selectedObject._objects?.[selectedChildIndex] ?
  selectedObject._objects[selectedChildIndex] :
  null;

  const fill = targetObject ? targetObject.fill : selectedObject?.fill;
  const isGradient = fill && typeof fill === "object" && fill instanceof Gradient;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="glass-header backdrop-blur-xl rounded-lg border border-border/30 px-[3px] py-[3px]">
        <div className="flex items-center gap-2">
          {/* Fill Color Button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-8 px-3">
                <div
                  className="w-5 h-5 rounded border border-border"
                  style={{
                    background: isGradient ? gradientToCSS(fill) : typeof fill === "string" ? fill : "#000000"
                  }} />

                <span className="text-xs">{targetObject ? `Path ${(selectedChildIndex ?? 0) + 1} Fill` : "Fill"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto" align="start" sideOffset={8}>
              <FillColorDialog
                selectedObject={targetObject || selectedObject}
                onUpdate={onUpdate}
                targetObject={targetObject} />

            </PopoverContent>
          </Popover>

          {/* Stroke Color Button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-8 px-3">
                <div
                  className="w-5 h-5 rounded border-2"
                  style={{
                    borderColor: (targetObject || selectedObject)?.stroke || "#000000",
                    backgroundColor: "transparent"
                  }} />

                <span className="text-xs">Stroke</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto" align="start" sideOffset={8}>
              <StrokeColorDialog selectedObject={targetObject || selectedObject} onUpdate={onUpdate} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>);

};

export default ColorPropertiesPanel;
import { useEffect, useState } from "react";
import { Canvas as FabricCanvas, FabricObject } from "fabric";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PropertiesPanelProps {
  canvas: FabricCanvas | null;
}

export function PropertiesPanel({ canvas }: PropertiesPanelProps) {
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [properties, setProperties] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    angle: 0,
    opacity: 1,
    fill: '#000000',
    stroke: '#000000',
    strokeWidth: 0,
  });

  useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        setSelectedObject(activeObject);
        updateProperties(activeObject);
      } else {
        setSelectedObject(null);
      }
    };

    const handleModified = () => {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        updateProperties(activeObject);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedObject(null));
    canvas.on('object:modified', handleModified);

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared');
      canvas.off('object:modified', handleModified);
    };
  }, [canvas]);

  const updateProperties = (obj: FabricObject) => {
    setProperties({
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0),
      width: Math.round(obj.width || 0),
      height: Math.round(obj.height || 0),
      angle: Math.round(obj.angle || 0),
      opacity: obj.opacity || 1,
      fill: (obj.fill as string) || '#000000',
      stroke: (obj.stroke as string) || '#000000',
      strokeWidth: obj.strokeWidth || 0,
    });
  };

  const handlePropertyChange = (key: string, value: any) => {
    if (!selectedObject || !canvas) return;

    selectedObject.set(key as any, value);
    canvas.renderAll();
    updateProperties(selectedObject);
  };

  if (!selectedObject) {
    return (
      <div className="w-64 border-l border-border bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm text-center px-4">
          Select an object to edit properties
        </p>
      </div>
    );
  }

  return (
    <div className="w-64 border-l border-border bg-background">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Properties</h3>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-4 space-y-6">
          {/* Position */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Position</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">X</Label>
                <Input
                  type="number"
                  value={properties.left}
                  onChange={(e) => handlePropertyChange('left', Number(e.target.value))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Y</Label>
                <Input
                  type="number"
                  value={properties.top}
                  onChange={(e) => handlePropertyChange('top', Number(e.target.value))}
                  className="h-8"
                />
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Size</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">W</Label>
                <Input
                  type="number"
                  value={properties.width}
                  onChange={(e) => handlePropertyChange('width', Number(e.target.value))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">H</Label>
                <Input
                  type="number"
                  value={properties.height}
                  onChange={(e) => handlePropertyChange('height', Number(e.target.value))}
                  className="h-8"
                />
              </div>
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Rotation</Label>
            <Input
              type="number"
              value={properties.angle}
              onChange={(e) => handlePropertyChange('angle', Number(e.target.value))}
              className="h-8"
            />
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Opacity</Label>
            <Slider
              value={[properties.opacity * 100]}
              onValueChange={([value]) => handlePropertyChange('opacity', value / 100)}
              max={100}
              step={1}
            />
            <div className="text-xs text-muted-foreground text-right">
              {Math.round(properties.opacity * 100)}%
            </div>
          </div>

          {/* Fill Color */}
          {selectedObject.type !== 'image' && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Fill</Label>
              <Input
                type="color"
                value={properties.fill}
                onChange={(e) => handlePropertyChange('fill', e.target.value)}
                className="h-10"
              />
            </div>
          )}

          {/* Stroke */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Stroke</Label>
            <Input
              type="color"
              value={properties.stroke}
              onChange={(e) => handlePropertyChange('stroke', e.target.value)}
              className="h-10"
            />
            <div>
              <Label className="text-xs">Width</Label>
              <Input
                type="number"
                value={properties.strokeWidth}
                onChange={(e) => handlePropertyChange('strokeWidth', Number(e.target.value))}
                className="h-8"
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

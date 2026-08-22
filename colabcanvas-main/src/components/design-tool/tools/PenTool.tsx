import { useEffect, useState } from "react";
import { Canvas as FabricCanvas, Path, Point } from "fabric";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface PenToolProps {
  canvas: FabricCanvas;
}

export function PenTool({ canvas }: PenToolProps) {
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';

    const handleClick = (e: any) => {
      const pointer = canvas.getPointer(e.e);
      const newPoint = new Point(pointer.x, pointer.y);
      
      setPoints(prev => [...prev, newPoint]);
      setIsDrawing(true);
    };

    canvas.on('mouse:down', handleClick);

    return () => {
      canvas.off('mouse:down', handleClick);
      canvas.selection = true;
      canvas.defaultCursor = 'default';
    };
  }, [canvas]);

  const finishPath = () => {
    if (points.length < 2) return;

    const pathData = points.map((point, i) => {
      return i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`;
    }).join(' ');

    const path = new Path(pathData, {
      stroke: '#000000',
      strokeWidth: 2,
      fill: '',
      selectable: true,
    });

    canvas.add(path);
    canvas.renderAll();
    
    setPoints([]);
    setIsDrawing(false);
  };

  const cancelPath = () => {
    setPoints([]);
    setIsDrawing(false);
  };

  if (!isDrawing) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg p-2 flex gap-2">
      <Button size="sm" onClick={finishPath}>
        <Check className="w-4 h-4 mr-2" />
        Finish Path
      </Button>
      <Button size="sm" variant="outline" onClick={cancelPath}>
        <X className="w-4 h-4 mr-2" />
        Cancel
      </Button>
    </div>
  );
}

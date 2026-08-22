import { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import {
  ShapeTriangleIcon,
  ShapeHexagonIcon,
  ShapeStarIcon,
  ShapeCircleIcon,
  ShapeRectangleIcon,
  ShapePentagonIcon
} from "@/components/icons/CustomIcons";
import { createElement } from "@/components/canvas/ElementCreator";
import { FrameContainer } from "@/lib/canvas/FrameContainer";
import { applyFrameClip } from "@/lib/canvas/frameReparenting";

interface ShapeToolsProps {
  canvas: FabricCanvas;
}

export function ShapeTools({ canvas }: ShapeToolsProps) {
  const addShape = (type: string, color: string) => {
    // Check if a frame is currently selected — auto-parent into it
    const active = canvas.getActiveObject();
    const targetFrame = (active && (active as any).isArtboard && active instanceof FrameContainer)
      ? active as FrameContainer
      : null;

    const obj = createElement(type, canvas, color);
    if (obj) {
      (obj as any).isStandaloneObject = true;
      (obj as any).canvasObjectId = (obj as any).canvasObjectId || `obj_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // If a frame is selected, place at frame center and auto-parent
      if (targetFrame) {
        const bounds = targetFrame.getFrameBounds();
        const objW = (obj.width || 100) * (obj.scaleX || 1);
        const objH = (obj.height || 100) * (obj.scaleY || 1);
        obj.set({
          left: bounds.left + (bounds.width - objW) / 2,
          top: bounds.top + (bounds.height - objH) / 2,
        });
        obj.setCoords();
        applyFrameClip(obj, targetFrame);
      }

      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.renderAll();
    }
  };

  return (
    <div className="absolute top-20 left-4 bg-background border border-border rounded-lg p-2 space-y-2">
      <Button variant="ghost" className="w-full justify-start" onClick={() => addShape('rectangle', '#3b82f6')}>
        <ShapeRectangleIcon className="w-4 h-4 mr-2" />
        Rectangle
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => addShape('circle', '#10b981')}>
        <ShapeCircleIcon className="w-4 h-4 mr-2" />
        Circle
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => addShape('triangle', '#f59e0b')}>
        <ShapeTriangleIcon className="w-4 h-4 mr-2" />
        Triangle
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => addShape('star', '#ef4444')}>
        <ShapeStarIcon className="w-4 h-4 mr-2" />
        Star
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => addShape('hexagon', '#8b5cf6')}>
        <ShapeHexagonIcon className="w-4 h-4 mr-2" />
        Hexagon
      </Button>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { Canvas as FabricCanvas, PencilBrush, Path, util } from 'fabric';
import type { BrushStyle } from './BrushStyleSelector';

interface PencilToolProps {
  canvas: FabricCanvas | null;
  isActive: boolean;
  color?: string;
  width?: number;
  brushStyle?: BrushStyle;
  onStrokeComplete?: () => void;
}

// Smooth path using Catmull-Rom spline
function smoothPath(points: { x: number; y: number }[], smoothness: number): string {
  if (points.length < 2) return '';
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    const cp1x = p1.x + (p2.x - p0.x) * smoothness / 6;
    const cp1y = p1.y + (p2.y - p0.y) * smoothness / 6;
    const cp2x = p2.x - (p3.x - p1.x) * smoothness / 6;
    const cp2y = p2.y - (p3.y - p1.y) * smoothness / 6;
    
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  
  return path;
}

export const PencilTool = ({ 
  canvas, 
  isActive, 
  color = '#000000', 
  width = 2,
  brushStyle,
  onStrokeComplete,
}: PencilToolProps) => {
  const stylusDetectedRef = useRef(false);
  const pressureDataRef = useRef<number[]>([]);

  useEffect(() => {
    if (!canvas) return;
    
    if (isActive) {
      canvas.isDrawingMode = true;
      const brush = new PencilBrush(canvas);
      
      const baseWidth = brushStyle?.width || width;
      const sensitivity = brushStyle?.pressureSensitivity ?? 0.8;
      const minWidthFactor = 0.15; // minimum width as fraction of base

      // Apply brush style settings
      if (brushStyle) {
        brush.width = brushStyle.width;
        brush.color = color;
      } else {
        brush.color = color;
        brush.width = width;
      }
      
      canvas.freeDrawingBrush = brush;

      // ── Pressure-sensitive drawing (Apple Pencil / stylus) ──
      const handlePointerMove = (opt: any) => {
        if (!canvas.isDrawingMode) return;
        const e = opt.e as PointerEvent;
        if (!e || typeof e.pressure === 'undefined') return;

        const pointerType = e.pointerType;
        
        // Detect stylus
        if (pointerType === 'pen') {
          stylusDetectedRef.current = true;
        }

        // Only apply pressure from pen input
        if (pointerType === 'pen' && e.pressure > 0) {
          const pressure = e.pressure;
          pressureDataRef.current.push(pressure);
          
          // Dynamic width based on pressure
          const dynamicWidth = baseWidth * (minWidthFactor + pressure * (1 - minWidthFactor) * sensitivity);
          const currentBrush = canvas.freeDrawingBrush;
          if (currentBrush) {
            currentBrush.width = Math.max(0.5, dynamicWidth);
          }
        }
      };

      // Distinguish touch (finger) from pen (stylus) on pointer down
      const handlePointerDown = (opt: any) => {
        const e = opt.e as PointerEvent;
        if (!e) return;

        // If stylus is detected and this is a touch (finger), block drawing — let it pan
        if (stylusDetectedRef.current && e.pointerType === 'touch') {
          canvas.isDrawingMode = false;
        } else if (e.pointerType === 'pen' || !stylusDetectedRef.current) {
          canvas.isDrawingMode = true;
          pressureDataRef.current = [];
        }
      };

      const handlePointerUp = (opt: any) => {
        const e = opt.e as PointerEvent;
        // Re-enable drawing mode after finger lift (for next pen stroke)
        if (e?.pointerType === 'touch' && stylusDetectedRef.current) {
          canvas.isDrawingMode = true;
        }
        // Reset brush width to base for next stroke
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.width = baseWidth;
        }
      };

      canvas.on('mouse:move', handlePointerMove);
      canvas.on('mouse:down', handlePointerDown);
      canvas.on('mouse:up', handlePointerUp);

      // Path smoothing + metadata on path:created
      const pathCreatedHandler = (e: any) => {
        const path = e.path;
        if (!path) return;

        // Smooth path if needed
        if (brushStyle && brushStyle.smoothness > 0.5) {
          const pathData = path.path;
          const points: { x: number; y: number }[] = [];
          
          pathData.forEach((segment: any) => {
            if (segment[0] === 'M' || segment[0] === 'L') {
              points.push({ x: segment[1], y: segment[2] });
            } else if (segment[0] === 'Q') {
              points.push({ x: segment[3], y: segment[4] });
            }
          });
          
          if (points.length > 2) {
            const smoothedPath = smoothPath(points, brushStyle.smoothness);
            try {
              path.path = util.parsePath(smoothedPath);
            } catch (err) {
              // Keep original path on parse error
            }
          }
        }

        // Tag with metadata
        const canvasObjectId = `brush_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        (path as any).canvasObjectId = canvasObjectId;
        (path as any).object_id = canvasObjectId;
        
        path.set({
          isBrushStroke: true,
          brushWidth: baseWidth,
          canvasObjectId,
          object_id: canvasObjectId,
        });
        
        // Store pressure data for variable-width re-rendering
        (path as any).pressureData = [...pressureDataRef.current];
        (path as any).brushArea = path.getBoundingRect();
        
        canvas.renderAll();
        
        // Notify parent of stroke completion
        onStrokeComplete?.();
      };
      
      canvas.on('path:created', pathCreatedHandler);
      
      return () => {
        canvas.off('mouse:move', handlePointerMove);
        canvas.off('mouse:down', handlePointerDown);
        canvas.off('mouse:up', handlePointerUp);
        canvas.off('path:created', pathCreatedHandler);
        canvas.isDrawingMode = false;
      };
    } else {
      canvas.isDrawingMode = false;
    }
    
    return () => {
      if (canvas) {
        canvas.isDrawingMode = false;
      }
    };
  }, [canvas, isActive, color, width, brushStyle, onStrokeComplete]);
  
  return null;
};

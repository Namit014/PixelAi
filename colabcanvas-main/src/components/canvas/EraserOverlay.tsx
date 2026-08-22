import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, Minus, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FabricImage } from 'fabric';

interface EraserOverlayProps {
  selectedObject: any;
  canvas: any;
  onClose: () => void;
}

const EraserOverlay = ({ selectedObject, canvas, onClose }: EraserOverlayProps) => {
  const [brushSize, setBrushSize] = useState(30);
  const [isErasing, setIsErasing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const boundsRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Calculate image bounds in screen space
  const getBounds = useCallback(() => {
    if (!selectedObject || !canvas) return null;
    const bounds = selectedObject.getBoundingRect();
    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = vpt[0];
    const canvasEl = canvas.getElement?.();
    const rect = canvasEl?.getBoundingClientRect() || { left: 0, top: 0 };
    return {
      x: bounds.left * zoom + vpt[4] + rect.left,
      y: bounds.top * zoom + vpt[5] + rect.top,
      w: bounds.width * zoom,
      h: bounds.height * zoom,
    };
  }, [selectedObject, canvas]);

  useEffect(() => {
    const bounds = getBounds();
    if (!bounds) return;
    boundsRef.current = bounds;

    // Create mask canvas matching image pixel dimensions
    const imgW = selectedObject.width * (selectedObject.scaleX || 1);
    const imgH = selectedObject.height * (selectedObject.scaleY || 1);
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = Math.round(imgW);
    maskCanvas.height = Math.round(imgH);
    const ctx = maskCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
    maskCanvasRef.current = maskCanvas;
  }, [selectedObject, canvas, getBounds]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDrawingRef.current = true;
    setIsErasing(true);
    drawAt(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingRef.current) return;
    drawAt(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  const drawAt = (clientX: number, clientY: number) => {
    const bounds = boundsRef.current;
    if (!bounds || !overlayCanvasRef.current || !maskCanvasRef.current) return;

    const ox = clientX - bounds.x;
    const oy = clientY - bounds.y;

    // Draw on visible overlay (red semi-transparent)
    const octx = overlayCanvasRef.current.getContext('2d');
    if (octx) {
      octx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      octx.beginPath();
      octx.arc(ox, oy, brushSize / 2, 0, Math.PI * 2);
      octx.fill();
    }

    // Draw on mask canvas (white = erase area)
    const mctx = maskCanvasRef.current.getContext('2d');
    if (mctx) {
      const scaleX = maskCanvasRef.current.width / bounds.w;
      const scaleY = maskCanvasRef.current.height / bounds.h;
      mctx.fillStyle = 'white';
      mctx.beginPath();
      mctx.arc(ox * scaleX, oy * scaleY, (brushSize / 2) * scaleX, 0, Math.PI * 2);
      mctx.fill();
    }
  };

  const handleApply = async () => {
    if (!maskCanvasRef.current || !selectedObject) return;
    setIsProcessing(true);

    try {
      const imageUrl = selectedObject.getSrc?.() || selectedObject.toDataURL?.({ format: 'png', quality: 1 });
      const maskUrl = maskCanvasRef.current.toDataURL('image/png');

      const { data, error } = await supabase.functions.invoke('inpaint-image', {
        body: {
          imageUrl,
          maskUrl,
          prompt: 'Remove the masked area and fill with the surrounding background, maintaining natural continuity.',
        },
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error('No image returned');

      // Replace image on canvas
      const newImg = await FabricImage.fromURL(data.imageUrl);
      if (!newImg || !canvas) return;

      newImg.set({
        left: selectedObject.left,
        top: selectedObject.top,
        scaleX: selectedObject.scaleX,
        scaleY: selectedObject.scaleY,
        angle: selectedObject.angle,
        data: selectedObject.data,
      });

      canvas.remove(selectedObject);
      canvas.add(newImg);
      canvas.setActiveObject(newImg);
      canvas.requestRenderAll();

      toast.success('Eraser applied successfully!');
      onClose();
    } catch (err: any) {
      console.error('[Eraser] Error:', err);
      toast.error(err.message || 'Eraser failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const bounds = getBounds();
  if (!bounds) return null;

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div className="fixed inset-0 z-[996] bg-black/20" onClick={onClose} />

      {/* Brush overlay on top of image */}
      <canvas
        ref={overlayCanvasRef}
        width={Math.round(bounds.w)}
        height={Math.round(bounds.h)}
        className="absolute z-[997] cursor-crosshair"
        style={{
          left: `${bounds.x}px`,
          top: `${bounds.y}px`,
          width: `${bounds.w}px`,
          height: `${bounds.h}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Control bar */}
      <div
        className="absolute z-[1001] flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-xl rounded-lg border border-zinc-200 shadow-lg"
        style={{
          left: `${bounds.x + bounds.w / 2}px`,
          top: `${bounds.y - 52}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBrushSize(Math.max(5, brushSize - 10))}>
          <Minus className="w-3 h-3" />
        </Button>
        <Slider
          min={5}
          max={100}
          step={1}
          value={[brushSize]}
          onValueChange={([v]) => setBrushSize(v)}
          className="w-24"
        />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBrushSize(Math.min(100, brushSize + 10))}>
          <Plus className="w-3 h-3" />
        </Button>

        <div className="w-px h-5 bg-zinc-200" />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-zinc-500"
          onClick={onClose}
          disabled={isProcessing}
        >
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleApply}
          disabled={isProcessing || !isErasing}
        >
          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Apply
        </Button>
      </div>
    </>
  );
};

export default EraserOverlay;

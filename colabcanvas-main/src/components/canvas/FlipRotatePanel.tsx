import { X, FlipHorizontal, FlipVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';

interface FlipRotatePanelProps {
  selectedObject: any;
  canvas: any;
  position: { x: number; y: number };
  onClose: () => void;
}

const FlipRotatePanel = ({ selectedObject, canvas, position, onClose }: FlipRotatePanelProps) => {
  const [rotation, setRotation] = useState(selectedObject?.angle || 0);

  const handleFlipH = () => {
    if (!selectedObject || !canvas) return;
    selectedObject.set('flipX', !selectedObject.flipX);
    selectedObject.setCoords();
    canvas.requestRenderAll();
  };

  const handleFlipV = () => {
    if (!selectedObject || !canvas) return;
    selectedObject.set('flipY', !selectedObject.flipY);
    selectedObject.setCoords();
    canvas.requestRenderAll();
  };

  const handleRotationChange = (value: number) => {
    if (!selectedObject || !canvas) return;
    setRotation(value);
    selectedObject.set('angle', value);
    selectedObject.setCoords();
    canvas.requestRenderAll();
  };

  const panelX = Math.min(position.x + 20, window.innerWidth - 240);
  const panelY = Math.max(20, Math.min(position.y - 40, window.innerHeight - 200));

  return (
    <div
      className="absolute z-[1001] w-[220px] bg-white/95 backdrop-blur-xl rounded-xl border border-zinc-200 shadow-xl animate-in fade-in slide-in-from-left-2 duration-200"
      style={{ left: `${panelX}px`, top: `${panelY}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100">
        <span className="text-xs font-semibold text-zinc-800">Flip & Rotate</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3 h-3 text-zinc-400" />
        </Button>
      </div>

      {/* Flip Buttons */}
      <div className="flex gap-2 px-3 py-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs gap-1.5"
          onClick={handleFlipH}
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
          Flip H
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs gap-1.5"
          onClick={handleFlipV}
        >
          <FlipVertical className="w-3.5 h-3.5" />
          Flip V
        </Button>
      </div>

      {/* Rotation Slider */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-zinc-500">Rotation</span>
          <span className="text-[10px] text-zinc-400 tabular-nums">{Math.round(rotation)}°</span>
        </div>
        <Slider
          min={0}
          max={360}
          step={1}
          value={[rotation]}
          onValueChange={([v]) => handleRotationChange(v)}
        />
      </div>
    </div>
  );
};

export default FlipRotatePanel;

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  LayersIcon, 
  UndoIcon, 
  RedoIcon, 
  ZoomInIcon, 
  ZoomOutIcon, 
  ResetViewIcon, 
  CanvasInfoIcon 
} from '@/components/icons/CustomIcons';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Canvas as FabricCanvas, Point } from 'fabric';

const BG_PRESETS = [
  { label: 'White', color: '#FFFFFF' },
  { label: 'Light Gray', color: '#F5F5F5' },
  { label: 'Gray', color: '#E0E0E0' },
  { label: 'Dark Gray', color: '#424242' },
  { label: 'Charcoal', color: '#1E1E1E' },
  { label: 'Black', color: '#000000' },
  { label: 'Cream', color: '#FFF8E7' },
  { label: 'Blue Gray', color: '#CFD8DC' },
  { label: 'Warm Gray', color: '#D7CCC8' },
  { label: 'Soft Blue', color: '#E3F2FD' },
  { label: 'Soft Green', color: '#E8F5E9' },
  { label: 'Soft Pink', color: '#FCE4EC' },
];

interface CanvasBottomControlsProps {
  isLayersPanelOpen: boolean;
  onToggleLayers: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoomPercentage: number;
  canvasInstanceRef?: React.MutableRefObject<FabricCanvas | null>;
  canvasBgColor?: string;
  onCanvasBgColorChange?: (color: string) => void;
}

const CanvasBottomControls = ({
  isLayersPanelOpen,
  onToggleLayers,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  zoomPercentage,
  canvasInstanceRef,
  canvasBgColor = '#FFFFFF',
  onCanvasBgColorChange
}: CanvasBottomControlsProps) => {
  const [customColor, setCustomColor] = useState(canvasBgColor);

  const handleResetView = () => {
    if (!canvasInstanceRef?.current) return;
    
    const canvas = canvasInstanceRef.current;
    const allArtboards = canvas.getObjects().filter((obj: any) => obj.isArtboard);
    
    if (allArtboards.length > 0) {
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;
      
      allArtboards.forEach(obj => {
        const left = obj.left || 0;
        const top = obj.top || 0;
        const width = (obj.width || 0) * (obj.scaleX || 1);
        const height = (obj.height || 0) * (obj.scaleY || 1);
        
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, left + width);
        maxY = Math.max(maxY, top + height);
      });
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const width = maxX - minX;
      const height = maxY - minY;
      
      const zoom = Math.min(
        canvas.width! / (width * 1.2),
        canvas.height! / (height * 1.2),
        2
      );
      
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.setZoom(zoom);
      canvas.absolutePan(new Point(centerX, centerY));
      canvas.renderAll();
      
      toast.success('View centered on artboards');
    } else {
      toast.info('No artboards to center on');
    }
  };

  const handleShowInfo = () => {
    if (!canvasInstanceRef?.current) return;
    
    const canvas = canvasInstanceRef.current;
    const objectCount = canvas.getObjects().length;
    const artboardCount = canvas.getObjects().filter((obj: any) => obj.isArtboard).length;
    
    toast.info(`Canvas: ${artboardCount} artboards, ${objectCount - artboardCount * 2} objects`);
  };

  return <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
      {/* Layers */}
      <Button variant="ghost" size="sm" onClick={onToggleLayers} title="Toggle Layers Panel" className="h-9 px-3 text-zinc-900 shadow-none bg-zinc-100 rounded-md">
        <LayersIcon className="w-5 h-5" />
      </Button>

      {/* Background Color Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="Canvas Background Color"
            className="h-9 w-9 p-0 shadow-none bg-zinc-100 rounded-md flex items-center justify-center"
          >
            <div
              className="w-5 h-5 rounded-full border border-zinc-300"
              style={{ backgroundColor: canvasBgColor }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-[240px] p-3">
          <p className="text-xs font-medium text-zinc-500 mb-2">Canvas Background</p>
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {BG_PRESETS.map((preset) => (
              <button
                key={preset.color}
                title={preset.label}
                onClick={() => {
                  onCanvasBgColorChange?.(preset.color);
                  setCustomColor(preset.color);
                }}
                className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: preset.color,
                  borderColor: canvasBgColor === preset.color ? '#3B82F6' : preset.color === '#FFFFFF' ? '#D4D4D8' : 'transparent',
                  boxShadow: canvasBgColor === preset.color ? '0 0 0 2px rgba(59,130,246,0.3)' : 'none',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 shrink-0">Custom</span>
            <div className="w-px h-4 bg-zinc-300" />
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                onCanvasBgColorChange?.(e.target.value);
              }}
              className="w-6 h-6 rounded-full border border-zinc-200 cursor-pointer p-0 appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                  onCanvasBgColorChange?.(e.target.value);
                }
              }}
              className="w-20 text-xs px-2 py-1 rounded border border-zinc-200 bg-zinc-50 font-mono"
              placeholder="#FFFFFF"
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5 rounded-md h-9 bg-zinc-100">
        <Button variant="ghost" size="sm" onClick={onUndo} title="Undo (⌘Z)" className="h-9 px-3 text-zinc-900 rounded-r-none shadow-none bg-zinc-100">
          <UndoIcon className="w-5 h-5" />
        </Button>
        <div className="w-px h-5 bg-zinc-300" />
        <Button variant="ghost" size="sm" onClick={onRedo} title="Redo (⌘⇧Z)" className="h-9 px-3 text-zinc-900 rounded-l-none shadow-none bg-zinc-100">
          <RedoIcon className="w-5 h-5" />
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5 rounded-md h-9 bg-zinc-100">
        <Button variant="ghost" size="sm" onClick={onZoomOut} className="h-9 px-3 hover:bg-zinc-300 text-zinc-900 rounded-r-none shadow-none" title="Zoom Out (⌘-)">
          <ZoomOutIcon className="w-5 h-5" />
        </Button>
        <div className="px-3 text-sm font-medium text-zinc-900 min-w-[60px] text-center">
          {Math.round(zoomPercentage)}%
        </div>
        <Button variant="ghost" size="sm" onClick={onZoomIn} className="h-9 px-3 hover:bg-zinc-300 text-zinc-900 rounded-l-none shadow-none" title="Zoom In (⌘+)">
          <ZoomInIcon className="w-5 h-5" />
        </Button>
      </div>

      {/* View Controls */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleResetView} 
        title="Reset View - Center on Artboards"
        className="h-9 px-3 text-zinc-900 shadow-none bg-zinc-100 rounded-md"
      >
        <ResetViewIcon className="w-5 h-5" />
      </Button>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleShowInfo} 
        title="Canvas Info"
        className="h-9 px-3 text-zinc-900 shadow-none bg-zinc-100 rounded-md"
      >
        <CanvasInfoIcon className="w-5 h-5" />
      </Button>
    </div>;
};
export default CanvasBottomControls;

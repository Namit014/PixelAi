import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Download, Link2, Circle, Square } from 'lucide-react';
import { FillColorDialog } from './FillColorDialog';
import { StrokeColorDialog } from './StrokeColorDialog';

interface SelectionPropertiesBarProps {
  position: { x: number; y: number };
  selectedObject: any;
  onUpdate: (properties: any) => void;
  onDownload: () => void;
}

export function SelectionPropertiesBar({
  position,
  selectedObject,
  onUpdate,
  onDownload,
}: SelectionPropertiesBarProps) {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [cornerRadius, setCornerRadius] = useState(0);
  const [linkedDimensions, setLinkedDimensions] = useState(true);

  useEffect(() => {
    if (!selectedObject) return;
    
    const w = Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1));
    const h = Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1));
    setWidth(w);
    setHeight(h);
    
    if (selectedObject.rx !== undefined) {
      setCornerRadius(selectedObject.rx || 0);
    }
  }, [selectedObject]);

  if (!selectedObject) return null;

  const isShape = ['rect', 'circle', 'ellipse', 'polygon', 'path', 'triangle'].includes(selectedObject.type?.toLowerCase() || '');
  const isText = ['text', 'i-text', 'textbox'].includes(selectedObject.type?.toLowerCase() || '');

  if (!isShape && !isText) return null;

  const handleWidthChange = (newWidth: number) => {
    if (linkedDimensions && width > 0) {
      const ratio = newWidth / width;
      const newHeight = Math.round(height * ratio);
      setWidth(newWidth);
      setHeight(newHeight);
      onUpdate({ 
        scaleX: newWidth / (selectedObject.width || 1),
        scaleY: newHeight / (selectedObject.height || 1)
      });
    } else {
      setWidth(newWidth);
      onUpdate({ scaleX: newWidth / (selectedObject.width || 1) });
    }
  };

  const handleHeightChange = (newHeight: number) => {
    if (linkedDimensions && height > 0) {
      const ratio = newHeight / height;
      const newWidth = Math.round(width * ratio);
      setHeight(newHeight);
      setWidth(newWidth);
      onUpdate({ 
        scaleX: newWidth / (selectedObject.width || 1),
        scaleY: newHeight / (selectedObject.height || 1)
      });
    } else {
      setHeight(newHeight);
      onUpdate({ scaleY: newHeight / (selectedObject.height || 1) });
    }
  };

  const handleCornerRadiusChange = (radius: number) => {
    setCornerRadius(radius);
    onUpdate({ rx: radius, ry: radius });
  };

  const fillColor = typeof selectedObject?.fill === 'string' ? selectedObject.fill : 'transparent';
  const strokeColor = selectedObject?.stroke || 'transparent';
  const hasNoFill = !fillColor || fillColor === 'transparent';
  const hasNoStroke = !strokeColor || strokeColor === 'transparent';

  return (
    <div
      className="absolute z-50 flex items-center gap-1 bg-white rounded-xl px-2 py-1.5 border border-zinc-100 animate-push-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Fill Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-zinc-100"
            title="Fill"
          >
            {hasNoFill ? (
              <div className="w-5 h-5 rounded-full border-2 border-zinc-300 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-0.5 bg-red-500 rotate-45" />
                </div>
              </div>
            ) : (
              <div
                className="w-5 h-5 rounded-full border border-zinc-200"
                style={{ backgroundColor: fillColor }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" align="center" sideOffset={8}>
          <FillColorDialog
            selectedObject={selectedObject}
            onUpdate={onUpdate}
          />
        </PopoverContent>
      </Popover>

      {/* Stroke Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-zinc-100"
            title="Stroke"
          >
            {hasNoStroke ? (
              <Circle className="w-5 h-5 text-zinc-300" />
            ) : (
              <div
                className="w-5 h-5 rounded-full border-[2.5px]"
                style={{ borderColor: strokeColor, backgroundColor: 'transparent' }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" align="center" sideOffset={8}>
          <StrokeColorDialog
            selectedObject={selectedObject}
            onUpdate={onUpdate}
          />
        </PopoverContent>
      </Popover>

      {/* Corner Radius - only for shapes */}
      {isShape && selectedObject.type === 'rect' && (
        <>
          <div className="w-px h-4 bg-zinc-200" />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1.5 text-zinc-700 hover:bg-zinc-100"
                title="Corner Radius"
              >
                <Square className="w-3.5 h-3.5" style={{ borderRadius: 2 }} />
                {cornerRadius}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-3" align="center" sideOffset={8}>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-600">Corner Radius</label>
                <Input
                  type="number"
                  value={cornerRadius}
                  onChange={(e) => handleCornerRadiusChange(parseInt(e.target.value) || 0)}
                  className="h-8 text-sm"
                  min={0}
                  max={200}
                />
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}

      <div className="w-px h-4 bg-zinc-200" />

      {/* Width */}
      <div className="flex items-center">
        <span className="text-[10px] text-zinc-400 font-medium mr-1">W</span>
        <Input
          type="number"
          value={width}
          onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
          className="h-7 w-16 text-xs border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
        />
      </div>

      {/* Link Dimensions */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 ${linkedDimensions ? 'text-blue-500' : 'text-zinc-400'}`}
        onClick={() => setLinkedDimensions(!linkedDimensions)}
        title={linkedDimensions ? 'Unlink dimensions' : 'Link dimensions'}
      >
        <Link2 className="w-3.5 h-3.5" />
      </Button>

      {/* Height */}
      <div className="flex items-center">
        <span className="text-[10px] text-zinc-400 font-medium mr-1">H</span>
        <Input
          type="number"
          value={height}
          onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
          className="h-7 w-16 text-xs border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
        />
      </div>

      <div className="w-px h-4 bg-zinc-200" />

      {/* Download */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-100"
        onClick={onDownload}
        title="Download"
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
}

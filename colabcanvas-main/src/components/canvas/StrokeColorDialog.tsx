import { useState, useEffect } from 'react';
import { X, Pipette, Slash, Menu, Minus, Plus } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';

interface StrokeColorDialogProps {
  selectedObject: any;
  onUpdate: (properties: any) => void;
  onSwitchToFill?: () => void;
  onClose?: () => void;
}

// Preset colors - 2 rows of 6
const PRESET_COLORS = [
'transparent',
'#000000',
'#FFFFFF',
'#FF0000',
'#00FF00',
'#0000FF',
'#FFFF00',
'#FF00FF',
'#00FFFF',
'#FF8800',
'#8800FF',
'#0088FF'];


export function StrokeColorDialog({ selectedObject, onUpdate, onSwitchToFill, onClose }: StrokeColorDialogProps) {
  const [currentStroke, setCurrentStroke] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [strokePosition, setStrokePosition] = useState('center');
  const [opacity, setOpacity] = useState(100);

  useEffect(() => {
    if (selectedObject) {
      const stroke = selectedObject.stroke;
      if (typeof stroke === 'string') {
        if (stroke === 'transparent' || stroke === '' || !stroke) {
          setCurrentStroke('transparent');
        } else if (stroke.startsWith('#')) {
          setCurrentStroke(stroke);
        } else if (stroke.startsWith('rgb')) {
          const match = stroke.match(/\d+/g);
          if (match) {
            const [r, g, b] = match.map(Number);
            setCurrentStroke(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
          }
        }
      }
      setStrokeWidth(selectedObject.strokeWidth || 1);
      setOpacity(Math.round((selectedObject.opacity || 1) * 100));
    }
  }, [selectedObject]);

  const handleColorChange = (color: string) => {
    setCurrentStroke(color);
    onUpdate({ stroke: color });
  };

  const handleWidthChange = (value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value));
    setStrokeWidth(clampedValue);
    onUpdate({ strokeWidth: clampedValue });
  };

  const handleOpacityChange = (value: number[]) => {
    setOpacity(value[0]);
    onUpdate({ opacity: value[0] / 100 });
  };

  const handlePresetClick = (color: string) => {
    if (color === 'transparent') {
      setCurrentStroke('transparent');
      onUpdate({ stroke: 'transparent' });
    } else {
      setCurrentStroke(color);
      onUpdate({ stroke: color });
    }
  };

  return (
    <div className="w-60 bg-white rounded-xl overflow-hidden animate-push-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-sm font-semibold text-zinc-900">Stroke</span>
        {onClose &&
        <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        }
      </div>
      
      {/* Width Control Row */}
      <div className="flex items-center gap-1.5 px-3 py-3 border-b border-zinc-100 overflow-hidden">
        <button
          onClick={() => handleWidthChange(strokeWidth - 1)}
          className="p-1 hover:bg-zinc-100 rounded-md transition-colors flex-shrink-0">
          <Minus className="w-3.5 h-3.5 text-zinc-600" />
        </button>
        <Input
          type="number"
          value={strokeWidth}
          onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
          className="w-11 h-7 text-center text-xs border-zinc-200 px-1 flex-shrink-0" />
        <button
          onClick={() => handleWidthChange(strokeWidth + 1)}
          className="p-1 hover:bg-zinc-100 rounded-md transition-colors flex-shrink-0">
          <Plus className="w-3.5 h-3.5 text-zinc-600" />
        </button>
        <span className="text-[10px] text-zinc-400 flex-shrink-0">px</span>
        <Select value={strokePosition} onValueChange={setStrokePosition}>
          <SelectTrigger className="w-[68px] h-7 text-[10px] flex-shrink-0 ml-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="bottom" align="end">
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="inside">Inside</SelectItem>
            <SelectItem value="outside">Outside</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Color Picker Section */}
      <div className="px-4 py-4 space-y-4">
        {/* Color Picker - Full width, 180px height */}
        <div className="relative">
          <HexColorPicker
            color={currentStroke === 'transparent' ? '#ffffff' : currentStroke}
            onChange={handleColorChange}
            style={{ width: '100%', height: '180px' }} />

        </div>
        
        {/* Opacity Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Opacity</span>
            <span>{opacity}%</span>
          </div>
          <div className="relative h-3 rounded-full overflow-hidden" style={{
            background: `linear-gradient(to right, transparent, ${currentStroke === 'transparent' ? '#000' : currentStroke}), 
              repeating-conic-gradient(#d4d4d4 0% 25%, transparent 0% 50%) 50% / 8px 8px`
          }}>
            <Slider
              value={[opacity]}
              onValueChange={handleOpacityChange}
              min={0}
              max={100}
              step={1}
              className="absolute inset-0" />

          </div>
        </div>
        
        {/* Preset Colors - 2 rows of 6 */}
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((color, i) =>
          <button
            key={i}
            onClick={() => handlePresetClick(color)}
            className={`w-9 h-9 rounded-full border-2 hover:scale-110 transition-transform relative overflow-hidden ${
            currentStroke === color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-zinc-200'}`
            }
            style={{
              backgroundColor: color === 'transparent' ? '#fff' : color,
              backgroundImage: color === 'transparent' ?
              'repeating-conic-gradient(#d4d4d4 0% 25%, transparent 0% 50%)' :
              undefined,
              backgroundSize: color === 'transparent' ? '8px 8px' : undefined
            }}>

              {color === 'transparent' &&
            <Slash className="w-5 h-5 text-red-500 absolute inset-0 m-auto" />
            }
            </button>
          )}
        </div>
        
        {/* Bottom Row: Eyedropper | Hex | Opacity */}
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors">
            <Pipette className="w-4 h-4 text-zinc-600" />
          </button>
          <div className="flex-1 h-9 flex items-center bg-zinc-100 rounded-lg px-3 gap-1">
            <span className="text-zinc-400 text-sm">#</span>
            <HexColorInput
              color={currentStroke === 'transparent' ? '' : currentStroke}
              onChange={handleColorChange}
              className="flex-1 bg-transparent text-sm uppercase tracking-wide border-none outline-none w-full"
              placeholder="000000" />

          </div>
          <div className="w-16 h-9 flex items-center justify-center bg-zinc-100 rounded-lg px-2">
            <span className="text-sm text-zinc-700">{opacity}%</span>
          </div>
        </div>
      </div>
    </div>);

}
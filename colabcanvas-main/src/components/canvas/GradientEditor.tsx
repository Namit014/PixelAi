import { useState, useEffect, useCallback, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { Gradient } from 'fabric';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ColorStop {
  color: string;
  offset: number;
  opacity: number;
}

interface GradientEditorProps {
  selectedObject: any;
  onUpdate: (gradient: any) => void;
}

const GRADIENT_PRESETS = [
  { name: 'Sunset', stops: [{ color: '#FF6B6B', offset: 0, opacity: 100 }, { color: '#FFA500', offset: 1, opacity: 100 }] },
  { name: 'Ocean', stops: [{ color: '#00C9FF', offset: 0, opacity: 100 }, { color: '#92FE9D', offset: 1, opacity: 100 }] },
  { name: 'Purple', stops: [{ color: '#7F00FF', offset: 0, opacity: 100 }, { color: '#E100FF', offset: 1, opacity: 100 }] },
  { name: 'Fire', stops: [{ color: '#FF0000', offset: 0, opacity: 100 }, { color: '#FFFF00', offset: 1, opacity: 100 }] },
  { name: 'Aurora', stops: [{ color: '#00FFA3', offset: 0, opacity: 100 }, { color: '#03E9F4', offset: 0.5, opacity: 100 }, { color: '#DC54FE', offset: 1, opacity: 100 }] },
  { name: 'Midnight', stops: [{ color: '#0F2027', offset: 0, opacity: 100 }, { color: '#203A43', offset: 0.5, opacity: 100 }, { color: '#2C5364', offset: 1, opacity: 100 }] },
  { name: 'Rose', stops: [{ color: '#FF9A9E', offset: 0, opacity: 100 }, { color: '#FECFEF', offset: 1, opacity: 100 }] },
  { name: 'Lime', stops: [{ color: '#11998E', offset: 0, opacity: 100 }, { color: '#38EF7D', offset: 1, opacity: 100 }] },
  { name: 'Gold', stops: [{ color: '#F7971E', offset: 0, opacity: 100 }, { color: '#FFD200', offset: 1, opacity: 100 }] },
  { name: 'Berry', stops: [{ color: '#8E2DE2', offset: 0, opacity: 100 }, { color: '#4A00E0', offset: 1, opacity: 100 }] },
];

// Convert hex + opacity to rgba string
function hexToRgba(hex: string, opacity: number): string {
  if (opacity >= 100) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${(opacity / 100).toFixed(2)})`;
}

// Extract hex and opacity from a color string
function parseColor(color: string): { hex: string; opacity: number } {
  if (color.startsWith('rgba')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    if (match) {
      const [, r, g, b, a] = match;
      const hex = `#${Number(r).toString(16).padStart(2, '0')}${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`;
      return { hex, opacity: a ? Math.round(parseFloat(a) * 100) : 100 };
    }
  }
  if (color.startsWith('rgb')) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match;
      const hex = `#${Number(r).toString(16).padStart(2, '0')}${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`;
      return { hex, opacity: 100 };
    }
  }
  return { hex: color.startsWith('#') ? color : '#000000', opacity: 100 };
}

const GradientEditor = ({ selectedObject, onUpdate }: GradientEditorProps) => {
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [angle, setAngle] = useState(0);
  const [colorStops, setColorStops] = useState<ColorStop[]>([
    { color: '#000000', offset: 0, opacity: 100 },
    { color: '#FFFFFF', offset: 1, opacity: 100 },
  ]);
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingStopRef = useRef<number | null>(null);

  useEffect(() => {
    if (selectedObject?.fill && typeof selectedObject.fill === 'object') {
      const fill = selectedObject.fill;
      if (fill.type === 'linear' || fill.type === 'radial') {
        setGradientType(fill.type);
        if (fill.colorStops) {
          setColorStops(fill.colorStops.map((s: any) => {
            const { hex, opacity } = parseColor(s.color);
            return { color: hex, offset: s.offset, opacity };
          }));
        }
      }
    }
  }, [selectedObject]);

  const createGradient = useCallback((stops = colorStops, type = gradientType, gradAngle = angle) => {
    if (!selectedObject) return null;
    const width = selectedObject.width || 100;
    const height = selectedObject.height || 100;

    const gradient = new Gradient({
      type,
      coords: type === 'linear'
        ? {
            x1: 0, y1: 0,
            x2: width * Math.cos((gradAngle * Math.PI) / 180),
            y2: height * Math.sin((gradAngle * Math.PI) / 180),
          }
        : {
            x1: width / 2, y1: height / 2, r1: 0,
            x2: width / 2, y2: height / 2, r2: width / 2,
          },
      colorStops: stops.map(stop => ({
        color: hexToRgba(stop.color, stop.opacity),
        offset: stop.offset,
      })),
    });
    return gradient;
  }, [selectedObject, colorStops, gradientType, angle]);

  const handleGradientTypeChange = (type: 'linear' | 'radial') => {
    setGradientType(type);
    const gradient = createGradient(colorStops, type, angle);
    if (gradient) onUpdate(gradient);
  };

  const handleAngleChange = (value: number[]) => {
    setAngle(value[0]);
    const gradient = createGradient(colorStops, gradientType, value[0]);
    if (gradient) onUpdate(gradient);
  };

  const handleColorStopChange = (index: number, color: string) => {
    const updated = [...colorStops];
    updated[index] = { ...updated[index], color };
    setColorStops(updated);
    const gradient = createGradient(updated);
    if (gradient) onUpdate(gradient);
  };

  const handleStopOpacityChange = (index: number, value: number[]) => {
    const updated = [...colorStops];
    updated[index] = { ...updated[index], opacity: value[0] };
    setColorStops(updated);
    const gradient = createGradient(updated);
    if (gradient) onUpdate(gradient);
  };

  const addColorStop = () => {
    const newStop: ColorStop = { color: '#808080', offset: 0.5, opacity: 100 };
    const updated = [...colorStops, newStop].sort((a, b) => a.offset - b.offset);
    setColorStops(updated);
    const gradient = createGradient(updated);
    if (gradient) onUpdate(gradient);
  };

  const removeColorStop = (index: number) => {
    if (colorStops.length <= 2) return;
    const updated = colorStops.filter((_, i) => i !== index);
    setColorStops(updated);
    if (selectedStopIndex >= updated.length) setSelectedStopIndex(updated.length - 1);
    const gradient = createGradient(updated);
    if (gradient) onUpdate(gradient);
  };

  const applyPreset = (preset: typeof GRADIENT_PRESETS[0]) => {
    setColorStops(preset.stops);
    const gradient = createGradient(preset.stops);
    if (gradient) onUpdate(gradient);
  };

  // Draggable stops on the gradient track
  const handleTrackMouseDown = useCallback((e: React.MouseEvent, stopIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    draggingStopRef.current = stopIndex;
    setSelectedStopIndex(stopIndex);

    const onMouseMove = (me: MouseEvent) => {
      if (draggingStopRef.current === null || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width));
      const updated = [...colorStops];
      updated[draggingStopRef.current] = { ...updated[draggingStopRef.current], offset: t };
      setColorStops(updated);
      const gradient = createGradient(updated);
      if (gradient) onUpdate(gradient);
    };

    const onMouseUp = () => {
      draggingStopRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [colorStops, createGradient, onUpdate]);

  const gradientCSS = gradientType === 'linear'
    ? `linear-gradient(${angle}deg, ${colorStops.map(s => `${hexToRgba(s.color, s.opacity)} ${s.offset * 100}%`).join(', ')})`
    : `radial-gradient(circle, ${colorStops.map(s => `${hexToRgba(s.color, s.opacity)} ${s.offset * 100}%`).join(', ')})`;

  return (
    <div className="space-y-4">
      {/* Linear / Radial Toggle */}
      <div className="flex gap-2">
        <button
          className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            gradientType === 'linear' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50'
          }`}
          onClick={() => handleGradientTypeChange('linear')}
        >
          Linear
        </button>
        <button
          className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            gradientType === 'radial' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50'
          }`}
          onClick={() => handleGradientTypeChange('radial')}
        >
          Radial
        </button>
      </div>

      {/* Colors label with +/- buttons */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700">Colors</span>
        <div className="flex gap-1">
          <button onClick={addColorStop} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
            <Plus className="w-4 h-4 text-zinc-600" />
          </button>
          <button
            onClick={() => removeColorStop(selectedStopIndex)}
            className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
            disabled={colorStops.length <= 2}
          >
            <Minus className="w-4 h-4 text-zinc-600" />
          </button>
        </div>
      </div>

      {/* Gradient Track with Draggable Stops */}
      <div
        ref={trackRef}
        className="relative h-10 rounded-xl overflow-visible"
        style={{ background: gradientCSS }}
      >
        {colorStops.map((stop, i) => (
          <Popover key={i}>
            <PopoverTrigger asChild>
              <button
                className={`absolute top-0 w-6 h-10 -translate-x-1/2 cursor-grab flex flex-col items-center justify-end pb-0.5 ${
                  selectedStopIndex === i ? 'z-10' : ''
                }`}
                style={{ left: `${stop.offset * 100}%` }}
                onClick={() => setSelectedStopIndex(i)}
                onMouseDown={(e) => handleTrackMouseDown(e, i)}
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 shadow-sm ${
                    selectedStopIndex === i ? 'border-blue-500 ring-2 ring-blue-200' : 'border-white'
                  }`}
                  style={{ backgroundColor: stop.color }}
                />
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-white" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 space-y-2" side="bottom">
              <HexColorPicker
                color={stop.color}
                onChange={(color) => handleColorStopChange(i, color)}
                style={{ width: '180px', height: '140px' }}
              />
              {/* Per-stop opacity slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Opacity</span>
                  <span>{stop.opacity}%</span>
                </div>
                <Slider
                  value={[stop.opacity]}
                  onValueChange={(v) => handleStopOpacityChange(i, v)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>

      {/* Rotation (for linear) */}
      {gradientType === 'linear' && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-600 w-16">Rotation</span>
          <Slider value={[angle]} onValueChange={handleAngleChange} min={0} max={360} step={1} className="flex-1" />
          <div className="flex items-center gap-1.5 min-w-[50px] justify-end">
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-sm text-zinc-600">{angle}°</span>
          </div>
        </div>
      )}

      {/* Presets */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700">Preset</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {GRADIENT_PRESETS.map((preset, i) => (
          <button
            key={i}
            onClick={() => applyPreset(preset)}
            className="w-10 h-10 rounded-full border-2 border-zinc-200 hover:scale-110 transition-transform hover:border-zinc-400"
            style={{
              background: `linear-gradient(135deg, ${preset.stops.map(s => `${s.color} ${s.offset * 100}%`).join(', ')})`,
            }}
            title={preset.name}
          />
        ))}
      </div>
    </div>
  );
};

export default GradientEditor;

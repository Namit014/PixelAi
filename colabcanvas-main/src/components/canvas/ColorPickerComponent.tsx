import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Pipette } from 'lucide-react';

interface ColorPickerComponentProps {
  color: string;
  onChange: (color: string) => void;
  showOpacity?: boolean;
}

// Preset colors matching the reference design
const PRESET_COLORS = [
  'transparent',
  '#000000',
  '#FFFFFF',
  '#10B981',
  '#8B5CF6',
  '#C4B5FD',
  '#EF4444',
  '#F97316',
  '#FACC15',
  '#3B82F6',
  '#EC4899',
  '#6B7280',
];

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  if (!hex || hex === 'transparent') return { h: 0, s: 0, l: 0 };
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 50 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  if (!color || color === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }
  
  const hex = color.replace('#', '');
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  
  return { r: 0, g: 0, b: 0, a: 1 };
}

export function ColorPickerComponent({ 
  color, 
  onChange, 
  showOpacity = true 
}: ColorPickerComponentProps) {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [opacity, setOpacity] = useState(100);
  const [hexInput, setHexInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const satBrightRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!color || color === 'transparent') {
      setOpacity(0);
      return;
    }
    
    const parsed = parseColor(color);
    setOpacity(Math.round(parsed.a * 100));
    
    const hex = `#${parsed.r.toString(16).padStart(2, '0')}${parsed.g.toString(16).padStart(2, '0')}${parsed.b.toString(16).padStart(2, '0')}`.toUpperCase();
    setHexInput(hex.replace('#', ''));
    
    const hsl = hexToHsl(hex);
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
  }, [color]);
  
  const updateColor = useCallback((h: number, s: number, l: number, a: number) => {
    if (a === 0) {
      onChange('transparent');
      return;
    }
    const hex = hslToHex(h, s, l);
    setHexInput(hex.replace('#', ''));
    if (a < 100) {
      const parsed = parseColor(hex);
      onChange(`rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${a / 100})`);
    } else {
      onChange(hex);
    }
  }, [onChange]);
  
  const handleSatBrightChange = useCallback((clientX: number, clientY: number) => {
    if (!satBrightRef.current) return;
    
    const rect = satBrightRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    
    const s = x * 100;
    const l = 100 - y * 50 - (x * 50 * (1 - y));
    
    setSaturation(s);
    setLightness(Math.max(0, Math.min(100, l)));
    updateColor(hue, s, Math.max(0, Math.min(100, l)), opacity);
  }, [hue, opacity, updateColor]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSatBrightChange(e.clientX, e.clientY);
  };
  
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      handleSatBrightChange(e.clientX, e.clientY);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleSatBrightChange]);
  
  const handleHueChange = (value: number[]) => {
    const h = value[0];
    setHue(h);
    updateColor(h, saturation, lightness, opacity);
  };
  
  const handleOpacityChange = (value: number[]) => {
    const a = value[0];
    setOpacity(a);
    updateColor(hue, saturation, lightness, a);
  };
  
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace('#', '').toUpperCase();
    setHexInput(value);
    
    if (/^[0-9A-F]{6}$/i.test(value)) {
      const hsl = hexToHsl(`#${value}`);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
      updateColor(hsl.h, hsl.s, hsl.l, opacity);
    }
  };
  
  const handlePresetClick = (presetColor: string) => {
    if (presetColor === 'transparent') {
      setOpacity(0);
      onChange('transparent');
      return;
    }
    
    const hsl = hexToHsl(presetColor);
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
    setOpacity(100);
    setHexInput(presetColor.replace('#', ''));
    onChange(presetColor);
  };
  
  const handleEyedropper = async () => {
    try {
      // @ts-ignore
      if (window.EyeDropper) {
        // @ts-ignore
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        handlePresetClick(result.sRGBHex);
      }
    } catch (e) {
      console.log('Eyedropper cancelled');
    }
  };
  
  const pickerX = saturation;
  const pickerY = 100 - lightness;
  
  return (
    <div className="w-56 space-y-2 p-2.5">
      {/* Saturation/Brightness Picker - COMPACT */}
      <div 
        ref={satBrightRef}
        className="relative h-28 rounded-lg overflow-hidden cursor-crosshair"
        style={{
          background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`,
        }}
        onMouseDown={handleMouseDown}
      >
        <div 
          className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${pickerX}%`, top: `${pickerY}%` }}
        >
          <div className="w-full h-full rounded-full border-2 border-white shadow-md" 
            style={{ backgroundColor: hslToHex(hue, saturation, lightness) }} 
          />
        </div>
      </div>
      
      {/* Hue Slider - COMPACT */}
      <div className="relative h-2 rounded-full overflow-hidden"
        style={{
          background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
        }}
      >
        <Slider
          value={[hue]}
          onValueChange={handleHueChange}
          min={0}
          max={360}
          step={1}
          className="absolute inset-0 [&>span:first-child]:bg-transparent [&_[role=slider]]:w-3 [&_[role=slider]]:h-3 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-md [&_[role=slider]]:bg-transparent"
        />
      </div>
      
      {/* Opacity Slider - COMPACT */}
      {showOpacity && (
        <div className="relative h-2 rounded-full overflow-hidden"
          style={{
            background: `linear-gradient(to right, transparent, ${hslToHex(hue, saturation, lightness)}), repeating-conic-gradient(#e5e5e5 0% 25%, white 0% 50%) 50% / 6px 6px`,
          }}
        >
          <Slider
            value={[opacity]}
            onValueChange={handleOpacityChange}
            min={0}
            max={100}
            step={1}
            className="absolute inset-0 [&>span:first-child]:bg-transparent [&_[role=slider]]:w-3 [&_[role=slider]]:h-3 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-md [&_[role=slider]]:bg-white"
          />
        </div>
      )}
      
      {/* Preset Colors - COMPACT 2 rows of 6 */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex justify-between gap-1">
          {PRESET_COLORS.slice(0, 6).map((presetColor, i) => (
            <button
              key={i}
              className={`w-6 h-6 rounded-full border transition-all hover:scale-110 flex-shrink-0 ${
                presetColor === 'transparent' ? 'border-zinc-300' : 
                color === presetColor ? 'border-zinc-900 ring-1 ring-zinc-900/20' : 'border-zinc-200'
              }`}
              style={{ 
                backgroundColor: presetColor === 'transparent' ? 'white' : presetColor,
              }}
              onClick={() => handlePresetClick(presetColor)}
            >
              {presetColor === 'transparent' && (
                <div className="w-full h-full rounded-full relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-0.5 bg-red-500 rotate-45" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="flex justify-between gap-1">
          {PRESET_COLORS.slice(6, 12).map((presetColor, i) => (
            <button
              key={i + 6}
              className={`w-6 h-6 rounded-full border transition-all hover:scale-110 flex-shrink-0 ${
                color === presetColor ? 'border-zinc-900 ring-1 ring-zinc-900/20' : 'border-zinc-200'
              }`}
              style={{ backgroundColor: presetColor }}
              onClick={() => handlePresetClick(presetColor)}
            />
          ))}
        </div>
      </div>
      
      {/* Bottom Row: Eyedropper | Hex | Opacity - COMPACT */}
      <div className="flex items-center gap-1.5">
        <button 
          onClick={handleEyedropper}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-100 hover:bg-zinc-200 transition-colors flex-shrink-0"
          title="Pick color"
        >
          <Pipette className="w-3 h-3 text-zinc-600" />
        </button>
        
        <div className="flex-1 flex items-center bg-zinc-100 rounded-md px-2 h-7">
          <span className="text-[10px] text-zinc-400 font-medium">#</span>
          <Input
            value={hexInput}
            onChange={handleHexChange}
              className="border-0 bg-transparent h-6 text-[11px] px-0.5 focus-visible:ring-0 focus-visible:ring-offset-0 uppercase tracking-wider"
              maxLength={6}
          />
        </div>
        
        {showOpacity && (
          <div className="flex items-center bg-zinc-100 rounded-md px-1.5 h-7 w-14 flex-shrink-0">
            <Input
              type="number"
              value={opacity}
              onChange={(e) => handleOpacityChange([parseInt(e.target.value) || 0])}
              className="border-0 bg-transparent h-6 text-[11px] px-0 text-center focus-visible:ring-0 focus-visible:ring-offset-0 w-8 tabular-nums"
              min={0}
              max={100}
            />
            <span className="text-[10px] text-zinc-400">%</span>
          </div>
        )}
      </div>
    </div>
  );
}

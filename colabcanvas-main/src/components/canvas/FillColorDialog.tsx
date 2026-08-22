import { useState, useEffect, useRef } from 'react';
import { X, Pipette, Slash, Upload, Move } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Gradient, Pattern } from 'fabric';
import GradientEditor from './GradientEditor';
import { useRecentColorsStore } from '@/stores/recentColorsStore';

interface FillColorDialogProps {
  selectedObject: any;
  onUpdate: (properties: any) => void;
  onSwitchToStroke?: () => void;
  onClose?: () => void;
  targetObject?: any;
  canvas?: any;
}

const FALLBACK_COLORS = [
  'transparent', '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FF8800', '#8800FF', '#0088FF',
];

export function FillColorDialog({ selectedObject, onUpdate, onSwitchToStroke, onClose, targetObject, canvas }: FillColorDialogProps) {
  const effectiveObject = targetObject || selectedObject;
  const [activeTab, setActiveTab] = useState<'solid' | 'gradient' | 'image'>('solid');
  const [currentFill, setCurrentFill] = useState('#000000');
  const [opacity, setOpacity] = useState(100);
  const [lastSolidColor, setLastSolidColor] = useState('#000000');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { recentColors, addColor, scanCanvas } = useRecentColorsStore();

  // Scan canvas colors on mount
  useEffect(() => {
    if (canvas) scanCanvas(canvas);
  }, [canvas, scanCanvas]);

  const displayColors = recentColors.length > 0
    ? ['transparent', ...recentColors.slice(0, 11)]
    : FALLBACK_COLORS;

  useEffect(() => {
    if (effectiveObject) {
      const fill = effectiveObject.fill;
      if (fill && typeof fill === 'object' && fill instanceof Gradient) {
        setActiveTab('gradient');
      } else if (fill && typeof fill === 'object' && fill.source) {
        // Pattern fill
        setActiveTab('image');
        if (fill.source instanceof HTMLImageElement) {
          setImagePreview(fill.source.src);
        }
      } else if (typeof fill === 'string') {
        if (fill === 'transparent' || fill === '') {
          setCurrentFill('transparent');
        } else if (fill.startsWith('#')) {
          setCurrentFill(fill);
          setLastSolidColor(fill);
        } else if (fill.startsWith('rgb')) {
          const match = fill.match(/\d+/g);
          if (match) {
            const [r, g, b] = match.map(Number);
            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            setCurrentFill(hex);
            setLastSolidColor(hex);
          }
        }
      }
      setOpacity(Math.round((effectiveObject.opacity || 1) * 100));
    }
  }, [effectiveObject]);

  const handleTabChange = (tab: string) => {
    const newTab = tab as 'solid' | 'gradient' | 'image';
    if (newTab === 'gradient' && activeTab === 'solid') {
      const baseColor = currentFill === 'transparent' ? '#000000' : currentFill;
      if (effectiveObject) {
        const width = effectiveObject.width || 100;
        const height = effectiveObject.height || 100;
        const gradient = new Gradient({
          type: 'linear',
          coords: { x1: 0, y1: 0, x2: width, y2: 0 },
          colorStops: [
            { color: baseColor, offset: 0 },
            { color: '#FFFFFF', offset: 1 },
          ],
        });
        onUpdate({ fill: gradient });
      }
    }
    if (newTab === 'solid' && activeTab === 'gradient') {
      const fill = effectiveObject?.fill;
      if (fill && fill instanceof Gradient && fill.colorStops?.length > 0) {
        const firstColor = fill.colorStops[0].color;
        const hex = firstColor.startsWith('#') ? firstColor : lastSolidColor;
        setCurrentFill(hex);
        onUpdate({ fill: hex });
      } else {
        onUpdate({ fill: lastSolidColor });
      }
    }
    setActiveTab(newTab);
  };

  const handleColorChange = (color: string) => {
    setCurrentFill(color);
    setLastSolidColor(color);
    addColor(color);
    onUpdate({ fill: color });
  };

  const handleOpacityChange = (value: number[]) => {
    setOpacity(value[0]);
    onUpdate({ opacity: value[0] / 100 });
  };

  const handlePresetClick = (color: string) => {
    if (color === 'transparent') {
      setCurrentFill('transparent');
      onUpdate({ fill: 'transparent' });
    } else {
      setCurrentFill(color);
      setLastSolidColor(color);
      addColor(color);
      onUpdate({ fill: color });
    }
  };

  const handleEyedropper = async () => {
    try {
      if (!('EyeDropper' in window)) {
        console.warn('EyeDropper API not supported');
        return;
      }
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        handleColorChange(result.sRGBHex);
      }
    } catch (e) {
      // User cancelled
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveObject) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        // Scale the image to fit the object dimensions
        const objWidth = effectiveObject.width * (effectiveObject.scaleX || 1);
        const objHeight = effectiveObject.height * (effectiveObject.scaleY || 1);
        const scaleX = objWidth / img.width;
        const scaleY = objHeight / img.height;
        // Use cover scaling (fill entire shape)
        const scale = Math.max(scaleX, scaleY);

        // Create an offscreen canvas to draw the scaled image
        const offCanvas = document.createElement('canvas');
        offCanvas.width = Math.round(img.width * scale);
        offCanvas.height = Math.round(img.height * scale);
        const ctx = offCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
        }

        const pattern = new Pattern({
          source: offCanvas,
          repeat: 'no-repeat',
          // Use patternTransform for positioning (Alt+drag)
          patternTransform: [1, 0, 0, 1, 0, 0],
        });
        
        effectiveObject.set('fill', pattern);
        effectiveObject.set('dirty', true);
        effectiveObject.set('objectCaching', false);
        if (canvas) canvas.renderAll();
        setImagePreview(dataUrl);
        onUpdate({ fill: pattern });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-60 bg-white rounded-xl overflow-hidden animate-push-in">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-sm font-semibold text-zinc-900">Fill</span>
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="px-4 pb-3">
          <TabsList className="w-full h-9 p-1 bg-zinc-100 rounded-lg grid grid-cols-3">
            <TabsTrigger value="solid" className="rounded-md text-xs font-medium data-[state=active]:bg-white">Solid</TabsTrigger>
            <TabsTrigger value="gradient" className="rounded-md text-xs font-medium data-[state=active]:bg-white">Gradient</TabsTrigger>
            <TabsTrigger value="image" className="rounded-md text-xs font-medium data-[state=active]:bg-white">Image</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="solid" className="px-4 pb-4 space-y-4 mt-0">
          <div className="relative">
            <HexColorPicker 
              color={currentFill === 'transparent' ? '#ffffff' : currentFill} 
              onChange={handleColorChange}
              style={{ width: '100%', height: '180px' }}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Opacity</span>
              <span>{opacity}%</span>
            </div>
            <div className="relative h-3 rounded-full overflow-hidden" style={{
              background: `linear-gradient(to right, transparent, ${currentFill === 'transparent' ? '#000' : currentFill}), 
                repeating-conic-gradient(#d4d4d4 0% 25%, transparent 0% 50%) 50% / 8px 8px`
            }}>
              <Slider value={[opacity]} onValueChange={handleOpacityChange} min={0} max={100} step={1} className="absolute inset-0" />
            </div>
          </div>
          
          <div className="grid grid-cols-6 gap-2">
            {displayColors.map((color, i) => (
              <button
                key={i}
                onClick={() => handlePresetClick(color)}
                className={`w-9 h-9 rounded-full border-2 hover:scale-110 transition-transform relative overflow-hidden ${
                  currentFill === color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-zinc-200'
                }`}
                style={{ 
                  backgroundColor: color === 'transparent' ? '#fff' : color,
                  backgroundImage: color === 'transparent' ? 'repeating-conic-gradient(#d4d4d4 0% 25%, transparent 0% 50%)' : undefined,
                  backgroundSize: color === 'transparent' ? '8px 8px' : undefined
                }}
              >
                {color === 'transparent' && <Slash className="w-5 h-5 text-red-500 absolute inset-0 m-auto" />}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleEyedropper}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors"
              title="Pick color from screen"
            >
              <Pipette className="w-4 h-4 text-zinc-600" />
            </button>
            <div className="flex-1 h-9 flex items-center bg-zinc-100 rounded-lg px-3 gap-1">
              <span className="text-zinc-400 text-sm">#</span>
              <HexColorInput
                color={currentFill === 'transparent' ? '' : currentFill}
                onChange={handleColorChange}
                className="flex-1 bg-transparent text-sm uppercase tracking-wide border-none outline-none w-full"
                placeholder="000000"
              />
            </div>
            <div className="w-16 h-9 flex items-center justify-center bg-zinc-100 rounded-lg px-2">
              <span className="text-sm text-zinc-700">{opacity}%</span>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="gradient" className="px-4 pb-4 mt-0">
          <GradientEditor selectedObject={effectiveObject} onUpdate={(gradient) => onUpdate({ fill: gradient })} />
        </TabsContent>
        
        <TabsContent value="image" className="px-4 pb-4 mt-0">
          <div className="space-y-4">
            {imagePreview ? (
              <div className="space-y-3">
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
                  <img src={imagePreview} alt="Fill preview" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-9 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Replace Image
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-zinc-300 rounded-lg hover:border-zinc-400 hover:bg-zinc-50 transition-colors flex flex-col items-center gap-2"
              >
                <Upload className="w-6 h-6 text-zinc-400" />
                <span className="text-xs text-zinc-500">Upload Image</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <div className="flex items-center gap-2 px-2 py-2 bg-zinc-50 rounded-lg">
              <Move className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span className="text-[11px] text-zinc-500">Hold <kbd className="px-1 py-0.5 bg-zinc-200 rounded text-[10px] font-mono">Alt</kbd> + drag to reposition image</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

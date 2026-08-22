import { useState, useCallback, useRef, useEffect } from 'react';
import { X, RotateCcw, Sun, Palette, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FabricImage } from 'fabric';

interface AdjustPanelProps {
  selectedObject: any;
  canvas: any;
  position: { x: number; y: number };
  onClose: () => void;
}

interface AdjustValues {
  // Light
  light: number;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  // Color
  vibrance: number;
  saturation: number;
  temperature: number;
  tint: number;
  // Detail
  sharpen: number;
  clarity: number;
  grain: number;
  // Effects
  vignette: number;
  glamour: number;
  bloom: number;
}

const DEFAULT_VALUES: AdjustValues = {
  light: 0, exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
  vibrance: 0, saturation: 0, temperature: 0, tint: 0,
  sharpen: 0, clarity: 0, grain: 0,
  vignette: 0, glamour: 0, bloom: 0,
};

type TabId = 'light' | 'color' | 'detail' | 'effects';

const TABS: { id: TabId; icon: any; label: string }[] = [
  { id: 'light', icon: Sun, label: 'Light' },
  { id: 'color', icon: Palette, label: 'Color' },
  { id: 'detail', icon: Search, label: 'Detail' },
  { id: 'effects', icon: Sparkles, label: 'Effects' },
];

const TAB_SLIDERS: Record<TabId, { key: keyof AdjustValues; label: string; min: number; max: number; gradient?: string }[]> = {
  light: [
    { key: 'light', label: 'Light', min: -100, max: 100 },
    { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
    { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
    { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
    { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
    { key: 'whites', label: 'Whites', min: -100, max: 100 },
    { key: 'blacks', label: 'Blacks', min: -100, max: 100 },
  ],
  color: [
    { key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
    { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
    { key: 'temperature', label: 'Temperature', min: -100, max: 100, gradient: 'linear-gradient(to right, #4488ff, #ff8844)' },
    { key: 'tint', label: 'Tint', min: -100, max: 100, gradient: 'linear-gradient(to right, #cc44aa, #44cc66)' },
  ],
  detail: [
    { key: 'sharpen', label: 'Sharpen', min: 0, max: 100 },
    { key: 'clarity', label: 'Clarity', min: -100, max: 100 },
    { key: 'grain', label: 'Grain', min: 0, max: 100 },
  ],
  effects: [
    { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
    { key: 'glamour', label: 'Glamour', min: 0, max: 100 },
    { key: 'bloom', label: 'Bloom', min: 0, max: 100 },
  ],
};

const BLEND_MODES = [
  'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
] as const;

const BLEND_MODE_LABELS: Record<string, string> = {
  'source-over': 'Normal', 'multiply': 'Multiply', 'screen': 'Screen',
  'overlay': 'Overlay', 'darken': 'Darken', 'lighten': 'Lighten',
  'color-dodge': 'Color Dodge', 'color-burn': 'Color Burn',
  'hard-light': 'Hard Light', 'soft-light': 'Soft Light',
  'difference': 'Difference', 'exclusion': 'Exclusion',
  'hue': 'Hue', 'saturation': 'Saturation', 'color': 'Color', 'luminosity': 'Luminosity',
};

const AdjustPanel = ({ selectedObject, canvas, position, onClose }: AdjustPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('light');
  const [values, setValues] = useState<AdjustValues>({ ...DEFAULT_VALUES });
  const [blendMode, setBlendMode] = useState<string>('source-over');
  const originalImageDataRef = useRef<string | null>(null);
  // Store original image data on mount
  useEffect(() => {
    if (selectedObject && !originalImageDataRef.current) {
      const src = selectedObject.getSrc?.() || selectedObject.toDataURL?.({ format: 'png' });
      originalImageDataRef.current = src;
    }
  }, [selectedObject]);

  const applyAdjustments = useCallback((vals: AdjustValues) => {
    if (!selectedObject || !canvas) return;

    // Build CSS filter string from adjustment values
    const brightness = 1 + (vals.light + vals.exposure) / 200;
    const contrast = 1 + vals.contrast / 100;
    const saturate = 1 + (vals.saturation + vals.vibrance * 0.5) / 100;
    // Temperature approximation: warm = sepia-ish hue rotate
    const hueRotate = vals.temperature * 0.3 + vals.tint * 0.2;

    // Apply using Fabric.js filters
    const img = selectedObject as FabricImage;
    if (typeof img.applyFilters !== 'function') return;

    // Create a temporary canvas to apply pixel-level adjustments
    const origSrc = originalImageDataRef.current;
    if (!origSrc) return;

    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = tempImg.naturalWidth;
      tempCanvas.height = tempImg.naturalHeight;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      // Apply CSS-like filters via canvas context
      ctx.filter = [
        `brightness(${brightness})`,
        `contrast(${contrast})`,
        `saturate(${saturate})`,
        `hue-rotate(${hueRotate}deg)`,
      ].join(' ');

      ctx.drawImage(tempImg, 0, 0);

      // Apply grain effect
      if (vals.grain > 0) {
        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        const intensity = vals.grain * 0.5;
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * intensity;
          data[i] = Math.max(0, Math.min(255, data[i] + noise));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Apply vignette
      if (vals.vignette > 0) {
        const cx = tempCanvas.width / 2;
        const cy = tempCanvas.height / 2;
        const radius = Math.max(cx, cy);
        const gradient = ctx.createRadialGradient(cx, cy, radius * (1 - vals.vignette / 100), cx, cy, radius);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${vals.vignette / 100 * 0.7})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      }

      // Apply bloom (soft glow)
      if (vals.bloom > 0) {
        ctx.globalAlpha = vals.bloom / 300;
        ctx.filter = `blur(${vals.bloom / 5}px) brightness(1.3)`;
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.globalAlpha = 1;
        ctx.filter = 'none';
      }

      // Apply glamour (warm soft light)
      if (vals.glamour > 0) {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.globalAlpha = vals.glamour / 200;
        ctx.fillStyle = '#ffd4a0';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // Apply sharpness via unsharp mask approximation
      if (vals.sharpen > 0 || vals.clarity > 0) {
        // Simplified: just increase contrast slightly for clarity
        const clarityBoost = 1 + (vals.clarity * 0.003);
        ctx.filter = `contrast(${clarityBoost})`;
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
      }

      // Highlights/shadows/whites/blacks adjustments via curves approximation
      if (vals.highlights !== 0 || vals.shadows !== 0 || vals.whites !== 0 || vals.blacks !== 0) {
        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
          let adjust = 0;
          if (lum > 200) adjust += vals.whites * 0.5;
          else if (lum > 128) adjust += vals.highlights * 0.4;
          else if (lum > 50) adjust += vals.shadows * 0.4;
          else adjust += vals.blacks * 0.5;
          data[i] = Math.max(0, Math.min(255, data[i] + adjust));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + adjust));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + adjust));
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Update the Fabric image source
      const dataUrl = tempCanvas.toDataURL('image/png');
      const updateImg = new Image();
      updateImg.crossOrigin = 'anonymous';
      updateImg.onload = () => {
        (img as any)._element = updateImg;
        (img as any)._originalElement = updateImg;
        img.width = updateImg.naturalWidth;
        img.height = updateImg.naturalHeight;
        img.setCoords();
        canvas.requestRenderAll();
      };
      updateImg.src = dataUrl;
    };
    tempImg.src = origSrc;
  }, [selectedObject, canvas]);

  const handleSliderChange = (key: keyof AdjustValues, val: number) => {
    const newValues = { ...values, [key]: val };
    setValues(newValues);
    applyAdjustments(newValues);
  };

  const handleBlendModeChange = (mode: string) => {
    setBlendMode(mode);
    if (selectedObject && canvas) {
      selectedObject.globalCompositeOperation = mode;
      canvas.requestRenderAll();
    }
  };

  const handleReset = () => {
    setValues({ ...DEFAULT_VALUES });
    setBlendMode('source-over');
    applyAdjustments({ ...DEFAULT_VALUES });
    if (selectedObject && canvas) {
      selectedObject.globalCompositeOperation = 'source-over';
      canvas.requestRenderAll();
    }
  };

  // Clamp panel position
  const panelX = Math.min(position.x + 20, window.innerWidth - 280);
  const panelY = Math.max(20, Math.min(position.y - 100, window.innerHeight - 500));

  return (
    <div
      className="absolute z-[1001] w-[252px] bg-white/95 backdrop-blur-xl rounded-xl border border-zinc-200 shadow-xl animate-in fade-in slide-in-from-left-2 duration-200"
      style={{ left: `${panelX}px`, top: `${panelY}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100">
        <span className="text-xs font-semibold text-zinc-800">Adjust</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleReset}>
            <RotateCcw className="w-3 h-3 text-zinc-400" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-3 h-3 text-zinc-400" />
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-zinc-100">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                isActive ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sliders */}
      <div className="px-3 py-2 space-y-3 max-h-[340px] overflow-y-auto">
        {TAB_SLIDERS[activeTab].map(slider => (
          <div key={slider.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-zinc-500">{slider.label}</span>
              <span className="text-[10px] text-zinc-400 tabular-nums w-8 text-right">
                {values[slider.key]}
              </span>
            </div>
            <div className="relative">
              {slider.gradient && (
                <div
                  className="absolute inset-y-0 left-0 right-0 h-2 rounded-full top-1/2 -translate-y-1/2 opacity-30 pointer-events-none"
                  style={{ background: slider.gradient }}
                />
              )}
              <Slider
                min={slider.min}
                max={slider.max}
                step={1}
                value={[values[slider.key]]}
                onValueChange={([v]) => handleSliderChange(slider.key, v)}
                className="w-full"
              />
            </div>
          </div>
        ))}

        {/* Blend Mode dropdown - only in Effects tab */}
        {activeTab === 'effects' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-zinc-500">Blend Mode</span>
            </div>
            <Select value={blendMode} onValueChange={handleBlendModeChange}>
              <SelectTrigger className="h-7 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[1100]">
                {BLEND_MODES.map(m => (
                  <SelectItem key={m} value={m} className="text-[11px]">
                    {BLEND_MODE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdjustPanel;

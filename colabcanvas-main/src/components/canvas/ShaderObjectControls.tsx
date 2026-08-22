import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Trash2, Settings2, Sparkles, Play } from 'lucide-react';
import { removeShaderFromObject, updateShaderUniform, getShaderConfig } from '@/lib/shaders/applyShaderToObject';
import { HexColorPicker } from 'react-colorful';
import type { ShaderConfig } from '@/lib/shaders/shaderDefinitions';

interface ShaderObjectControlsProps {
  selectedObject: any;
  fabricCanvas: any;
  onShaderRemoved?: () => void;
}

function vec3ToHex(vec3: number[]): string {
  const r = Math.round(vec3[0] * 255).toString(16).padStart(2, '0');
  const g = Math.round(vec3[1] * 255).toString(16).padStart(2, '0');
  const b = Math.round(vec3[2] * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function hexToVec3(hex: string): number[] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export function ShaderObjectControls({ selectedObject, fabricCanvas, onShaderRemoved }: ShaderObjectControlsProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [, forceUpdate] = useState({});
  
  // Force re-render when shader config changes
  useEffect(() => {
    if (selectedObject?.__hasShader) {
      forceUpdate({});
    }
  }, [selectedObject?.__hasShader, selectedObject?.__shaderConfig]);
  
  if (!selectedObject || !selectedObject.__hasShader) {
    return null;
  }
  
  const shaderConfig = getShaderConfig(selectedObject) as ShaderConfig | null;
  if (!shaderConfig) return null;

  const handleRemoveShader = () => {
    removeShaderFromObject(selectedObject);
    fabricCanvas?.requestRenderAll();
    onShaderRemoved?.();
    forceUpdate({});
  };

  const handleUniformChange = (name: string, value: number | number[]) => {
    updateShaderUniform(selectedObject, name, value);
    // Update local state for UI
    if (shaderConfig.uniforms[name]) {
      shaderConfig.uniforms[name].value = value;
    }
    forceUpdate({});
  };

  return (
    <>
      {/* Shader indicator badge */}
      <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-md border border-purple-500/30">
        <Sparkles className="w-3 h-3 text-purple-400" />
        <span className="text-xs font-medium text-purple-300">{shaderConfig.name}</span>
      </div>

      <div className="w-px h-5 bg-border" />

      {/* Settings popover */}
      <Popover open={showSettings} onOpenChange={setShowSettings}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-purple-500/20"
            title="Shader Settings"
          >
            <Settings2 className="w-4 h-4 text-purple-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 bg-zinc-900 border-zinc-700" align="center" side="bottom">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-zinc-100">{shaderConfig.name}</h4>
              {shaderConfig.isAnimated && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 rounded text-[10px] text-green-400">
                  <Play className="w-2.5 h-2.5" />
                  Animated
                </div>
              )}
            </div>
            
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {Object.entries(shaderConfig.uniforms).map(([name, uniform]) => (
                <div key={name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-300">{uniform.label}</label>
                    {uniform.type === 'float' && (
                      <span className="text-xs text-zinc-500 tabular-nums">
                        {(uniform.value as number).toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  {uniform.type === 'float' && (
                    <Slider
                      value={[uniform.value as number]}
                      min={uniform.min || 0}
                      max={uniform.max || 1}
                      step={uniform.step || 0.01}
                      onValueChange={([v]) => handleUniformChange(name, v)}
                      className="w-full"
                    />
                  )}
                  
                  {uniform.type === 'color' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="w-full h-10 rounded-lg border-2 border-zinc-600 cursor-pointer hover:border-zinc-500 transition-colors shadow-inner"
                          style={{ backgroundColor: vec3ToHex(uniform.value as number[]) }}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3 bg-zinc-900 border-zinc-700" side="right">
                        <HexColorPicker
                          color={vec3ToHex(uniform.value as number[])}
                          onChange={(hex) => handleUniformChange(name, hexToVec3(hex))}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              ))}
            </div>
            
            {/* Remove button inside popover */}
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleRemoveShader}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Shader
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick remove button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-destructive/20"
        onClick={handleRemoveShader}
        title="Remove Shader"
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </>
  );
}

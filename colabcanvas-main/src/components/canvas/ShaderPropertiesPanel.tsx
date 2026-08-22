import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Trash2 } from 'lucide-react';
import type { ShaderConfig } from '@/lib/shaders/shaderDefinitions';
import { hexToVec3 } from '@/lib/shaders/shaderDefinitions';

interface ShaderPropertiesPanelProps {
  shader: ShaderConfig;
  onUniformChange: (name: string, value: number | number[]) => void;
  onExportVideo: () => void;
  onClose: () => void;
  onApply: () => void;
  onRemove?: () => void;
}

function vec3ToHex(vec3: number[]): string {
  const r = Math.round(vec3[0] * 255).toString(16).padStart(2, '0');
  const g = Math.round(vec3[1] * 255).toString(16).padStart(2, '0');
  const b = Math.round(vec3[2] * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function ShaderPropertiesPanel({ 
  shader, 
  onUniformChange, 
  onExportVideo,
  onApply,
  onRemove
}: ShaderPropertiesPanelProps) {
  const [localUniforms, setLocalUniforms] = useState(shader.uniforms);

  // Reset local uniforms when shader changes
  useEffect(() => {
    setLocalUniforms(shader.uniforms);
  }, [shader]);

  const handleChange = (name: string, value: number | number[]) => {
    setLocalUniforms(prev => ({
      ...prev,
      [name]: { ...prev[name], value }
    }));
    onUniformChange(name, value);
  };

  return (
    <>
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {/* Parameters Section */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Parameters</h4>
            <div className="space-y-4">
              {Object.entries(localUniforms).map(([name, config]) => (
                <div key={name} className="space-y-2">
                  <Label className="text-xs font-medium">{config.label}</Label>
                  
                  {config.type === 'float' && (
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[config.value as number]}
                        min={config.min ?? 0}
                        max={config.max ?? 1}
                        step={config.step ?? 0.01}
                        onValueChange={([v]) => handleChange(name, v)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={(config.value as number).toFixed(2)}
                        onChange={(e) => handleChange(name, parseFloat(e.target.value))}
                        className="w-20 h-8 text-xs"
                        step={config.step ?? 0.01}
                        min={config.min ?? 0}
                        max={config.max ?? 1}
                      />
                    </div>
                  )}

                  {config.type === 'color' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="w-full h-10 rounded-md border border-border hover:border-primary/50 transition-colors"
                          style={{ backgroundColor: vec3ToHex(config.value as number[]) }}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3">
                        <HexColorPicker
                          color={vec3ToHex(config.value as number[])}
                          onChange={(hex) => handleChange(name, hexToVec3(hex))}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/30 space-y-2">
        <div className="flex gap-2">
          <Button 
            onClick={onApply} 
            className="flex-1"
            size="sm"
          >
            Apply to Canvas
          </Button>
          {shader.isAnimated && (
            <Button 
              onClick={onExportVideo} 
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Video
            </Button>
          )}
        </div>
        
        {onRemove && (
          <Button 
            onClick={onRemove} 
            variant="destructive"
            size="sm"
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Shader
          </Button>
        )}
      </div>
    </>
  );
}

import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, ArrowLeft } from 'lucide-react';
import { ShaderPreview } from './ShaderPreview';
import { ShaderPropertiesPanel } from './ShaderPropertiesPanel';
import { SHADER_DEFINITIONS, ShaderConfig } from '@/lib/shaders/shaderDefinitions';

interface ShadersPanelProps {
  onShaderSelect: (shader: ShaderConfig) => void;
  onClose?: () => void;
}

export function ShadersPanel({ onShaderSelect, onClose }: ShadersPanelProps) {
  const [selectedShader, setSelectedShader] = useState<ShaderConfig | null>(null);

  const shadersByCategory = {
    effect: Object.values(SHADER_DEFINITIONS).filter(s => s.category === 'effect'),
    animation: Object.values(SHADER_DEFINITIONS).filter(s => s.category === 'animation'),
    filter: Object.values(SHADER_DEFINITIONS).filter(s => s.category === 'filter'),
  };

  const handleShaderClick = (shader: ShaderConfig) => {
    setSelectedShader(shader);
  };

  const handleBack = () => {
    setSelectedShader(null);
  };

  const handleApply = () => {
    if (selectedShader) {
      onShaderSelect(selectedShader);
      setSelectedShader(null);
    }
  };

  if (selectedShader) {
    return (
      <div className="bg-background/95 backdrop-blur-xl rounded-lg border border-border/30 w-80 max-h-[500px] flex flex-col">
        <div className="p-4 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-sm font-medium">{selectedShader.name}</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <ShaderPropertiesPanel 
          shader={selectedShader} 
          onUniformChange={() => {}}
          onExportVideo={() => {}}
          onClose={handleBack}
          onApply={handleApply}
        />
      </div>
    );
  }

  return (
    <div className="bg-background/95 backdrop-blur-xl rounded-lg border border-border/30 w-[340px] h-[520px] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border/30 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-medium">Shaders & Effects</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 overflow-auto">
        <div className="p-4">
          <div className="space-y-6">
            {/* Effects Section */}
            <div>
              <h4 className="text-[10px] font-medium text-muted-foreground mb-3 uppercase tracking-wide">Effects</h4>
              <div className="grid grid-cols-4 gap-3">
                {shadersByCategory.effect.map((shader) => (
                  <button
                    key={shader.id}
                    onClick={() => handleShaderClick(shader)}
                    className="group flex flex-col gap-1.5"
                  >
                    <div className="w-[68px] h-[68px] rounded-lg overflow-hidden border border-border/30 hover:border-primary/50 hover:ring-2 hover:ring-primary/20 transition-all">
                      <ShaderPreview shaderConfig={shader} width={68} height={68} className="w-full h-full" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground text-center leading-tight truncate w-[68px]">
                      {shader.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Animations Section */}
            <div>
              <h4 className="text-[10px] font-medium text-muted-foreground mb-3 uppercase tracking-wide">Logo Animations</h4>
              <div className="grid grid-cols-4 gap-3">
                {shadersByCategory.animation.map((shader) => (
                  <button
                    key={shader.id}
                    onClick={() => handleShaderClick(shader)}
                    className="group flex flex-col gap-1.5"
                  >
                    <div className="w-[68px] h-[68px] rounded-lg overflow-hidden border border-border/30 hover:border-primary/50 hover:ring-2 hover:ring-primary/20 transition-all">
                      <ShaderPreview shaderConfig={shader} width={68} height={68} className="w-full h-full" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground text-center leading-tight truncate w-[68px]">
                      {shader.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Filters Section */}
            <div>
              <h4 className="text-[10px] font-medium text-muted-foreground mb-3 uppercase tracking-wide">Image Filters</h4>
              <div className="grid grid-cols-4 gap-3">
                {shadersByCategory.filter.map((shader) => (
                  <button
                    key={shader.id}
                    onClick={() => handleShaderClick(shader)}
                    className="group flex flex-col gap-1.5"
                  >
                    <div className="w-[68px] h-[68px] rounded-lg overflow-hidden border border-border/30 hover:border-primary/50 hover:ring-2 hover:ring-primary/20 transition-all">
                      <ShaderPreview shaderConfig={shader} width={68} height={68} className="w-full h-full" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground text-center leading-tight truncate w-[68px]">
                      {shader.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

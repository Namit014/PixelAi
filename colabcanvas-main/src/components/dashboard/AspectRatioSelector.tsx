import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AspectRatioSelectorProps {
  selectedRatio: string;
  onSelect: (ratio: string) => void;
}

const aspectRatios = [
  { label: '4:3', value: '4:3' },
  { label: '3:2', value: '3:2' },
  { label: '16:9', value: '16:9' },
  { label: '2.35:1', value: '2.35:1' },
  { label: '1:1', value: '1:1' },
  { label: '4:5', value: '4:5' },
  { label: '2:3', value: '2:3' },
  { label: '9:16', value: '9:16' },
];

const getAspectRatioDimensions = (ratio: string) => {
  const parts = ratio.split(':');
  const width = parseFloat(parts[0]);
  const height = parseFloat(parts[1]);
  const maxSize = 100;
  
  if (width > height) {
    return { width: maxSize, height: (maxSize * height) / width };
  } else {
    return { width: (maxSize * width) / height, height: maxSize };
  }
};

export const AspectRatioSelector = ({ selectedRatio, onSelect }: AspectRatioSelectorProps) => {
  const dimensions = getAspectRatioDimensions(selectedRatio);
  
  return (
    <Card className="absolute top-full mt-2 right-0 p-4 shadow-xl border-2 border-gray-300 bg-white z-50 w-[520px]">
      <h3 className="text-sm font-normal mb-4 text-muted-foreground">Aspect Ratio</h3>
      
      <div className="flex gap-4">
        {/* Left side - Quick selection buttons */}
        <div className="grid grid-cols-4 gap-2 flex-1">
          {aspectRatios.map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => onSelect(ratio.value)}
              className={cn(
                "h-12 rounded-lg border-2 transition-all font-medium text-xs flex items-center justify-center",
                selectedRatio === ratio.value
                  ? "border-gray-900 bg-gray-100 text-foreground"
                  : "border-border/40 bg-white text-foreground hover:border-border/60"
              )}
            >
              {ratio.label}
            </button>
          ))}
        </div>
        
        {/* Right side - Interactive visual preview */}
        <div className="flex items-center justify-center w-40">
          <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
            {/* Preview box with dynamic aspect ratio and grid */}
            <div 
              className="bg-gray-100 border-2 border-gray-300 rounded-md shadow-sm transition-all duration-300 relative"
              style={{ 
                width: dimensions.width, 
                height: dimensions.height 
              }}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-gray-300/50" />
                ))}
              </div>
            </div>
            
            {/* Draggable handles - positioned relative to the dynamic box */}
            <div 
              className="absolute w-10 h-3 bg-gray-400 rounded-full cursor-ns-resize shadow-sm transition-all duration-300"
              style={{ 
                top: `calc(50% - ${dimensions.height / 2}px - 8px)`,
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            />
            <div 
              className="absolute w-10 h-3 bg-gray-400 rounded-full cursor-ns-resize shadow-sm transition-all duration-300"
              style={{ 
                top: `calc(50% + ${dimensions.height / 2}px + 2px)`,
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            />
            <div 
              className="absolute w-3 h-10 bg-gray-400 rounded-full cursor-ew-resize shadow-sm transition-all duration-300"
              style={{ 
                top: '50%',
                left: `calc(50% - ${dimensions.width / 2}px - 8px)`,
                transform: 'translateY(-50%)'
              }}
            />
            <div 
              className="absolute w-3 h-10 bg-gray-400 rounded-full cursor-ew-resize shadow-sm transition-all duration-300"
              style={{ 
                top: '50%',
                left: `calc(50% + ${dimensions.width / 2}px + 2px)`,
                transform: 'translateY(-50%)'
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

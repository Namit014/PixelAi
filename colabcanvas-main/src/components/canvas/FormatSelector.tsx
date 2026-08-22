import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Format {
  ratio: string;
  wRatio: number;
  hRatio: number;
  label: string;
}

const formats: Format[] = [
  { ratio: "21:9", wRatio: 21, hRatio: 9, label: "Ultra Wide" },
  { ratio: "16:9", wRatio: 16, hRatio: 9, label: "Wide" },
  { ratio: "4:3", wRatio: 4, hRatio: 3, label: "Standard" },
  { ratio: "3:2", wRatio: 3, hRatio: 2, label: "Classic" },
  { ratio: "1:1", wRatio: 1, hRatio: 1, label: "Square" },
  { ratio: "9:16", wRatio: 9, hRatio: 16, label: "Portrait" },
  { ratio: "3:4", wRatio: 3, hRatio: 4, label: "Portrait" },
  { ratio: "2:3", wRatio: 2, hRatio: 3, label: "Portrait" },
  { ratio: "5:4", wRatio: 5, hRatio: 4, label: "Landscape" },
  { ratio: "4:5", wRatio: 4, hRatio: 5, label: "Portrait" },
];

// Shared dimension calculation function - resolution-aware
export const getFormatDimensions = (format: string, resolution: string): { width: number; height: number } => {
  const baseSize = resolution === '4K' ? 4096 : resolution === '2K' ? 2048 : 1024;
  
  const formatData = formats.find(f => f.ratio === format) || formats[4]; // Default to 1:1
  
  // Calculate dimensions maintaining aspect ratio with baseSize as the larger dimension
  if (formatData.wRatio >= formatData.hRatio) {
    // Landscape or square - width is baseSize
    return { 
      width: baseSize, 
      height: Math.round(baseSize * formatData.hRatio / formatData.wRatio) 
    };
  } else {
    // Portrait - height is baseSize
    return { 
      width: Math.round(baseSize * formatData.wRatio / formatData.hRatio), 
      height: baseSize 
    };
  }
};

interface FormatSelectorProps {
  selectedFormat: string;
  selectedResolution?: string;
  onFormatChange: (format: string, dimensions: { width: number; height: number }) => void;
}

// Dynamic icon based on aspect ratio orientation
const getFormatIcon = (format: Format) => {
  const isSquare = format.wRatio === format.hRatio;
  const isLandscape = format.wRatio > format.hRatio;
  
  if (isSquare) {
    // Square icon
    return (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    );
  } else if (isLandscape) {
    // Horizontal rectangle (landscape)
    return (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="4" width="14" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    );
  } else {
    // Vertical rectangle (portrait)
    return (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="1" width="8" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    );
  }
};

export const FormatSelector = ({ selectedFormat, selectedResolution = '1K', onFormatChange }: FormatSelectorProps) => {
  const [open, setOpen] = useState(false);

  const currentFormat = formats.find(f => f.ratio === selectedFormat) || formats[5]; // Default to 9:16

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs"
        >
          <span>{currentFormat.ratio}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 z-[1200]" align="end">
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Select Format
          </div>
          {formats.map((format) => {
            const dims = getFormatDimensions(format.ratio, selectedResolution);
            return (
              <button
                key={format.ratio}
                onClick={() => {
                  onFormatChange(format.ratio, dims);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2 py-2 text-sm rounded-md hover:bg-accent transition-colors ${
                  selectedFormat === format.ratio ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {getFormatIcon(format)}
                  <span className="font-medium">{format.ratio}</span>
                  <span className="text-xs text-muted-foreground">{format.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {dims.width}×{dims.height}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

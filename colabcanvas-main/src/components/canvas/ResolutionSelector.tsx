import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Resolution {
  label: string;
  value: string;
  multiplier: number;
}

const resolutions: Resolution[] = [
  { label: "1K", value: "1K", multiplier: 1 },
  { label: "2K", value: "2K", multiplier: 2 },
  { label: "4K", value: "4K", multiplier: 4 },
];

interface ResolutionSelectorProps {
  selectedResolution: string;
  onResolutionChange: (resolution: string) => void;
}

export const ResolutionSelector = ({ selectedResolution, onResolutionChange }: ResolutionSelectorProps) => {
  const [open, setOpen] = useState(false);

  const currentResolution = resolutions.find(r => r.value === selectedResolution) || resolutions[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs"
        >
          <span>{currentResolution.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2 z-[1200]" align="start">
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Resolution
          </div>
          {resolutions.map((resolution) => (
            <button
              key={resolution.value}
              onClick={() => {
                onResolutionChange(resolution.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2 py-2 text-sm rounded-md hover:bg-accent transition-colors ${
                selectedResolution === resolution.value ? "bg-accent" : ""
              }`}
            >
              <span className="font-medium">{resolution.label}</span>
              <span className="text-xs text-muted-foreground">
                {resolution.multiplier}x
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

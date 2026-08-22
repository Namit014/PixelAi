import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepPreviewProps {
  title: string;
  description: string;
  mediaUrl: string | null;
  ctaText: string;
  currentStep: number;
  totalSteps: number;
}

export function StepPreview({ title, description, mediaUrl, ctaText, currentStep, totalSteps }: StepPreviewProps) {
  return (
    <Card className="w-[320px] p-4 bg-zinc-950 border-zinc-800 text-zinc-100 relative">
      <button className="absolute right-2 top-2 p-1 rounded-full hover:bg-zinc-800 transition-colors">
        <X className="w-3 h-3 text-zinc-500" />
      </button>

      <div className="text-[10px] text-zinc-500 mb-1.5">
        Step {currentStep} of {totalSteps}
      </div>

      <h3 className="text-sm font-semibold mb-1 text-zinc-100">
        {title || 'Step title'}
      </h3>

      <p className="text-xs text-zinc-400 mb-3">
        {description || 'Step description...'}
      </p>

      {mediaUrl && (
        <div className="mb-3 rounded-md overflow-hidden border border-zinc-800">
          <img src={mediaUrl} alt="Preview" className="w-full h-24 object-cover" />
        </div>
      )}

      <div className="flex items-center justify-center gap-1 mb-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              i === currentStep - 1 ? "bg-zinc-300" : "bg-zinc-700"
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400">Skip Tour</span>
        <Button size="sm" className="h-7 text-xs bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
          {ctaText || 'Next'}
          <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </Card>
  );
}

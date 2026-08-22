import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Sparkles, RefreshCw, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Canvas as FabricCanvas, FabricImage } from 'fabric';

interface SketchToImageOverlayProps {
  sketchDataUrl: string;
  brushStrokes: any[];
  canvas: FabricCanvas;
  onFinalize: (imageDataUrl: string) => void;
  onClose: () => void;
}

export function SketchToImageOverlay({
  sketchDataUrl,
  brushStrokes,
  canvas,
  onFinalize,
  onClose,
}: SketchToImageOverlayProps) {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('sketch-to-image', {
        body: {
          sketch_base64: sketchDataUrl,
          prompt: prompt || undefined,
        },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.status === 429) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
        } else if (data.status === 402) {
          toast.error('Insufficient credits. Please add credits to continue.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (data?.image_url) {
        setGeneratedImage(data.image_url);
      } else {
        toast.error('No image was generated. Try a different sketch or prompt.');
      }
    } catch (err: any) {
      console.error('Sketch to image error:', err);
      toast.error('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalize = () => {
    if (generatedImage) {
      onFinalize(generatedImage);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Sketch to Image</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content - Side by side */}
        <div className="flex gap-4 p-6">
          {/* Left: Sketch */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Sketch</p>
            <div className="w-full aspect-square bg-muted/30 rounded-xl border border-border flex items-center justify-center overflow-hidden">
              <img
                src={sketchDataUrl}
                alt="Sketch"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>

          {/* Right: Generated */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Result</p>
            <div className="w-full aspect-square bg-muted/30 rounded-xl border border-border flex items-center justify-center overflow-hidden">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm">Generating image...</p>
                </div>
              ) : generatedImage ? (
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                  <Sparkles className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Click "Generate" to transform your sketch</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Prompt + Actions */}
        <div className="px-6 pb-6 space-y-3">
          <Input
            placeholder="Optional: describe what this sketch should become..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full"
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && !isGenerating) handleGenerate();
            }}
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {generatedImage && (
              <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Regenerate
              </Button>
            )}
            {!generatedImage ? (
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1.5" />
                )}
                Generate
              </Button>
            ) : (
              <Button onClick={handleFinalize}>
                <Check className="w-4 h-4 mr-1.5" />
                Finalise
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

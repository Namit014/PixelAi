import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Loader2, Sparkles } from 'lucide-react';
import { 
  StickerGeneratorIcon, 
  BackgroundGeneratorIcon, 
  PatternGeneratorIcon, 
  IconsGeneratorIcon 
} from '@/components/icons/CustomIcons';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { removeBackground, loadImage } from '@/lib/removeBackground';

type GeneratorType = 'sticker' | 'background' | 'pattern' | 'icon';

interface GeneratorTypeOption {
  id: GeneratorType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  creditCost: number;
}

const GENERATOR_TYPES: GeneratorTypeOption[] = [
  { 
    id: 'sticker', 
    label: 'Sticker', 
    description: 'Fun illustrated stickers',
    icon: StickerGeneratorIcon, 
    placeholder: 'A cute cartoon cat with sunglasses...',
    creditCost: 10
  },
  { 
    id: 'background', 
    label: 'Background', 
    description: 'Textures, gradients, abstract',
    icon: BackgroundGeneratorIcon, 
    placeholder: 'Abstract gradient with blue and purple...',
    creditCost: 10
  },
  { 
    id: 'pattern', 
    label: 'Pattern', 
    description: 'Seamless repeating patterns',
    icon: PatternGeneratorIcon, 
    placeholder: 'Geometric hexagon pattern in gold...',
    creditCost: 10
  },
  { 
    id: 'icon', 
    label: 'Icon', 
    description: 'Minimal flat icons',
    icon: IconsGeneratorIcon, 
    placeholder: 'Minimalist shopping cart icon...',
    creditCost: 10
  },
];

interface AssetGeneratorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (imageUrl: string) => void;
  initialType?: GeneratorType;
}

export function AssetGeneratorPanel({
  isOpen,
  onClose,
  onGenerate,
  initialType = 'sticker',
}: AssetGeneratorPanelProps) {
  const [generatorType, setGeneratorType] = useState<GeneratorType>(initialType);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const currentGenerator = GENERATOR_TYPES.find(g => g.id === generatorType)!;

  // FIX #11: Improved prompts for better transparency and quality
  const getSystemPrompt = (type: GeneratorType, userPrompt: string): string => {
    const baseInstructions = {
      sticker: `Generate a PNG sticker with TRUE ALPHA TRANSPARENCY.

CRITICAL REQUIREMENTS:
- Output MUST be PNG format with transparent background (alpha channel)
- NO white background, NO colored background - pure transparency
- Cartoon/illustration style with clean, thick outlines
- Vibrant colors, fun and playful aesthetic
- Single subject, centered composition
- Die-cut ready with crisp edges against transparent background
- The sticker should appear to float with no background whatsoever

Subject: ${userPrompt}`,
      
      background: `Create a BACKGROUND texture or pattern. Requirements:
- Full frame coverage (no borders or margins)
- Suitable as a design background
- High resolution, seamless edges if possible
- Can be abstract, gradient, textured, or photographic

User request: ${userPrompt}`,
      
      pattern: `Create a SEAMLESS REPEATING PATTERN. Requirements:
- Must tile perfectly in all directions
- Consistent density and spacing
- Works at various scales
- Clean, professional pattern design

User request: ${userPrompt}`,
      
      icon: `Generate a MINIMAL FLAT ICON with TRUE ALPHA TRANSPARENCY.

CRITICAL REQUIREMENTS:
- Output MUST be PNG format with transparent background
- NO white background - pure transparency
- Simple, clean geometric shapes
- Single color or limited palette (2-3 colors max)
- Centered on transparent background
- Modern, minimalist aesthetic
- Works well at small sizes

Icon subject: ${userPrompt}`,
    };

    return baseInstructions[type];
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe what you want to generate');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    
    // Elapsed timer instead of fake progress
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setProgress(elapsed);
    }, 1000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        clearInterval(progressInterval);
        toast.error('Please sign in to generate assets');
        return;
      }

      const systemPrompt = getSystemPrompt(generatorType, prompt);

      const { data, error } = await supabase.functions.invoke('canvas-ai-chat', {
        body: {
          prompt: systemPrompt,
          mode: generatorType,
        },
      });

      if (error) throw error;

      let generatedImageUrl = data?.images?.[0] || data?.imageUrl;
      
      if (!generatedImageUrl) {
        throw new Error('No image returned');
      }

      // For stickers and icons, remove background (skip upscale to reduce latency)
      if (generatorType === 'sticker' || generatorType === 'icon') {
        toast.loading('Removing background...', { id: 'enhance' });
        
        try {
          let imgElement: HTMLImageElement;
          
          // Handle data URLs directly without fetch (avoids CORS issues)
          if (generatedImageUrl.startsWith('data:')) {
            imgElement = document.createElement('img');
            imgElement.crossOrigin = 'anonymous';
            imgElement.src = generatedImageUrl;
            await new Promise<void>((resolve, reject) => {
              imgElement.onload = () => resolve();
              imgElement.onerror = () => reject(new Error('Failed to load data URL image'));
            });
          } else {
            // For regular URLs, fetch and convert to blob
            const response = await fetch(generatedImageUrl);
            const blob = await response.blob();
            imgElement = await loadImage(blob);
          }
          
          // Run client-side background removal on the upscaled image
          const transparentBlob = await removeBackground(imgElement);
          
          // Validate the result before using
          if (transparentBlob && transparentBlob.size > 100) {
            // Convert blob to data URL for canvas
            generatedImageUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(transparentBlob);
            });
            toast.success('High-quality sticker ready!', { id: 'enhance' });
          } else {
            throw new Error('Background removal produced empty result');
          }
        } catch (rmbgError) {
          console.error('Background removal failed:', rmbgError);
          toast.warning('Could not remove background - using original', { id: 'enhance' });
          // Continue with original image if RMBG fails
        }
      }

      onGenerate(generatedImageUrl);
      clearInterval(progressInterval);
      setProgress(100);
      toast.success(`${currentGenerator.label} generated!`);
      onClose();
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('Generation error:', error);
      if (error.message?.includes('insufficient_credits')) {
        toast.error('Insufficient credits');
      } else {
        toast.error('Failed to generate asset');
      }
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed left-[60px] top-1/2 -translate-y-1/2 z-50">
      <div 
        className="bg-background rounded-2xl border border-border w-[420px] overflow-hidden animate-slide-in-left"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Asset Generator</h2>
              <p className="text-sm text-muted-foreground">AI-powered design assets</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type Selector */}
          <div className="grid grid-cols-4 gap-2">
            {GENERATOR_TYPES.map(type => {
              const Icon = type.icon;
              const isSelected = generatorType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setGeneratorType(type.id)}
                  className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs ${isSelected ? 'font-medium' : 'text-muted-foreground'}`}>
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Description */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">{currentGenerator.description}</p>
          </div>

          {/* Prompt Input */}
          <div>
            <Label className="text-xs mb-1.5 block">Describe your {currentGenerator.label.toLowerCase()}</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                // Prevent spacebar from triggering canvas panning
                if (e.key === ' ' || e.key === 'Spacebar') {
                  e.stopPropagation();
                }
              }}
              placeholder={currentGenerator.placeholder}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-between">
          {isGenerating ? (
              <span className="text-xs text-primary font-medium">Processing... {progress}s</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Cost: {currentGenerator.creditCost} credits
              </span>
            )}
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !prompt.trim()}
              className="h-11 px-6"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

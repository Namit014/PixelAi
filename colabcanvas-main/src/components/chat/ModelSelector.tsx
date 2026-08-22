import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ModelSelectorIcon } from '@/components/icons/CustomIcons';
import { Check, Sparkles, Zap, Image, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  selectedImageModel?: string;
  onImageModelChange?: (model: string) => void;
}

const ALL_MODELS = [
// Chat Models
{ id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Balanced speed & quality', available: true, type: 'Chat', icon: '✦' },
{ id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Best for complex reasoning', available: true, type: 'Chat', icon: '✦' },
{ id: 'google/gemini-2.5-flash-lite', name: 'Gemini Flash Lite', description: 'Fastest & cheapest', available: true, type: 'Chat', icon: '✦' },
{ id: 'openai/gpt-5', name: 'GPT-5', description: 'OpenAI flagship model', available: true, type: 'Chat', icon: '◉' },
{ id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', description: 'Cost-efficient', available: true, type: 'Chat', icon: '◉' },
{ id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', description: 'Fastest GPT', available: true, type: 'Chat', icon: '◉' },

// Image/Video Generation Models
{ id: 'google/gemini-3-pro-image-preview', name: 'Gemini Pro Image', description: 'Best quality • Pro', available: true, type: 'Image', icon: '✦' },
{ id: 'google/gemini-2.5-flash-image', name: 'Gemini Flash Image', description: 'Fast generation', available: true, type: 'Image', icon: '✦' },
{ id: 'openai/gpt-image-1', name: 'GPT Image', description: 'High quality', available: true, type: 'Image', icon: '◉' },
{ id: 'azure/sora', name: 'Sora Video', description: 'Video generation', available: true, type: 'Video', icon: '▶' }];


const ModelSelector = ({
  selectedModel,
  onModelChange,
  selectedImageModel = 'google/gemini-3-pro-image-preview',
  onImageModelChange
}: ModelSelectorProps) => {
  const [autoSelect, setAutoSelect] = useState(false);

  const handleModelChange = (modelId: string) => {
    const model = ALL_MODELS.find((m) => m.id === modelId);
    if (!model || !model.available) return;

    if (model.type === 'Chat') {
      onModelChange(modelId);
    } else if ((model.type === 'Image' || model.type === 'Video') && onImageModelChange) {
      onImageModelChange(modelId);
    }
  };

  const isSelected = (modelId: string) => {
    return modelId === selectedModel || modelId === selectedImageModel;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border-secondary bg-secondary">
          <ModelSelectorIcon className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0 bg-background border shadow-xl z-[9999]" align="start" sideOffset={8}>
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">AI Models</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Auto</span>
              <Switch
                checked={autoSelect}
                onCheckedChange={setAutoSelect}
                className="scale-75" />

            </div>
          </div>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto">
          {/* Chat Models */}
          <div className="mb-2">
            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Chat
            </div>
            <div className="space-y-0.5">
              {ALL_MODELS.filter((m) => m.type === 'Chat').map((model) =>
              <button
                key={model.id}
                onClick={() => handleModelChange(model.id)}
                disabled={!model.available || autoSelect}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                  isSelected(model.id) ?
                  "bg-primary/10 text-primary" :
                  "hover:bg-muted",
                  (!model.available || autoSelect) && "opacity-50 cursor-not-allowed"
                )}>

                  <span className="text-base w-5 text-center">{model.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{model.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{model.description}</div>
                  </div>
                  {isSelected(model.id) && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              )}
            </div>
          </div>

          {/* Image Models */}
          <div className="mb-2">
            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Image className="w-3 h-3" />
              Image
            </div>
            <div className="space-y-0.5">
              {ALL_MODELS.filter((m) => m.type === 'Image').map((model) =>
              <button
                key={model.id}
                onClick={() => handleModelChange(model.id)}
                disabled={!model.available || autoSelect}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                  isSelected(model.id) ?
                  "bg-primary/10 text-primary" :
                  "hover:bg-muted",
                  (!model.available || autoSelect) && "opacity-50 cursor-not-allowed"
                )}>

                  <span className="text-base w-5 text-center">{model.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{model.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{model.description}</div>
                  </div>
                  {isSelected(model.id) && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              )}
            </div>
          </div>

          {/* Video Models */}
          <div>
            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-3 h-3" />
              Video
            </div>
            <div className="space-y-0.5">
              {ALL_MODELS.filter((m) => m.type === 'Video').map((model) =>
              <button
                key={model.id}
                onClick={() => handleModelChange(model.id)}
                disabled={!model.available || autoSelect}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                  isSelected(model.id) ?
                  "bg-primary/10 text-primary" :
                  "hover:bg-muted",
                  (!model.available || autoSelect) && "opacity-50 cursor-not-allowed"
                )}>

                  <span className="text-base w-5 text-center">{model.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{model.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{model.description}</div>
                  </div>
                  {isSelected(model.id) && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            Free tier until Oct 2025
          </p>
        </div>
      </PopoverContent>
    </Popover>);

};

export default ModelSelector;
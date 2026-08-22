import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { X, Instagram, Facebook, Linkedin, Twitter, Youtube, Mail, Globe, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DesignFormat {
  id: string;
  name: string;
  width: number;
  height: number;
  icon?: React.ComponentType<{ className?: string }>;
  category: 'social' | 'banner' | 'print';
}

const DESIGN_FORMATS: DesignFormat[] = [
  // Social Media
  { id: 'ig-story', name: 'Instagram Story', width: 1080, height: 1920, icon: Instagram, category: 'social' },
  { id: 'ig-post', name: 'Instagram Post', width: 1080, height: 1080, icon: Instagram, category: 'social' },
  { id: 'ig-reel', name: 'Instagram Reel', width: 1080, height: 1920, icon: Instagram, category: 'social' },
  { id: 'fb-cover', name: 'Facebook Cover', width: 820, height: 312, icon: Facebook, category: 'social' },
  { id: 'fb-post', name: 'Facebook Post', width: 1200, height: 630, icon: Facebook, category: 'social' },
  { id: 'linkedin-banner', name: 'LinkedIn Banner', width: 1584, height: 396, icon: Linkedin, category: 'social' },
  { id: 'linkedin-post', name: 'LinkedIn Post', width: 1200, height: 627, icon: Linkedin, category: 'social' },
  { id: 'twitter-header', name: 'Twitter Header', width: 1500, height: 500, icon: Twitter, category: 'social' },
  { id: 'twitter-post', name: 'Twitter Post', width: 1600, height: 900, icon: Twitter, category: 'social' },
  { id: 'youtube-thumb', name: 'YouTube Thumbnail', width: 1280, height: 720, icon: Youtube, category: 'social' },
  { id: 'youtube-banner', name: 'YouTube Banner', width: 2560, height: 1440, icon: Youtube, category: 'social' },
  
  // Banners
  { id: 'web-banner', name: 'Web Banner', width: 1200, height: 628, icon: Globe, category: 'banner' },
  { id: 'email-header', name: 'Email Header', width: 600, height: 200, icon: Mail, category: 'banner' },
  { id: 'leaderboard', name: 'Leaderboard', width: 728, height: 90, icon: Globe, category: 'banner' },
  { id: 'medium-rect', name: 'Medium Rectangle', width: 300, height: 250, icon: Globe, category: 'banner' },
  { id: 'skyscraper', name: 'Skyscraper', width: 160, height: 600, icon: Globe, category: 'banner' },
  
  // Print
  { id: 'a4', name: 'A4', width: 2480, height: 3508, icon: FileText, category: 'print' },
  { id: 'a5', name: 'A5', width: 1748, height: 2480, icon: FileText, category: 'print' },
  { id: 'letter', name: 'Letter', width: 2550, height: 3300, icon: FileText, category: 'print' },
  { id: 'business-card', name: 'Business Card', width: 1050, height: 600, icon: FileText, category: 'print' },
  { id: 'poster-18x24', name: 'Poster 18×24', width: 5400, height: 7200, icon: FileText, category: 'print' },
];

interface DesignAdaptationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAdaptDesign: (adaptedImageUrl: string, width: number, height: number, formatName: string) => Promise<void>;
  currentWidth?: number;
  currentHeight?: number;
  sourceImageUrl?: string | null;
}

interface AdaptationProgress {
  current: number;
  total: number;
  currentFormat: string;
  completed: string[];
  failed: string[];
}

export function DesignAdaptationPanel({
  isOpen,
  onClose,
  onAdaptDesign,
  currentWidth = 1080,
  currentHeight = 1080,
  sourceImageUrl,
}: DesignAdaptationPanelProps) {
  const [customWidth, setCustomWidth] = useState(currentWidth.toString());
  const [customHeight, setCustomHeight] = useState(currentHeight.toString());
  const [isAdapting, setIsAdapting] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(new Set());
  const [adaptationProgress, setAdaptationProgress] = useState<AdaptationProgress | null>(null);

  const toggleFormat = (formatId: string) => {
    setSelectedFormats(prev => {
      const next = new Set(prev);
      if (next.has(formatId)) {
        next.delete(formatId);
      } else {
        next.add(formatId);
      }
      return next;
    });
  };

  const selectAll = (category: 'social' | 'banner' | 'print') => {
    const categoryFormats = DESIGN_FORMATS.filter(f => f.category === category);
    const allSelected = categoryFormats.every(f => selectedFormats.has(f.id));
    setSelectedFormats(prev => {
      const next = new Set(prev);
      categoryFormats.forEach(f => {
        if (allSelected) {
          next.delete(f.id);
        } else {
          next.add(f.id);
        }
      });
      return next;
    });
  };

  const handleBatchAdapt = async () => {
    if (!sourceImageUrl) {
      toast.error('Please select an artboard or image first');
      return;
    }
    if (selectedFormats.size === 0) {
      toast.error('Please select at least one format');
      return;
    }

    const formats = DESIGN_FORMATS.filter(f => selectedFormats.has(f.id));
    setIsAdapting(true);
    setAdaptationProgress({
      current: 0,
      total: formats.length,
      currentFormat: formats[0].name,
      completed: [],
      failed: [],
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please sign in to adapt designs');
      setIsAdapting(false);
      setAdaptationProgress(null);
      return;
    }

    for (let i = 0; i < formats.length; i++) {
      const format = formats[i];
      setAdaptationProgress(prev => prev ? {
        ...prev,
        current: i,
        currentFormat: format.name,
      } : null);

      try {
        const { data, error } = await supabase.functions.invoke('adapt-design', {
          body: {
            imageUrl: sourceImageUrl,
            targetWidth: format.width,
            targetHeight: format.height,
            formatName: format.name,
          },
        });

        if (error) throw error;

        if (data?.adaptedImageUrl) {
          await onAdaptDesign(data.adaptedImageUrl, format.width, format.height, format.name);
          setAdaptationProgress(prev => prev ? {
            ...prev,
            completed: [...prev.completed, format.name],
          } : null);
        }
      } catch (error: any) {
        console.error(`Failed to adapt to ${format.name}:`, error);
        setAdaptationProgress(prev => prev ? {
          ...prev,
          failed: [...prev.failed, format.name],
        } : null);
      }
    }

    const finalProgress = adaptationProgress;
    setIsAdapting(false);
    setSelectedFormats(new Set());
    setAdaptationProgress(null);
    toast.success(`Adapted design to ${formats.length} formats`);
  };

  const handleCustomAdapt = async () => {
    if (!sourceImageUrl) {
      toast.error('Please select an artboard or image first');
      return;
    }

    const width = parseInt(customWidth);
    const height = parseInt(customHeight);
    
    if (isNaN(width) || isNaN(height) || width < 100 || height < 100) {
      toast.error('Please enter valid dimensions (min 100px)');
      return;
    }
    
    if (width > 8000 || height > 8000) {
      toast.error('Maximum dimension is 8000px');
      return;
    }
    
    setIsAdapting(true);
    setAdaptationProgress({
      current: 0,
      total: 1,
      currentFormat: `Custom ${width}×${height}`,
      completed: [],
      failed: [],
    });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to adapt designs');
        return;
      }

      const { data, error } = await supabase.functions.invoke('adapt-design', {
        body: {
          imageUrl: sourceImageUrl,
          targetWidth: width,
          targetHeight: height,
          formatName: `Custom ${width}×${height}`,
        },
      });

      if (error) throw error;

      if (data?.adaptedImageUrl) {
        await onAdaptDesign(data.adaptedImageUrl, width, height, `Custom ${width}×${height}`);
        toast.success(`Design adapted to ${width}×${height}`);
      }
    } catch (error: any) {
      console.error('Failed to adapt design:', error);
      if (error.message?.includes('429')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('402')) {
        toast.error('Insufficient credits. Please add more credits.');
      } else {
        toast.error('Failed to adapt design');
      }
    } finally {
      setIsAdapting(false);
      setAdaptationProgress(null);
    }
  };

  const socialFormats = DESIGN_FORMATS.filter(f => f.category === 'social');
  const bannerFormats = DESIGN_FORMATS.filter(f => f.category === 'banner');
  const printFormats = DESIGN_FORMATS.filter(f => f.category === 'print');

  if (!isOpen) return null;

  const renderFormatGrid = (formats: DesignFormat[], categoryLabel: string, category: 'social' | 'banner' | 'print') => {
    const allSelected = formats.every(f => selectedFormats.has(f.id));
    const someSelected = formats.some(f => selectedFormats.has(f.id));
    
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">{categoryLabel}</h3>
          <button
            onClick={() => selectAll(category)}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
            disabled={isAdapting}
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {formats.map(format => {
            const Icon = format.icon;
            const isSelected = selectedFormats.has(format.id);
            const isCompleted = adaptationProgress?.completed.includes(format.name);
            const isFailed = adaptationProgress?.failed.includes(format.name);
            const isProcessing = adaptationProgress?.currentFormat === format.name && isAdapting;
            
            return (
              <button
                key={format.id}
                onClick={() => !isAdapting && toggleFormat(format.id)}
                disabled={isAdapting}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                  isCompleted
                    ? 'border-green-500/50 bg-green-500/5'
                    : isFailed
                    ? 'border-destructive/50 bg-destructive/5'
                    : isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                } ${isAdapting ? 'cursor-default' : ''}`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <Checkbox
                    checked={isSelected}
                    className="shrink-0"
                    onCheckedChange={() => !isAdapting && toggleFormat(format.id)}
                    disabled={isAdapting}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{format.name}</p>
                  <p className="text-xs text-muted-foreground">{format.width}×{format.height}</p>
                </div>
                {Icon && !isProcessing && !isCompleted && (
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed left-[60px] top-1/2 -translate-y-1/2 z-50">
      <div className="bg-background rounded-2xl border border-border w-[480px] max-h-[80vh] overflow-hidden animate-slide-in-left">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">
              Adapt Design
              <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary align-middle">BETA</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {sourceImageUrl 
                ? `Current: ${currentWidth}×${currentHeight}px • ${selectedFormats.size} selected` 
                : 'Select an artboard first'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* No source image warning */}
        {!sourceImageUrl && (
          <div className="px-6 py-4 bg-muted/50 border-b border-border">
            <p className="text-sm text-muted-foreground">
              Please select an artboard or image to adapt. The AI will intelligently reflow your design to the new dimensions.
            </p>
          </div>
        )}

        {/* Batch progress */}
        {isAdapting && adaptationProgress && (
          <div className="px-6 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Adapting {adaptationProgress.current + 1}/{adaptationProgress.total}
              </span>
              <span className="text-xs text-muted-foreground">{adaptationProgress.currentFormat}</span>
            </div>
            <Progress value={((adaptationProgress.completed.length + adaptationProgress.failed.length) / adaptationProgress.total) * 100} className="h-2" />
            {adaptationProgress.completed.length > 0 && (
              <p className="text-xs text-green-600 mt-1">
                ✓ {adaptationProgress.completed.length} completed
              </p>
            )}
          </div>
        )}

        <ScrollArea className="h-[calc(80vh-220px)]">
          <div className="p-6 space-y-6">
            {renderFormatGrid(socialFormats, 'SOCIAL MEDIA', 'social')}
            {renderFormatGrid(bannerFormats, 'BANNERS & ADS', 'banner')}
            {renderFormatGrid(printFormats, 'PRINT', 'print')}

            {/* Custom Size */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">CUSTOM SIZE</h3>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs mb-1.5 block">Width (px)</Label>
                  <Input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    min={100}
                    max={8000}
                    className="h-10"
                    disabled={isAdapting}
                  />
                </div>
                <span className="text-muted-foreground pb-2">×</span>
                <div className="flex-1">
                  <Label className="text-xs mb-1.5 block">Height (px)</Label>
                  <Input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    min={100}
                    max={8000}
                    className="h-10"
                    disabled={isAdapting}
                  />
                </div>
                <Button 
                  onClick={handleCustomAdapt}
                  disabled={isAdapting || !sourceImageUrl}
                  className="h-10"
                  variant="outline"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Sticky bottom: Adapt All button */}
        {selectedFormats.size > 0 && (
          <div className="px-6 py-4 border-t border-border bg-background">
            <Button
              onClick={handleBatchAdapt}
              disabled={isAdapting || !sourceImageUrl}
              className="w-full h-11"
              size="lg"
            >
              {isAdapting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Adapting...</>
              ) : (
                `Adapt to ${selectedFormats.size} format${selectedFormats.size > 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

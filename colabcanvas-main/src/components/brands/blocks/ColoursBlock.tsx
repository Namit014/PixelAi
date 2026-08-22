import * as React from 'react';
import { ColoursBlock as ColoursBlockType } from '@/types/brandBlocks';
import { Trash2, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ColoursBlockProps {
  block: ColoursBlockType;
  onUpdate: (content: ColoursBlockType['content']) => void;
  onDelete: () => void;
  isPreviewMode?: boolean;
}

export const ColoursBlock = ({ block, onUpdate, onDelete, isPreviewMode = false }: ColoursBlockProps) => {
  const { toast } = useToast();
  const [colors, setColors] = React.useState(block.content.colors);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = React.useState(false);
  const [generatingPalette, setGeneratingPalette] = React.useState(false);
  const [selectedStyle, setSelectedStyle] = React.useState('modern');

  const addColor = () => {
    const newColors = [...colors, { name: 'New Color', hex: '#000000' }];
    setColors(newColors);
    onUpdate({ colors: newColors });
  };

  const updateColor = (index: number, field: string, value: string) => {
    const newColors = [...colors];
    newColors[index] = { ...newColors[index], [field]: value };
    setColors(newColors);
    onUpdate({ colors: newColors });
  };

  const removeColor = (index: number) => {
    const newColors = colors.filter((_, i) => i !== index);
    setColors(newColors);
    onUpdate({ colors: newColors });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '';
  };

  const generatePalette = async () => {
    setGeneratingPalette(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-color-palette', {
        body: { style: selectedStyle, mood: selectedStyle }
      });

      if (error) throw error;

      if (data?.colors) {
        setColors(data.colors);
        onUpdate({ colors: data.colors });
        toast({
          title: "Palette generated!",
          description: `Created ${data.colors.length} colors based on ${selectedStyle} style`,
        });
        setShowGenerateDialog(false);
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingPalette(false);
    }
  };

  return (
    <div className="group relative py-2">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {colors.map((color, index) => (
          <div 
            key={index} 
            className="space-y-3"
          >
            <div className="relative group">
              <div
                className="aspect-square rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
                style={{ backgroundColor: color.hex }}
                onClick={(e) => {
                  if (!isPreviewMode) {
                    e.stopPropagation();
                    const input = document.getElementById(`color-picker-${index}`) as HTMLInputElement;
                    input?.click();
                  }
                }}
              >
                <input
                  id={`color-picker-${index}`}
                  type="color"
                  value={color.hex}
                  onChange={(e) => updateColor(index, 'hex', e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              {!isPreviewMode && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeColor(index);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {editingIndex === index && !isPreviewMode ? (
                <div className="space-y-2">
                  <Input
                    value={color.name}
                    onChange={(e) => updateColor(index, 'name', e.target.value)}
                    onBlur={() => setEditingIndex(null)}
                    placeholder="Color name"
                    className="h-8 text-sm rounded-xl border-2"
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <p 
                    className="font-medium text-sm cursor-pointer hover:text-zinc-700 transition-colors"
                    onClick={() => !isPreviewMode && setEditingIndex(index)}
                  >
                    {color.name}
                  </p>
                  <code 
                    className="text-xs text-muted-foreground cursor-pointer hover:underline block"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(color.hex);
                    }}
                  >
                    {color.hex}
                  </code>
                  {color.usage && (
                    <p className="text-xs text-muted-foreground">{color.usage}</p>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        
        {!isPreviewMode && (
          <div 
            onClick={addColor}
            className="aspect-square rounded-2xl shadow-sm border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:shadow-md hover:border-zinc-400 transition-all group/add bg-muted/30"
          >
            <Plus className="w-8 h-8 text-muted-foreground group-hover/add:text-zinc-700 transition-colors" />
          </div>
        )}
      </div>

      {!isPreviewMode && (
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGenerateDialog(true)}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate Palette
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Block
          </Button>
        </div>
      )}

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Generate Color Palette</DialogTitle>
            <DialogDescription>
              AI will create a harmonious color palette based on your selected style
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="style">Brand Style</Label>
              <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern & Minimal</SelectItem>
                  <SelectItem value="bold">Bold & Vibrant</SelectItem>
                  <SelectItem value="elegant">Elegant & Luxury</SelectItem>
                  <SelectItem value="natural">Natural & Organic</SelectItem>
                  <SelectItem value="tech">Tech & Innovation</SelectItem>
                  <SelectItem value="warm">Warm & Friendly</SelectItem>
                  <SelectItem value="cool">Cool & Professional</SelectItem>
                  <SelectItem value="vintage">Vintage & Retro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>
          </ScrollArea>
          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGenerateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={generatePalette} disabled={generatingPalette}>
              {generatingPalette && <Sparkles className="w-4 h-4 mr-2 animate-pulse" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

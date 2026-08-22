import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Type,
  ChevronDown,
  Search,
} from 'lucide-react';
import { getPopularFonts, loadGoogleFont, FONT_CATEGORIES } from '@/lib/googleFonts';
import GradientEditor from './GradientEditor';
import { Gradient } from 'fabric';

interface TextPropertiesPanelProps {
  selectedObject: any;
  onUpdate: (properties: any) => void;
}

const TextPropertiesPanel = ({ selectedObject, onUpdate }: TextPropertiesPanelProps) => {
  const [fontFamily, setFontFamily] = useState(selectedObject?.fontFamily || 'Inter');
  const [fontSize, setFontSize] = useState(selectedObject?.fontSize || 24);
  const [fontWeight, setFontWeight] = useState(selectedObject?.fontWeight || '400');
  const [textAlign, setTextAlign] = useState(selectedObject?.textAlign || 'left');
  const [charSpacing, setCharSpacing] = useState(selectedObject?.charSpacing || 0);
  const [lineHeight, setLineHeight] = useState(selectedObject?.lineHeight || 1.2);
  const [fill, setFill] = useState(selectedObject?.fill || '#000000');
  const [colorMode, setColorMode] = useState<'solid' | 'gradient'>('solid');
  const [fontSearch, setFontSearch] = useState('');
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);

  const allFonts = getPopularFonts();
  
  // Filter fonts based on search
  const filteredFonts = useMemo(() => {
    if (!fontSearch.trim()) return allFonts;
    const lowerSearch = fontSearch.toLowerCase();
    return allFonts.filter(font => font.toLowerCase().includes(lowerSearch));
  }, [fontSearch, allFonts]);

  // Group fonts by category for display when not searching
  const groupedFonts = useMemo(() => {
    if (fontSearch.trim()) return null;
    return FONT_CATEGORIES;
  }, [fontSearch]);

  useEffect(() => {
    if (selectedObject) {
      setFontFamily(selectedObject.fontFamily || 'Inter');
      setFontSize(selectedObject.fontSize || 24);
      setFontWeight(selectedObject.fontWeight || '400');
      setTextAlign(selectedObject.textAlign || 'left');
      setCharSpacing(selectedObject.charSpacing || 0);
      setLineHeight(selectedObject.lineHeight || 1.2);
      setFill(selectedObject.fill || '#000000');
    }
  }, [selectedObject]);

  const handleFontFamilyChange = async (family: string) => {
    setFontFamily(family);
    setFontDropdownOpen(false);
    setFontSearch('');
    try {
      await loadGoogleFont(family);
      
      if (selectedObject && selectedObject.canvas) {
        (selectedObject as any)._isUpdatingFont = true;
      }
      
      onUpdate({ fontFamily: family });
      
      setTimeout(() => {
        if (selectedObject) {
          (selectedObject as any)._isUpdatingFont = false;
        }
      }, 100);
    } catch (error) {
      console.error('Failed to load font:', error);
    }
  };

  const handleFontSizeChange = (value: number[]) => {
    setFontSize(value[0]);
    onUpdate({ fontSize: value[0] });
  };

  const handleFontWeightChange = (weight: string) => {
    setFontWeight(weight);
    onUpdate({ fontWeight: weight });
  };

  const handleTextAlignChange = (align: string) => {
    setTextAlign(align);
    onUpdate({ textAlign: align });
  };

  const handleCharSpacingChange = (value: number[]) => {
    setCharSpacing(value[0]);
    onUpdate({ charSpacing: value[0] });
  };

  const handleLineHeightChange = (value: number[]) => {
    setLineHeight(value[0]);
    onUpdate({ lineHeight: value[0] });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFill(e.target.value);
    onUpdate({ fill: e.target.value });
  };

  const toggleBold = () => {
    const newWeight = fontWeight === '700' ? '400' : '700';
    handleFontWeightChange(newWeight);
  };

  const toggleItalic = () => {
    const newStyle = selectedObject.fontStyle === 'italic' ? 'normal' : 'italic';
    onUpdate({ fontStyle: newStyle });
  };

  const toggleUnderline = () => {
    const newUnderline = !selectedObject.underline;
    onUpdate({ underline: newUnderline });
  };

  // Get the icon for current alignment
  const getAlignIcon = () => {
    switch (textAlign) {
      case 'center': return <AlignCenter className="h-4 w-4" />;
      case 'right': return <AlignRight className="h-4 w-4" />;
      case 'justify': return <AlignJustify className="h-4 w-4" />;
      default: return <AlignLeft className="h-4 w-4" />;
    }
  };

  if (!selectedObject || selectedObject.type !== 'text' && selectedObject.type !== 'i-text' && selectedObject.type !== 'textbox') {
    return null;
  }

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="glass-header rounded-lg border border-border/30 px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Font Family with Search */}
          <Popover open={fontDropdownOpen} onOpenChange={setFontDropdownOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-[140px] h-8 justify-between px-2 text-xs bg-background/50"
                style={{ fontFamily }}
              >
                <span className="truncate">{fontFamily}</span>
                <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search fonts..."
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Spacebar') {
                        e.stopPropagation();
                      }
                    }}
                    className="h-8 pl-7 text-xs"
                  />
                </div>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="p-1">
                  {fontSearch.trim() ? (
                    // Flat list when searching
                    filteredFonts.length > 0 ? (
                      filteredFonts.map((font) => (
                        <button
                          key={font}
                          onClick={() => handleFontFamilyChange(font)}
                          className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors ${
                            fontFamily === font ? 'bg-accent' : ''
                          }`}
                          style={{ fontFamily: font }}
                        >
                          {font}
                        </button>
                      ))
                    ) : (
                      <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                        No fonts found
                      </p>
                    )
                  ) : (
                    // Grouped by category when not searching
                    groupedFonts && Object.entries(groupedFonts).map(([category, fonts]) => (
                      <div key={category} className="mb-2">
                        <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {category}
                        </p>
                        {fonts.map((font) => (
                          <button
                            key={font}
                            onClick={() => handleFontFamilyChange(font)}
                            className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors ${
                              fontFamily === font ? 'bg-accent' : ''
                            }`}
                            style={{ fontFamily: font }}
                          >
                            {font}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <div className="h-5 w-px bg-border/30" />

          {/* Font Size */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                {fontSize}px
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-4">
                <Label>Font Size: {fontSize}px</Label>
                <Slider
                  value={[fontSize]}
                  onValueChange={handleFontSizeChange}
                  min={8}
                  max={300}
                  step={1}
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* Font Weight Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
                {fontWeight === '300' ? 'Light' : 
                 fontWeight === '400' ? 'Regular' : 
                 fontWeight === '500' ? 'Medium' : 
                 fontWeight === '600' ? 'Semi' : 
                 fontWeight === '700' ? 'Bold' : 
                 fontWeight === '800' ? 'Extra' : 'Black'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-28">
              <DropdownMenuItem onClick={() => handleFontWeightChange('300')} className="text-xs">Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontWeightChange('400')} className="text-xs">Regular</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontWeightChange('500')} className="text-xs">Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontWeightChange('600')} className="text-xs">Semi Bold</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontWeightChange('700')} className="text-xs">Bold</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontWeightChange('800')} className="text-xs">Extra Bold</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontWeightChange('900')} className="text-xs">Black</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-border/30" />

          {/* Text Styling */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${fontWeight === '700' ? 'bg-accent' : ''}`}
            onClick={toggleBold}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${selectedObject.fontStyle === 'italic' ? 'bg-accent' : ''}`}
            onClick={toggleItalic}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${selectedObject.underline ? 'bg-accent' : ''}`}
            onClick={toggleUnderline}
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>

          <div className="h-5 w-px bg-border/30" />

          {/* Text Alignment Dropdown (Compact) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {getAlignIcon()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-36">
              <DropdownMenuItem 
                onClick={() => handleTextAlignChange('left')} 
                className={`text-xs gap-2 ${textAlign === 'left' ? 'bg-accent' : ''}`}
              >
                <AlignLeft className="h-4 w-4" /> Align Left
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleTextAlignChange('center')} 
                className={`text-xs gap-2 ${textAlign === 'center' ? 'bg-accent' : ''}`}
              >
                <AlignCenter className="h-4 w-4" /> Align Center
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleTextAlignChange('right')} 
                className={`text-xs gap-2 ${textAlign === 'right' ? 'bg-accent' : ''}`}
              >
                <AlignRight className="h-4 w-4" /> Align Right
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleTextAlignChange('justify')} 
                className={`text-xs gap-2 ${textAlign === 'justify' ? 'bg-accent' : ''}`}
              >
                <AlignJustify className="h-4 w-4" /> Justify
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-border/30" />

          {/* Character Spacing */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Type className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-4">
                <div>
                  <Label>Letter Spacing: {charSpacing}px</Label>
                  <Slider
                    value={[charSpacing]}
                    onValueChange={handleCharSpacingChange}
                    min={-50}
                    max={100}
                    step={1}
                  />
                </div>
                <div>
                  <Label>Line Height: {lineHeight.toFixed(1)}</Label>
                  <Slider
                    value={[lineHeight]}
                    onValueChange={handleLineHeightChange}
                    min={0.5}
                    max={3}
                    step={0.1}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default TextPropertiesPanel;

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Maximize2, ChevronDown, Trash2, LayoutGrid, Columns, Rows, AlignLeft, AlignCenter, AlignRight, Download, FileImage, History, FileType2, Settings2 } from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import type { AutoLayoutConfig, LayoutDirection, LayoutAlign } from '@/lib/canvas/autoLayout';
import { DEFAULT_AUTO_LAYOUT } from '@/lib/canvas/autoLayout';

interface ArtboardDimensionsPanelProps {
  width: number;
  height: number;
  onUpdate: (width: number, height: number) => void;
  onDelete?: () => void;
  onExport?: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onOpenHistory?: () => void;
  backgroundColor?: string;
  onBackgroundColorChange?: (color: string) => void;
  autoLayoutConfig?: AutoLayoutConfig | null;
  onAutoLayoutChange?: (config: AutoLayoutConfig | null) => void;
}

const ArtboardDimensionsPanel = ({ width, height, onUpdate, onDelete, onExport, onExportPNG, onExportSVG, onOpenHistory, backgroundColor, onBackgroundColorChange, autoLayoutConfig, onAutoLayoutChange }: ArtboardDimensionsPanelProps) => {
  const [localWidth, setLocalWidth] = useState(width.toString());
  const [localHeight, setLocalHeight] = useState(height.toString());
  const [isLocked, setIsLocked] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(width / height);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLayoutPopoverOpen, setIsLayoutPopoverOpen] = useState(false);

  const isAutoLayout = autoLayoutConfig?.enabled ?? false;

  const presetFormats = [
    { name: '1:1', width: 1024, height: 1024, icon: '□' },
    { name: '2:3', width: 1024, height: 1536, icon: '▭' },
    { name: '9:16', width: 1080, height: 1920, icon: '▯' },
    { name: '3:2', width: 1536, height: 1024, icon: '▬' },
    { name: '16:9', width: 1920, height: 1080, icon: '▬' },
    { name: 'A4', width: 1024, height: 1754, icon: '▯' },
    { name: 'Website', width: 1366, height: 768, icon: '▬' },
  ];

  useEffect(() => {
    setLocalWidth(Math.round(width).toString());
    setLocalHeight(Math.round(height).toString());
    setAspectRatio(width / height);
  }, [width, height]);

  const handleWidthChange = (value: string) => {
    setLocalWidth(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (isLocked) {
        const newHeight = Math.round(numValue / aspectRatio);
        setLocalHeight(newHeight.toString());
        onUpdate(numValue, newHeight);
      } else {
        onUpdate(numValue, parseInt(localHeight));
      }
    }
  };

  const handleHeightChange = (value: string) => {
    setLocalHeight(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (isLocked) {
        const newWidth = Math.round(numValue * aspectRatio);
        setLocalWidth(newWidth.toString());
        onUpdate(newWidth, numValue);
      } else {
        onUpdate(parseInt(localWidth), numValue);
      }
    }
  };

  const handlePresetSelect = (preset: { width: number; height: number }) => {
    setLocalWidth(preset.width.toString());
    setLocalHeight(preset.height.toString());
    onUpdate(preset.width, preset.height);
    setIsPopoverOpen(false);
  };

  const toggleAutoLayout = () => {
    if (!onAutoLayoutChange) return;
    if (isAutoLayout) {
      onAutoLayoutChange(null);
    } else {
      onAutoLayoutChange({ ...DEFAULT_AUTO_LAYOUT, enabled: true });
    }
  };

  const updateLayoutProp = <K extends keyof AutoLayoutConfig>(key: K, value: AutoLayoutConfig[K]) => {
    if (!onAutoLayoutChange || !autoLayoutConfig) return;
    onAutoLayoutChange({ ...autoLayoutConfig, [key]: value });
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="glass-header rounded-lg border border-border/30 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-medium h-7 px-2">
                <Maximize2 className="h-3.5 w-3.5" />
                Custom
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 bg-card/95 backdrop-blur-xl border-border/30" align="start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Format</p>
                {presetFormats.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetSelect(preset)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                  >
                    <span className="text-lg">{preset.icon}</span>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm font-medium">{preset.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {preset.width}×{preset.height}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <div className="h-5 w-px bg-border/30" />
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">W</span>
            <Input
              value={localWidth}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="w-16 h-7 text-center text-xs font-medium px-1"
              type="number"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${isLocked ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => setIsLocked(!isLocked)}
            title={isLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          >
            <Link2 className={`h-3.5 w-3.5 ${isLocked ? '' : 'opacity-50'}`} />
          </Button>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">H</span>
            <Input
              value={localHeight}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="w-16 h-7 text-center text-xs font-medium px-1"
              type="number"
            />
          </div>

          {onBackgroundColorChange && (
            <>
              <div className="h-5 w-px bg-border/30" />
              <div className="flex items-center gap-1.5">
                <label className="relative h-7 w-7 rounded-md border border-border/40 overflow-hidden cursor-pointer" title="Background color">
                  <span
                    className="absolute inset-0.5 rounded"
                    style={{ backgroundColor: backgroundColor || '#ffffff' }}
                  />
                  <input
                    type="color"
                    value={backgroundColor || '#ffffff'}
                    onChange={(e) => onBackgroundColorChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>
            </>
          )}

          {/* Auto Layout Toggle + Popover for settings */}
          {onAutoLayoutChange && (
            <>
              <div className="h-5 w-px bg-border/30" />
              <Popover open={isLayoutPopoverOpen} onOpenChange={setIsLayoutPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-1.5 text-xs font-medium h-7 px-2 ${isAutoLayout ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="Auto layout settings"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    {isAutoLayout ? 'Auto' : 'Free'}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3 bg-card/95 backdrop-blur-xl border-border/30" align="center">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Auto Layout</span>
                      <Button
                        variant={isAutoLayout ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={toggleAutoLayout}
                      >
                        {isAutoLayout ? 'On' : 'Off'}
                      </Button>
                    </div>

                    {isAutoLayout && autoLayoutConfig && (
                      <>
                        <div className="h-px bg-border/30" />
                        
                        {/* Direction */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">Direction</span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${autoLayoutConfig.direction === 'horizontal' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                              onClick={() => updateLayoutProp('direction', 'horizontal')}
                              title="Horizontal"
                            >
                              <Columns className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${autoLayoutConfig.direction === 'vertical' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                              onClick={() => updateLayoutProp('direction', 'vertical')}
                              title="Vertical"
                            >
                              <Rows className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${autoLayoutConfig.direction === 'wrap' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                              onClick={() => updateLayoutProp('direction', 'wrap')}
                              title="Wrap / Grid"
                            >
                              <LayoutGrid className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Alignment */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">Align</span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${autoLayoutConfig.align === 'start' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                              onClick={() => updateLayoutProp('align', 'start')}
                            >
                              <AlignLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${autoLayoutConfig.align === 'center' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                              onClick={() => updateLayoutProp('align', 'center')}
                            >
                              <AlignCenter className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${autoLayoutConfig.align === 'end' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                              onClick={() => updateLayoutProp('align', 'end')}
                            >
                              <AlignRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Gap & Padding */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-medium">Gap</span>
                            <Input
                              value={autoLayoutConfig.gap}
                              onChange={(e) => {
                                const v = parseInt(e.target.value);
                                if (!isNaN(v) && v >= 0) updateLayoutProp('gap', v);
                              }}
                              className="h-7 text-center text-xs font-medium px-1"
                              type="number"
                              min={0}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-medium">Padding</span>
                            <Input
                              value={autoLayoutConfig.padding}
                              onChange={(e) => {
                                const v = parseInt(e.target.value);
                                if (!isNaN(v) && v >= 0) updateLayoutProp('padding', v);
                              }}
                              className="h-7 text-center text-xs font-medium px-1"
                              type="number"
                              min={0}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}

          {(onExportPNG || onExportSVG || onExport) && (
            <>
              <div className="h-5 w-px bg-border/30" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="Export"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-44">
                  {onExportPNG && (
                    <DropdownMenuItem onClick={onExportPNG} className="text-xs gap-2">
                      <FileImage className="h-3.5 w-3.5" />
                      Download PNG
                    </DropdownMenuItem>
                  )}
                  {onExportSVG && (
                    <DropdownMenuItem onClick={onExportSVG} className="text-xs gap-2">
                      <FileType2 className="h-3.5 w-3.5" />
                      Download SVG
                    </DropdownMenuItem>
                  )}
                  {onExport && (
                    <DropdownMenuItem onClick={onExport} className="text-xs gap-2">
                      <Settings2 className="h-3.5 w-3.5" />
                      More export options…
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {onOpenHistory && (
            <>
              <div className="h-5 w-px bg-border/30" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={onOpenHistory}
                title="Version history"
              >
                <History className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {onDelete && (
            <>
              <div className="h-5 w-px bg-border/30" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete}
                title="Delete artboard (Delete/Backspace)"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtboardDimensionsPanel;

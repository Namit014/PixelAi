import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, Download, Sliders, Plus, Type, Sparkles, Layers } from "lucide-react";
import AddTextIconUrl from "@/assets/icons/add-text.svg";
import FontGeneratorIconUrl from "@/assets/icons/font-generator.svg";
import ComponentIconUrl from "@/assets/icons/component.svg";
import {
  SelectIcon, TextToolIcon, PenToolIcon, BrushToolIcon, ShapesToolIcon, HandToolIcon,
  CanvasAiChatIcon, AddFrameIcon, AddImageIcon, ImageGeneratorIcon, ImportFromLibraryIcon,
  ImportFromBrandIcon, ExportFromBrandIcon, AssetsCubeIcon, IconsGeneratorIcon,
  PatternGeneratorIcon, BackgroundGeneratorIcon, StickerGeneratorIcon, QRCodeIcon,
  TranslateIcon, AdaptDesignIcon, GenerateAssetsIcon, ShapeRectangleIcon, ShapeCircleIcon,
  ShapeTriangleIcon, ShapeStarIcon, ShapeHexagonIcon, ShapePentagonIcon, ShapeArrowIcon,
  VideoGeneratorIcon, EffectsFilterIcon,
} from "@/components/icons/CustomIcons";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { BrushStyleSelector, BrushStyle, BRUSH_PRESETS } from "./BrushStyleSelector";

interface CanvasToolPanelProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
  onAddArtboard?: () => void;
  onImageGenerator?: () => void;
  onVideoGenerator?: () => void;
  brushWidth?: number;
  onBrushWidthChange?: (width: number) => void;
  brushStyle?: BrushStyle;
  onBrushStyleChange?: (style: BrushStyle) => void;
  onOpenAssetPicker?: () => void;
  onOpenImportFromBrand?: () => void;
  onOpenExportToBrand?: () => void;
  onOpenDesignAdaptation?: () => void;
  onOpenTranslateText?: () => void;
  onOpenQRGenerator?: () => void;
  onOpenAssetGenerator?: (type?: string) => void;
  onImageUpload?: (file: File) => void;
  onOpenEffects?: () => void;
  isEffectsOpen?: boolean;
  isLiveSketchActive?: boolean;
  onToggleLiveSketch?: () => void;
  onOpenFontGenerator?: () => void;
  onOpenComponentsPanel?: () => void;
}

const CanvasToolPanel = ({
  activeTool, onToolSelect, onAddArtboard, onImageGenerator, onVideoGenerator,
  brushWidth = 4, onBrushWidthChange, brushStyle = BRUSH_PRESETS[0], onBrushStyleChange,
  onOpenAssetPicker, onOpenImportFromBrand, onOpenExportToBrand, onOpenDesignAdaptation,
  onOpenTranslateText, onOpenQRGenerator, onOpenAssetGenerator, onImageUpload,
  onOpenEffects, isEffectsOpen,
  isLiveSketchActive, onToggleLiveSketch,
  onOpenFontGenerator, onOpenComponentsPanel,
}: CanvasToolPanelProps) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const svgInputRef = useRef<HTMLInputElement>(null);

  // Click outside to close menu
  useEffect(() => {
    if (!activeMenu) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeMenu]);

  const toggleMenu = useCallback((menu: string) => {
    setActiveMenu(prev => prev === menu ? null : menu);
  }, []);

  const mainTools = [
    { id: "select", icon: SelectIcon, label: "Select", shortcut: "V" },
    { id: "text", icon: TextToolIcon, label: "Text", shortcut: "T" },
    { id: "pen", icon: PenToolIcon, label: "Pen", shortcut: "P" },
    { id: "pencil", icon: BrushToolIcon, label: "Brush", shortcut: "B" },
  ];

  const addTools = [
    { id: "artboard", icon: AddFrameIcon, label: "Add Frame", shortcut: "A" },
    { id: "image", icon: AddImageIcon, label: "Add Image", shortcut: "I" },
    { id: "import-svg", icon: AddImageIcon, label: "Import SVG", shortcut: "S" },
    { id: "image-generator", icon: ImageGeneratorIcon, label: "Image Generator", action: onImageGenerator, shortcut: "G" },
    { id: "video-generator", icon: VideoGeneratorIcon, label: "Video Generator", action: onVideoGenerator, shortcut: "V" },
  ];

  const shapesTools = [
    { id: "rectangle", icon: ShapeRectangleIcon, label: "Rectangle", shortcut: "R" },
    { id: "circle", icon: ShapeCircleIcon, label: "Circle", shortcut: "C" },
    { id: "star", icon: ShapeStarIcon, label: "Star", shortcut: "S" },
    { id: "triangle", icon: ShapeTriangleIcon, label: "Triangle", shortcut: "T" },
    { id: "hexagon", icon: ShapeHexagonIcon, label: "Hexagon", shortcut: "H" },
    { id: "polygon", icon: ShapePentagonIcon, label: "Pentagon", shortcut: "P" },
    { id: "arrow", icon: ShapeArrowIcon, label: "Arrow", shortcut: "A" },
  ];

  const assetsTools = [
    { id: "import-library", icon: ImportFromLibraryIcon, label: "Import from Library", action: onOpenAssetPicker },
    { id: "import-brand", icon: ImportFromBrandIcon, label: "Import from Brand", action: onOpenImportFromBrand },
    { id: "export-brand", icon: ExportFromBrandIcon, label: "Export to Brand", action: onOpenExportToBrand },
  ];

  const otherTools = [
    { id: "hand", icon: HandToolIcon, label: "Pan", shortcut: "H" },
    { id: "chat", icon: CanvasAiChatIcon, label: "AI Chat", shortcut: "C" },
  ];

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) onImageUpload(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  return (
    <div ref={panelRef} className="absolute left-3 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1 pointer-events-auto">
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageInputChange} />
      <input ref={svgInputRef} type="file" accept=".svg,image/svg+xml" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file && onImageUpload) onImageUpload(file);
        if (svgInputRef.current) svgInputRef.current.value = "";
      }} />

      <div className="p-1 glass rounded-lg backdrop-blur-md shadow-none">
        {/* Add Button */}
        <div className="relative pb-1 mb-1 border-b border-border/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleMenu('add')}
                className="justify-center h-8 w-8 p-0 hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Add</TooltipContent>
          </Tooltip>

          {activeMenu === 'add' && (
            <div className="absolute left-full ml-2 top-0 p-1 min-w-[160px] z-50 rounded-lg border border-border/30 bg-background animate-slide-in-left">
              <div className="flex flex-col gap-0.5">
                {addTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Button
                      key={tool.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (tool.id === "image") imageInputRef.current?.click();
                        else if (tool.id === "import-svg") svgInputRef.current?.click();
                        else if (tool.action) tool.action();
                        else onToolSelect(tool.id);
                        setActiveMenu(null);
                      }}
                      className="justify-between gap-2 h-8 px-2 text-xs w-full shadow-none bg-background hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tool.label}</span>
                      </div>
                      {tool.shortcut && (
                        <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">{tool.shortcut}</kbd>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Main Tools */}
        <div className="flex flex-col gap-0.5 pb-1 mb-1 border-b border-border/50">
          {mainTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            const isTextTool = tool.id === "text";
            return (
              <div key={tool.id} className="relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        if (isTextTool) {
                          toggleMenu('text');
                        } else {
                          onToolSelect(tool.id);
                        }
                      }}
                      className={`justify-center h-8 w-8 p-0 transition-colors ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {tool.label} {tool.shortcut && `(${tool.shortcut})`}
                  </TooltipContent>
                </Tooltip>

                {/* Text flyout */}
                {isTextTool && activeMenu === 'text' && (
                  <div className="absolute left-full ml-2 top-0 p-1 min-w-[180px] z-50 rounded-lg border border-border/30 bg-background animate-slide-in-left">
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { onToolSelect('text'); setActiveMenu(null); }}
                        className="justify-between gap-2 h-8 px-2 text-xs w-full hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <img src={AddTextIconUrl} alt="" className="w-3.5 h-3.5 [filter:var(--icon-filter,none)]" />
                          <span>Add Text</span>
                        </div>
                        <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">T</kbd>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { onOpenFontGenerator?.(); setActiveMenu(null); }}
                        className="justify-between gap-2 h-8 px-2 text-xs w-full hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <img src={FontGeneratorIconUrl} alt="" className="w-3.5 h-3.5" />
                          <span>Font Generator (AI)</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Brush settings flyout */}
                {tool.id === "pencil" && isActive && (
                  <div className="absolute left-full ml-2 top-0 p-3 min-w-[200px] z-50 glass-header backdrop-blur-xl rounded-lg border border-border/30 bg-background/95">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-medium mb-2 block">Brush Width: {brushWidth}px</Label>
                        <Slider value={[brushWidth]} onValueChange={([val]) => onBrushWidthChange?.(val)} min={1} max={50} step={1} className="w-full" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-2 block">Brush Style</Label>
                        <BrushStyleSelector selectedStyle={brushStyle} onStyleSelect={(style) => onBrushStyleChange?.(style)} />
                      </div>
                      <div className="pt-2 border-t border-border/30">
                        <button
                          onClick={() => onToggleLiveSketch?.()}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            isLiveSketchActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                          }`}
                        >
                          <span>Live Sketch → Image</span>
                          <div className={`w-2 h-2 rounded-full ${isLiveSketchActive ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/30'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Shapes Tool */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMenu('shapes')}
                  className="justify-center h-8 w-8 p-0 hover:bg-muted transition-colors"
                >
                  <ShapesToolIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Shapes</TooltipContent>
            </Tooltip>

            {activeMenu === 'shapes' && (
              <div className="absolute left-full ml-2 top-0 p-1 min-w-[160px] z-50 rounded-lg border border-border/30 bg-background animate-slide-in-left">
                <div className="flex flex-col gap-0.5">
                  {shapesTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <Button
                        key={tool.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => { onToolSelect(tool.id); setActiveMenu(null); }}
                        className="justify-between gap-2 h-8 px-2 text-xs w-full hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tool.label}</span>
                        </div>
                        {tool.shortcut && (
                          <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">{tool.shortcut}</kbd>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Assets Tool */}
        <div className="flex flex-col gap-0.5 pb-1 mb-1 border-b border-border/50">
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMenu('assets')}
                  className="justify-center h-8 w-8 p-0 hover:bg-muted transition-colors"
                >
                  <AssetsCubeIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Assets</TooltipContent>
            </Tooltip>

            {activeMenu === 'assets' && (
              <div className="absolute left-full ml-2 top-0 p-1 min-w-[200px] z-50 rounded-lg border border-border/30 bg-background animate-slide-in-left">
                <div className="flex flex-col gap-0.5">
                  {assetsTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <Button
                        key={tool.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => { if (tool.action) tool.action(); setActiveMenu(null); }}
                        className="justify-between gap-2 h-8 px-2 text-xs w-full hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tool.label}</span>
                        </div>
                      </Button>
                    );
                  })}
                  {onOpenComponentsPanel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { onOpenComponentsPanel(); setActiveMenu(null); }}
                      className="justify-between gap-2 h-8 px-2 text-xs w-full hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <img src={ComponentIconUrl} alt="" className="w-3.5 h-3.5" />
                        <span>Components</span>
                      </div>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generate Assets Menu */}
        <div className="flex flex-col gap-0.5 pb-1 mb-1 border-b border-border/50">
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMenu('generate')}
                  className="justify-center h-8 w-8 p-0 hover:bg-muted transition-colors"
                >
                  <GenerateAssetsIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Generate</TooltipContent>
            </Tooltip>

            {activeMenu === 'generate' && (
              <div className="absolute left-full ml-2 top-0 p-1 min-w-[180px] z-50 rounded-lg border border-border/30 bg-background animate-slide-in-left">
                <div className="flex flex-col gap-0.5">
                  {[
                    { icon: QRCodeIcon, label: "QR Code", action: () => onOpenQRGenerator?.() },
                    { icon: StickerGeneratorIcon, label: "Stickers", action: () => onOpenAssetGenerator?.("sticker") },
                    { icon: BackgroundGeneratorIcon, label: "Backgrounds", action: () => onOpenAssetGenerator?.("background") },
                    { icon: PatternGeneratorIcon, label: "Patterns", action: () => onOpenAssetGenerator?.("pattern") },
                    { icon: IconsGeneratorIcon, label: "Icons", action: () => onOpenAssetGenerator?.("icon") },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.label}
                        variant="ghost"
                        size="sm"
                        onClick={() => { item.action(); setActiveMenu(null); }}
                        className="justify-between gap-2 h-8 px-2 text-xs w-full hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{item.label}</span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Adapt Design */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => onOpenDesignAdaptation?.()} className="justify-center h-8 w-8 p-0 hover:bg-muted transition-colors">
                <AdaptDesignIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Adapt Design</TooltipContent>
          </Tooltip>

          {/* Translate Text */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => onOpenTranslateText?.()} className="justify-center h-8 w-8 p-0 hover:bg-muted transition-colors">
                <TranslateIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Translate</TooltipContent>
          </Tooltip>

          {/* Effects Filter */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenEffects?.()}
                className={`justify-center h-8 w-8 p-0 transition-colors ${isEffectsOpen ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <EffectsFilterIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Effects</TooltipContent>
          </Tooltip>
        </div>

        {/* Other Tools */}
        <div className="flex flex-col gap-0.5">
          {otherTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onToolSelect(tool.id)}
                    className={`justify-center h-8 w-8 p-0 transition-colors ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {tool.label} {tool.shortcut && `(${tool.shortcut})`}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CanvasToolPanel;

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Sparkles, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { AppliedFilter, FilterCategory } from '@/lib/filters/types';
import { getAllFilters } from '@/lib/filters/FilterRegistry';
import { getPresets } from '@/lib/filters/PresetRegistry';
import { FilterEngine } from '@/lib/filters/FilterEngine';
import EffectThumbnail from './EffectThumbnail';
import { FilterStackPanel } from './FilterStackPanel';

interface EffectsPanelProps {
  selectedObject: any;
  fabricCanvas: any;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<FilterCategory | 'presets', string> = {
  basic: 'Basic Effects',
  color: 'Color',
  distortion: 'Distortion',
  stylize: 'Stylize',
  presets: 'Presets'
};

export function EffectsPanel({ selectedObject, fabricCanvas, onClose }: EffectsPanelProps) {
  const [filterStack, setFilterStack] = useState<AppliedFilter[]>([]);
  const [sourceThumb, setSourceThumb] = useState<ImageBitmap | null>(null);
  const engineRef = useRef<FilterEngine | null>(null);
  const rafRef = useRef<number>(0);
  const dirtyRef = useRef(false);
  const stackRef = useRef<AppliedFilter[]>([]);

  const allFilters = getAllFilters();
  const presets = getPresets();

  // Extract source bitmap from selected object
  useEffect(() => {
    if (!selectedObject) {
      setSourceThumb(null);
      return;
    }

    // Load existing filter stack from object
    const existingStack = selectedObject.__filterStack as AppliedFilter[] | undefined;
    if (existingStack) {
      setFilterStack(existingStack);
      stackRef.current = existingStack;
    } else {
      setFilterStack([]);
      stackRef.current = [];
    }

    const extractBitmap = async () => {
      try {
        // Always use toDataURL path to avoid cross-origin tainted bitmap issues
        const tempCanvas = document.createElement('canvas');
        const w = Math.round((selectedObject.width || 128) * (selectedObject.scaleX || 1));
        const h = Math.round((selectedObject.height || 128) * (selectedObject.scaleY || 1));
        tempCanvas.width = Math.max(w, 64);
        tempCanvas.height = Math.max(h, 64);
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        const dataUrl = selectedObject.toDataURL({ format: 'png', multiplier: 1 });
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);resolve();};
          img.onerror = () => resolve();
          img.src = dataUrl;
        });

        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
          const bmp = await createImageBitmap(tempCanvas);
          setSourceThumb(bmp);

          // Init engine
          const engine = new FilterEngine();
          if (engine.init(bmp.width, bmp.height)) {
            engine.setSourceImage(bmp);
            engineRef.current?.dispose();
            engineRef.current = engine;
          }
        }
      } catch (e) {
        console.error('Failed to extract source bitmap:', e);
      }
    };

    extractBitmap();

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [selectedObject]);

  // Apply filter stack to object via rAF-gated rendering
  const applyFilters = useCallback(async () => {
    if (!engineRef.current || !selectedObject || !fabricCanvas) return;

    const result = await engineRef.current.render(stackRef.current, performance.now() / 1000);
    if (!result) return;

    // Apply to Fabric object
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = result.width;
    tempCanvas.height = result.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) {result.close();return;}
    ctx.drawImage(result, 0, 0);
    result.close();

    try {
      const blob = await new Promise<Blob | null>((resolve) => tempCanvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        if (selectedObject.type === 'image') {
          selectedObject.setElement(img);
        } else {
          const fabric = (window as any).fabric;
          if (fabric?.Pattern) {
            selectedObject.set({
              fill: new fabric.Pattern({ source: tempCanvas, repeat: 'no-repeat' }),
              dirty: true
            });
          }
        }
        fabricCanvas.requestRenderAll();
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (e) {
      console.error('Failed to apply filters to object:', e);
    }
  }, [selectedObject, fabricCanvas]);

  const scheduleRender = useCallback(() => {
    if (dirtyRef.current) return;
    dirtyRef.current = true;
    rafRef.current = requestAnimationFrame(() => {
      dirtyRef.current = false;
      applyFilters();
    });
  }, [applyFilters]);

  const addFilter = useCallback((filterId: string, params?: Record<string, any>) => {
    const instanceId = `${filterId}_${Date.now()}`;
    const filterDef = allFilters.find((f) => f.id === filterId);
    const defaultParams: Record<string, any> = {};
    if (filterDef) {
      for (const [key, param] of Object.entries(filterDef.params)) {
        defaultParams[key] = params?.[key] ?? param.value;
      }
    }

    const applied: AppliedFilter = { instanceId, filterId, params: defaultParams };
    setFilterStack((prev) => {
      const next = [...prev, applied];
      stackRef.current = next;
      selectedObject?.set('__filterStack', next);
      return next;
    });
    scheduleRender();
  }, [allFilters, scheduleRender, selectedObject]);

  const updateParam = useCallback((instanceId: string, paramKey: string, value: any) => {
    setFilterStack((prev) => {
      const next = prev.map((f) =>
      f.instanceId === instanceId ? { ...f, params: { ...f.params, [paramKey]: value } } : f
      );
      stackRef.current = next;
      selectedObject?.set('__filterStack', next);
      return next;
    });
    scheduleRender();
  }, [scheduleRender, selectedObject]);

  const removeFilter = useCallback((instanceId: string) => {
    setFilterStack((prev) => {
      const next = prev.filter((f) => f.instanceId !== instanceId);
      stackRef.current = next;
      selectedObject?.set('__filterStack', next);
      return next;
    });
    scheduleRender();
  }, [scheduleRender, selectedObject]);

  const applyPreset = useCallback((presetFilterStack: {filterId: string;params: Record<string, any>;}[]) => {
    for (const item of presetFilterStack) {
      addFilter(item.filterId, item.params);
    }
  }, [addFilter]);

  // Group filters by category
  const categories = new Map<FilterCategory, typeof allFilters>();
  for (const f of allFilters) {
    if (!categories.has(f.category)) categories.set(f.category, []);
    categories.get(f.category)!.push(f);
  }

  return (
    <div className="absolute left-[60px] top-1/2 -translate-y-1/2 w-72 max-h-[80vh] bg-background border border-border rounded-xl z-50 flex flex-col shadow-xl pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Effects</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <ScrollArea className="flex-1 h-0">
        <div className="p-2 space-y-1">
          {/* Applied filter stack */}
          {filterStack.length > 0 &&
          <FilterStackPanel
            stack={filterStack}
            onUpdateParam={updateParam}
            onRemoveFilter={removeFilter} />

          }

          {/* Filter categories */}
          {Array.from(categories.entries()).map(([category, filters]) =>
          <Collapsible key={category} defaultOpen={category === 'basic'}>
              
              <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md border border-border/40 bg-muted/30 hover:bg-muted/50 group">
                <span>{CATEGORY_LABELS[category]}</span>
                <ChevronRight className="w-3 h-3 transition-transform group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-3 gap-1 px-1 pb-2 py-[7px]">
                  {filters.map((filter) =>
                <EffectThumbnail
                  key={filter.id}
                  filter={filter}
                  sourceImage={sourceThumb}
                  size={64}
                  onClick={() => addFilter(filter.id)}
                  isActive={filterStack.some((f) => f.filterId === filter.id)} />

                )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Presets */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md border border-border/40 bg-muted/30 hover:bg-muted/50 group">
              <span>Presets</span>
              <ChevronRight className="w-3 h-3 transition-transform group-data-[state=open]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-2 gap-1 py-[6px] px-0 pb-px">
                {presets.map((preset) =>
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.filterStack)}
                  className="px-2 py-1.5 text-xs rounded-md border border-border/50 hover:bg-accent/50 text-foreground transition-colors text-left">

                    {preset.name}
                  </button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>);

}
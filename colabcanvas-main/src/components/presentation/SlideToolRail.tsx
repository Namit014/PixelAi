import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Plus, Layers, LayoutGrid, Palette, Type,
  Image, BarChart3, Shapes, Settings,
  Sparkles, Search, FolderOpen, LayoutTemplate, Layers2, Database,
} from 'lucide-react';
import type { SlideToolId } from '@/types/presentation';
import { cn } from '@/lib/utils';
import { LayoutPickerPanel } from './LayoutPickerPanel';
import { ThemePickerPanel } from './ThemePickerPanel';
import { BlockPickerPanel } from './BlockPickerPanel';
import { CosmoAssetLibrary } from './CosmoAssetLibrary';
import { TemplateGallery } from './TemplateGallery';
import { CosmoLayerPanel } from './CosmoLayerPanel';
import { ComponentsPanel } from './ComponentsPanel';
import { CollectionManager } from './CollectionManager';
import { usePresentationStore } from '@/stores/presentationStore';

const tools: { id: SlideToolId; icon: React.ElementType; label: string; filterCategories?: string[] }[] = [
  { id: 'slides', icon: Layers, label: 'Slides' },
  { id: 'layers' as SlideToolId, icon: Layers2, label: 'Layers' },
  { id: 'layouts', icon: LayoutGrid, label: 'Layouts' },
  { id: 'themes', icon: Palette, label: 'Themes' },
  { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
  { id: 'components', icon: Type, label: 'Text', filterCategories: ['Text', 'Lists', 'Callout Boxes', 'Other'] },
  { id: 'media', icon: Image, label: 'Media', filterCategories: ['Images', 'Videos & Media', 'Embed Apps & Web'] },
  { id: 'charts', icon: BarChart3, label: 'Charts', filterCategories: ['Charts & Graphs', 'Metrics'] },
  { id: 'ai', icon: Shapes, label: 'Shapes', filterCategories: ['Shapes & Lines', 'Smart Layouts › Columns', 'Smart Layouts › Boxes', 'Smart Layouts › Stats', 'Smart Layouts › Steps', 'Smart Layouts › Diagrams', 'Smart Layouts › Quotes'] },
  { id: 'assets', icon: FolderOpen, label: 'Assets' },
  { id: 'blocks' as SlideToolId, icon: Search, label: 'Components' },
  { id: 'pen' as SlideToolId, icon: Database, label: 'Collections' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

interface Props {
  onToolSelect?: (tool: SlideToolId) => void;
  onOpenDiagram?: () => void;
}

export function SlideToolRail({ onToolSelect, onOpenDiagram }: Props) {
  const [activeTool, setActiveTool] = useState<SlideToolId | null>(null);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [blockPickerFilter, setBlockPickerFilter] = useState<string[] | undefined>(undefined);
  const setActiveAITab = usePresentationStore((s) => s.setActiveAITab);
  const setStoreActiveTool = usePresentationStore((s) => s.setActiveTool);

  const handleClick = (id: SlideToolId) => {
    const tool = tools.find(t => t.id === id);

    if (id === 'assets') {
      const next = activeTool === id ? null : id;
      setActiveTool(next);
      setShowAssetLibrary(!!next);
      setShowBlockPicker(false);
      return;
    }

    if (id === 'settings') {
      setActiveAITab('properties');
      setActiveTool(null);
      setShowBlockPicker(false);
      setShowAssetLibrary(false);
      return;
    }

    if (id === 'themes') {
      const next = activeTool === id ? null : id;
      setActiveTool(next);
      setShowBlockPicker(false);
      setShowAssetLibrary(false);
      if (next) setActiveAITab('theme');
      return;
    }

    if (id === 'layouts') {
      const next = activeTool === id ? null : id;
      setActiveTool(next);
      setShowBlockPicker(false);
      return;
    }

    if (id === 'slides') {
      setActiveTool(null);
      setShowBlockPicker(false);
      return;
    }

    if (id === 'layers' as SlideToolId || id === 'templates' as SlideToolId || id === 'blocks' as SlideToolId || id === 'pen' as SlideToolId) {
      const next = activeTool === id ? null : id;
      setActiveTool(next);
      setShowBlockPicker(false);
      setShowAssetLibrary(false);
      return;
    }

    if (tool?.filterCategories) {
      if (activeTool === id) {
        setActiveTool(null);
        setShowBlockPicker(false);
        setBlockPickerFilter(undefined);
      } else {
        setActiveTool(id);
        setBlockPickerFilter(tool.filterCategories);
        setShowBlockPicker(true);
      }
      return;
    }

    const next = activeTool === id ? null : id;
    setActiveTool(next);
    setShowBlockPicker(false);
    setBlockPickerFilter(undefined);
    onToolSelect?.(next as SlideToolId);
  };

  const handlePlusClick = () => {
    setShowBlockPicker(!showBlockPicker);
    setActiveTool(null);
    setBlockPickerFilter(undefined);
  };

  return (
    <>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1 pointer-events-auto">
        <div className="p-1 glass rounded-lg backdrop-blur-md">
          <div className="pb-1 mb-1 border-b border-border/50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showBlockPicker && !blockPickerFilter ? 'default' : 'ghost'}
                  size="sm"
                  onClick={handlePlusClick}
                  className={cn(
                    'justify-center h-8 w-8 p-0 transition-colors',
                    showBlockPicker && !blockPickerFilter
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Insert Block</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex flex-col gap-0.5">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleClick(tool.id)}
                      className={cn(
                        'justify-center h-8 w-8 p-0 transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{tool.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>

      {showBlockPicker && (
        <BlockPickerPanel
          onClose={() => { setShowBlockPicker(false); setActiveTool(null); setBlockPickerFilter(undefined); }}
          filterCategories={blockPickerFilter}
          onOpenDiagram={onOpenDiagram}
        />
      )}
      {showAssetLibrary && (
        <CosmoAssetLibrary onClose={() => { setShowAssetLibrary(false); setActiveTool(null); }} />
      )}
      {activeTool === 'layouts' && <LayoutPickerPanel onClose={() => setActiveTool(null)} />}
      {activeTool === 'themes' && <ThemePickerPanel onClose={() => setActiveTool(null)} />}
      {activeTool === ('layers' as SlideToolId) && <CosmoLayerPanel onClose={() => setActiveTool(null)} />}
      {activeTool === ('templates' as SlideToolId) && <TemplateGallery onClose={() => setActiveTool(null)} />}
      {activeTool === ('blocks' as SlideToolId) && <ComponentsPanel onClose={() => setActiveTool(null)} />}
      {activeTool === ('pen' as SlideToolId) && <CollectionManager onClose={() => setActiveTool(null)} />}
    </>
  );
}
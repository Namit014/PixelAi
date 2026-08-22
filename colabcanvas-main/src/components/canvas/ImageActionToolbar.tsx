import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { FabricImage } from 'fabric';
import { MoreHorizontal } from 'lucide-react';
import { DownloadToolbarIcon } from '@/components/icons/CustomIcons';
import { CustomiseToolbarIcon } from '@/components/icons/CustomIcons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TOOLBAR_TOOLS, getToolbarConfig } from './toolbarRegistry';
import CustomizeToolbarDialog from './CustomizeToolbarDialog';

interface ImageActionToolbarProps {
  position: { x: number; y: number };
  onToolAction: (toolId: string) => void;
  onDownload?: () => void;
}

const ImageActionToolbar = ({
  position,
  onToolAction,
  onDownload,
}: ImageActionToolbarProps) => {
  const [showCustomize, setShowCustomize] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);

  const config = useMemo(() => getToolbarConfig(), [configVersion]);

  const pinnedTools = useMemo(() => {
    return config.pinned
      .map(id => TOOLBAR_TOOLS.find(t => t.id === id))
      .filter(Boolean) as typeof TOOLBAR_TOOLS;
  }, [config.pinned]);

  const overflowTools = useMemo(() => {
    return TOOLBAR_TOOLS.filter(t => !config.pinned.includes(t.id));
  }, [config.pinned]);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="absolute z-[999] flex items-center p-1 bg-white/95 backdrop-blur-xl rounded-lg border border-zinc-200 animate-fly-in-down-centered px-[4px] gap-[2px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translateX(-50%)',
        }}
      >
        {pinnedTools.map((tool, i) => {
          const Icon = tool.icon;
          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onToolAction(tool.id)}
                  className="gap-1 h-8 text-sm font-medium hover:bg-zinc-100 px-[6px]"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.showNames && (
                    <span className="text-[11px]">{tool.label}</span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{tool.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {overflowTools.length > 0 && (
          <>
            <div className="w-px h-5 bg-zinc-200" />
            <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 px-1.5 hover:bg-zinc-100">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="end"
                className="w-40 p-1"
              >
                {overflowTools.map(tool => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setOverflowOpen(false);
                        onToolAction(tool.id);
                      }}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-zinc-700 hover:bg-zinc-100 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 text-zinc-500" />
                      {tool.label}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </>
        )}

        <div className="w-px h-5 bg-zinc-200" />

        {/* Download */}
        {onDownload && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 px-1.5 hover:bg-zinc-100" onClick={onDownload}>
                <DownloadToolbarIcon className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Download</p></TooltipContent>
          </Tooltip>
        )}

        {/* Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-1.5 hover:bg-zinc-100"
              onClick={() => setShowCustomize(true)}
            >
              <CustomiseToolbarIcon className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Customize toolbar</p></TooltipContent>
        </Tooltip>
      </div>

      <CustomizeToolbarDialog
        open={showCustomize}
        onOpenChange={(open) => {
          setShowCustomize(open);
          if (!open) setConfigVersion(v => v + 1);
        }}
      />
    </TooltipProvider>
  );
};

// Helper function to check if object is an image and should show toolbar
export const shouldShowImageToolbar = (selectedObject: any): boolean => {
  if (!selectedObject) return false;

  const objType = selectedObject.type;
  if (objType === 'activeselection' || objType === 'ActiveSelection') return false;

  const objectType = objType?.toLowerCase();
  const hasSrc = typeof selectedObject.getSrc === 'function';
  const hasElement = !!selectedObject._element;
  const hasOriginalElement = !!selectedObject._originalElement;
  const isFabricImageInstance = selectedObject instanceof FabricImage;

  const isImage =
    objectType === 'image' ||
    isFabricImageInstance ||
    hasSrc ||
    hasElement ||
    hasOriginalElement;

  const isPlaceholder = selectedObject.isPlaceholder === true;

  return isImage && !isPlaceholder;
};

// Helper to calculate position
export const getImageToolbarPosition = (selectedObject: any, canvas: any): { x: number; y: number } | null => {
  if (!canvas || !selectedObject) return null;

  const bounds = selectedObject.getBoundingRect();
  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
  const zoom = vpt[0];

  const x = (bounds.left + bounds.width / 2) * zoom + vpt[4];
  const y = bounds.top * zoom + vpt[5] - 48;

  if (x < -100 || x > window.innerWidth + 100 || y < -100 || y > window.innerHeight + 100) {
    return null;
  }

  return { x, y };
};

export default ImageActionToolbar;

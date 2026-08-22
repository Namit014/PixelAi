import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutGrid,
  Group,
  Merge,
  MoreHorizontal,
  Download,
  ChevronDown,
  AlignCenterHorizontal,
  AlignStartHorizontal,
  AlignEndHorizontal,
  AlignCenterVertical,
  AlignStartVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  LayoutDashboard,
  Combine,
  SquaresSubtract,
  SquaresIntersect,
  SquaresExclude,
} from 'lucide-react';

interface MultiSelectToolbarProps {
  position: { x: number; y: number };
  selectedCount: number;
  onAutoLayout: () => void;
  onGroup: () => void;
  onMerge: () => void;
  onAlignLeft: () => void;
  onAlignCenterH: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignCenterV: () => void;
  onAlignBottom: () => void;
  onDistributeH: () => void;
  onDistributeV: () => void;
  onDownload: () => void;
  onBooleanUnion?: () => void;
  onBooleanSubtract?: () => void;
  onBooleanIntersect?: () => void;
  onBooleanExclude?: () => void;
}

export function MultiSelectToolbar({
  position,
  selectedCount,
  onAutoLayout,
  onGroup,
  onMerge,
  onAlignLeft,
  onAlignCenterH,
  onAlignRight,
  onAlignTop,
  onAlignCenterV,
  onAlignBottom,
  onDistributeH,
  onDistributeV,
  onDownload,
  onBooleanUnion,
  onBooleanSubtract,
  onBooleanIntersect,
  onBooleanExclude,
}: MultiSelectToolbarProps) {
  if (selectedCount < 2) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="fixed z-50 flex items-center gap-0.5 bg-white rounded-xl px-1.5 py-1 border border-zinc-100 animate-push-in"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translateX(-50%)',
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* Auto Layout */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs font-medium gap-1.5 text-zinc-700 hover:bg-zinc-100"
              onClick={onAutoLayout}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Auto Layout
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Automatically arrange selected objects</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-zinc-200" />

        {/* Group */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs font-medium gap-1.5 text-zinc-700 hover:bg-zinc-100"
              onClick={onGroup}
            >
              <Group className="w-3.5 h-3.5" />
              Group
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Group selected objects (⌘G)</p>
          </TooltipContent>
        </Tooltip>

        {/* Merge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs font-medium gap-1.5 text-zinc-700 hover:bg-zinc-100"
              onClick={onMerge}
            >
              <Merge className="w-3.5 h-3.5" />
              Merge
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Flatten selection into single image</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-zinc-200" />

        {/* Boolean Operations Dropdown */}
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium gap-1 text-zinc-700 hover:bg-zinc-100"
                >
                  <Combine className="w-3.5 h-3.5" />
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-44">
                <DropdownMenuItem onClick={onBooleanUnion} className="text-xs gap-2">
                  <Combine className="w-3.5 h-3.5" />
                  Union
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onBooleanSubtract} className="text-xs gap-2">
                  <SquaresSubtract className="w-3.5 h-3.5" />
                  Subtract
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onBooleanIntersect} className="text-xs gap-2">
                  <SquaresIntersect className="w-3.5 h-3.5" />
                  Intersect
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onBooleanExclude} className="text-xs gap-2">
                  <SquaresExclude className="w-3.5 h-3.5" />
                  Exclude
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Boolean operations</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-zinc-200" />

        {/* Alignment Dropdown */}
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium gap-1 text-zinc-700 hover:bg-zinc-100"
                >
                  <AlignCenterHorizontal className="w-3.5 h-3.5" />
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-44">
                <DropdownMenuItem onClick={onAlignLeft} className="text-xs gap-2">
                  <AlignStartVertical className="w-3.5 h-3.5" />
                  Align Left
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAlignCenterH} className="text-xs gap-2">
                  <AlignCenterVertical className="w-3.5 h-3.5" />
                  Align Center
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAlignRight} className="text-xs gap-2">
                  <AlignEndVertical className="w-3.5 h-3.5" />
                  Align Right
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onAlignTop} className="text-xs gap-2">
                  <AlignStartHorizontal className="w-3.5 h-3.5" />
                  Align Top
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAlignCenterV} className="text-xs gap-2">
                  <AlignCenterHorizontal className="w-3.5 h-3.5" />
                  Align Middle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAlignBottom} className="text-xs gap-2">
                  <AlignEndHorizontal className="w-3.5 h-3.5" />
                  Align Bottom
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Align objects</p>
          </TooltipContent>
        </Tooltip>

        {/* Spacing Dropdown */}
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium gap-1 text-zinc-700 hover:bg-zinc-100"
                >
                  <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                <DropdownMenuItem onClick={onDistributeH} className="text-xs gap-2">
                  <AlignVerticalDistributeCenter className="w-3.5 h-3.5" />
                  Distribute Horizontally
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDistributeV} className="text-xs gap-2">
                  <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
                  Distribute Vertically
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onAutoLayout} className="text-xs gap-2">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Auto Arrange
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Distribute objects evenly</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-zinc-200" />

        {/* More Options */}
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-100"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onDownload} className="text-xs gap-2">
                  <Download className="w-3.5 h-3.5" />
                  Download
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>More options</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

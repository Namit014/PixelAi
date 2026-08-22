import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit3, Copy, Trash2 } from 'lucide-react';
import { usePresentationStore } from '@/stores/presentationStore';
import { cn } from '@/lib/utils';

interface Props {
  blockId: string;
  slideId: string;
  className?: string;
  blockY?: number;
}

export function BlockToolbar({ blockId, slideId, className, blockY }: Props) {
  const setEditingBlock = usePresentationStore((s) => s.setEditingBlock);
  const removeBlock = usePresentationStore((s) => s.removeBlock);
  const duplicateBlock = usePresentationStore((s) => s.duplicateBlock);

  const isNearTop = (blockY ?? 200) < 120;

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-xl border border-border bg-background shadow-lg px-3 py-2",
        isNearTop ? "top-full mt-2" : "-top-20",
        className
      )}
      style={{ pointerEvents: 'auto' }}
      onClick={(e) => e.stopPropagation()}>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-14 w-14 p-0 rounded-2xl" onClick={() => setEditingBlock(blockId)}>
            <Edit3 className="w-15 h-15 mx-0 px-0 py-0 w-[40px] h-[40px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">Edit</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-14 w-14 p-0" onClick={() => duplicateBlock(slideId, blockId)}>
            <Copy className="w-[40px] h-[40px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">Duplicate</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-14 w-14 p-0 text-destructive hover:text-destructive" onClick={() => removeBlock(slideId, blockId)}>
            <Trash2 className="w-[40px] h-[40px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">Delete</TooltipContent>
      </Tooltip>
    </div>);

}
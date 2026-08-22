import React from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Group, Ungroup, AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd, AlignHorizontalSpaceBetween, AlignVerticalSpaceBetween,
  Trash2, Copy
} from 'lucide-react';

export function SlideMultiSelectToolbar({ slideId }: { slideId: string }) {
  const selectedBlockIds = usePresentationStore(s => s.selectedBlockIds);
  const groupBlocks = usePresentationStore(s => s.groupBlocks);
  const ungroupBlocks = usePresentationStore(s => s.ungroupBlocks);
  const alignBlocks = usePresentationStore(s => s.alignBlocks);
  const distributeBlocks = usePresentationStore(s => s.distributeBlocks);
  const removeBlock = usePresentationStore(s => s.removeBlock);
  const duplicateBlock = usePresentationStore(s => s.duplicateBlock);
  const clearBlockSelection = usePresentationStore(s => s.clearBlockSelection);

  if (selectedBlockIds.length < 2) return null;

  const alignItems: { icon: React.ElementType; alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'; label: string }[] = [
    { icon: AlignHorizontalJustifyStart, alignment: 'left', label: 'Align Left' },
    { icon: AlignHorizontalJustifyCenter, alignment: 'center-h', label: 'Align Center' },
    { icon: AlignHorizontalJustifyEnd, alignment: 'right', label: 'Align Right' },
    { icon: AlignVerticalJustifyStart, alignment: 'top', label: 'Align Top' },
    { icon: AlignVerticalJustifyCenter, alignment: 'center-v', label: 'Align Middle' },
    { icon: AlignVerticalJustifyEnd, alignment: 'bottom', label: 'Align Bottom' },
  ];

  return (
    <div
      className="absolute z-[999] flex items-center gap-1 rounded-lg border bg-popover p-1 shadow-lg"
      style={{ top: -52, left: '50%', transform: 'translateX(-50%)' }}
    >
      <span className="px-2 text-xs text-muted-foreground font-medium">
        {selectedBlockIds.length} selected
      </span>

      {/* Group */}
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Group"
        onClick={() => { groupBlocks(slideId, selectedBlockIds); clearBlockSelection(); }}>
        <Group className="h-4 w-4" />
      </Button>

      {/* Align */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Align">
            <AlignHorizontalJustifyCenter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" sideOffset={8}>
          <div className="grid grid-cols-3 gap-1">
            {alignItems.map(({ icon: Icon, alignment, label }) => (
              <Button key={alignment} variant="ghost" size="icon" className="h-8 w-8" title={label}
                onClick={() => alignBlocks(slideId, selectedBlockIds, alignment)}>
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Distribute */}
      {selectedBlockIds.length >= 3 && (
        <>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Distribute Horizontally"
            onClick={() => distributeBlocks(slideId, selectedBlockIds, 'horizontal')}>
            <AlignHorizontalSpaceBetween className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Distribute Vertically"
            onClick={() => distributeBlocks(slideId, selectedBlockIds, 'vertical')}>
            <AlignVerticalSpaceBetween className="h-4 w-4" />
          </Button>
        </>
      )}

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Delete all */}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete selected"
        onClick={() => { selectedBlockIds.forEach(id => removeBlock(slideId, id)); clearBlockSelection(); }}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

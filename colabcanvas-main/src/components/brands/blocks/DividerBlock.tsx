import { DividerBlock as DividerBlockType } from '@/types/brandBlocks';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface DividerBlockProps {
  block: DividerBlockType;
  onDelete: () => void;
  isPreviewMode?: boolean;
}

export const DividerBlock = ({ onDelete, isPreviewMode = false }: DividerBlockProps) => {
  return (
    <div className="group relative py-4">
      <Separator className="bg-border" />
      {!isPreviewMode && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

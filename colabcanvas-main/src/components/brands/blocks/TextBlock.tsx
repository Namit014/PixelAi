import { EditableTextBlock } from './EditableTextBlock';
import { TextBlock as TextBlockType } from '@/types/brandBlocks';
import { BlockType } from '@/types/brandBlocks';

interface TextBlockProps {
  block: TextBlockType;
  onUpdate: (content: TextBlockType['content']) => void;
  onDelete: () => void;
  onSlashCommand?: (type: BlockType) => void;
  isPreviewMode?: boolean;
}

export const TextBlock = ({ block, onUpdate, onDelete, onSlashCommand, isPreviewMode = false }: TextBlockProps) => {
  return (
    <EditableTextBlock
      block={block}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onSlashCommand={onSlashCommand}
      isPreviewMode={isPreviewMode}
    />
  );
};

import { useState } from 'react';
import { HeadingBlock as HeadingBlockType } from '@/types/brandBlocks';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HeadingBlockProps {
  block: HeadingBlockType;
  onUpdate: (content: HeadingBlockType['content']) => void;
  onDelete: () => void;
  isPreviewMode?: boolean;
}

export const HeadingBlock = ({ block, onUpdate, onDelete, isPreviewMode = false }: HeadingBlockProps) => {
  const [text, setText] = useState(block.content?.text || '');
  const [level] = useState(block.content?.level || 2);
  const [fontSize] = useState(block.content?.fontSize || 'default');

  const handleSave = () => {
    onUpdate({ text, level, fontSize });
  };

  const getFontSizeClass = () => {
    const sizeMap: Record<string, string> = {
      'small': 'text-sm',
      'default': level === 1 ? 'text-4xl' : level === 2 ? 'text-3xl' : level === 3 ? 'text-2xl' : level === 4 ? 'text-xl' : level === 5 ? 'text-lg' : 'text-base',
      'large': level === 1 ? 'text-5xl' : level === 2 ? 'text-4xl' : level === 3 ? 'text-3xl' : level === 4 ? 'text-2xl' : level === 5 ? 'text-xl' : 'text-lg',
    };
    return sizeMap[fontSize] || sizeMap['default'];
  };

  const Tag = (`h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6');

  return (
    <div className="group relative py-2">
      <Tag
        contentEditable={!isPreviewMode}
        suppressContentEditableWarning
        onBlur={(e) => {
          setText(e.currentTarget.textContent || '');
          handleSave();
        }}
        className={`font-semibold ${getFontSizeClass()} outline-none ${!isPreviewMode ? 'cursor-text' : ''}`}
      >
        {text || (isPreviewMode ? '' : 'Click to add heading')}
      </Tag>

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

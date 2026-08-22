import { useState } from 'react';
import { QuoteBlock as QuoteBlockType } from '@/types/brandBlocks';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface QuoteBlockProps {
  block: QuoteBlockType;
  onUpdate: (content: QuoteBlockType['content']) => void;
  onDelete: () => void;
  isPreviewMode?: boolean;
}

export const QuoteBlock = ({ block, onUpdate, onDelete, isPreviewMode = false }: QuoteBlockProps) => {
  const [text, setText] = useState(block.content.text);
  const [author, setAuthor] = useState(block.content.author || '');

  const handleUpdate = () => {
    onUpdate({ text, author: author || undefined });
  };

  return (
    <div className="group relative py-2">
      <blockquote className="border-l-4 border-border pl-6 py-2 space-y-2">
        <p 
          contentEditable={!isPreviewMode}
          suppressContentEditableWarning
          onBlur={(e) => {
            setText(e.currentTarget.textContent || '');
            handleUpdate();
          }}
          className="text-lg italic outline-none"
        >
          {text || 'Enter quote...'}
        </p>
        {(author || !isPreviewMode) && (
          <cite 
            contentEditable={!isPreviewMode}
            suppressContentEditableWarning
            onBlur={(e) => {
              setAuthor(e.currentTarget.textContent || '');
              handleUpdate();
            }}
            className="text-sm not-italic text-muted-foreground outline-none block"
          >
            {author || 'Author'}
          </cite>
        )}
      </blockquote>
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

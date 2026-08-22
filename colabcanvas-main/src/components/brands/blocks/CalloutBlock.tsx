import { useState } from 'react';
import { CalloutBlock as CalloutBlockType } from '@/types/brandBlocks';
import { Trash2, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CalloutBlockProps {
  block: CalloutBlockType;
  onUpdate: (content: CalloutBlockType['content']) => void;
  onDelete: () => void;
  isPreviewMode?: boolean;
}

export const CalloutBlock = ({ block, onUpdate, onDelete, isPreviewMode = false }: CalloutBlockProps) => {
  const [text, setText] = useState(block.content.text);

  const icons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
  };

  const colors = {
    info: 'border-zinc-500 bg-zinc-50 dark:bg-zinc-950',
    warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
    success: 'border-green-500 bg-green-50 dark:bg-green-950',
  };

  const Icon = icons[block.content.type];

  return (
    <div className="group relative py-2">
      <div className={`border-l-4 rounded-r p-4 ${colors[block.content.type]}`}>
        <div className="flex gap-3">
          <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p 
            contentEditable={!isPreviewMode}
            suppressContentEditableWarning
            onBlur={(e) => {
              setText(e.currentTarget.textContent || '');
              onUpdate({ ...block.content, text: e.currentTarget.textContent || '' });
            }}
            className="flex-1 outline-none"
          >
            {text || 'Enter callout text...'}
          </p>
        </div>
      </div>
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

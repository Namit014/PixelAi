import { useState } from 'react';
import { ButtonBlock as ButtonBlockType } from '@/types/brandBlocks';
import { Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ButtonBlockProps {
  block: ButtonBlockType;
  onUpdate: (content: ButtonBlockType['content']) => void;
  onDelete: () => void;
  isPreviewMode?: boolean;
}

export const ButtonBlock = ({ block, onUpdate, onDelete, isPreviewMode = false }: ButtonBlockProps) => {
  const [text, setText] = useState(block.content.text || 'Button');
  const [url, setUrl] = useState(block.content.url || '');
  const [variant, setVariant] = useState<'primary' | 'secondary' | 'outline'>(block.content.variant || 'primary');
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>(block.content.size || 'md');

  const handleTextChange = (newText: string) => {
    setText(newText);
    onUpdate({ text: newText, url, variant, size });
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    onUpdate({ text, url: newUrl, variant, size });
  };

  const handleVariantChange = (newVariant: 'primary' | 'secondary' | 'outline') => {
    setVariant(newVariant);
    onUpdate({ text, url, variant: newVariant, size });
  };

  const handleSizeChange = (newSize: 'sm' | 'md' | 'lg') => {
    setSize(newSize);
    onUpdate({ text, url, variant, size: newSize });
  };

  const variantMap = {
    primary: 'default',
    secondary: 'secondary',
    outline: 'outline'
  } as const;

  const sizeMap = {
    sm: 'sm',
    md: 'default',
    lg: 'lg'
  } as const;

  return (
    <div className="group relative py-2">
      {!isPreviewMode && (
        <button
          onClick={onDelete}
          className="absolute -right-2 top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 z-10"
        >
          <Trash2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
      )}

      {!isPreviewMode ? (
        <div className="space-y-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">
              Button Text
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Button text"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">
              URL (optional)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">
                Variant
              </label>
              <select
                value={variant}
                onChange={(e) => handleVariantChange(e.target.value as any)}
                className="w-full px-3 py-2 bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">
                Size
              </label>
              <select
                value={size}
                onChange={(e) => handleSizeChange(e.target.value as any)}
                className="w-full px-3 py-2 bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-2">
              Preview
            </label>
            <Button
              variant={variantMap[variant]}
              size={sizeMap[size]}
              onClick={() => url && window.open(url, '_blank')}
              className="pointer-events-auto"
            >
              {text}
              {url && <ExternalLink className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant={variantMap[variant]}
          size={sizeMap[size]}
          onClick={() => url && window.open(url, '_blank')}
        >
          {text}
          {url && <ExternalLink className="w-4 h-4 ml-2" />}
        </Button>
      )}
    </div>
  );
};

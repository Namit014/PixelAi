import { useState } from 'react';
import { NumberedListBlock as NumberedListBlockType } from '@/types/brandBlocks';
import { Trash2, Plus } from 'lucide-react';

interface NumberedListBlockProps {
  block: NumberedListBlockType;
  onUpdate: (content: NumberedListBlockType['content']) => void;
  onDelete: () => void;
  isPreviewMode?: boolean;
}

export const NumberedListBlock = ({ block, onUpdate, onDelete, isPreviewMode = false }: NumberedListBlockProps) => {
  const [items, setItems] = useState(block.content.items || []);
  const startNumber = block.content.start_number || 1;

  const handleTextChange = (itemId: string, text: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, text } : item
    );
    setItems(updatedItems);
    onUpdate({ items: updatedItems, start_number: startNumber });
  };

  const handleIndent = (itemId: string, direction: 'in' | 'out') => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const newIndent = direction === 'in' 
          ? Math.min(item.indent + 1, 3)
          : Math.max(item.indent - 1, 0);
        return { ...item, indent: newIndent };
      }
      return item;
    });
    setItems(updatedItems);
    onUpdate({ items: updatedItems, start_number: startNumber });
  };

  const handleAddItem = () => {
    const newItem = {
      id: crypto.randomUUID(),
      text: '',
      indent: 0
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    onUpdate({ items: updatedItems, start_number: startNumber });
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    setItems(updatedItems);
    onUpdate({ items: updatedItems, start_number: startNumber });
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleIndent(itemId, e.shiftKey ? 'out' : 'in');
    } else if (e.key === 'Backspace' && items[index].text === '') {
      e.preventDefault();
      handleDeleteItem(itemId);
    }
  };

  const getNumberLabel = (index: number, indent: number) => {
    if (indent === 0) return `${startNumber + index}.`;
    if (indent === 1) return String.fromCharCode(97 + (index % 26)) + '.';
    if (indent === 2) return `${(index % 10) + 1}.`;
    return '•';
  };

  let counters = [0, 0, 0, 0];

  return (
    <div className="group relative py-2">
      {!isPreviewMode && (
        <button
          onClick={onDelete}
          className="absolute -right-2 top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          <Trash2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
      )}

      <div className="space-y-1">
        {items.map((item, index) => {
          counters[item.indent]++;
          for (let i = item.indent + 1; i < counters.length; i++) {
            counters[i] = 0;
          }
          
          return (
            <div 
              key={item.id} 
              className="flex items-start gap-2 group/item"
              style={{ paddingLeft: `${item.indent * 24}px` }}
            >
              <span className="text-zinc-600 dark:text-zinc-400 select-none min-w-[24px] mt-0.5">
                {getNumberLabel(counters[item.indent] - 1, item.indent)}
              </span>
              <input
                type="text"
                value={item.text}
                onChange={(e) => handleTextChange(item.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, item.id, index)}
                disabled={isPreviewMode}
                placeholder="List item"
                className="flex-1 bg-transparent border-none outline-none text-sm text-foreground"
              />
              {!isPreviewMode && (
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Trash2 className="w-3 h-3 text-zinc-400" />
                </button>
              )}
            </div>
          );
        })}
        
        {!isPreviewMode && (
          <button
            onClick={handleAddItem}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            <Plus className="w-4 h-4" />
            Add item
          </button>
        )}
      </div>
    </div>
  );
};

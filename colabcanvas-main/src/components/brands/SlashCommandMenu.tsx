import { useState, useEffect, useRef } from 'react';
import { BlockType } from '@/types/brandBlocks';
import { Type, Heading1, Heading2, Heading3, Image, Video, Music, FileText, Quote, Info, Minus, Images, CheckSquare, List, ListOrdered, Code, Table, MousePointer, Globe } from 'lucide-react';

interface SlashCommandMenuProps {
  onSelect: (blockType: BlockType) => void;
  onClose: () => void;
  position: { top: number; left: number };
  search: string;
}

const blockCommands = [
  { type: 'text' as BlockType, label: 'Text', icon: Type, description: 'Plain text block' },
  { type: 'heading' as BlockType, label: 'Heading 1', icon: Heading1, description: 'Large heading' },
  { type: 'heading' as BlockType, label: 'Heading 2', icon: Heading2, description: 'Medium heading' },
  { type: 'heading' as BlockType, label: 'Heading 3', icon: Heading3, description: 'Small heading' },
  { type: 'todo_list' as BlockType, label: 'To-Do List', icon: CheckSquare, description: 'Task list with checkboxes' },
  { type: 'bullet_list' as BlockType, label: 'Bullet List', icon: List, description: 'Unordered list' },
  { type: 'numbered_list' as BlockType, label: 'Numbered List', icon: ListOrdered, description: 'Ordered list' },
  { type: 'code' as BlockType, label: 'Code', icon: Code, description: 'Code with syntax highlighting' },
  { type: 'table' as BlockType, label: 'Table', icon: Table, description: 'Data table' },
  { type: 'button' as BlockType, label: 'Button', icon: MousePointer, description: 'Clickable button' },
  { type: 'image' as BlockType, label: 'Image', icon: Image, description: 'Upload an image' },
  { type: 'gallery' as BlockType, label: 'Gallery', icon: Images, description: 'Image gallery' },
  { type: 'video' as BlockType, label: 'Video', icon: Video, description: 'Embed video' },
  { type: 'audio' as BlockType, label: 'Audio', icon: Music, description: 'Upload audio' },
  { type: 'file' as BlockType, label: 'File', icon: FileText, description: 'Attach file' },
  { type: 'embed' as BlockType, label: 'Embed', icon: Globe, description: 'Embed external content' },
  { type: 'divider' as BlockType, label: 'Divider', icon: Minus, description: 'Visual separator' },
  { type: 'quote' as BlockType, label: 'Quote', icon: Quote, description: 'Quote block' },
  { type: 'callout' as BlockType, label: 'Callout', icon: Info, description: 'Highlighted text' },
];

export const SlashCommandMenu = ({ onSelect, onClose, position, search }: SlashCommandMenuProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = blockCommands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].type);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredCommands, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredCommands.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-80 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      <div className="max-h-80 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
          BASIC BLOCKS
        </div>
        {filteredCommands.map((cmd, index) => {
          const Icon = cmd.icon;
          return (
            <button
              key={`${cmd.type}-${cmd.label}`}
              onClick={() => onSelect(cmd.type)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-left
                transition-colors
                ${index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'}
              `}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Icon className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm font-medium">{cmd.label}</div>
                <div className="text-xs text-muted-foreground">{cmd.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
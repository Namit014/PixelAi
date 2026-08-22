import { useState, useRef, useEffect } from 'react';
import { TextBlock as TextBlockType } from '@/types/brandBlocks';
import { Trash2, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SlashCommandMenu } from '../SlashCommandMenu';
import { InlineEmojiPicker } from './InlineEmojiPicker';
import { BlockType } from '@/types/brandBlocks';

interface EditableTextBlockProps {
  block: TextBlockType;
  onUpdate: (content: TextBlockType['content']) => void;
  onDelete: () => void;
  onSlashCommand?: (type: BlockType) => void;
  isPreviewMode?: boolean;
}

export const EditableTextBlock = ({ block, onUpdate, onDelete, onSlashCommand, isPreviewMode = false }: EditableTextBlockProps) => {
  const [text, setText] = useState(block.content?.text || '');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
  const [slashSearch, setSlashSearch] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 });
  const [showEmojiButton, setShowEmojiButton] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    const content = editableRef.current?.textContent || '';
    setText(content);
    onUpdate({ text: content });
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || '';

    // Detect slash command
    if (content.endsWith('/')) {
      const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect();
      if (rect) {
        setSlashPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX
        });
        setSlashSearch('');
        setShowSlashMenu(true);
      }
    } else if (showSlashMenu) {
      const lastSlashIndex = content.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        const searchTerm = content.substring(lastSlashIndex + 1);
        setSlashSearch(searchTerm);
      }
    }

    // Detect emoji shortcut
    if (content.endsWith(':') && !showEmojiPicker) {
      const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect();
      if (rect) {
        setEmojiPickerPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX
        });
        setShowEmojiPicker(true);
      }
    }
  };

  const handleSlashSelect = (type: BlockType) => {
    if (editableRef.current) {
      // Remove slash command text
      const content = text;
      const lastSlashIndex = content.lastIndexOf('/');
      const newText = content.substring(0, lastSlashIndex);
      setText(newText);
      editableRef.current.textContent = newText;
      onUpdate({ text: newText });
    }
    setShowSlashMenu(false);
    onSlashCommand?.(type);
  };

  const handleEmojiSelect = (value: string, type: 'emoji' | 'icon' | 'image') => {
    if (editableRef.current) {
      const currentText = editableRef.current.textContent || '';
      const lastColonIndex = currentText.lastIndexOf(':');
      
      let insertValue = value;
      if (type === 'icon') {
        insertValue = `[icon:${value}]`;
      } else if (type === 'image') {
        insertValue = `![](${value})`;
      }
      
      const newText = currentText.slice(0, lastColonIndex) + insertValue + ' ';
      editableRef.current.textContent = newText;
      setText(newText);
      onUpdate({ text: newText });
      setShowEmojiPicker(false);
      editableRef.current.focus();
    }
  };

  const handleEmojiButtonClick = () => {
    if (editableRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setEmojiPickerPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX
        });
        setShowEmojiPicker(true);
      }
    }
  };

  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setShowEmojiButton(true);
    } else {
      setShowEmojiButton(false);
    }
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  return (
    <div className="group relative py-2">
      {!isPreviewMode && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          {showEmojiButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEmojiButtonClick}
              className="absolute top-0 -left-10"
            >
              <Smile className="w-4 h-4" />
            </Button>
          )}
        </>
      )}

      <div
        ref={editableRef}
        contentEditable={!isPreviewMode}
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleSave}
        className="text-base outline-none whitespace-pre-wrap cursor-text"
      >
        {text || (isPreviewMode ? '' : 'Type / for commands or : for emoji')}
      </div>

      {showSlashMenu && onSlashCommand && (
        <SlashCommandMenu
          onSelect={handleSlashSelect}
          onClose={() => setShowSlashMenu(false)}
          position={slashPosition}
          search={slashSearch}
        />
      )}

      {showEmojiPicker && (
        <InlineEmojiPicker
          onEmojiSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
          position={emojiPickerPosition}
        />
      )}
    </div>
  );
};
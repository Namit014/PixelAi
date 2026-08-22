import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Button } from '@/components/ui/button';
import { Smile } from 'lucide-react';

interface SectionEmojiPickerProps {
  currentEmoji?: string;
  onSelect: (emoji: string) => void;
}

export const SectionEmojiPicker = ({ currentEmoji, onSelect }: SectionEmojiPickerProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect(emojiData.emoji);
    setShowPicker(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPicker(!showPicker)}
        className="h-8 w-8 p-0"
      >
        {currentEmoji ? (
          <span className="text-lg">{currentEmoji}</span>
        ) : (
          <Smile className="w-4 h-4 text-muted-foreground" />
        )}
      </Button>

      {showPicker && (
        <div className="absolute z-50 top-10 left-0">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            width={320}
            height={400}
            searchDisabled={false}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}
    </div>
  );
};
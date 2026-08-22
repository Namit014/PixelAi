import { useState } from 'react';
import { Check, MapPin, Trash2 } from 'lucide-react';
import type { PinTag } from '@/types/pinTag';

interface ObjectMarkedPopoverProps {
  tag: PinTag;
  onSelectSuggestion: (label: string) => void;
  onCustomLabel: (label: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export const ObjectMarkedPopover = ({ 
  tag, 
  onSelectSuggestion, 
  onCustomLabel, 
  onRemove,
  onClose 
}: ObjectMarkedPopoverProps) => {
  const [customInput, setCustomInput] = useState('');

  const handleSubmitCustom = () => {
    if (customInput.trim()) {
      onCustomLabel(customInput.trim());
      setCustomInput('');
    }
  };

  return (
    <div className="w-56 bg-white rounded-2xl overflow-hidden animate-push-in">
      {/* Simple header */}
      <div className="px-4 pt-4 pb-2">
        <h4 className="text-sm font-medium text-zinc-900">Object Marked</h4>
      </div>
      
      {/* Suggestions with thumbnails */}
      {tag.aiSuggestions.length > 0 && (
        <div className="px-2 pb-2 space-y-1">
          {tag.aiSuggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSelectSuggestion(suggestion)}
              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-zinc-50 transition-colors"
            >
              <img 
                src={tag.thumbnailUrl} 
                alt={suggestion}
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
              />
              <span className="text-sm text-zinc-800 flex-1 text-left">{suggestion}</span>
              {tag.label === suggestion && (
                <Check className="w-5 h-5 text-zinc-700 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
      
      {/* Custom input */}
      <div className="flex items-center gap-3 px-4 py-3">
        <MapPin className="w-5 h-5 text-zinc-400 flex-shrink-0" />
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmitCustom();
            }
          }}
          placeholder="Enter your own"
          className="flex-1 text-sm text-zinc-600 placeholder:text-zinc-400 bg-transparent outline-none"
        />
      </div>
      
      {/* Delete pin button */}
      <div className="px-4 pb-3">
        <button
          onClick={onRemove}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-zinc-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete pin</span>
        </button>
      </div>
    </div>
  );
};

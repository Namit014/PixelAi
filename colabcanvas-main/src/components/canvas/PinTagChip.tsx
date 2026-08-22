import { ChevronDown, Loader2 } from 'lucide-react';
import type { PinTag } from '@/types/pinTag';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface PinTagChipProps {
  tag: PinTag;
  isActive: boolean;
  onClick: () => void;
  fullImageUrl?: string;
}

export const PinTagChip = ({ tag, isActive, onClick, fullImageUrl }: PinTagChipProps) => {
  const chipContent = (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs transition-all ${
        isActive 
          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
          : 'bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'
      }`}
    >
      {/* Thumbnail */}
      <img 
        src={tag.thumbnailUrl} 
        alt="" 
        className="w-5 h-5 rounded-sm object-cover border border-zinc-200"
      />
      {/* Number badge */}
      <span className="flex items-center justify-center w-4 h-4 bg-blue-500 text-white text-[10px] font-bold rounded-full">
        {tag.number}
      </span>
      {/* Label */}
      <span className="text-zinc-700 max-w-[80px] truncate">
        {tag.isIdentifying ? (
          <span className="flex items-center gap-1 text-zinc-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>...</span>
          </span>
        ) : (
          tag.label
        )}
      </span>
      {/* Dropdown chevron */}
      <ChevronDown className="w-3 h-3 text-zinc-400" />
    </button>
  );

  // If no full image URL, just render the chip without hover preview
  if (!fullImageUrl) {
    return chipContent;
  }

  // Generate unique animation name for this pin's coordinates
  const animationName = `zoomToPin-${tag.number}`;
  const keyframes = `
    @keyframes ${animationName} {
      0% { 
        background-size: 100%; 
        background-position: center center; 
      }
      100% { 
        background-size: 200%; 
        background-position: ${tag.x * 100}% ${tag.y * 100}%; 
      }
    }
  `;

  // Render with hover preview
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {chipContent}
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        sideOffset={8} 
        className="w-40 h-40 p-0 overflow-hidden rounded-lg shadow-xl border-0"
      >
        <style>{keyframes}</style>
        <div 
          className="w-full h-full relative"
          style={{
            backgroundImage: `url(${fullImageUrl})`,
            backgroundRepeat: 'no-repeat',
            animation: `${animationName} 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
          }}
        >
          {/* Center crosshair indicator */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-4 h-4 border-2 border-white rounded-full shadow-md bg-blue-500/30" />
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

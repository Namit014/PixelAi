import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  transcript: string;
  isLive: boolean;
}

export const AINotetakerPanel = ({ transcript, isLive }: Props) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-1 py-2"
      >
        <div className="text-sm font-medium text-zinc-900">Ai Notetaker</div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>
      {open && (
        <div
          className={cn(
            'mt-1 rounded-2xl bg-zinc-100 px-4 py-6 min-h-[160px] flex items-center justify-center text-center'
          )}
        >
          <div className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
            {transcript || (isLive ? 'Listening…' : 'Captions will appear here once\nthe call begins')}
          </div>
        </div>
      )}
    </div>
  );
};

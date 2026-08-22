import { useState } from 'react';
import {
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  FolderOpen,
  Globe,
  Lightbulb,
  Loader2,
  MessageSquare,
  Mic,
  Paperclip,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type LandingMode = 'research' | 'creative-intelligence';
export type LandingSendMode = 'chat' | 'execute';

interface LandingPromptBoxProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  busy?: boolean;
  actionLabel?: string;
  showModeToggle?: boolean;
  mode?: LandingMode;
  onModeChange?: (m: LandingMode) => void;
  showSendModeDropdown?: boolean;
  showMicButton?: boolean;
}

export const LandingPromptBox = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask me anything…',
  busy = false,
  showModeToggle = true,
  mode = 'creative-intelligence',
  onModeChange,
  showSendModeDropdown = true,
  showMicButton = true,
}: LandingPromptBoxProps) => {
  const [focused, setFocused] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [sendMode, setSendMode] = useState<LandingSendMode>('chat');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const canSend = value.trim().length > 0 && !busy;

  return (
    <div
      className={cn(
        'max-w-[614px] mx-auto w-full rounded-3xl border border-zinc-200 bg-white p-3 transition-colors',
        focused && 'border-zinc-400',
      )}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={busy}
        rows={1}
        className="w-full bg-transparent border-0 outline-none resize-none text-base leading-normal text-zinc-900 placeholder:text-zinc-400 mb-3 px-2 min-h-[40px] max-h-[160px]"
      />

      <div className="flex items-center gap-1.5">
        <Popover open={plusMenuOpen} onOpenChange={setPlusMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={busy}
              className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors text-zinc-500 disabled:opacity-50 shrink-0"
              aria-label="Attach"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1.5" align="start" side="top">
            <div className="flex flex-col gap-0.5">
              <button type="button" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-50 transition-colors text-left text-xs">
                <Paperclip className="h-3.5 w-3.5 text-zinc-400" />Upload files
              </button>
              <button type="button" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-50 transition-colors text-left text-xs">
                <FolderOpen className="h-3.5 w-3.5 text-zinc-400" />Import from library
              </button>
              <button type="button" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-50 transition-colors text-left text-xs">
                <FileText className="h-3.5 w-3.5 text-zinc-400" />Add context
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {showModeToggle && (
          <TooltipProvider delayDuration={0}>
            <div className="flex items-center h-9 rounded-full bg-white border border-zinc-200 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn('flex items-center justify-center w-9 h-full rounded-full transition-all', mode === 'research' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-700')}
                    onClick={() => onModeChange?.('research')}
                  >
                    <Globe className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">Research</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onModeChange?.('creative-intelligence')}
                    className={cn('flex items-center justify-center w-9 h-full rounded-full transition-all', mode === 'creative-intelligence' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-700')}
                  >
                    <Lightbulb className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">Creative Intelligence</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}

        {showSendModeDropdown && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-1 h-9 px-3 rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors">
                {sendMode === 'chat' ? 'Chat' : 'Execute'}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-48">
              <DropdownMenuItem onClick={() => setSendMode('chat')} className="gap-2">
                <MessageSquare className="h-3.5 w-3.5" /><span className="text-xs">Chat & Plan</span>
                {sendMode === 'chat' && <Check className="h-3.5 w-3.5 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSendMode('execute')} className="gap-2">
                <Rocket className="h-3.5 w-3.5" /><span className="text-xs">Execute Autonomously</span>
                {sendMode === 'execute' && <Check className="h-3.5 w-3.5 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex-1" />

        {showMicButton && (
          <button type="button" disabled={busy} className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors text-zinc-400 disabled:opacity-50" aria-label="Voice input">
            <Mic className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSend}
          className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          aria-label="Send"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            sendMode === 'execute' ? <Rocket className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default LandingPromptBox;

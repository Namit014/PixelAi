import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChatHistoryIcon, ResetChatIcon, AssetsIcon, MinimiseIcon, RumiBlackIcon } from '@/components/icons/CustomIcons';

interface ChatHeaderProps {
  onMinimize: () => void;
  onHistoryClick: () => void;
  onResetClick: () => void;
  onAssetsClick: () => void;
}

const ChatHeader = ({
  onMinimize,
  onHistoryClick,
  onResetClick,
  onAssetsClick
}: ChatHeaderProps) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center">
            <RumiBlackIcon className="w-full h-full" />
          </div>
          <div>
            <h3 className="font-semibold text-base">
              <span className="font-instrument-serif">RUMI</span>
              {' '}
              <span className="text-zinc-500 font-normal text-sm">(AI Designer)</span>
            </h3>
          </div>
        </div>
        
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onHistoryClick}>
                  <ChatHistoryIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>Chat History</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setShowResetConfirm(true)}>
                  <ResetChatIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>Reset Chat</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onAssetsClick}>
                  <AssetsIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>Assets</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onMinimize}>
                  <MinimiseIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>Minimize</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will start a new conversation. Your current chat history will still be available in Chat History.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowResetConfirm(false); onResetClick(); }}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ChatHeader;

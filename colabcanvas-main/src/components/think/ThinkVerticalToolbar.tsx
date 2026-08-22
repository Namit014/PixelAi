import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import MagicCursorIcon from "@/assets/icons/Magic_Cursor.svg?react";
import LandingPageIcon from "@/assets/icons/Landing_Page.svg?react";
import ConnectorIcon from "@/assets/icons/Connector.svg?react";
import ImageStudioIcon from "@/assets/icons/Image_Studio.svg?react";
import VideoStudioIcon from "@/assets/icons/Video_Studio.svg?react";
import DocumentIcon from "@/assets/icons/Document.svg?react";

interface ThinkVerticalToolbarProps {
  activeItem: string;
  onItemChange: (item: string) => void;
}

const toolbarItems = [
  { id: "magic-cursor", icon: MagicCursorIcon, label: "Magic Cursor" },
  { id: "landing-page", icon: LandingPageIcon, label: "Landing Page" },
  { id: "connectors", icon: ConnectorIcon, label: "Connectors" },
  { id: "image-studio", icon: ImageStudioIcon, label: "Image Studio" },
  { id: "video-studio", icon: VideoStudioIcon, label: "Video Studio" },
  { id: "document", icon: DocumentIcon, label: "Document" },
];

export function ThinkVerticalToolbar({ activeItem, onItemChange }: ThinkVerticalToolbarProps) {
  return (
    <div className="fixed left-5 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg p-1 flex flex-col gap-0.5 z-40 border border-zinc-200">
      <TooltipProvider delayDuration={0}>
        {toolbarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onItemChange(item.id)}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}

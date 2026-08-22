import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Type, 
  LayoutGrid, 
  Palette, 
  Image, 
  Sparkles, 
  Upload,
  Frame
} from "lucide-react";
import { cn } from "@/lib/utils";

type PanelType = 'text' | 'templates' | 'illustrations' | 'images' | 'textures' | 'uploads' | 'frames' | null;

interface LeftSidebarNavigationProps {
  activePanel: PanelType;
  onPanelChange: (panel: PanelType) => void;
}

const navItems = [
  { id: 'frames' as const, icon: Frame, label: 'Frames' },
  { id: 'text' as const, icon: Type, label: 'Text' },
  { id: 'templates' as const, icon: LayoutGrid, label: 'Templates' },
  { id: 'illustrations' as const, icon: Palette, label: 'Illustrations' },
  { id: 'images' as const, icon: Image, label: 'Images' },
  { id: 'textures' as const, icon: Sparkles, label: 'Textures' },
  { id: 'uploads' as const, icon: Upload, label: 'Uploads' },
];

export function LeftSidebarNavigation({ activePanel, onPanelChange }: LeftSidebarNavigationProps) {
  return (
    <div className="w-16 border-r border-border bg-background flex flex-col items-center py-4 gap-2">
      {navItems.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          size="icon"
          className={cn(
            "w-12 h-12 rounded-lg transition-colors",
            activePanel === item.id && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => onPanelChange(activePanel === item.id ? null : item.id)}
          title={item.label}
        >
          <item.icon className="w-5 h-5" />
        </Button>
      ))}
    </div>
  );
}
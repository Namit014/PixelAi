import { defaultThemes } from './ThemeRegistry';
import { usePresentationStore } from '@/stores/presentationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onClose: () => void;
}

export function ThemePickerPanel({ onClose }: Props) {
  const themeId = usePresentationStore((s) => s.themeId);
  const setTheme = usePresentationStore((s) => s.setTheme);

  return (
    <div className="absolute left-16 top-1/2 -translate-y-1/2 z-50 w-[240px] max-h-[70vh] rounded-xl border border-border bg-background animate-in slide-in-from-left-2 duration-200 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-medium text-foreground">Themes</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-3">
          {defaultThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <div
                className="w-10 h-10 rounded-lg border border-border shrink-0"
                style={{ background: theme.preview }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground">{theme.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {theme.tokens.headingFont.split("'")[1] || 'Default'}
                </div>
              </div>
              {themeId === theme.id && (
                <Check className="h-4 w-4 text-foreground shrink-0" />
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

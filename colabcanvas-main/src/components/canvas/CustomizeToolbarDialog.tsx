import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Pin, RotateCcw, X as XIcon } from 'lucide-react';
import { TOOLBAR_TOOLS, type ToolbarConfig, getToolbarConfig, saveToolbarConfig, DEFAULT_PINNED } from './toolbarRegistry';

interface CustomizeToolbarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CustomizeToolbarDialog = ({ open, onOpenChange }: CustomizeToolbarDialogProps) => {
  const [config, setConfig] = useState<ToolbarConfig>(getToolbarConfig());
  const [previewConfig, setPreviewConfig] = useState<ToolbarConfig>(config);

  useEffect(() => {
    if (open) {
      const current = getToolbarConfig();
      setConfig(current);
      setPreviewConfig(current);
    }
  }, [open]);

  const togglePin = (toolId: string) => {
    setPreviewConfig(prev => {
      const isPinned = prev.pinned.includes(toolId);
      const newPinned = isPinned
        ? prev.pinned.filter(id => id !== toolId)
        : [...prev.pinned, toolId];
      return { ...prev, pinned: newPinned };
    });
  };

  const toggleShowNames = (show: boolean) => {
    setPreviewConfig(prev => ({ ...prev, showNames: show }));
  };

  const handleReset = () => {
    setPreviewConfig({ pinned: [...DEFAULT_PINNED], showNames: false });
  };

  const handleSave = () => {
    saveToolbarConfig(previewConfig);
    setConfig(previewConfig);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setPreviewConfig(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-zinc-200 p-0 gap-0 z-[1100]">
        <DialogHeader className="p-4 pb-3 border-b border-zinc-100">
          <DialogTitle className="text-sm font-semibold text-zinc-900">Customize Toolbar</DialogTitle>
        </DialogHeader>

        {/* Preview Bar */}
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
          <p className="text-[11px] text-zinc-400 mb-2 uppercase tracking-wider">Preview</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {previewConfig.pinned.map(toolId => {
              const tool = TOOLBAR_TOOLS.find(t => t.id === toolId);
              if (!tool) return null;
              const Icon = tool.icon;
              return (
                <div
                  key={toolId}
                  className="relative flex items-center gap-1 px-1.5 py-1 bg-white rounded border border-zinc-200 text-zinc-700 animate-jiggle"
                >
                  <Icon className="w-3 h-3" />
                  {previewConfig.showNames && (
                    <span className="text-[10px] font-medium">{tool.label}</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePin(toolId); }}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-zinc-500 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                  >
                    <XIcon className="w-2 h-2" />
                  </button>
                </div>
              );
            })}
            {previewConfig.pinned.length === 0 && (
              <span className="text-xs text-zinc-400 italic">No tools pinned</span>
            )}
          </div>
        </div>

        {/* Tool Grid */}
        <div className="px-4 py-3 max-h-[320px] overflow-y-auto">
          <div className="grid grid-cols-2 gap-1.5">
            {TOOLBAR_TOOLS.map(tool => {
              const isPinned = previewConfig.pinned.includes(tool.id);
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => togglePin(tool.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors ${
                    isPinned
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'hover:bg-zinc-50 text-zinc-500'
                  }`}
                >
                  <Pin
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                      isPinned ? 'fill-zinc-700 text-zinc-700' : 'text-zinc-300'
                    }`}
                  />
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs font-medium truncate">{tool.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Show Names Toggle */}
        <div className="px-4 py-3 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-names" className="text-xs text-zinc-600">Show tool names</Label>
            <Switch
              id="show-names"
              checked={previewConfig.showNames}
              onCheckedChange={toggleShowNames}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-zinc-500 gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="text-xs">
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomizeToolbarDialog;

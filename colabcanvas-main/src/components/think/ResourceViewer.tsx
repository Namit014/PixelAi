import React from 'react';
import { X, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface ResourceViewerProps {
  url: string | null;
  onClose: () => void;
}

export function ResourceViewer({ url, onClose }: ResourceViewerProps) {
  if (!url) return null;

  const displayUrl = (() => {
    try {
      const u = new URL(url);
      return `${u.hostname}${u.pathname}`.slice(0, 60);
    } catch {
      return url.slice(0, 60);
    }
  })();

  return (
    <Dialog open={!!url} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Resource Viewer</DialogTitle>
        {/* Header bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/50">
          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground truncate flex-1 font-mono">{displayUrl}</span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => window.open(url, '_blank')}
          >
            <ExternalLink className="h-3 w-3" /> New Tab
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {/* iframe */}
        <iframe
          src={url}
          className="w-full flex-1 border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title="Resource Viewer"
          style={{ height: 'calc(85vh - 48px)' }}
        />
      </DialogContent>
    </Dialog>
  );
}

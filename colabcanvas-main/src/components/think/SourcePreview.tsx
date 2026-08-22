import { motion } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';

interface SourcePreviewProps {
  source: {
    title: string;
    url: string;
    favicon?: string;
    snippet?: string;
  };
  onClose: () => void;
}

export function SourcePreview({ source, onClose }: SourcePreviewProps) {
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const hostname = (() => {
    try { return new URL(source.url).hostname; } catch { return source.url; }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="fixed right-4 top-1/3 z-50 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <img 
            src={source.favicon || `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
            alt=""
            className="w-4 h-4 rounded-sm shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xs font-medium truncate text-foreground">{hostname}</span>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h4 className="text-sm font-medium text-foreground line-clamp-2">
          {source.title || hostname}
        </h4>
        {source.snippet && (
          <p className="text-xs text-muted-foreground line-clamp-4">
            {source.snippet}
          </p>
        )}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline truncate block"
        >
          {source.url}
        </a>
      </div>
    </motion.div>
  );
}

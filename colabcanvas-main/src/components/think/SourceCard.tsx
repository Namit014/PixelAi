import { ExternalLink, Globe } from 'lucide-react';

export interface Source {
  title: string;
  url: string;
  snippet?: string;
  favicon?: string;
}

interface SourceCardProps {
  source: Source;
  index: number;
}

export const SourceCard = ({ source, index }: SourceCardProps) => {
  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const faviconUrl = source.favicon || getFaviconUrl(source.url);

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted border border-border/50 transition-colors group"
    >
      <span className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-primary text-xs font-medium shrink-0">
        {index + 1}
      </span>
      {faviconUrl ? (
        <img
          src={faviconUrl}
          alt=""
          className="w-4 h-4 shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
      <span className="text-xs truncate max-w-[150px]">{source.title}</span>
      <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
    </a>
  );
};

interface SourcesPanelProps {
  sources: Source[];
}

export const SourcesPanel = ({ sources }: SourcesPanelProps) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-2 font-medium">Sources</p>
      <div className="flex flex-wrap gap-2">
        {sources.slice(0, 6).map((source, index) => (
          <SourceCard key={index} source={source} index={index} />
        ))}
      </div>
      {sources.length > 6 && (
        <p className="text-xs text-muted-foreground mt-2">
          +{sources.length - 6} more sources
        </p>
      )}
    </div>
  );
};

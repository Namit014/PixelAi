import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MermaidDiagramProps {
  code: string;
  id?: string;
}

// Initialize mermaid with dark mode support
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

export const MermaidDiagram = ({ code, id }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const uniqueId = id || `mermaid-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        setError(null);
        
        // Clean the code - remove any leading/trailing whitespace
        const cleanCode = code.trim();
        
        const { svg: renderedSvg } = await mermaid.render(uniqueId, cleanCode);
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError('Failed to render diagram');
        setSvg('');
      }
    };

    if (code) {
      renderDiagram();
    }
  }, [code, uniqueId]);

  const handleDownload = () => {
    if (!svg) return;
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diagram.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  if (error) {
    return (
      <div className="w-full p-4 bg-destructive/10 rounded-xl border border-destructive/20 text-destructive text-sm">
        {error}
        <pre className="mt-2 text-xs opacity-60 overflow-auto">{code}</pre>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-muted/30 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-1 p-2 border-b border-border bg-background/50">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-[40px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleResetZoom}
          title="Reset zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleDownload}
          title="Download SVG"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Diagram */}
      <div
        ref={containerRef}
        className="p-4 overflow-auto max-h-[500px] flex items-center justify-center"
        style={{ minHeight: '200px' }}
      >
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="transition-transform duration-200"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
};

// Helper to detect mermaid code blocks
export const extractMermaidBlocks = (content: string): { type: 'text' | 'mermaid'; content: string }[] => {
  const parts: { type: 'text' | 'mermaid'; content: string }[] = [];
  const regex = /```mermaid\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    
    // Add the mermaid block
    parts.push({ type: 'mermaid', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) {
      parts.push({ type: 'text', content: remaining });
    }
  }

  // If no mermaid blocks found, return the whole content as text
  if (parts.length === 0) {
    return [{ type: 'text', content }];
  }

  return parts;
};

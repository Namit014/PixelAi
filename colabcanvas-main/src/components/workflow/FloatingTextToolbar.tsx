import { memo, useEffect, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Bold, Italic, List, ListOrdered, Heading2, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NodeData } from '@/types/workflow';

interface FloatingTextToolbarProps {
  nodeId: string;
  onFormat: (command: string) => void;
}

export const FloatingTextToolbar = memo(({ nodeId, onFormat }: FloatingTextToolbarProps) => {
  const { getNode } = useReactFlow();
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const node = getNode(nodeId);
    if (node) {
      // Position toolbar 60px above the node
      setPosition({
        x: node.position.x,
        y: node.position.y - 60,
      });
    }
  }, [nodeId, getNode]);

  return (
    <div
      className="absolute z-50 flex items-center gap-1 p-1.5 bg-white/95 dark:bg-white/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-200 rounded-lg shadow-sm"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('paragraph')}
        title="Paragraph"
        className="h-7 w-7 p-0"
      >
        <Type className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('heading')}
        title="Heading"
        className="h-7 w-7 p-0"
      >
        <Heading2 className="w-3.5 h-3.5" />
      </Button>
      <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-100" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('bold')}
        title="Bold"
        className="h-7 w-7 p-0"
      >
        <Bold className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('italic')}
        title="Italic"
        className="h-7 w-7 p-0"
      >
        <Italic className="w-3.5 h-3.5" />
      </Button>
      <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-100" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('bulletList')}
        title="Bullet List"
        className="h-7 w-7 p-0"
      >
        <List className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('orderedList')}
        title="Numbered List"
        className="h-7 w-7 p-0"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
});

FloatingTextToolbar.displayName = 'FloatingTextToolbar';

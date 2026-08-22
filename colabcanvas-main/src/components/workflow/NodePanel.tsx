import { useState } from 'react';
import { NODE_TYPES, NODE_CATEGORIES } from '@/lib/workflowNodeTypes';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface NodePanelProps {
  onNodeDrop: (nodeType: string) => void;
}

const NodePanel = ({ onNodeDrop }: NodePanelProps) => {
  const [search, setSearch] = useState('');

  const filteredNodes = Object.values(NODE_TYPES).filter(node =>
    node.label.toLowerCase().includes(search.toLowerCase()) ||
    node.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-64 bg-white dark:bg-white border-r border-zinc-200 dark:border-zinc-200 flex flex-col">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-200">
        <h2 className="text-lg font-semibold text-foreground mb-3">Nodes</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {Object.entries(NODE_CATEGORIES).map(([categoryKey, category]) => {
            const categoryNodes = filteredNodes.filter(node =>
              category.nodes.includes(node.type)
            );

            if (categoryNodes.length === 0) return null;

            return (
              <div key={categoryKey}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  {category.label}
                </h3>
                <div className="space-y-1">
                  {categoryNodes.map(node => {
                    const Icon = node.icon;
                    return (
                      <Button
                        key={node.type}
                        variant="ghost"
                        className="w-full justify-start h-auto py-2 px-3"
                        onClick={() => onNodeDrop(node.type)}
                      >
                        <Icon className="w-4 h-4 mr-2 shrink-0 covex-icon-strong" />
                        <div className="text-left">
                          <div className="text-sm font-medium">{node.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {node.description}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default NodePanel;

import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { NODE_TYPES, NODE_CATEGORIES } from '@/lib/workflowNodeTypes';
import { NodeType } from '@/types/workflow';

interface FloatingAddMenuProps {
  onNodeAdd: (nodeType: NodeType, position?: { x: number; y: number }) => void;
  position: { x: number; y: number };
  onClose: () => void;
}

const FloatingAddMenu = ({ onNodeAdd, position, onClose }: FloatingAddMenuProps) => {
  const [search, setSearch] = useState('');
  const [draggedNodeType, setDraggedNodeType] = useState<NodeType | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCategories = Object.entries(NODE_CATEGORIES).map(([key, category]) => ({
    key,
    ...category,
    nodes: category.nodes.filter(nodeType => {
      const nodeInfo = NODE_TYPES[nodeType as NodeType];
      return nodeInfo.label.toLowerCase().includes(search.toLowerCase()) ||
             nodeInfo.description.toLowerCase().includes(search.toLowerCase());
    }),
  })).filter(cat => cat.nodes.length > 0);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleNodeSelect = (nodeType: NodeType) => {
    onNodeAdd(nodeType);
    onClose();
  };

  const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    setDraggedNodeType(nodeType);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/reactflow', nodeType);
  };

  const handleDragEnd = () => {
    setDraggedNodeType(null);
    onClose();
  };

  return (
    <>
      <div
        ref={menuRef}
        className="fixed bg-white/95 backdrop-blur-md rounded-lg w-80 z-50 border border-zinc-200"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <div className="p-3 border-b border-zinc-200">
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </div>
        <ScrollArea className="h-[400px]">
          <div className="p-2">
            {filteredCategories.map((category) => (
              <div key={category.key} className="mb-4">
                <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                  {category.label}
                </div>
                <div className="space-y-1">
                  {category.nodes.map((nodeType) => {
                    const nodeInfo = NODE_TYPES[nodeType as NodeType];
                    const Icon = nodeInfo.icon;
                    return (
                      <button
                        key={nodeType}
                        draggable
                        onDragStart={(e) => handleDragStart(e, nodeType as NodeType)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleNodeSelect(nodeType as NodeType)}
                        className="w-full flex items-start gap-3 p-2 rounded-md hover:bg-zinc-100 transition-colors text-left cursor-grab active:cursor-grabbing"
                      >
                        <div className="mt-0.5 p-2 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                          <Icon className="h-6 w-6 text-zinc-900 covex-icon-strong" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-900">
                            {nodeInfo.label}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-500 line-clamp-2">
                            {nodeInfo.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Ghost preview while dragging */}
      {draggedNodeType && (
        <div
          className="fixed pointer-events-none z-[9999] opacity-50"
          style={{
            left: -9999,
            top: -9999,
          }}
        >
          <div className="bg-white dark:bg-zinc-100 border-2 border-zinc-400 dark:border-zinc-600 rounded-lg p-3 shadow-xl min-w-[200px]">
            <div className="flex items-center gap-2">
              {NODE_TYPES[draggedNodeType]?.icon && (() => {
                const Icon = NODE_TYPES[draggedNodeType].icon;
                return <Icon className="w-5 h-5 covex-icon-strong" />;
              })()}
              <span className="text-sm font-medium">{NODE_TYPES[draggedNodeType]?.label}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingAddMenu;

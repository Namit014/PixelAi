import { useEffect, useState, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { NODE_TYPES, NODE_CATEGORIES } from '@/lib/workflowNodeTypes';
import { NodeType, NodeData } from '@/types/workflow';
import {
  Clock,
  Store,
} from 'lucide-react';
import CopyIcon from '@/assets/icons/copy.svg?react';
import DeleteIcon from '@/assets/icons/workflow-delete.svg?react';
import PlayIcon from '@/assets/icons/play.svg?react';
import SaveIcon from '@/assets/icons/workflow-save.svg?react';
import ZoomInIcon from '@/assets/icons/workflow-zoom-in.svg?react';
import ZoomOutIcon from '@/assets/icons/workflow-zoom-out.svg?react';
import FitViewIcon from '@/assets/icons/workflow-fit-view.svg?react';

interface CommandPaletteProps {
  onSave?: () => void;
  onExecute?: () => void;
  onNodeAdd?: (nodeType: NodeType) => void;
}

const CommandPalette = ({ onSave, onExecute, onNodeAdd }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const { getNodes, setNodes, zoomIn, zoomOut, fitView } = useReactFlow();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      if (e.key === 'k' && isCtrl) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter(n => !n.selected));
    setOpen(false);
  }, [setNodes]);

  const handleDuplicateSelected = useCallback(() => {
    const nodes = getNodes();
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;
    
    const duplicatedNodes = selectedNodes.map(node => ({
      ...node,
      id: `${(node.data as NodeData).nodeType}_${Date.now()}_${Math.random()}`,
      position: { x: node.position.x + 20, y: node.position.y + 20 },
      selected: false,
    }));
    
    setNodes([...nodes.map(n => ({ ...n, selected: false })), ...duplicatedNodes]);
    setOpen(false);
  }, [getNodes, setNodes]);

  const handleAddNode = (nodeType: NodeType) => {
    onNodeAdd?.(nodeType);
    setOpen(false);
  };

  return (
    <div className="dark">
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search nodes..." />
        <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Actions">
          {onSave && (
            <CommandItem onSelect={() => { onSave(); setOpen(false); }}>
              <SaveIcon className="mr-2 h-4 w-4 covex-icon-strong" />
              <span>Save Workflow</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘S</span>
            </CommandItem>
          )}
          {onExecute && (
            <CommandItem onSelect={() => { onExecute(); setOpen(false); }}>
              <PlayIcon className="mr-2 h-4 w-4 covex-icon-strong" />
              <span>Execute Workflow</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘E</span>
            </CommandItem>
          )}
          <CommandItem onSelect={handleDuplicateSelected}>
            <CopyIcon className="mr-2 h-4 w-4 covex-icon-strong" />
            <span>Duplicate Selected</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘D</span>
          </CommandItem>
          <CommandItem onSelect={handleDeleteSelected}>
            <DeleteIcon className="mr-2 h-4 w-4 covex-icon-strong" />
            <span>Delete Selected</span>
            <span className="ml-auto text-xs text-muted-foreground">Del</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="View">
          <CommandItem onSelect={() => { fitView(); setOpen(false); }}>
            <FitViewIcon className="mr-2 h-4 w-4 covex-icon-strong" />
            <span>Fit View</span>
          </CommandItem>
          <CommandItem onSelect={() => { zoomIn(); setOpen(false); }}>
            <ZoomInIcon className="mr-2 h-4 w-4 covex-icon-strong" />
            <span>Zoom In</span>
          </CommandItem>
          <CommandItem onSelect={() => { zoomOut(); setOpen(false); }}>
            <ZoomOutIcon className="mr-2 h-4 w-4 covex-icon-strong" />
            <span>Zoom Out</span>
          </CommandItem>
        </CommandGroup>

        {Object.entries(NODE_CATEGORIES).map(([key, category]) => (
          <CommandGroup key={key} heading={`Add ${category.label}`}>
            {category.nodes.map((nodeType) => {
              const nodeInfo = NODE_TYPES[nodeType as NodeType];
              const Icon = nodeInfo.icon;
              return (
                <CommandItem
                  key={nodeType}
                  onSelect={() => handleAddNode(nodeType as NodeType)}
                >
                  <Icon className="mr-2 h-4 w-4 covex-icon-strong" />
                  <span>{nodeInfo.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground line-clamp-1">
                    {nodeInfo.description}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
      </CommandDialog>
    </div>
  );
};

export default CommandPalette;

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useWorkflowStore } from '@/stores/workflowStore';
import { cn } from '@/lib/utils';
import FloatingAddMenu from './FloatingAddMenu';
import { NodeType } from '@/types/workflow';
import { useState, useRef, useEffect } from 'react';
import CommentsIcon from '@/assets/icons/Comments.svg?react';
import SelectIcon from '@/assets/icons/workflow-select.svg?react';
import HandIcon from '@/assets/icons/workflow-hand.svg?react';

interface CanvasFloatingToolbarProps {
  onNodeAdd: (nodeType: NodeType, position?: { x: number; y: number }) => void;
}

const CanvasFloatingToolbar = ({ onNodeAdd }: CanvasFloatingToolbarProps) => {
  const { activeTool, setActiveTool } = useWorkflowStore();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (plusButtonRef.current && showAddMenu) {
      const rect = plusButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        x: rect.right + 8,
        y: rect.top,
      });
    }
  }, [showAddMenu]);

  return (
    <>
      <div className="fixed left-5 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-lg rounded-lg shadow-sm p-1.5 flex flex-col gap-1 z-40 border border-zinc-200">
        {/* Add Node Tool */}
        <Button
          ref={plusButtonRef}
          variant="ghost"
          size="icon"
          onClick={() => setShowAddMenu(!showAddMenu)}
          className={cn(
            "h-9 w-9 text-zinc-900 hover:bg-zinc-100",
            showAddMenu && "bg-zinc-200"
          )}
          title="Add Node (A)"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </Button>

        <Separator className="my-1 bg-zinc-200" />

        {/* Canvas Tools */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setActiveTool('select')}
          className={cn(
            "h-9 w-9 text-zinc-900 hover:bg-zinc-100",
            activeTool === 'select' && "bg-zinc-200"
          )}
          title="Select Tool (V)"
        >
          <SelectIcon className="h-5 w-5 covex-icon-strong" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setActiveTool('hand')}
          className={cn(
            "h-9 w-9 text-zinc-900 hover:bg-zinc-100",
            activeTool === 'hand' && "bg-zinc-200"
          )}
          title="Hand Tool (H)"
        >
          <HandIcon className="h-5 w-5 covex-icon-strong" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setActiveTool('comment')}
          className={cn(
            "h-9 w-9 text-zinc-900 hover:bg-zinc-100",
            activeTool === 'comment' && "bg-zinc-200"
          )}
          title="Comment Tool (C)"
        >
          <CommentsIcon className="h-5 w-5 covex-icon-strong" />
        </Button>
      </div>

      {/* Floating Add Menu */}
      {showAddMenu && (
        <FloatingAddMenu
          onNodeAdd={(nodeType, position) => {
            onNodeAdd(nodeType, position);
            setShowAddMenu(false);
          }}
          position={menuPosition}
          onClose={() => setShowAddMenu(false)}
        />
      )}
    </>
  );
};

export default CanvasFloatingToolbar;

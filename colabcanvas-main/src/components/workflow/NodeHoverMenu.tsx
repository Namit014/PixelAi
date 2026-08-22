import { Button } from '@/components/ui/button';
import CopyIcon from '@/assets/icons/copy.svg?react';
import DeleteIcon from '@/assets/icons/workflow-delete.svg?react';
import SettingIcon from '@/assets/icons/workflow-settings.svg?react';
import PlayIcon from '@/assets/icons/workflow-play.svg?react';

interface NodeHoverMenuProps {
  onDuplicate: () => void;
  onConfigure: () => void;
  onDelete: () => void;
  onRunFromHere: () => void;
}

const NodeHoverMenu = ({
  onDuplicate,
  onConfigure,
  onDelete,
  onRunFromHere,
}: NodeHoverMenuProps) => {
  return (
    <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-lg p-1 flex gap-1 z-50 border border-zinc-200">
      <Button
        variant="ghost"
        size="icon"
        onClick={onDuplicate}
        className="h-8 w-8 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
        title="Duplicate"
      >
        <CopyIcon className="h-4 w-4 covex-icon-strong" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onConfigure}
        className="h-8 w-8 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
        title="Configure"
      >
        <SettingIcon className="h-4 w-4 covex-icon-strong" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRunFromHere}
        className="h-8 w-8 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
        title="Run from here"
      >
        <PlayIcon className="h-4 w-4 covex-icon-strong" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-zinc-200"
        title="Delete"
      >
        <DeleteIcon className="h-4 w-4 covex-icon-strong" />
      </Button>
    </div>
  );
};

export default NodeHoverMenu;

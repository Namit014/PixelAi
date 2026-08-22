import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

interface KeyboardShortcutsProps {
  onSave?: () => void;
  onExecute?: () => void;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
}

export const useWorkflowKeyboardShortcuts = ({
  onSave,
  onExecute,
  onDeleteSelected,
  onDuplicateSelected,
}: KeyboardShortcutsProps) => {
  const { getNodes, setNodes } = useReactFlow();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrl = isMac ? e.metaKey : e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Prevent default for our shortcuts
      if (isCtrl && ['s', 'z', 'y', 'e', 'd', 'a', 'c', 'v', 'k'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }

      // Ctrl/Cmd + S: Save
      if (isCtrl && e.key.toLowerCase() === 's') {
        onSave?.();
        return;
      }

      // Ctrl/Cmd + E: Execute
      if (isCtrl && e.key.toLowerCase() === 'e') {
        onExecute?.();
        return;
      }

      // Ctrl/Cmd + D: Duplicate
      if (isCtrl && e.key.toLowerCase() === 'd') {
        onDuplicateSelected?.();
        return;
      }

      // Ctrl/Cmd + A: Select All
      if (isCtrl && e.key.toLowerCase() === 'a') {
        const nodes = getNodes();
        setNodes(nodes.map(n => ({ ...n, selected: true })));
        return;
      }

      // Delete/Backspace: Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputField) {
        onDeleteSelected?.();
        return;
      }

      // Escape: Deselect all
      if (e.key === 'Escape') {
        const nodes = getNodes();
        setNodes(nodes.map(n => ({ ...n, selected: false })));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave, onExecute, onDeleteSelected, onDuplicateSelected, getNodes, setNodes]);
};

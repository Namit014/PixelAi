import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsProps {
  onDelete?: () => void;
  onDuplicate?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onSelectTool?: () => void;
  onPanTool?: () => void;
  onEscape?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onTextTool?: () => void;
  onShapeTool?: () => void;
  onFrameTool?: () => void;
  onImageTool?: () => void;
  onImageGenerator?: () => void;
  onVideoGenerator?: () => void;
  onPenTool?: () => void;
  onQuickComment?: (cursorPosition: { x: number; y: number }) => void;
  canvasRef?: React.RefObject<any>;
}

// Helper to check if text is being edited
const isTextEditing = (canvasRef?: React.RefObject<any>): boolean => {
  if (!canvasRef?.current) return false;
  const activeObject = canvasRef.current.getActiveObject?.();
  return activeObject && 
    (activeObject.type === 'i-text' || activeObject.type === 'textbox') && 
    activeObject.isEditing === true;
};

export const useKeyboardShortcuts = ({
  onDelete,
  onDuplicate,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onSelectTool,
  onPanTool,
  onEscape,
  onGroup,
  onUngroup,
  onCopy,
  onPaste,
  onCut,
  onTextTool,
  onShapeTool,
  onFrameTool,
  onImageTool,
  onImageGenerator,
  onVideoGenerator,
  onPenTool,
  onQuickComment,
  canvasRef,
}: KeyboardShortcutsProps) => {
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if typing in input fields or contentEditable
      const target = e.target as HTMLElement;
      
      // CRITICAL: Check both the target AND its ancestors for contentEditable
      // The event target might be a child element inside the contentEditable
      const isContentEditable = target.isContentEditable === true || 
                                (target.isContentEditable as any) === 'true' ||
                                target.getAttribute?.('contenteditable') === 'true' ||
                                target.closest?.('[contenteditable="true"]') !== null;
      
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          isContentEditable;
      
      // Debug log for troubleshooting
      if (e.key === 'v' || e.key === 's' || e.key === 't' || e.key === 'h') {
        console.log('🎹 Keyboard shortcut check:', {
          key: e.key,
          targetTag: target.tagName,
          isContentEditable,
          isInputField,
          closestContentEditable: target.closest?.('[contenteditable="true"]')
        });
      }
      
      // Check if editing text on canvas
      const isCanvasTextEditing = isTextEditing(canvasRef);
      
      // CRITICAL: For spacebar, if we're editing text on canvas, allow the space
      if (e.key === ' ') {
        if (isInputField || isCanvasTextEditing) {
          // Do NOT prevent default - allow space to be typed
          return;
        }
        // Only activate pan tool if NOT editing text
        if (!e.repeat && canvasRef?.current) {
          e.preventDefault();
          canvasRef.current.defaultCursor = 'grab';
          canvasRef.current.hoverCursor = 'grab';
          canvasRef.current.selection = false;
        }
        return;
      }

      // For other shortcuts, ignore when in input fields
      if (isInputField) {
        console.log('🎹 Ignoring shortcut - in input field');
        return;
      }

      // Delete: Backspace or Delete (but not when editing text)
      if ((e.key === 'Backspace' || e.key === 'Delete') && onDelete && !isCanvasTextEditing) {
        e.preventDefault();
        onDelete();
      }

      // Copy: Cmd/Ctrl + C
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && onCopy && !isCanvasTextEditing) {
        e.preventDefault();
        onCopy();
      }

      // Paste: Cmd/Ctrl + V
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && onPaste && !isCanvasTextEditing) {
        e.preventDefault();
        onPaste();
      }

      // Cut: Cmd/Ctrl + X
      if ((e.metaKey || e.ctrlKey) && e.key === 'x' && onCut && !isCanvasTextEditing) {
        e.preventDefault();
        onCut();
      }

      // Duplicate: Cmd/Ctrl + D
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && onDuplicate) {
        e.preventDefault();
        onDuplicate();
      }

      // Undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && onUndo) {
        e.preventDefault();
        onUndo();
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key === 'z' || e.key === 'y') && onRedo) {
        e.preventDefault();
        onRedo();
      }

      // Zoom in: Cmd/Ctrl + Plus or Cmd/Ctrl + =
      if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=') && onZoomIn) {
        e.preventDefault();
        onZoomIn();
      }

      // Zoom out: Cmd/Ctrl + Minus
      if ((e.metaKey || e.ctrlKey) && e.key === '-' && onZoomOut) {
        e.preventDefault();
        onZoomOut();
      }

      // Zoom reset: Cmd/Ctrl + 0
      if ((e.metaKey || e.ctrlKey) && e.key === '0' && onZoomReset) {
        e.preventDefault();
        onZoomReset();
      }

      // Tool shortcuts (only when not editing text and no modifier keys)
      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !isCanvasTextEditing) {
        
        // V: Select tool
        if (e.key === 'v' && onSelectTool) {
          e.preventDefault();
          onSelectTool();
        }

        // H: Pan tool
        if (e.key === 'h' && onPanTool) {
          e.preventDefault();
          onPanTool();
        }

        // T: Text tool
        if (e.key === 't' && onTextTool) {
          e.preventDefault();
          onTextTool();
        }

        // S: Shape tool
        if (e.key === 's' && onShapeTool) {
          e.preventDefault();
          onShapeTool();
        }

        // F: Frame/Artboard tool
        if (e.key === 'f' && onFrameTool) {
          e.preventDefault();
          onFrameTool();
        }

        // P: Pen tool
        if (e.key === 'p' && onPenTool) {
          e.preventDefault();
          onPenTool();
        }

        // I: Image tool
        if (e.key === 'i' && onImageTool) {
          e.preventDefault();
          onImageTool();
        }

        // G: Image Generator
        if (e.key === 'g' && onImageGenerator) {
          e.preventDefault();
          onImageGenerator();
        }

        // Shift + V is already video generator in tool panel, but let's use standalone 'r' for video
        // Actually, using 'r' for video (record) to not conflict with 'v' for select

        // /: Quick Comment
        if (e.key === '/' && onQuickComment) {
          e.preventDefault();
          onQuickComment({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        }
      }

      // Escape: Clear selection or exit mode
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
      }

      // Group: Cmd/Ctrl + G
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && !e.shiftKey && onGroup) {
        e.preventDefault();
        onGroup();
      }

      // Ungroup: Cmd/Ctrl + Shift + G
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'g' && onUngroup) {
        e.preventDefault();
        onUngroup();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release space for temporary pan (only if not editing text)
      if (e.key === ' ' && canvasRef?.current && onSelectTool) {
        const isCanvasTextEditing = isTextEditing(canvasRef);
        if (isCanvasTextEditing) {
          return; // Don't interfere with text editing
        }
        e.preventDefault();
        onSelectTool();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onDelete, onDuplicate, onUndo, onRedo, onZoomIn, onZoomOut, onZoomReset, onSelectTool, onPanTool, onEscape, onGroup, onUngroup, onCopy, onPaste, onCut, onTextTool, onShapeTool, onFrameTool, onImageTool, onImageGenerator, onVideoGenerator, onPenTool, onQuickComment, canvasRef]);
};

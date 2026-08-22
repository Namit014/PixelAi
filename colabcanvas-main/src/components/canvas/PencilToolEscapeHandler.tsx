import { useEffect } from 'react';

interface PencilToolEscapeHandlerProps {
  isActive: boolean;
  onExit: () => void;
}

export const PencilToolEscapeHandler = ({ isActive, onExit }: PencilToolEscapeHandlerProps) => {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isActive, onExit]);

  if (!isActive) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
      Drawing Mode Active • Press <kbd className="px-2 py-1 bg-white/20 rounded mx-1">ESC</kbd> to exit
    </div>
  );
};

import { memo, useState, useEffect, useRef } from 'react';

interface CollaboratorCursorProps {
  name: string;
  color: string;
  position: { x: number; y: number };
}

const CollaboratorCursor = memo(({ name, color, position: initialPosition }: CollaboratorCursorProps) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        });
      }
    };
    
    const handleMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className="absolute z-50 flex items-start gap-1 cursor-grab active:cursor-grabbing select-none"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      {/* Cursor arrow */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={color}
        className="drop-shadow-sm"
      >
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z" />
      </svg>
      
      {/* Name badge */}
      <span
        className="px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </div>
  );
});

CollaboratorCursor.displayName = 'CollaboratorCursor';

export default CollaboratorCursor;

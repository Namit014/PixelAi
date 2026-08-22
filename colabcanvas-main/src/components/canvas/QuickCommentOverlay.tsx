import { useRef, useEffect, useCallback, useState } from 'react';

interface QuickCommentOverlayProps {
  screenPosition: { x: number; y: number };
  liveCursorPosition?: { x: number; y: number };
  canvas: any;
  onPost: (worldPosition: { x: number; y: number }, text: string) => void;
  onDismiss: () => void;
}

const QuickCommentOverlay = ({ screenPosition, liveCursorPosition, canvas, onPost, onDismiss }: QuickCommentOverlayProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [fading, setFading] = useState(false);

  // Always follow cursor
  const pos = liveCursorPosition || screenPosition;
  const clampedX = Math.min(Math.max(pos.x + 16, 16), window.innerWidth - 260);
  const clampedY = Math.min(Math.max(pos.y + 16, 16), window.innerHeight - 48);

  // Auto-focus on mount
  useEffect(() => {
    mountedRef.current = true;
    requestAnimationFrame(() => {
      if (mountedRef.current && inputRef.current) {
        inputRef.current.focus();
      }
    });
    return () => { mountedRef.current = false; };
  }, []);

  // Fade-out then dismiss
  const triggerDismiss = useCallback(() => {
    if (fading) return;
    setFading(true);
    setTimeout(() => {
      if (mountedRef.current) onDismiss();
    }, 200);
  }, [fading, onDismiss]);

  // Auto-dismiss after 5s inactivity
  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) triggerDismiss();
    }, 5000);
  }, [triggerDismiss]);

  useEffect(() => {
    resetTimeout();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimeout]);

  // Click-outside dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        triggerDismiss();
      }
    };
    const id = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [triggerDismiss]);

  const handleInput = useCallback(() => {
    resetTimeout();
  }, [resetTimeout]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    resetTimeout();

    if (e.key === 'Enter') {
      e.preventDefault();
      const text = inputRef.current?.value.trim();
      if (!text) { triggerDismiss(); return; }

      // Use current cursor position for world coords
      let worldX = clampedX;
      let worldY = clampedY;
      if (canvas) {
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vpt[0];
        worldX = (pos.x - vpt[4]) / zoom;
        worldY = (pos.y - vpt[5]) / zoom;
      }
      onPost({ x: worldX, y: worldY }, text);
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      triggerDismiss();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          transform: `translate3d(${clampedX}px, ${clampedY}px, 0)`,
          pointerEvents: 'all',
          opacity: fading ? 0 : 1,
          transition: fading
            ? 'opacity 200ms ease-out, transform 200ms ease-out'
            : 'none',
          ...(fading ? { transform: `translate3d(${clampedX}px, ${clampedY + 6}px, 0)` } : {}),
        }}
      >
        {/* Speech bubble notch */}
        <div
          style={{
            position: 'absolute',
            top: -6,
            left: 10,
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '6px solid #5C6D8E',
          }}
        />
        <div
          className="flex items-center gap-2.5 px-3.5 py-2 shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #5C6D8E 0%, #4A5B7A 100%)',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Avatar dot */}
          <div
            className="shrink-0"
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #60A5FA, #818CF8)',
              boxShadow: '0 0 6px rgba(96,165,250,0.5)',
            }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Say something…"
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            className="bg-transparent outline-none border-none"
            style={{
              width: 200,
              fontSize: 13,
              color: '#fff',
              caretColor: '#93C5FD',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default QuickCommentOverlay;

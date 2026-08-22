import { useEffect, useRef } from 'react';

interface BrushCursorPreviewProps {
  brushWidth: number;
  isActive: boolean;
}

export const BrushCursorPreview = ({ brushWidth, isActive }: BrushCursorPreviewProps) => {
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const posRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const el = elRef.current;
    if (!isActive || !el) return;

    const onMove = (e: MouseEvent) => {
      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          el.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0) translate(-50%, -50%)`;
        });
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      ref={elRef}
      className="fixed top-0 left-0 pointer-events-none rounded-full border-2 border-zinc-500/70 bg-zinc-500/20"
      style={{
        width: brushWidth,
        height: brushWidth,
        transform: 'translate3d(-9999px, -9999px, 0)',
        willChange: 'transform',
        zIndex: 999999,
      }}
    />
  );
};

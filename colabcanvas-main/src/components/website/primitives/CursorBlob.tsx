/**
 * CursorBlob — a soft accent blob that follows the cursor with eased lag.
 * Pointer-events: none. Hidden on touch devices.
 */
import { useEffect, useRef } from 'react';

export function CursorBlob({ color = '#fff' }: { color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (matchMedia('(hover: none)').matches) return;
    const el = ref.current;
    if (!el) return;
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    let tx = x, ty = y;
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    window.addEventListener('mousemove', onMove);
    let raf = 0;
    const loop = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      el.style.transform = `translate3d(${x - 80}px, ${y - 80}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[9998] hidden md:block"
      style={{
        width: 160,
        height: 160,
        borderRadius: '50%',
        background: color,
        opacity: 0.18,
        filter: 'blur(40px)',
        mixBlendMode: 'screen',
      }}
    />
  );
}

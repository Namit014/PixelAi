/**
 * ScrollProgressBar — top-of-page progress line driven by window scroll.
 */
import { useEffect, useState } from 'react';

export function ScrollProgressBar({ color = '#0a0a0a' }: { color?: string }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      setPct((h.scrollTop / max) * 100);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-[9997] pointer-events-none">
      <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 80ms linear' }} />
    </div>
  );
}

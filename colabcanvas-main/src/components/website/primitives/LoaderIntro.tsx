/**
 * LoaderIntro — full-screen brand loader that counts 0→100, then curtain
 * reveal. Auto-mounts once per page load via sessionStorage so the user
 * doesn't see it on every soft nav.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  brandName?: string;
  primary?: string;
  foreground?: string;
}

export function LoaderIntro({ brandName = '', primary = '#0a0a0a', foreground = '#ffffff' }: Props) {
  const [show, setShow] = useState(true);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('wp-loader-shown')) {
      setShow(false);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i += Math.random() * 8 + 2;
      if (i >= 100) {
        i = 100;
        clearInterval(t);
        setTimeout(() => {
          sessionStorage.setItem('wp-loader-shown', '1');
          setShow(false);
        }, 350);
      }
      setPct(Math.floor(i));
    }, 60);
    return () => clearInterval(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 0 }}
          exit={{ y: '-100%', transition: { duration: 0.9, ease: [0.76, 0, 0.24, 1] } }}
          className="fixed inset-0 z-[9999] flex items-end justify-between px-8 md:px-14 pb-10"
          style={{ background: primary, color: foreground }}
        >
          <span className="text-sm uppercase tracking-[0.32em] opacity-70">{brandName}</span>
          <span className="font-semibold tabular-nums" style={{ fontSize: 'clamp(3rem, 9vw, 7rem)', lineHeight: 1 }}>
            {String(pct).padStart(3, '0')}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

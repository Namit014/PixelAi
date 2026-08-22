import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

/** Scroll-triggered reveal wrapper for any block. */
export function Reveal({
  children,
  delay = 0,
  y,
  className,
}: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  const distance = reduce ? 0 : (y ?? 24);
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MagicAICursorProps {
  x: number;
  y: number;
  label?: string;
  isClicking?: boolean;
  visible?: boolean;
}

export function MagicAICursor({ x, y, label, isClicking, visible = true }: MagicAICursorProps) {
  const [showRipple, setShowRipple] = useState(false);

  useEffect(() => {
    if (isClicking) {
      setShowRipple(true);
      const t = setTimeout(() => setShowRipple(false), 500);
      return () => clearTimeout(t);
    }
  }, [isClicking]);

  if (!visible) return null;

  return (
    <motion.div
      className="pointer-events-none fixed z-[9999]"
      animate={{ left: x, top: y }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }}
    >
      {/* SVG Cursor */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-lg"
      >
        <path
          d="M5.65 2.14L19.76 11.57C20.37 11.97 20.11 12.91 19.38 12.95L12.82 13.31L9.86 19.28C9.52 19.96 8.54 19.82 8.39 19.07L5.01 3.02C4.87 2.33 5.14 1.81 5.65 2.14Z"
          fill="hsl(var(--primary))"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* Sparkle trail */}
      <motion.div
        className="absolute -top-1 -left-1 w-3 h-3 rounded-full"
        style={{ background: 'hsl(var(--primary) / 0.4)' }}
        animate={{
          scale: [0.5, 1.2, 0.5],
          opacity: [0.8, 0.2, 0.8],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Click ripple */}
      <AnimatePresence>
        {showRipple && (
          <motion.div
            className="absolute top-0 left-0 w-8 h-8 rounded-full border-2"
            style={{ borderColor: 'hsl(var(--primary))' }}
            initial={{ scale: 0.2, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Label tooltip */}
      <AnimatePresence>
        {label && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-6 top-6 whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-medium shadow-lg"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

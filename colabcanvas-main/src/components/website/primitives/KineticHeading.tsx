/**
 * KineticHeading — splits a heading into words and reveals each with a
 * staggered slide-up + fade. Used by HeroKineticType and award-grade closers.
 */
import { motion } from 'framer-motion';
import React from 'react';

interface Props {
  text: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  /** Stagger between words (sec). */
  stagger?: number;
}

export function KineticHeading({
  text,
  as = 'h1',
  className = '',
  style,
  delay = 0,
  stagger = 0.06,
}: Props) {
  const Tag = motion[as] as any;
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag
      className={className}
      style={style}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-baseline" style={{ marginRight: '0.25em' }}>
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: '110%', opacity: 0 },
              show: { y: '0%', opacity: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

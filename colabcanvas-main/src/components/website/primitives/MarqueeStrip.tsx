/**
 * MarqueeStrip — infinite horizontal marquee, GSAP-free.
 * Duplicates children once and animates with a CSS keyframe.
 * Pause on hover when `pauseOnHover`.
 */
import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Seconds for one full loop. Lower = faster. */
  speed?: number;
  /** Reverse direction (right→left default). */
  reverse?: boolean;
  /** Gap (px) between repeated items. */
  gap?: number;
  pauseOnHover?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function MarqueeStrip({
  children,
  speed = 30,
  reverse = false,
  gap = 48,
  pauseOnHover = true,
  className = '',
  style,
}: Props) {
  return (
    <div
      className={`overflow-hidden w-full marquee-strip ${className}`}
      style={{ ['--mq-speed' as any]: `${speed}s`, ['--mq-gap' as any]: `${gap}px`, ...style }}
    >
      <style>{`
        @keyframes mq-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-strip .mq-track {
          display: inline-flex;
          gap: var(--mq-gap);
          padding-right: var(--mq-gap);
          white-space: nowrap;
          animation: mq-scroll var(--mq-speed) linear infinite;
          animation-direction: ${reverse ? 'reverse' : 'normal'};
          will-change: transform;
        }
        ${pauseOnHover ? '.marquee-strip:hover .mq-track { animation-play-state: paused; }' : ''}
      `}</style>
      <div className="mq-track">
        {children}
        {children}
      </div>
    </div>
  );
}

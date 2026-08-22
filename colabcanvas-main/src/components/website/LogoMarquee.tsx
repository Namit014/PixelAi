/**
 * LogoMarquee — endless logo strip (clients/press). Uses bullet labels
 * since real logos aren't always available; renders styled wordmarks.
 */
import { MarqueeStrip } from './primitives/MarqueeStrip';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function LogoMarquee({ section, theme }: SectionProps) {
  const fg = readableOn(theme.background);
  const labels = section.bullets?.length ? section.bullets : ['Stripe', 'Linear', 'Vercel', 'Notion', 'Figma', 'Loom', 'Framer'];
  return (
    <section className="py-12 md:py-16" style={{ background: theme.background, color: fg, borderTop: `1px solid ${withAlpha(fg, 0.08)}`, borderBottom: `1px solid ${withAlpha(fg, 0.08)}` }}>
      {section.heading && (
        <p className="text-center text-[11px] uppercase tracking-[0.32em] opacity-60 mb-6">{section.heading}</p>
      )}
      <MarqueeStrip speed={50} gap={64}>
        {labels.map((l, i) => (
          <span key={i} className="opacity-80" style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'clamp(1.5rem, 2.5vw, 2.25rem)', letterSpacing: '-0.02em' }}>
            {l}
          </span>
        ))}
      </MarqueeStrip>
    </section>
  );
}

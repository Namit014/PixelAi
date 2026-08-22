/**
 * MarqueeWall — infinite horizontal marquee of feature/value names.
 * Linear-style. Two rows running opposite directions.
 */
import { EditableText } from './EditableText';
import { MarqueeStrip } from './primitives/MarqueeStrip';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function MarqueeWall({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.foreground);
  const items = (section.features?.map((f) => f.title) ?? section.bullets ?? [
    'Brand-aware', 'Conversion-first', 'Edge-fast', 'Pixel-perfect', 'Always on', 'Built to ship',
  ]);
  return (
    <section className="py-20 md:py-28 overflow-hidden" style={{ background: theme.foreground, color: fg }}>
      <div className="max-w-7xl mx-auto px-6 md:px-14 mb-10">
        {section.heading && (
          <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
            className="font-semibold leading-[1.0]"
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3.5rem)', letterSpacing: '-0.025em' }}>
            {section.heading}
          </EditableText>
        )}
      </div>
      <MarqueeStrip speed={45} gap={56}>
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-6" style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)', fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '-0.03em' }}>
            <span>{it}</span>
            <span style={{ color: theme.accent, fontSize: '0.6em' }}>✦</span>
          </span>
        ))}
      </MarqueeStrip>
      <div className="mt-3" style={{ borderTop: `1px solid ${withAlpha(fg, 0.12)}`, borderBottom: `1px solid ${withAlpha(fg, 0.12)}`, padding: '14px 0' }}>
        <MarqueeStrip speed={60} gap={48} reverse>
          {items.map((it, i) => (
            <span key={i} className="inline-flex items-center gap-4 opacity-70" style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.32em' }}>
              <span>{it}</span>
              <span>·</span>
            </span>
          ))}
        </MarqueeStrip>
      </div>
    </section>
  );
}

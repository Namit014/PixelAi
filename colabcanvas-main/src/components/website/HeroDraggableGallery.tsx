/**
 * HeroDraggableGallery — copy on top, draggable horizontal carousel of
 * tiles below. Studio / portfolio aesthetic.
 */
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { EditableText } from './EditableText';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function HeroDraggableGallery({ section, index, theme, brand, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  const trackRef = useRef<HTMLDivElement>(null);
  const tiles = section.features?.length
    ? section.features.map((f) => ({ title: f.title, sub: f.description }))
    : [
        { title: 'Identity', sub: 'Logo · type · system' },
        { title: 'Web', sub: 'Sites that convert' },
        { title: 'Campaign', sub: 'Multi-channel launch' },
        { title: 'Strategy', sub: 'Brand & positioning' },
      ];

  return (
    <section className="relative overflow-hidden" style={{ background: theme.background, color: fg, minHeight: '100vh' }}>
      <div className="px-8 md:px-14 pt-28 pb-10 grid md:grid-cols-12 gap-8 items-end">
        <div className="md:col-span-8 space-y-5">
          {section.kicker && (
            <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
              className="text-xs uppercase tracking-[0.32em] font-medium" style={{ color: theme.accent }}>
              {section.kicker}
            </EditableText>
          )}
          {section.heading && (
            <EditableText as="h1" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
              className="font-semibold leading-[0.95]"
              style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.5rem, 7vw, 6rem)', letterSpacing: '-0.035em' }}>
              {section.heading}
            </EditableText>
          )}
        </div>
        <div className="md:col-span-4 md:text-right">
          {section.subheading && (
            <EditableText as="p" sectionIndex={index} fieldPath="subheading" value={section.subheading} editable={editable}
              className="text-base md:text-lg opacity-75 leading-relaxed">
              {section.subheading}
            </EditableText>
          )}
        </div>
      </div>

      <div ref={trackRef} className="overflow-x-hidden pb-20 cursor-grab active:cursor-grabbing">
        <motion.div drag="x" dragConstraints={{ left: -1200, right: 0 }} dragElastic={0.06} className="flex gap-5 px-8 md:px-14 will-change-transform">
          {tiles.map((t, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -6 }}
              className="shrink-0 w-[320px] md:w-[420px] aspect-[4/5] rounded-3xl overflow-hidden flex items-end p-7"
              style={{
                background: i % 2 === 0
                  ? `linear-gradient(160deg, ${theme.primary}, ${theme.accent})`
                  : `linear-gradient(20deg, ${theme.surface}, ${theme.background})`,
                color: i % 2 === 0 ? readableOn(theme.primary) : fg,
                border: `1px solid ${withAlpha(fg, 0.06)}`,
              }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] opacity-70 mb-3">0{i + 1}</p>
                <h3 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>{t.title}</h3>
                {t.sub && <p className="text-sm opacity-80 mt-2">{t.sub}</p>}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

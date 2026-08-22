/**
 * HorizontalScroll — pinned heading + horizontal scroll of feature tiles.
 * Implemented with translateX driven by vertical scroll progress.
 */
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { EditableText } from './EditableText';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function HorizontalScroll({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const items = section.features?.length ? section.features : [
    { title: 'One', description: 'Strategy' },
    { title: 'Two', description: 'Identity' },
    { title: 'Three', description: 'Launch' },
    { title: 'Four', description: 'Optimize' },
  ];
  const x = useTransform(scrollYProgress, [0, 1], ['0%', `-${(items.length - 1) * 80}%`]);
  return (
    <section ref={ref} className="relative" style={{ background: theme.background, color: fg, height: `${items.length * 100}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col">
        <div className="px-8 md:px-14 pt-24 pb-8">
          {section.heading && (
            <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
              className="font-semibold leading-[1.0]"
              style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 5vw, 4rem)', letterSpacing: '-0.03em' }}>
              {section.heading}
            </EditableText>
          )}
        </div>
        <motion.div style={{ x }} className="flex flex-1 items-center pl-8 md:pl-14 gap-6">
          {items.map((f, i) => (
            <div
              key={i}
              className="shrink-0 w-[80vw] md:w-[60vw] h-[60vh] rounded-3xl p-10 flex flex-col justify-between"
              style={{ background: i % 2 === 0 ? `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` : theme.surface, color: i % 2 === 0 ? readableOn(theme.primary) : fg, border: `1px solid ${withAlpha(fg, 0.06)}` }}
            >
              <span className="font-mono text-xs opacity-70">{String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>
              <div>
                <EditableText as="h3" sectionIndex={index} fieldPath={`features[${i}].title`} value={f.title} editable={editable}
                  className="font-semibold tracking-tight"
                  style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
                  {f.title}
                </EditableText>
                {f.description && (
                  <EditableText as="p" sectionIndex={index} fieldPath={`features[${i}].description`} value={f.description} editable={editable}
                    className="mt-3 text-base md:text-lg opacity-85 max-w-md">
                    {f.description}
                  </EditableText>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/**
 * WorkGrid — masonry-style case-study grid (3-4-5 column responsive).
 * Falls back to gradient tiles when no images.
 */
import { motion } from 'framer-motion';
import { EditableText } from './EditableText';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function WorkGrid({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  const items = section.features?.length ? section.features : Array.from({ length: 6 }).map((_, i) => ({ title: `Case ${i + 1}`, description: 'Selected work' }));
  return (
    <section className="px-6 md:px-14 py-24 md:py-32" style={{ background: theme.background, color: fg }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          {section.heading && (
            <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
              className="font-semibold leading-[1.0]"
              style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 5vw, 4rem)', letterSpacing: '-0.03em' }}>
              {section.heading}
            </EditableText>
          )}
          {section.subheading && (
            <EditableText as="p" sectionIndex={index} fieldPath="subheading" value={section.subheading} editable={editable}
              className="text-base opacity-70 max-w-md">
              {section.subheading}
            </EditableText>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-12 gap-4 auto-rows-[140px]">
          {items.map((f, i) => {
            const sizes = ['md:col-span-7 md:row-span-3', 'md:col-span-5 md:row-span-2', 'md:col-span-4 md:row-span-2', 'md:col-span-4 md:row-span-2', 'md:col-span-4 md:row-span-2', 'md:col-span-12 md:row-span-2'];
            const grad = `linear-gradient(${(i * 67) % 360}deg, ${theme.primary}, ${theme.accent})`;
            return (
              <motion.a
                key={i}
                href="#"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.55, delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className={`${sizes[i % sizes.length]} relative rounded-2xl overflow-hidden block`}
                style={{ background: grad, border: `1px solid ${withAlpha(fg, 0.06)}` }}
              >
                <div className="absolute inset-0 flex flex-col justify-end p-6" style={{ color: readableOn(theme.primary) }}>
                  <p className="text-[10px] uppercase tracking-[0.28em] opacity-80 mb-1">{String(i + 1).padStart(2, '0')}</p>
                  <h3 className="text-xl md:text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>{f.title}</h3>
                  {f.description && <p className="text-sm opacity-90 mt-1">{f.description}</p>}
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

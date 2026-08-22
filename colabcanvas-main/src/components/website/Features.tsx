import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { EditableText } from './EditableText';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

/** Bento-grid feature layout — varied tile sizes. */
export function FeatureBento({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  const features = section.features || [];
  return (
    <section className="px-8 md:px-14 py-24 md:py-32" style={{ background: theme.background, color: fg }}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }} className="max-w-3xl mb-14">
          {section.kicker && (
            <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
              className="text-xs uppercase tracking-[0.28em] mb-4 font-medium" style={{ color: theme.accent }}>
              {section.kicker}
            </EditableText>
          )}
          {section.heading && (
            <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
              className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]" style={{ fontFamily: 'var(--font-heading)' }}>
              {section.heading}
            </EditableText>
          )}
          {section.subheading && (
            <EditableText as="p" sectionIndex={index} fieldPath="subheading" value={section.subheading} editable={editable}
              className="text-lg opacity-70 mt-5 leading-relaxed">
              {section.subheading}
            </EditableText>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-6 auto-rows-[200px] gap-4">
          {features.map((f, i) => {
            // Bento sizing pattern
            const sizes = [
              'md:col-span-4 md:row-span-2',
              'md:col-span-2 md:row-span-1',
              'md:col-span-2 md:row-span-1',
              'md:col-span-3 md:row-span-1',
              'md:col-span-3 md:row-span-1',
              'md:col-span-6 md:row-span-1',
            ];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className={`${sizes[i % sizes.length]} relative rounded-3xl p-7 md:p-9 overflow-hidden flex flex-col justify-end group`}
                style={{
                  background: i === 0 ? `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` : theme.surface,
                  color: i === 0 ? readableOn(theme.primary) : fg,
                  border: `1px solid ${withAlpha(fg, 0.06)}`,
                }}
              >
                <EditableText as="h3" sectionIndex={index} fieldPath={`features[${i}].title`} value={f.title} editable={editable}
                  className="text-xl md:text-2xl font-semibold mb-2 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                  {f.title}
                </EditableText>
                <EditableText as="p" sectionIndex={index} fieldPath={`features[${i}].description`} value={f.description} editable={editable}
                  className="text-sm md:text-base opacity-80 leading-relaxed max-w-md">
                  {f.description}
                </EditableText>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Sticky-scroll feature reveal — left text scrolls past pinned right visual. */
export function StickyScrollFeatures({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  const features = section.features || [];
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  return (
    <section ref={ref} className="px-8 md:px-14 relative" style={{ background: theme.background, color: fg }}>
      <div className="max-w-7xl mx-auto py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mb-16">
          {section.heading && (
            <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
              className="text-4xl md:text-6xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              {section.heading}
            </EditableText>
          )}
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 relative">
          <div className="space-y-32">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30%' }}
                transition={{ duration: 0.7 }}
                className="space-y-4"
              >
                <div className="text-xs font-mono opacity-50">{String(i + 1).padStart(2, '0')}</div>
                <EditableText as="h3" sectionIndex={index} fieldPath={`features[${i}].title`} value={f.title} editable={editable}
                  className="text-3xl md:text-4xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                  {f.title}
                </EditableText>
                <EditableText as="p" sectionIndex={index} fieldPath={`features[${i}].description`} value={f.description} editable={editable}
                  className="text-base md:text-lg opacity-75 leading-relaxed">
                  {f.description}
                </EditableText>
              </motion.div>
            ))}
          </div>
          <div className="hidden md:block">
            <motion.div
              style={{ scale: useTransform(scrollYProgress, [0, 1], [0.95, 1.05]) }}
              className="sticky top-24 aspect-square rounded-[2rem] overflow-hidden"
            >
              {section.imageUrl ? (
                <img src={section.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: `radial-gradient(circle at 30% 30%, ${theme.accent}, ${theme.primary})` }} />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Magazine grid — editorial feel. */
export function MagazineGrid({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  const bullets = section.bullets || [];
  return (
    <section className="px-8 md:px-14 py-24 md:py-32" style={{ background: theme.background, color: fg }}>
      <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          {section.kicker && (
            <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
              className="text-xs uppercase tracking-[0.28em] font-medium mb-4" style={{ color: theme.accent }}>
              {section.kicker}
            </EditableText>
          )}
          {section.heading && (
            <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
              className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]" style={{ fontFamily: 'var(--font-heading)' }}>
              {section.heading}
            </EditableText>
          )}
        </div>
        <div className="md:col-span-7 space-y-6">
          {section.body && (
            <EditableText as="p" sectionIndex={index} fieldPath="body" value={section.body} editable={editable}
              className="text-lg md:text-xl opacity-80 leading-relaxed first-letter:text-5xl first-letter:font-semibold first-letter:float-left first-letter:mr-3 first-letter:mt-1"
              style={{ fontFamily: 'var(--font-body)' }}>
              {section.body}
            </EditableText>
          )}
          {bullets.length > 0 && (
            <ul className="space-y-3 pt-4 border-t" style={{ borderColor: withAlpha(fg, 0.12) }}>
              {bullets.map((b, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="flex gap-4 items-start py-3 border-b" style={{ borderColor: withAlpha(fg, 0.08) }}
                >
                  <span className="text-xs font-mono opacity-40 mt-1">{String(i + 1).padStart(2, '0')}</span>
                  <EditableText as="span" sectionIndex={index} fieldPath={`bullets[${i}]`} value={b} editable={editable}
                    className="text-base md:text-lg flex-1">
                    {b}
                  </EditableText>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

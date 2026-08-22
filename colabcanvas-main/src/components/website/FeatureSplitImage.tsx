/**
 * FeatureSplitImage — sticky image left, numbered list right with per-row reveal.
 */
import { motion } from 'framer-motion';
import { EditableText } from './EditableText';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function FeatureSplitImage({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  const items = section.features || [];
  return (
    <section className="px-6 md:px-14 py-24 md:py-32" style={{ background: theme.background, color: fg }}>
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-14">
        <div className="md:sticky md:top-24 self-start">
          {section.kicker && (
            <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
              className="text-xs uppercase tracking-[0.28em] mb-4" style={{ color: theme.accent }}>
              {section.kicker}
            </EditableText>
          )}
          {section.heading && (
            <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
              className="font-semibold leading-[1.0] mb-6"
              style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3.5rem)', letterSpacing: '-0.03em' }}>
              {section.heading}
            </EditableText>
          )}
          <div className="aspect-[4/5] rounded-2xl overflow-hidden">
            {section.imageUrl ? (
              <img src={section.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: `radial-gradient(circle at 30% 30%, ${theme.accent}, ${theme.primary})` }} />
            )}
          </div>
        </div>

        <div className="space-y-2">
          {items.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20%' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="grid grid-cols-[auto_1fr] gap-6 py-7 border-b" style={{ borderColor: withAlpha(fg, 0.1) }}
            >
              <span className="font-mono text-xs opacity-50 mt-2">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <EditableText as="h3" sectionIndex={index} fieldPath={`features[${i}].title`} value={f.title} editable={editable}
                  className="text-2xl md:text-3xl font-semibold tracking-tight mb-2"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                  {f.title}
                </EditableText>
                <EditableText as="p" sectionIndex={index} fieldPath={`features[${i}].description`} value={f.description} editable={editable}
                  className="text-base opacity-75 leading-relaxed">
                  {f.description}
                </EditableText>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

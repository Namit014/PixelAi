/**
 * BentoWithMedia — bento grid where tiles mix image, gradient, video, copy.
 * More varied than the plain FeatureBento.
 */
import { motion } from 'framer-motion';
import { EditableText } from './EditableText';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function BentoWithMedia({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  const features = section.features || [];
  const imageUrl = section.imageUrl;
  return (
    <section className="px-6 md:px-14 py-24 md:py-32" style={{ background: theme.background, color: fg }}>
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-14">
          {section.kicker && (
            <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
              className="text-xs uppercase tracking-[0.28em] font-medium mb-4" style={{ color: theme.accent }}>
              {section.kicker}
            </EditableText>
          )}
          {section.heading && (
            <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
              className="font-semibold leading-[1.0]"
              style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 5vw, 4rem)', letterSpacing: '-0.03em' }}>
              {section.heading}
            </EditableText>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[180px] gap-4">
          {/* Big media tile */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="md:col-span-7 md:row-span-2 rounded-3xl overflow-hidden relative"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }}
          >
            {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0 p-8 flex flex-col justify-end" style={{ background: imageUrl ? `linear-gradient(180deg, transparent 30%, ${withAlpha(theme.primary, 0.85)} 100%)` : undefined, color: readableOn(theme.primary) }}>
              {features[0] && (
                <>
                  <h3 className="text-3xl md:text-4xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>{features[0].title}</h3>
                  <p className="mt-2 text-base opacity-90 max-w-md">{features[0].description}</p>
                </>
              )}
            </div>
          </motion.div>

          {/* Stat tile */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.05 }}
            className="md:col-span-5 md:row-span-1 rounded-3xl p-8 flex flex-col justify-end"
            style={{ background: theme.surface, border: `1px solid ${withAlpha(fg, 0.06)}` }}>
            {features[1] && (
              <>
                <p className="text-xs uppercase tracking-[0.28em] opacity-60 mb-3">{features[1].title}</p>
                <p className="font-semibold leading-[0.95]" style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', color: theme.accent }}>
                  {features[1].description?.split(/\s+/)[0] ?? '∞'}
                </p>
              </>
            )}
          </motion.div>

          {/* Smaller tiles */}
          {features.slice(2, 6).map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.05 }}
              className={`${i === 0 ? 'md:col-span-5' : i === 3 ? 'md:col-span-7' : 'md:col-span-3'} md:row-span-1 rounded-3xl p-7 flex flex-col justify-end`}
              style={{ background: i === 3 ? theme.foreground : theme.surface, color: i === 3 ? readableOn(theme.foreground) : fg, border: `1px solid ${withAlpha(fg, 0.06)}` }}
            >
              <h4 className="text-xl md:text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>{f.title}</h4>
              <p className="text-sm md:text-base opacity-80 mt-1.5 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

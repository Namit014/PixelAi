/**
 * HeroSplitScroll — left text pinned, right column scroll-snaps through
 * stacked product/feature shots. Best for: SaaS, products with multiple states.
 */
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { EditableText } from './EditableText';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function HeroSplitScroll({ section, index, theme, brand, editable, art }: SectionProps) {
  const fg = readableOn(theme.background);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const parallax = art?.tokens.parallax ?? 120;
  const y = useTransform(scrollYProgress, [0, 1], [0, -parallax]);
  const tiles = [section.imageUrl, section.imageUrl, section.imageUrl].filter(Boolean) as string[];

  return (
    <section ref={ref} className="relative grid md:grid-cols-2" style={{ background: theme.background, color: fg, minHeight: '100vh' }}>
      <div className="sticky top-0 h-screen flex flex-col justify-center px-8 md:px-14">
        <motion.div style={{ y }} className="space-y-6 max-w-xl">
          {section.kicker && (
            <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
              className="text-xs uppercase tracking-[0.32em] font-medium" style={{ color: theme.accent }}>
              {section.kicker}
            </EditableText>
          )}
          {section.heading && (
            <EditableText as="h1" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
              className="font-semibold leading-[0.95]"
              style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '-0.035em' }}>
              {section.heading}
            </EditableText>
          )}
          {section.subheading && (
            <EditableText as="p" sectionIndex={index} fieldPath="subheading" value={section.subheading} editable={editable}
              className="text-lg opacity-75 leading-relaxed">
              {section.subheading}
            </EditableText>
          )}
          {section.ctaText && (
            <button className="inline-flex items-center gap-2 px-7 py-4 text-sm font-medium"
              style={{ background: theme.foreground, color: readableOn(theme.foreground), borderRadius: 'var(--site-radius-btn, 999px)' }}>
              <EditableText as="span" sectionIndex={index} fieldPath="ctaText" value={section.ctaText} editable={editable}>
                {section.ctaText}
              </EditableText>
              <span>→</span>
            </button>
          )}
        </motion.div>
      </div>

      <div className="relative" style={{ background: theme.surface }}>
        <div className="snap-y snap-mandatory overflow-y-auto h-screen md:h-auto">
          {(tiles.length ? tiles : [null, null, null]).map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30%' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="snap-start h-screen flex items-center justify-center p-12"
            >
              {src ? (
                <img src={src} alt="" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
              ) : (
                <div className="w-full max-w-lg aspect-[4/5] rounded-2xl"
                  style={{ background: `linear-gradient(${i * 60}deg, ${theme.primary}, ${theme.accent})`, boxShadow: `0 30px 80px -20px ${withAlpha(theme.primary, 0.4)}` }} />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * CtaOversizedQuestion — full-screen single-question closer ("Ready?") with a
 * giant CTA. Best for: launches, manifestos, agency portfolios.
 */
import { motion } from 'framer-motion';
import { EditableText } from './EditableText';
import type { SectionProps } from './types';
import { readableOn } from './types';

export function CtaOversizedQuestion({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  return (
    <section className="relative px-6 md:px-14 flex flex-col justify-center items-center text-center" style={{ background: theme.background, color: fg, minHeight: '90vh' }}>
      {section.kicker && (
        <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
          className="text-xs uppercase tracking-[0.32em] opacity-60 mb-8">
          {section.kicker}
        </EditableText>
      )}
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
        {section.heading && (
          <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
            className="font-semibold leading-[0.92]"
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(3rem, 12vw, 12rem)', letterSpacing: '-0.045em' }}>
            {section.heading}
          </EditableText>
        )}
      </motion.div>
      {section.ctaText && (
        <motion.button
          whileHover={{ scale: 1.04 }}
          className="mt-12 inline-flex items-center gap-3 px-10 py-5 text-base font-medium"
          style={{ background: theme.accent, color: readableOn(theme.accent), borderRadius: 'var(--site-radius-btn, 999px)' }}
        >
          <EditableText as="span" sectionIndex={index} fieldPath="ctaText" value={section.ctaText} editable={editable}>
            {section.ctaText}
          </EditableText>
          <span>→</span>
        </motion.button>
      )}
      {section.urgency && (
        <EditableText as="p" sectionIndex={index} fieldPath="urgency" value={section.urgency} editable={editable}
          className="mt-6 text-sm opacity-70">
          {section.urgency}
        </EditableText>
      )}
    </section>
  );
}

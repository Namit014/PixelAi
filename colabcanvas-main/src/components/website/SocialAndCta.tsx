import { motion } from 'framer-motion';
import { EditableText } from './EditableText';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

/** Marquee strip of testimonials scrolling horizontally. */
export function TestimonialMarquee({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.surface);
  const t = section.testimonials || [];
  const doubled = [...t, ...t];

  return (
    <section className="py-24 overflow-hidden" style={{ background: theme.surface, color: fg }}>
      <div className="max-w-7xl mx-auto px-8 md:px-14 mb-12">
        {section.kicker && (
          <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
            className="text-xs uppercase tracking-[0.28em] mb-3 font-medium" style={{ color: theme.accent }}>
            {section.kicker}
          </EditableText>
        )}
        {section.heading && (
          <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
            className="text-3xl md:text-5xl font-semibold tracking-tight max-w-2xl" style={{ fontFamily: 'var(--font-heading)' }}>
            {section.heading}
          </EditableText>
        )}
      </div>

      <style>{`
        @keyframes wp-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .wp-marquee-track { animation: wp-marquee 40s linear infinite; }
      `}</style>

      <div className="flex gap-6 wp-marquee-track w-max">
        {doubled.map((tm, i) => (
          <div key={i} className="w-[380px] shrink-0 rounded-2xl p-7" style={{ background: theme.background, border: `1px solid ${withAlpha(fg, 0.08)}` }}>
            <p className="text-base leading-relaxed mb-5" style={{ fontFamily: 'var(--font-body)' }}>"{tm.quote}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }} />
              <div>
                <p className="text-sm font-medium">{tm.name}</p>
                {tm.role && <p className="text-xs opacity-60">{tm.role}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Animated stat ticker band. */
export function StatBand({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.primary);
  const stats = section.stats || [];
  return (
    <section className="py-20" style={{ background: theme.primary, color: fg }}>
      <div className="max-w-7xl mx-auto px-8 md:px-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <EditableText as="p" sectionIndex={index} fieldPath={`stats[${i}].value`} value={s.value} editable={editable}
              className="text-5xl md:text-7xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: theme.accent }}>
              {s.value}
            </EditableText>
            <EditableText as="p" sectionIndex={index} fieldPath={`stats[${i}].label`} value={s.label} editable={editable}
              className="text-xs uppercase tracking-[0.2em] mt-3 opacity-80">
              {s.label}
            </EditableText>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/** FAQ accordion. */
export function FaqAccordion({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  return (
    <section className="px-8 md:px-14 py-24" style={{ background: theme.background, color: fg }}>
      <div className="max-w-4xl mx-auto">
        {section.heading && (
          <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
            className="text-4xl md:text-5xl font-semibold tracking-tight mb-12" style={{ fontFamily: 'var(--font-heading)' }}>
            {section.heading}
          </EditableText>
        )}
        <div className="space-y-3">
          {(section.faqs || []).map((f, i) => (
            <motion.details
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group rounded-2xl px-6 py-5 cursor-pointer"
              style={{ background: theme.surface, border: `1px solid ${withAlpha(fg, 0.06)}` }}
            >
              <summary className="flex items-center justify-between font-medium text-base md:text-lg list-none">
                <EditableText as="span" sectionIndex={index} fieldPath={`faqs[${i}].question`} value={f.question} editable={editable}>
                  {f.question}
                </EditableText>
                <span className="ml-4 text-2xl opacity-50 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <EditableText as="p" sectionIndex={index} fieldPath={`faqs[${i}].answer`} value={f.answer} editable={editable}
                className="mt-4 text-sm md:text-base opacity-75 leading-relaxed">
                {f.answer}
              </EditableText>
            </motion.details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Pricing tiers. */
export function PricingTiers({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  const tiers = section.pricing || [];
  return (
    <section className="px-8 md:px-14 py-24" style={{ background: theme.background, color: fg }}>
      <div className="max-w-6xl mx-auto">
        {section.heading && (
          <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
            className="text-4xl md:text-5xl font-semibold tracking-tight text-center mb-14" style={{ fontFamily: 'var(--font-heading)' }}>
            {section.heading}
          </EditableText>
        )}
        <div className="grid md:grid-cols-3 gap-5">
          {tiers.map((t, i) => {
            const highlighted = t.highlighted;
            const tBg = highlighted ? theme.foreground : theme.surface;
            const tFg = readableOn(tBg);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-3xl p-8 relative"
                style={{ background: tBg, color: tFg, border: highlighted ? 'none' : `1px solid ${withAlpha(fg, 0.08)}` }}
              >
                {highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider px-3 py-1 rounded-full" style={{ background: theme.accent, color: readableOn(theme.accent) }}>Most popular</span>
                )}
                <p className="text-xs uppercase tracking-[0.2em] opacity-60">{t.name}</p>
                <p className="text-5xl font-semibold mt-3 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>{t.price}</p>
                {t.description && <p className="text-sm opacity-70 mt-3">{t.description}</p>}
                <ul className="mt-6 space-y-2.5">
                  {(t.features || []).map((f, j) => (
                    <li key={j} className="text-sm flex gap-2 items-start">
                      <span className="mt-1" style={{ color: theme.accent }}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Final CTA banner. */
export function CtaBanner({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.foreground);
  return (
    <section className="px-8 md:px-14 py-24" style={{ background: theme.foreground, color: fg }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="max-w-4xl mx-auto text-center"
      >
        {section.kicker && (
          <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
            className="text-xs uppercase tracking-[0.28em] mb-5" style={{ color: theme.accent }}>
            {section.kicker}
          </EditableText>
        )}
        {section.heading && (
          <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
            className="text-4xl md:text-7xl font-semibold tracking-tight leading-[1.05]" style={{ fontFamily: 'var(--font-heading)' }}>
            {section.heading}
          </EditableText>
        )}
        {section.subheading && (
          <EditableText as="p" sectionIndex={index} fieldPath="subheading" value={section.subheading} editable={editable}
            className="mt-6 text-lg opacity-80 max-w-xl mx-auto">
            {section.subheading}
          </EditableText>
        )}
        {section.ctaText && (
          <button className="mt-10 inline-flex items-center gap-2 px-10 py-5 rounded-full text-base font-medium" style={{ background: theme.accent, color: readableOn(theme.accent) }}>
            <EditableText as="span" sectionIndex={index} fieldPath="ctaText" value={section.ctaText} editable={editable}>
              {section.ctaText}
            </EditableText>
            <span>→</span>
          </button>
        )}
        {section.urgency && (
          <EditableText as="p" sectionIndex={index} fieldPath="urgency" value={section.urgency} editable={editable}
            className="text-sm mt-5 opacity-70">
            {section.urgency}
          </EditableText>
        )}
      </motion.div>
    </section>
  );
}

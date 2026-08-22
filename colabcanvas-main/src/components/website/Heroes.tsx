import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { WebGLHero } from './WebGLHero';
import { EditableText } from './EditableText';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

/** Asymmetric magazine-style hero with WebGL background. */
export function HeroAsymmetric({ section, index, theme, brand, editable, dna }: SectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const parallax = dna?.tokens.parallax ?? 120;
  const y = useTransform(scrollYProgress, [0, 1], [0, -parallax]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const fg = readableOn(theme.foreground);

  return (
    <section ref={ref} className="relative overflow-hidden" style={{ background: theme.foreground, color: fg, minHeight: '92vh' }}>
      <div className="absolute inset-0 opacity-90">
        <WebGLHero
          primary={theme.primary}
          accent={theme.accent}
          surface={theme.foreground}
          scene={dna?.heroScene}
          className="w-full h-full"
        />
      </div>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 0%, ${withAlpha(theme.foreground, 0.4)} 70%, ${theme.foreground} 100%)` }} />

      <motion.div style={{ y, opacity }} className="relative z-10 max-w-7xl mx-auto px-8 md:px-14 pt-32 pb-24 grid md:grid-cols-12 gap-8 items-end min-h-[92vh]">
        <div className="md:col-span-8 space-y-7">
          {section.kicker && (
            <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
              className="text-[11px] uppercase tracking-[0.32em] font-medium" style={{ color: theme.accent }}>
              {section.kicker}
            </EditableText>
          )}
          {section.heading && (
            <EditableText as="h1" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
              className="text-[clamp(2.5rem,7vw,6rem)] leading-[0.95] font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}>
              {section.heading}
            </EditableText>
          )}
          {section.subheading && (
            <EditableText as="p" sectionIndex={index} fieldPath="subheading" value={section.subheading} editable={editable}
              className="text-lg md:text-2xl max-w-2xl opacity-85 leading-relaxed">
              {section.subheading}
            </EditableText>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-4">
            {section.ctaText && (
              <button className="group relative inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-medium overflow-hidden"
                style={{ background: theme.accent, color: readableOn(theme.accent) }}>
                <EditableText as="span" sectionIndex={index} fieldPath="ctaText" value={section.ctaText} editable={editable}>
                  {section.ctaText}
                </EditableText>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </button>
            )}
            {section.secondaryCtaText && (
              <button className="px-7 py-4 rounded-full text-sm font-medium border" style={{ borderColor: withAlpha(fg, 0.3), color: fg }}>
                <EditableText as="span" sectionIndex={index} fieldPath="secondaryCtaText" value={section.secondaryCtaText} editable={editable}>
                  {section.secondaryCtaText}
                </EditableText>
              </button>
            )}
          </div>
        </div>

        <div className="md:col-span-4 hidden md:block">
          {section.imageUrl ? (
            <motion.img
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              src={section.imageUrl} alt="" className="w-full aspect-[3/4] object-cover rounded-3xl shadow-2xl" />
          ) : (
            <div className="w-full aspect-[3/4] rounded-3xl" style={{ background: withAlpha(theme.accent, 0.15), border: `1px solid ${withAlpha(fg, 0.1)}` }} />
          )}
        </div>
      </motion.div>
    </section>
  );
}

/** Split hero — copy left, big image right. */
export function HeroSplit({ section, index, theme, brand, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  return (
    <section className="relative overflow-hidden" style={{ background: theme.background, color: fg, minHeight: '90vh' }}>
      <div className="max-w-7xl mx-auto px-8 md:px-14 py-24 grid md:grid-cols-2 gap-12 items-center min-h-[90vh]">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="space-y-6">
          {section.kicker && (
            <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
              className="text-xs uppercase tracking-[0.28em] font-medium" style={{ color: theme.accent }}>
              {section.kicker}
            </EditableText>
          )}
          {section.heading && (
            <EditableText as="h1" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
              className="text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1.05] font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}>
              {section.heading}
            </EditableText>
          )}
          {section.subheading && (
            <EditableText as="p" sectionIndex={index} fieldPath="subheading" value={section.subheading} editable={editable}
              className="text-lg opacity-75 max-w-xl leading-relaxed">
              {section.subheading}
            </EditableText>
          )}
          {section.ctaText && (
            <div className="pt-3">
              <button className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-medium" style={{ background: theme.accent, color: readableOn(theme.accent) }}>
                <EditableText as="span" sectionIndex={index} fieldPath="ctaText" value={section.ctaText} editable={editable}>
                  {section.ctaText}
                </EditableText>
                <span>→</span>
              </button>
            </div>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }} className="relative">
          {section.imageUrl ? (
            <img src={section.imageUrl} alt="" className="w-full aspect-square object-cover rounded-[2rem] shadow-xl" />
          ) : (
            <div className="w-full aspect-square rounded-[2rem]" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }} />
          )}
        </motion.div>
      </div>
    </section>
  );
}

/** Fullbleed hero — image as background. */
export function HeroFullbleed({ section, index, theme, editable }: SectionProps) {
  return (
    <section className="relative overflow-hidden flex items-center justify-center" style={{ minHeight: '92vh', background: theme.foreground }}>
      {section.imageUrl && (
        <img src={section.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${withAlpha(theme.foreground, 0.4)}, ${withAlpha(theme.foreground, 0.85)})` }} />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
        className="relative z-10 text-center px-8 max-w-4xl mx-auto" style={{ color: '#fff' }}>
        {section.kicker && (
          <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
            className="text-xs uppercase tracking-[0.32em] mb-5 opacity-80">
            {section.kicker}
          </EditableText>
        )}
        {section.heading && (
          <EditableText as="h1" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
            className="text-[clamp(2.5rem,7vw,6rem)] font-semibold tracking-tight leading-[0.95]"
            style={{ fontFamily: 'var(--font-heading)' }}>
            {section.heading}
          </EditableText>
        )}
        {section.subheading && (
          <EditableText as="p" sectionIndex={index} fieldPath="subheading" value={section.subheading} editable={editable}
            className="text-lg md:text-xl mt-6 opacity-90 max-w-2xl mx-auto">
            {section.subheading}
          </EditableText>
        )}
        {section.ctaText && (
          <button className="mt-10 inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-medium" style={{ background: theme.accent, color: readableOn(theme.accent) }}>
            <EditableText as="span" sectionIndex={index} fieldPath="ctaText" value={section.ctaText} editable={editable}>
              {section.ctaText}
            </EditableText>
            <span>→</span>
          </button>
        )}
      </motion.div>
    </section>
  );
}

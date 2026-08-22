/**
 * HeroOversizedMark — single giant glyph (first letter of brand) as the
 * composition; copy nestled in margin. Pentagram / studio aesthetic.
 */
import { motion } from 'framer-motion';
import { EditableText } from './EditableText';
import { GrainOverlay } from './primitives/GrainOverlay';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function HeroOversizedMark({ section, index, theme, brand, editable, art }: SectionProps) {
  const fg = readableOn(theme.background);
  const glyph = (brand.name || section.heading || 'A').trim().charAt(0).toUpperCase();
  const grain = art?.tokens.grain ?? 0;

  return (
    <section className="relative overflow-hidden" style={{ background: theme.background, color: fg, minHeight: '100vh' }}>
      {grain > 0 && <GrainOverlay opacity={grain} blendMode="multiply" />}

      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
        aria-hidden
      >
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: 'clamp(20rem, 70vw, 60rem)',
            lineHeight: 0.78,
            letterSpacing: '-0.06em',
            color: theme.accent,
            opacity: 0.92,
          }}
        >
          {glyph}
        </span>
      </motion.div>

      <div className="relative z-10 grid grid-rows-[auto_1fr_auto] min-h-[100vh] px-8 md:px-14 py-10">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.32em] opacity-70">
          <span>{brand.name}</span>
          {section.kicker && (
            <EditableText as="span" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}>
              {section.kicker}
            </EditableText>
          )}
        </div>

        <div />

        <div className="grid md:grid-cols-2 gap-10 items-end">
          <div className="space-y-4">
            {section.heading && (
              <EditableText as="h1" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
                className="font-semibold leading-[1.0]"
                style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4.5vw, 4rem)', letterSpacing: '-0.03em' }}>
                {section.heading}
              </EditableText>
            )}
            {section.subheading && (
              <EditableText as="p" sectionIndex={index} fieldPath="subheading" value={section.subheading} editable={editable}
                className="text-base md:text-lg opacity-80 max-w-md leading-relaxed">
                {section.subheading}
              </EditableText>
            )}
          </div>
          <div className="flex md:justify-end items-end gap-3">
            {section.ctaText && (
              <button className="px-7 py-4 text-sm font-medium"
                style={{ background: theme.foreground, color: readableOn(theme.foreground), borderRadius: 'var(--site-radius-btn, 4px)' }}>
                <EditableText as="span" sectionIndex={index} fieldPath="ctaText" value={section.ctaText} editable={editable}>
                  {section.ctaText}
                </EditableText>
              </button>
            )}
            {section.secondaryCtaText && (
              <button className="px-7 py-4 text-sm font-medium border" style={{ borderColor: withAlpha(fg, 0.3), color: fg, borderRadius: 'var(--site-radius-btn, 4px)' }}>
                {section.secondaryCtaText}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

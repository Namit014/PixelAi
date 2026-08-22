/**
 * HeroKineticType — oversized headline, per-word slide-up reveal,
 * marquee subline, optional grain. Best for: launches, manifestos.
 */
import { motion } from 'framer-motion';
import { EditableText } from './EditableText';
import { KineticHeading } from './primitives/KineticHeading';
import { MarqueeStrip } from './primitives/MarqueeStrip';
import { GrainOverlay } from './primitives/GrainOverlay';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function HeroKineticType({ section, index, theme, brand, editable, art }: SectionProps) {
  const fg = readableOn(theme.foreground);
  const grain = art?.tokens.grain ?? 0;
  const subline = section.subheading || section.kicker || brand.name || '';
  return (
    <section className="relative overflow-hidden flex flex-col justify-between" style={{ background: theme.foreground, color: fg, minHeight: '100vh' }}>
      {grain > 0 && <GrainOverlay opacity={grain} blendMode="overlay" />}

      <div className="px-6 md:px-14 pt-32 md:pt-40 relative z-10">
        {section.kicker && (
          <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
            className="text-[11px] uppercase tracking-[0.32em] mb-6 opacity-60">
            {section.kicker}
          </EditableText>
        )}
        {section.heading && (
          <KineticHeading
            text={section.heading}
            as="h1"
            className="font-semibold leading-[0.88]"
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(3rem, 12vw, 11rem)', letterSpacing: '-0.04em' }}
          />
        )}
      </div>

      <div className="relative z-10 mt-16">
        {subline && (
          <MarqueeStrip speed={40} gap={64}>
            <span style={{ fontSize: 'clamp(1rem, 2vw, 1.6rem)', fontFamily: 'var(--font-body)', opacity: 0.85 }}>
              {subline} <span style={{ color: theme.accent, margin: '0 1.5rem' }}>✦</span>
            </span>
          </MarqueeStrip>
        )}
        <div className="flex items-end justify-between px-6 md:px-14 py-10 border-t" style={{ borderColor: withAlpha(fg, 0.12) }}>
          <div className="max-w-md">
            {section.subheading && (
              <EditableText as="p" sectionIndex={index} fieldPath="subheading" value={section.subheading} editable={editable}
                className="text-base md:text-lg opacity-80 leading-relaxed">
                {section.subheading}
              </EditableText>
            )}
          </div>
          {section.ctaText && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              className="inline-flex items-center gap-2 px-7 py-4 text-sm font-medium"
              style={{ background: theme.accent, color: readableOn(theme.accent), borderRadius: 'var(--site-radius-btn, 999px)' }}
            >
              <EditableText as="span" sectionIndex={index} fieldPath="ctaText" value={section.ctaText} editable={editable}>
                {section.ctaText}
              </EditableText>
              <span>→</span>
            </motion.button>
          )}
        </div>
      </div>
    </section>
  );
}

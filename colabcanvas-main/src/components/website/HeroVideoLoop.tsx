/**
 * HeroVideoLoop — looping muted video (or animated CSS gradient as fallback)
 * as the background, copy on top with cinematic darken.
 */
import { motion } from 'framer-motion';
import { EditableText } from './EditableText';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function HeroVideoLoop({ section, index, theme, brand, editable }: SectionProps) {
  const videoUrl = (section as any).videoUrl as string | undefined;
  return (
    <section className="relative overflow-hidden flex items-end" style={{ minHeight: '100vh', background: theme.foreground, color: '#fff' }}>
      {videoUrl ? (
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
          <source src={videoUrl} />
        </video>
      ) : section.imageUrl ? (
        <motion.img
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 12, ease: 'easeOut' }}
          src={section.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 animate-[wp-video-bg_18s_ease_infinite]"
          style={{ background: `linear-gradient(120deg, ${theme.primary}, ${theme.accent}, ${theme.foreground})`, backgroundSize: '300% 300%' }} />
      )}
      <style>{`@keyframes wp-video-bg{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}`}</style>

      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${withAlpha('#000000', 0.2)} 0%, ${withAlpha('#000000', 0.65)} 100%)` }} />

      <div className="relative z-10 px-8 md:px-14 pb-20 max-w-5xl">
        {section.kicker && (
          <EditableText as="p" sectionIndex={index} fieldPath="kicker" value={section.kicker} editable={editable}
            className="text-xs uppercase tracking-[0.32em] mb-5 opacity-80">
            {section.kicker}
          </EditableText>
        )}
        {section.heading && (
          <EditableText as="h1" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
            className="font-semibold leading-[0.95]"
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.5rem, 7vw, 6.5rem)', letterSpacing: '-0.035em' }}>
            {section.heading}
          </EditableText>
        )}
        {section.subheading && (
          <EditableText as="p" sectionIndex={index} fieldPath="subheading" value={section.subheading} editable={editable}
            className="mt-6 text-lg md:text-xl max-w-xl opacity-90">
            {section.subheading}
          </EditableText>
        )}
        {section.ctaText && (
          <button className="mt-10 inline-flex items-center gap-2 px-8 py-4 text-sm font-medium"
            style={{ background: theme.accent, color: readableOn(theme.accent), borderRadius: 'var(--site-radius-btn, 999px)' }}>
            <EditableText as="span" sectionIndex={index} fieldPath="ctaText" value={section.ctaText} editable={editable}>
              {section.ctaText}
            </EditableText>
            <span>→</span>
          </button>
        )}
      </div>
    </section>
  );
}

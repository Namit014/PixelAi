/**
 * FooterMassive — Awwwards-style oversized brand wordmark + minimal links.
 * Use as a closer instead of (or alongside) the small NavFooter.
 */
import { motion } from 'framer-motion';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function FooterMassive({ section, theme, brand }: SectionProps) {
  const fg = readableOn(theme.foreground);
  const big = (brand.name || section.heading || 'Studio').toUpperCase();
  return (
    <section className="relative overflow-hidden" style={{ background: theme.foreground, color: fg }}>
      <div className="px-6 md:px-14 pt-20 pb-10 grid md:grid-cols-3 gap-10">
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.32em] opacity-60">Office</p>
          <p className="text-base">Built worldwide.<br/>Hello@ — say hi.</p>
        </div>
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.32em] opacity-60">Site</p>
          <ul className="space-y-1.5 text-base">
            <li><a className="hover:opacity-70 cursor-pointer">Work</a></li>
            <li><a className="hover:opacity-70 cursor-pointer">About</a></li>
            <li><a className="hover:opacity-70 cursor-pointer">Contact</a></li>
          </ul>
        </div>
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.32em] opacity-60">Social</p>
          <ul className="space-y-1.5 text-base">
            <li><a className="hover:opacity-70 cursor-pointer">Instagram</a></li>
            <li><a className="hover:opacity-70 cursor-pointer">LinkedIn</a></li>
            <li><a className="hover:opacity-70 cursor-pointer">Dribbble</a></li>
          </ul>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="leading-[0.78] font-semibold text-center px-2"
        style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(4rem, 22vw, 22rem)', letterSpacing: '-0.05em', color: theme.accent }}
      >
        {big}
      </motion.div>

      <div className="flex items-center justify-between px-6 md:px-14 pb-6 pt-4 text-[11px] opacity-60" style={{ borderTop: `1px solid ${withAlpha(fg, 0.1)}` }}>
        <span>© {new Date().getFullYear()} {brand.name}</span>
        <span>Built with care</span>
      </div>
    </section>
  );
}

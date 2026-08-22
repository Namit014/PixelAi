import { motion } from 'framer-motion';
import { EditableText } from './EditableText';
import type { SectionProps, Brand, Theme } from './types';
import { readableOn, withAlpha } from './types';

interface NavProps {
  brand: Brand;
  theme: Theme;
  navLinks?: Array<{ label: string; href?: string }>;
  ctaText?: string;
}

export function Nav({ brand, theme, navLinks, ctaText }: NavProps) {
  const fg = readableOn(theme.background);
  const links = navLinks?.length ? navLinks : [
    { label: 'Product' }, { label: 'Features' }, { label: 'Pricing' }, { label: 'About' },
  ];
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{ background: withAlpha(theme.background, 0.7), color: fg, borderBottom: `1px solid ${withAlpha(fg, 0.08)}` }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name || ''} className="h-8 w-auto object-contain" />
          ) : (
            <div className="h-8 w-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }} />
          )}
          <span className="text-base font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>{brand.name || 'Brand'}</span>
        </div>
        <div className="hidden md:flex items-center gap-7">
          {links.map((l, i) => (
            <a key={i} className="text-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer">{l.label}</a>
          ))}
        </div>
        {ctaText && (
          <button className="text-xs font-medium px-4 py-2 rounded-full" style={{ background: theme.accent, color: readableOn(theme.accent) }}>
            {ctaText}
          </button>
        )}
      </div>
    </motion.nav>
  );
}

export function Footer({ brand, theme }: { brand: Brand; theme: Theme }) {
  const fg = readableOn(theme.foreground);
  return (
    <footer className="px-8 md:px-14 py-16" style={{ background: theme.foreground, color: fg, borderTop: `1px solid ${withAlpha(fg, 0.08)}` }}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name || ''} className="h-10 w-auto object-contain" style={{ filter: fg === '#ffffff' ? 'brightness(0) invert(1)' : undefined }} />
          ) : (
            <div className="h-10 w-10 rounded-xl" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }} />
          )}
          <div>
            <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>{brand.name || 'Brand'}</p>
            <p className="text-xs opacity-50 mt-0.5">© {new Date().getFullYear()} {brand.name || 'All rights reserved'}.</p>
          </div>
        </div>
        <div className="flex gap-6 text-sm opacity-70">
          <a className="hover:opacity-100 cursor-pointer">Privacy</a>
          <a className="hover:opacity-100 cursor-pointer">Terms</a>
          <a className="hover:opacity-100 cursor-pointer">Contact</a>
        </div>
      </div>
    </footer>
  );
}

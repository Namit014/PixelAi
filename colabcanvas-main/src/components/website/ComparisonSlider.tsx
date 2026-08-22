/**
 * ComparisonSlider — draggable before/after image slider.
 * Falls back to two gradients labelled "Before" / "After".
 */
import { useState } from 'react';
import { EditableText } from './EditableText';
import type { SectionProps } from './types';
import { readableOn, withAlpha } from './types';

export function ComparisonSlider({ section, index, theme, editable }: SectionProps) {
  const fg = readableOn(theme.background);
  const [pct, setPct] = useState(50);
  const before = (section as any).beforeUrl || section.imageUrl || null;
  const after = (section as any).afterUrl || section.imageUrl || null;

  const handle = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const v = ((e.clientX - r.left) / r.width) * 100;
    setPct(Math.max(0, Math.min(100, v)));
  };

  return (
    <section className="px-6 md:px-14 py-24" style={{ background: theme.background, color: fg }}>
      <div className="max-w-6xl mx-auto">
        {section.heading && (
          <EditableText as="h2" sectionIndex={index} fieldPath="heading" value={section.heading} editable={editable}
            className="font-semibold mb-8 leading-[1.0]"
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.75rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
            {section.heading}
          </EditableText>
        )}
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden cursor-ew-resize select-none" onMouseMove={handle} onTouchMove={(e) => {
          const t = e.touches[0]; const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPct(((t.clientX - r.left) / r.width) * 100);
        }}>
          <div className="absolute inset-0" style={{ background: after ? `url(${after}) center/cover` : `linear-gradient(135deg, ${theme.accent}, ${theme.primary})` }} />
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%`, background: before ? `url(${before}) center/cover` : `linear-gradient(135deg, ${theme.surface}, ${theme.foreground})` }} />
          <div className="absolute top-0 bottom-0" style={{ left: `${pct}%`, width: 2, background: '#fff', boxShadow: '0 0 0 2px rgba(0,0,0,0.1)' }}>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center" style={{ color: '#000', fontWeight: 600 }}>↔</div>
          </div>
          <span className="absolute top-4 left-4 text-xs uppercase tracking-[0.28em] px-3 py-1.5 rounded-full" style={{ background: withAlpha('#000', 0.5), color: '#fff' }}>Before</span>
          <span className="absolute top-4 right-4 text-xs uppercase tracking-[0.28em] px-3 py-1.5 rounded-full" style={{ background: withAlpha('#000', 0.5), color: '#fff' }}>After</span>
        </div>
      </div>
    </section>
  );
}

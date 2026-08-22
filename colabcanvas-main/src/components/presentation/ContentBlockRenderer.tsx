import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import type { ContentBlock, DesignTokens, BlockStyle } from '@/types/presentation';
import { CountdownRenderer as CountdownRendererComp, AnimatedCounterRenderer as AnimatedCounterRendererComp, BeforeAfterRenderer as BeforeAfterRendererComp, ToggleRevealRenderer as ToggleRevealRendererComp, LiveTickerRenderer as LiveTickerRendererComp } from './InteractiveBlocks';
import { RenderIcon } from './IconHelper';
import { EditableText } from './EditableText';
import { IconPickerPopover } from './IconPickerPopover';
import { usePresentationStore } from '@/stores/presentationStore';
import { BrandLogoMap, BrandLogoIcon } from './BrandLogos';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ScatterChart, Scatter, RadarChart, Radar as RadarShape, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart,
} from 'recharts';

interface Props {
  block: ContentBlock;
  tokens: DesignTokens;
  onClick?: () => void;
  isEditing?: boolean;
  slideId?: string;
  allBlocks?: ContentBlock[];
  isIsolated?: boolean;
}

const getCardStyle = (tokens: DesignTokens): React.CSSProperties => {
  const style = tokens.cardStyle || 'elevated';
  const base: React.CSSProperties = { borderRadius: tokens.borderRadius, padding: 24 };
  switch (style) {
    case 'glass': return { ...base, backgroundColor: `${tokens.surfaceColor}99`, backdropFilter: 'blur(12px)', border: `1px solid ${tokens.surfaceColor}66` };
    case 'elevated': return { ...base, backgroundColor: tokens.surfaceColor, boxShadow: `0 4px 24px ${tokens.textColor}0a` };
    case 'outlined': return { ...base, backgroundColor: 'transparent', border: `1.5px solid ${tokens.mutedTextColor}33` };
    default: return { ...base, backgroundColor: tokens.surfaceColor };
  }
};

// ── Per-item background helper ───────────────────────────────────────
const getItemBg = (item: any, fallback?: string): string | undefined => {
  if (item?.bgImage) return `url(${item.bgImage}) center/cover no-repeat`;
  if (item?.bgGradient) return item.bgGradient;
  if (item?.bgColor) return item.bgColor;
  return fallback;
};

const getItemOverrideStyle = (item: any): React.CSSProperties => {
  const bg = getItemBg(item);
  return {
    ...(bg ? { background: bg } : {}),
    ...(item?.textColor ? { color: item.textColor } : {}),
  };
};

const AccentGradient = (tokens: DesignTokens) => {
  if (tokens.gradientStart && tokens.gradientEnd) return `linear-gradient(135deg, ${tokens.gradientStart}, ${tokens.gradientEnd})`;
  return tokens.accentColor;
};

// ── Inline editable icon wrapper ─────────────────────────────────────
function EditableIcon({ name, size, color, isEditing, onSelect, tokens }: {
  name: string; size: number; color: string; isEditing?: boolean;
  onSelect: (icon: string) => void; tokens: DesignTokens;
}) {
  if (!isEditing) return <RenderIcon name={name} size={size} color={color} />;
  return (
    <IconPickerPopover currentIcon={name} onSelect={onSelect} accentColor={tokens.accentColor}>
      <div style={{ cursor: 'pointer', position: 'relative' }} title="Click to change icon">
        <RenderIcon name={name} size={size} color={color} />
        <div style={{
          position: 'absolute', inset: -4, borderRadius: 4,
          border: `1px dashed ${tokens.accentColor}66`,
          pointerEvents: 'none',
        }} />
      </div>
    </IconPickerPopover>
  );
}

// ── Add / Remove Item Controls ───────────────────────────────────────
function AddItemButton({ onClick, accentColor }: { onClick: () => void; accentColor: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        width: '100%', padding: '8px 0', marginTop: 8,
        border: `1.5px dashed ${accentColor}40`, borderRadius: 8,
        backgroundColor: `${accentColor}08`, color: accentColor,
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = `${accentColor}15`; }}
      onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = `${accentColor}08`; }}
    >
      + Add item
    </button>
  );
}

function RemoveItemButton({ onClick, accentColor }: { onClick: () => void; accentColor: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: 'absolute', top: -6, right: -6,
        width: 20, height: 20, borderRadius: '50%',
        backgroundColor: '#ef4444', color: '#fff',
        border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: 0, transition: 'opacity 0.15s', zIndex: 10,
      }}
      className="group-hover/item:!opacity-100"
    >
      ×
    </button>
  );
}

// ── Accordion Item ───────────────────────────────────────────────────
function AccordionItem({ item, index, tokens, accentGrad, editing, save, block }: any) {
  const [open, setOpen] = useState(item.defaultOpen || false);
  return (
    <div style={{ borderRadius: tokens.borderRadius, border: `1px solid ${tokens.mutedTextColor}20`, overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer', backgroundColor: open ? `${tokens.accentColor}08` : tokens.surfaceColor, transition: 'background 0.2s' }}>
        <EditableText value={item.title} onSave={(t: string) => { const items = [...block.items]; items[index] = { ...items[index], title: t }; save({ items }); }} isEditing={editing} tag="span" style={{ fontSize: 18, fontWeight: 600 }} />
        <RenderIcon name={open ? 'ChevronUp' : 'ChevronDown'} size={18} color={tokens.mutedTextColor} />
      </div>
      {open && (
        <div style={{ padding: '16px 20px', fontSize: 16, lineHeight: 1.6, color: tokens.mutedTextColor }}>
          <EditableText value={item.content} onSave={(t: string) => { const items = [...block.items]; items[index] = { ...items[index], content: t }; save({ items }); }} isEditing={editing} tag="div" multiline />
        </div>
      )}
    </div>
  );
}

// ── Tabs Renderer ────────────────────────────────────────────────────
function TabsRenderer({ block, tokens, editing, save, cardStyle }: any) {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${tokens.mutedTextColor}15`, marginBottom: 16 }}>
        {block.tabs.map((tab: any, i: number) => (
          <div key={i} onClick={() => setActiveTab(i)} style={{ padding: '10px 20px', cursor: 'pointer', fontSize: 16, fontWeight: activeTab === i ? 700 : 400, color: activeTab === i ? tokens.accentColor : tokens.mutedTextColor, borderBottom: activeTab === i ? `2px solid ${tokens.accentColor}` : '2px solid transparent', marginBottom: -2, transition: 'all 0.2s' }}>
            <EditableText value={tab.label} onSave={(t: string) => { const tabs = [...block.tabs]; tabs[i] = { ...tabs[i], label: t }; save({ tabs }); }} isEditing={editing} tag="span" />
          </div>
        ))}
      </div>
      <div style={{ ...cardStyle, padding: 24 }}>
        <EditableText value={block.tabs[activeTab]?.content || ''} onSave={(t: string) => { const tabs = [...block.tabs]; tabs[activeTab] = { ...tabs[activeTab], content: t }; save({ tabs }); }} isEditing={editing} tag="div" multiline style={{ fontSize: 16, lineHeight: 1.6 }} />
      </div>
      {editing && <button onClick={() => save({ tabs: [...block.tabs, { label: 'New Tab', content: 'Content...' }] })} style={{ marginTop: 8, padding: '4px 12px', fontSize: 12, borderRadius: 6, border: `1px dashed ${tokens.accentColor}40`, background: 'transparent', color: tokens.accentColor, cursor: 'pointer' }}>+ Add Tab</button>}
    </div>
  );
}

export const ContentBlockRenderer = memo(function ContentBlockRenderer({ block, tokens, onClick, isEditing, slideId, allBlocks, isIsolated }: Props) {
  const bs = block.style as BlockStyle | undefined;
  const updateBlock = usePresentationStore((s) => s.updateBlock);

  // Ensure Google Font CSS is loaded when fontFamily changes
  const fontFamily = bs?.fontFamily || (block.type === 'title' ? tokens.headingFont : tokens.bodyFont);
  useEffect(() => {
    if (fontFamily && typeof fontFamily === 'string' && fontFamily !== 'inherit') {
      // Strip CSS fallbacks like "'Inter', sans-serif" → "Inter"
      const cleanFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
      if (cleanFont) {
        import('@/lib/googleFonts').then(({ loadGoogleFont }) => {
          loadGoogleFont(cleanFont).catch(() => {});
        });
      }
    }
  }, [fontFamily]);

  // Helper to save a field
  const save = useCallback((patch: Partial<ContentBlock>) => {
    if (slideId) updateBlock(slideId, block.id, patch as any);
  }, [slideId, block.id, updateBlock]);

  // Derive effective accent/surface colors that respect user overrides
  // accentColor is separate from text color — use dedicated accentColor property
  const effectiveAccent = bs?.accentColor || tokens.accentColor;
  const effectiveSurface = bs?.backgroundColor || tokens.surfaceColor;
  // Tokens with user overrides applied — pass to all sub-renderers
  const effectiveTokens: DesignTokens = {
    ...tokens,
    accentColor: effectiveAccent,
    surfaceColor: effectiveSurface,
    ...(bs?.color ? { primaryColor: bs.color } : {}),
    ...(bs?.fontFamily ? { headingFont: bs.fontFamily, bodyFont: bs.fontFamily } : {}),
  };

  // ── Build composite boxShadow from structured fields ──
  const buildBoxShadow = (bs: BlockStyle | undefined): string | undefined => {
    if (!bs?.shadowType) return bs?.boxShadow || undefined;
    const parts: string[] = [];
    if (bs.shadowType === 'drop' || bs.shadowType === 'both') {
      const c = bs.shadowColor || '#000000';
      const op = bs.shadowOpacity ?? 0.15;
      const rgba = c.startsWith('#') ? `${c}${Math.round(op * 255).toString(16).padStart(2, '0')}` : c;
      parts.push(`${bs.shadowX ?? 0}px ${bs.shadowY ?? 4}px ${bs.shadowBlur ?? 16}px ${bs.shadowSpread ?? 0}px ${rgba}`);
    }
    if (bs.shadowType === 'inner' || bs.shadowType === 'both') {
      const c = bs.innerShadowColor || '#000000';
      const op = bs.innerShadowOpacity ?? 0.1;
      const rgba = c.startsWith('#') ? `${c}${Math.round(op * 255).toString(16).padStart(2, '0')}` : c;
      parts.push(`inset ${bs.innerShadowX ?? 0}px ${bs.innerShadowY ?? 2}px ${bs.innerShadowBlur ?? 8}px ${bs.innerShadowSpread ?? 0}px ${rgba}`);
    }
    return parts.length > 0 ? parts.join(', ') : bs?.boxShadow || undefined;
  };

  // ── Build composite CSS filter ──
  const buildFilter = (bs: BlockStyle | undefined): string | undefined => {
    const parts: string[] = [];
    if (bs?.blur) parts.push(`blur(${bs.blur}px)`);
    if (bs?.filterBrightness != null && bs.filterBrightness !== 100) parts.push(`brightness(${bs.filterBrightness}%)`);
    if (bs?.filterContrast != null && bs.filterContrast !== 100) parts.push(`contrast(${bs.filterContrast}%)`);
    if (bs?.filterSaturate != null && bs.filterSaturate !== 100) parts.push(`saturate(${bs.filterSaturate}%)`);
    if (bs?.filterHueRotate) parts.push(`hue-rotate(${bs.filterHueRotate}deg)`);
    return parts.length > 0 ? parts.join(' ') : bs?.filter || undefined;
  };

  const computedBoxShadow = buildBoxShadow(bs);
  const computedFilter = buildFilter(bs);

  // Map textAlign to flex alignment so flex children respect it
  const textAlignVal = bs?.textAlign || (block.type === 'title' || block.type === 'metric' ? 'center' : 'left');
  const flexAlignFromText = textAlignVal === 'center' ? 'center' : textAlignVal === 'right' ? 'flex-end' : 'flex-start';

  // Build per-side padding
  const padAll = bs?.padding != null ? bs.padding : 16 * tokens.spacingScale;
  const paddingStr = (bs?.paddingTop != null || bs?.paddingRight != null || bs?.paddingBottom != null || bs?.paddingLeft != null)
    ? `${bs?.paddingTop ?? padAll}px ${bs?.paddingRight ?? padAll}px ${bs?.paddingBottom ?? padAll}px ${bs?.paddingLeft ?? padAll}px`
    : (typeof padAll === 'number' ? `${padAll}px` : padAll);

  // Build per-side margin
  const marginStr = (bs?.marginTop != null || bs?.marginRight != null || bs?.marginBottom != null || bs?.marginLeft != null)
    ? `${bs?.marginTop ?? 0}px ${bs?.marginRight ?? 0}px ${bs?.marginBottom ?? 0}px ${bs?.marginLeft ?? 0}px`
    : (bs?.margin != null ? `${bs.margin}px` : undefined);

  const style: React.CSSProperties = {
    fontFamily: bs?.fontFamily || (block.type === 'title' ? tokens.headingFont : tokens.bodyFont),
    color: bs?.color || tokens.textColor,
    width: '100%', height: '100%', minHeight: 0,
    display: 'flex', flexDirection: bs?.autoLayout || 'column',
    gap: bs?.gap,
    justifyContent: bs?.justifySelf || (block.type === 'metric' ? 'center' : 'flex-start'),
    alignItems: bs?.alignSelf || flexAlignFromText,
    cursor: isEditing ? 'text' : 'default',
    outline: isEditing ? `2px solid ${tokens.accentColor}` : 'none',
    outlineOffset: 4,
    borderRadius: bs?.borderRadius ?? tokens.borderRadius,
    padding: paddingStr,
    margin: marginStr,
    textAlign: textAlignVal,
    overflow: bs?.height ? 'auto' : 'visible',
    background: bs?.backgroundGradientCSS || (bs?.backgroundImageUrl ? `url(${bs.backgroundImageUrl}) center/cover no-repeat` : undefined) || bs?.backgroundColor || undefined,
    borderColor: bs?.borderColor || undefined,
    borderWidth: bs?.borderWidth || undefined,
    borderStyle: bs?.borderStyle || undefined,
    opacity: bs?.opacity ?? 1,
    boxShadow: computedBoxShadow,
    fontSize: bs?.fontSize || undefined,
    fontWeight: bs?.fontWeight || undefined,
    lineHeight: bs?.lineHeight || undefined,
    letterSpacing: bs?.letterSpacing ? `${bs.letterSpacing}px` : undefined,
    textTransform: bs?.textTransform as any || undefined,
    filter: computedFilter,
    backdropFilter: bs?.backdropBlur ? `blur(${bs.backdropBlur}px)` : undefined,
    mixBlendMode: bs?.mixBlendMode as any || undefined,
    position: (bs?.noiseIntensity ?? 0) > 0 ? 'relative' : undefined,
  };

  // Derive inner card style overrides from bs
  const innerCardStyle: React.CSSProperties = {
    ...(bs?.cardBgColor ? { backgroundColor: bs.cardBgColor } : {}),
    ...(bs?.cardBorderRadius != null ? { borderRadius: bs.cardBorderRadius } : {}),
    ...(bs?.cardBorderColor ? { borderColor: bs.cardBorderColor, borderStyle: 'solid' as const, borderWidth: bs?.cardBorderWidth ?? 1 } : {}),
    ...(bs?.cardShadow ? { boxShadow: bs.cardShadow } : {}),
    ...(bs?.innerPadding != null ? { padding: bs.innerPadding } : {}),
  };
  const effectiveIconColor = bs?.iconColor || undefined;
  const effectiveIconBgColor = bs?.iconBgColor || undefined;
  const effectiveIconSize = bs?.iconSize || undefined;

  const cardStyle = getCardStyle({ ...tokens, accentColor: effectiveAccent, surfaceColor: effectiveSurface });
  const accentGrad = AccentGradient({ ...tokens, accentColor: effectiveAccent });
  const isGrad = typeof accentGrad === 'string' && accentGrad.includes('gradient');
  const editing = !!isEditing;

  const renderContent = () => {
    switch (block.type) {
      case 'title':
        return (
          <EditableText
            value={block.text || 'Untitled'}
            onSave={(t) => save({ text: t } as any)}
            isEditing={editing}
            tag="h1"
            style={{
              fontSize: bs?.fontSize || (block.level === 1 ? 64 : block.level === 2 ? 48 : 36),
              fontWeight: bs?.fontWeight || 800,
              lineHeight: bs?.lineHeight || 1.1,
              margin: 0,
              letterSpacing: bs?.letterSpacing ? `${bs.letterSpacing}px` : '-0.02em',
              textAlign: bs?.textAlign || 'center',
              color: bs?.color || undefined,
              background: isGrad ? accentGrad : undefined,
              WebkitBackgroundClip: isGrad ? 'text' : undefined,
              WebkitTextFillColor: isGrad && block.level === 1 && !bs?.color ? 'transparent' : undefined,
            }}
          />
        );

      case 'subtitle':
        return (
          <EditableText
            value={block.text || 'Add subtitle...'}
            onSave={(t) => save({ text: t } as any)}
            isEditing={editing}
            tag="p"
            style={{
              fontSize: bs?.fontSize || 24,
              lineHeight: bs?.lineHeight || 1.6,
              color: bs?.color || tokens.mutedTextColor,
              margin: 0,
              fontWeight: bs?.fontWeight || 300,
              textAlign: bs?.textAlign || undefined,
            }}
          />
        );

      case 'bullets':
        return (
          <ul style={{ fontSize: 20, lineHeight: 1.8, paddingLeft: 0, margin: 0, listStyle: 'none', width: '100%', borderLeft: `3px solid ${effectiveAccent}30` }}>
            {block.items.map((item, i) => (
              <li key={i} className="group/item" style={{
                display: 'flex', alignItems: 'flex-start', gap: 16, padding: '10px 16px', position: 'relative',
                backgroundColor: i % 2 === 0 ? `${effectiveAccent}06` : 'transparent',
                borderBottom: `1px solid ${effectiveAccent}08`,
                transition: 'background 0.15s',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: accentGrad, marginTop: 8, flexShrink: 0, transform: 'rotate(45deg)' }} />
                <EditableText
                  value={item}
                  onSave={(t) => {
                    const items = [...block.items];
                    items[i] = t;
                    save({ items } as any);
                  }}
                  isEditing={editing}
                  tag="span"
                />
                {editing && block.items.length > 1 && (
                  <RemoveItemButton onClick={() => { const items = block.items.filter((_: any, idx: number) => idx !== i); save({ items } as any); }} accentColor={effectiveAccent} />
                )}
              </li>
            ))}
            {editing && (
              <AddItemButton onClick={() => save({ items: [...block.items, 'New item'] } as any)} accentColor={effectiveAccent} />
            )}
          </ul>
        );

      case 'image': {
        const maskClipPaths: Record<string, string> = {
          circle: 'circle(50% at 50% 50%)',
          rounded: 'inset(0 round 16px)',
          blob: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
          diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
        };
        const maskVal = (block as any).mask;
        const clipPath = maskVal && maskVal !== 'none' ? maskClipPaths[maskVal] : undefined;
        const isFullHeight = (block as any).fullHeight;

        const imgStyle: React.CSSProperties = isFullHeight
          ? { width: '100%', height: '100%', objectFit: block.fit, borderRadius: 0 }
          : { width: '100%', height: '100%', objectFit: block.fit, borderRadius: clipPath ? 0 : tokens.borderRadius };

        const wrapperStyle: React.CSSProperties = isFullHeight
          ? { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', padding: 0, margin: 0 }
          : { position: 'relative', width: '100%', height: '100%', clipPath, overflow: 'hidden' };

        // CSS filter tinting: convert hex to filter that recolors the element
        const tintFilter = (() => {
          const tc = (block as any).tintColor;
          if (!tc) return undefined;
          // Use CSS mask approach for SVGs (both data URLs and external .svg URLs)
          const isSvg = block.src?.startsWith('data:image/svg+xml') || block.src?.endsWith('.svg') || block.src?.includes('/svg');
          if (isSvg) {
            return { useMask: true, color: tc };
          }
          // For raster: overlay with mix-blend-mode multiply
          return { useMask: false, color: tc };
        })();

        return block.src ? (
          <div style={wrapperStyle}>
            {tintFilter?.useMask ? (
              <div style={{
                width: '100%', height: '100%',
                backgroundColor: tintFilter.color,
                WebkitMaskImage: `url(${block.src})`,
                WebkitMaskSize: block.fit === 'contain' ? 'contain' : 'cover',
                WebkitMaskPosition: 'center',
                WebkitMaskRepeat: 'no-repeat',
                maskImage: `url(${block.src})`,
                maskSize: block.fit === 'contain' ? 'contain' : 'cover',
                maskPosition: 'center',
                maskRepeat: 'no-repeat',
              }} />
            ) : (
              <>
                <img src={block.src} alt={block.alt} style={imgStyle} />
                {tintFilter && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundColor: tintFilter.color,
                    mixBlendMode: 'multiply',
                    pointerEvents: 'none',
                  }} />
                )}
              </>
            )}
            {editing && (
              <ImageEditOverlay
                onUrlChange={(src) => save({ src } as any)}
                tokens={tokens}
              />
            )}
          </div>
        ) : (
          <ImageEmptyState editing={editing} tokens={tokens} onUrlChange={(src) => save({ src } as any)} />
        );
      }

      case 'chart':
        return renderChart(block, effectiveTokens, accentGrad, editing, save);

      case 'callout': {
        const calloutConfig: Record<string, { bg: string; border: string; iconName: string }> = {
          info: { bg: '#3b82f611', border: '#3b82f6', iconName: 'Lightbulb' },
          success: { bg: '#22c55e11', border: '#22c55e', iconName: 'CheckCircle' },
          warning: { bg: '#f59e0b11', border: '#f59e0b', iconName: 'AlertTriangle' },
          accent: { bg: `${tokens.accentColor}11`, border: tokens.accentColor, iconName: 'Flame' },
          note: { bg: '#6366f111', border: '#6366f1', iconName: 'FileText' },
          caution: { bg: '#ef444411', border: '#ef4444', iconName: 'ShieldAlert' },
          question: { bg: '#8b5cf611', border: '#8b5cf6', iconName: 'HelpCircle' },
        };
        const cfg = calloutConfig[block.variant] || calloutConfig.accent;
        const calloutBg = (block as any).bgColor || cfg.bg;
        return (
          <div style={{ padding: 28, borderRadius: tokens.borderRadius, borderLeft: `5px solid ${cfg.border}`, backgroundColor: calloutBg, fontSize: 20, lineHeight: 1.7, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <EditableIcon
                name={block.icon || cfg.iconName}
                size={28}
                color={cfg.border}
                isEditing={editing}
                onSelect={(icon) => save({ icon } as any)}
                tokens={tokens}
              />
            </span>
            <EditableText
              value={block.text}
              onSave={(t) => save({ text: t } as any)}
              isEditing={editing}
              tag="span"
              multiline
            />
          </div>
        );
      }

      case 'quote':
        return (
          <div style={{ position: 'relative', padding: '32px 40px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, fontSize: 120, lineHeight: 1, fontFamily: 'Georgia, serif', color: tokens.accentColor, opacity: 0.15 }}>"</div>
            <EditableText
              value={block.text}
              onSave={(t) => save({ text: t } as any)}
              isEditing={editing}
              tag="div"
              multiline
              style={{ fontSize: 30, fontStyle: 'italic', lineHeight: 1.6, margin: 0, fontWeight: 300, position: 'relative', zIndex: 1 }}
            />
            {(block.attribution || editing) && (
              <footer style={{ fontSize: 18, color: tokens.mutedTextColor, marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 40, height: 2, background: accentGrad, display: 'inline-block' }} />
                <EditableText
                  value={block.attribution || ''}
                  onSave={(t) => save({ attribution: t } as any)}
                  isEditing={editing}
                  tag="span"
                  placeholder="Attribution..."
                />
              </footer>
            )}
          </div>
        );

      case 'metric': {
        const trendColors = { up: '#22c55e', down: '#ef4444', neutral: tokens.mutedTextColor };
        return (
          <div style={{ textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${tokens.accentColor}0a 0%, transparent 70%)` }} />
            <EditableText
              value={`${block.value}${block.suffix || ''}`}
              onSave={(t) => save({ value: t } as any)}
              isEditing={editing}
              tag="div"
              style={{ fontSize: 80, fontWeight: 900, lineHeight: 1, background: isGrad ? accentGrad : undefined, WebkitBackgroundClip: isGrad ? 'text' : undefined, WebkitTextFillColor: isGrad ? 'transparent' : undefined, color: !isGrad ? tokens.accentColor : undefined, position: 'relative', zIndex: 1 }}
            />
            <EditableText
              value={block.label}
              onSave={(t) => save({ label: t } as any)}
              isEditing={editing}
              tag="div"
              style={{ fontSize: 20, color: tokens.mutedTextColor, marginTop: 12, position: 'relative', zIndex: 1 }}
              placeholder="Label..."
            />
            {block.trend && !editing && (
              <div style={{ fontSize: 16, color: trendColors[block.trend], marginTop: 8, fontWeight: 600, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <RenderIcon name={block.trend === 'up' ? 'TrendingUp' : block.trend === 'down' ? 'TrendingDown' : 'Minus'} size={16} color={trendColors[block.trend]} />
                {block.trend === 'up' ? 'Trending up' : block.trend === 'down' ? 'Trending down' : 'Stable'}
              </div>
            )}
          </div>
        );
      }

      case 'icon-list': {
        const iconSz = effectiveIconSize || (block as any).iconSize || 24;
        const iconBoxSz = iconSz * 2.2;
        const iconColors = [effectiveAccent, tokens.primaryColor || '#8b5cf6', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, width: '100%' }}>
            {block.items.map((item, i) => {
              const ic = effectiveIconColor || (item as any).iconColor || iconColors[i % iconColors.length];
              const ibg = effectiveIconBgColor || undefined;
              return (
                <div key={i} className="group/item" style={{
                  ...cardStyle,
                  ...innerCardStyle,
                  backgroundColor: innerCardStyle.backgroundColor || (item as any).bgColor || cardStyle.backgroundColor,
                  ...(getItemBg(item) ? { background: getItemBg(item) } : {}),
                  ...((item as any).textColor ? { color: (item as any).textColor } : {}),
                  display: 'flex', gap: 16, alignItems: 'flex-start', position: 'relative',
                  borderTop: `3px solid ${ic}40`,
                }}>
                  <div style={{
                    width: iconBoxSz, height: iconBoxSz, borderRadius: '50%',
                    background: ibg || `linear-gradient(135deg, ${ic}20, ${ic}08)`,
                    border: `2px solid ${ic}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <EditableIcon name={item.icon} size={iconSz} color={ic} isEditing={editing} onSelect={(icon) => { const items = [...block.items]; items[i] = { ...items[i], icon }; save({ items } as any); }} tokens={effectiveTokens} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <EditableText value={item.title} onSave={(t) => { const items = [...block.items]; items[i] = { ...items[i], title: t }; save({ items } as any); }} isEditing={editing} tag="div" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }} />
                    <EditableText value={item.description} onSave={(t) => { const items = [...block.items]; items[i] = { ...items[i], description: t }; save({ items } as any); }} isEditing={editing} tag="div" multiline style={{ fontSize: 15, color: tokens.mutedTextColor, lineHeight: 1.5 }} />
                  </div>
                  {editing && block.items.length > 1 && (
                    <RemoveItemButton onClick={() => save({ items: block.items.filter((_: any, idx: number) => idx !== i) } as any)} accentColor={effectiveAccent} />
                  )}
                </div>
              );
            })}
            {editing && (
              <AddItemButton onClick={() => save({ items: [...block.items, { icon: 'Star', title: 'New Item', description: 'Description' }] } as any)} accentColor={effectiveAccent} />
            )}
          </div>
        );
      }

      case 'timeline':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%', position: 'relative', paddingLeft: 40 }}>
            <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${tokens.accentColor}44, ${tokens.accentColor}11)` }} />
            {block.items.map((item, i) => (
              <div key={i} className="group/item" style={{ display: 'flex', alignItems: 'flex-start', gap: 24, paddingBottom: 32, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -32, top: 6, width: 14, height: 14, borderRadius: '50%', background: accentGrad, border: `3px solid ${tokens.backgroundColor}`, boxShadow: `0 0 0 3px ${tokens.accentColor}33` }} />
                <div>
                  <EditableText value={item.year} onSave={(t) => { const items = [...block.items]; items[i] = { ...items[i], year: t }; save({ items } as any); }} isEditing={editing} tag="div" style={{ fontSize: 13, fontWeight: 700, color: tokens.accentColor, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                  <EditableText value={item.title} onSave={(t) => { const items = [...block.items]; items[i] = { ...items[i], title: t }; save({ items } as any); }} isEditing={editing} tag="div" style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }} />
                  <EditableText value={item.description} onSave={(t) => { const items = [...block.items]; items[i] = { ...items[i], description: t }; save({ items } as any); }} isEditing={editing} tag="div" multiline style={{ fontSize: 16, color: tokens.mutedTextColor, lineHeight: 1.6 }} />
                </div>
                {editing && block.items.length > 1 && (
                  <RemoveItemButton onClick={() => save({ items: block.items.filter((_: any, idx: number) => idx !== i) } as any)} accentColor={tokens.accentColor} />
                )}
              </div>
            ))}
            {editing && (
              <AddItemButton onClick={() => save({ items: [...block.items, { year: 'Year', title: 'New Event', description: 'Description' }] } as any)} accentColor={tokens.accentColor} />
            )}
          </div>
        );

      case 'comparison':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, width: '100%' }}>
            {[block.left, block.right].map((side, sideIdx) => {
              const sideKey = sideIdx === 0 ? 'left' : 'right';
              const sideColor = sideIdx === 0 ? tokens.accentColor : tokens.primaryColor || '#8b5cf6';
              return (
                <div key={sideIdx} style={{ ...cardStyle, borderTop: `4px solid ${sideColor}`, position: 'relative', overflow: 'hidden' }}>
                  {/* Header badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${sideColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RenderIcon name={sideIdx === 0 ? 'ThumbsUp' : 'ThumbsDown'} size={18} color={sideColor} />
                    </div>
                    <EditableText
                      value={side.title}
                      onSave={(t) => save({ [sideKey]: { ...side, title: t } } as any)}
                      isEditing={editing}
                      tag="div"
                      style={{ fontSize: 22, fontWeight: 700 }}
                    />
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {side.items.map((item, i) => (
                      <li key={i} className="group/item" style={{
                        display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', fontSize: 17,
                        backgroundColor: i % 2 === 0 ? `${sideColor}06` : 'transparent',
                        borderRadius: 6, position: 'relative',
                      }}>
                        <RenderIcon name={sideIdx === 0 ? 'Check' : 'X'} size={18} color={sideIdx === 0 ? '#22c55e' : '#ef4444'} />
                        <EditableText
                          value={item}
                          onSave={(t) => {
                            const items = [...side.items];
                            items[i] = t;
                            save({ [sideKey]: { ...side, items } } as any);
                          }}
                          isEditing={editing}
                          tag="span"
                        />
                        {editing && side.items.length > 1 && (
                          <RemoveItemButton onClick={() => { save({ [sideKey]: { ...side, items: side.items.filter((_: any, idx: number) => idx !== i) } } as any); }} accentColor={tokens.accentColor} />
                        )}
                      </li>
                    ))}
                  </ul>
                  {editing && (
                    <AddItemButton onClick={() => save({ [sideKey]: { ...side, items: [...side.items, 'New item'] } } as any)} accentColor={tokens.accentColor} />
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'numbered-list':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%', position: 'relative' }}>
            {/* Connecting line */}
            <div style={{ position: 'absolute', left: 20, top: 20, bottom: 20, width: 2, background: `linear-gradient(to bottom, ${effectiveAccent}40, ${effectiveAccent}08)`, zIndex: 0 }} />
            {block.items.map((item, i) => (
              <div key={i} className="group/item" style={{
                display: 'flex', gap: 20, alignItems: 'flex-start', position: 'relative', zIndex: 1,
                padding: '16px 0', borderBottom: i < block.items.length - 1 ? `1px solid ${effectiveAccent}08` : 'none',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: `linear-gradient(135deg, ${effectiveAccent}, ${effectiveAccent}bb)`,
                  color: tokens.backgroundColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, flexShrink: 0,
                  boxShadow: `0 4px 12px ${effectiveAccent}30`,
                }}>{i + 1}</div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <EditableText value={item.title} onSave={(t) => { const items = [...block.items]; items[i] = { ...items[i], title: t }; save({ items } as any); }} isEditing={editing} tag="div" style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }} />
                  <EditableText value={item.description} onSave={(t) => { const items = [...block.items]; items[i] = { ...items[i], description: t }; save({ items } as any); }} isEditing={editing} tag="div" multiline style={{ fontSize: 16, color: tokens.mutedTextColor, lineHeight: 1.6 }} />
                </div>
                {editing && block.items.length > 1 && (
                  <RemoveItemButton onClick={() => save({ items: block.items.filter((_: any, idx: number) => idx !== i) } as any)} accentColor={effectiveAccent} />
                )}
              </div>
            ))}
            {editing && (
              <AddItemButton onClick={() => save({ items: [...block.items, { title: 'New Item', description: 'Description' }] } as any)} accentColor={effectiveAccent} />
            )}
          </div>
        );

      case 'progress':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
            {block.items.map((item, i) => {
              const pct = Math.min(100, (item.value / (item.max || 100)) * 100);
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <EditableText
                      value={item.label}
                      onSave={(t) => { const items = [...block.items]; items[i] = { ...items[i], label: t }; save({ items } as any); }}
                      isEditing={editing}
                      tag="span"
                      style={{ fontSize: 17, fontWeight: 600 }}
                    />
                    <EditableText
                      value={`${item.value}%`}
                      onSave={(t) => { const items = [...block.items]; items[i] = { ...items[i], value: parseInt(t) || 0 }; save({ items } as any); }}
                      isEditing={editing}
                      tag="span"
                      style={{ fontSize: 17, fontWeight: 700, color: tokens.accentColor }}
                    />
                  </div>
                  <div style={{ height: 12, borderRadius: 6, backgroundColor: `${tokens.mutedTextColor}22`, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 6, background: accentGrad, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'card-grid': {
        const cardColors = [effectiveAccent, tokens.primaryColor || '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(block.cards.length, 3)}, 1fr)`, gap: 20, width: '100%' }}>
            {block.cards.map((card, i) => (
              <div key={i} className="group/item" style={{
                ...cardStyle, ...innerCardStyle,
                display: 'flex', flexDirection: 'column', gap: 12, position: 'relative',
                borderLeft: `4px solid ${card.accent || cardColors[i % cardColors.length]}`,
                background: getItemBg(card) || innerCardStyle.backgroundColor || (card as any).bgColor || `linear-gradient(135deg, ${(card.accent || cardColors[i % cardColors.length])}08, ${tokens.surfaceColor})`,
                ...((card as any).textColor ? { color: (card as any).textColor } : {}),
              }}>
                {card.icon && (
                  <div style={{ width: effectiveIconSize ? effectiveIconSize * 2 : 48, height: effectiveIconSize ? effectiveIconSize * 2 : 48, borderRadius: innerCardStyle.borderRadius ?? tokens.borderRadius, background: effectiveIconBgColor || `linear-gradient(135deg, ${card.accent || cardColors[i % cardColors.length]}20, ${card.accent || cardColors[i % cardColors.length]}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EditableIcon name={card.icon} size={effectiveIconSize || 24} color={effectiveIconColor || card.accent || cardColors[i % cardColors.length]} isEditing={editing} onSelect={(icon) => { const cards = [...block.cards]; cards[i] = { ...cards[i], icon }; save({ cards } as any); }} tokens={tokens} />
                  </div>
                )}
                <EditableText value={card.title} onSave={(t) => { const cards = [...block.cards]; cards[i] = { ...cards[i], title: t }; save({ cards } as any); }} isEditing={editing} tag="div" style={{ fontSize: 18, fontWeight: 700 }} />
                <EditableText value={card.description} onSave={(t) => { const cards = [...block.cards]; cards[i] = { ...cards[i], description: t }; save({ cards } as any); }} isEditing={editing} tag="div" multiline style={{ fontSize: 15, color: tokens.mutedTextColor, lineHeight: 1.5 }} />
                {editing && block.cards.length > 1 && (
                  <RemoveItemButton onClick={() => save({ cards: block.cards.filter((_: any, idx: number) => idx !== i) } as any)} accentColor={tokens.accentColor} />
                )}
              </div>
            ))}
            {editing && (
              <AddItemButton onClick={() => save({ cards: [...block.cards, { icon: 'Star', title: 'New Card', description: 'Description' }] } as any)} accentColor={tokens.accentColor} />
            )}
          </div>
        );
      }

      case 'table':
        return (
          <div style={{ width: '100%', overflow: 'auto', borderRadius: tokens.borderRadius + 4, border: `1px solid ${tokens.mutedTextColor}22` }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 18 }}>
              <tbody>
                {block.rows.map((row, ri) => {
                  const isHeader = block.hasHeader && ri === 0;
                  return (
                    <tr key={ri}>
                      {row.map((cell, ci) => {
                        const Tag = isHeader ? 'th' : 'td';
                        return (
                          <Tag key={ci} style={{
                            padding: '14px 18px',
                            borderBottom: `1px solid ${tokens.mutedTextColor}15`,
                            backgroundColor: isHeader ? effectiveAccent : ri % 2 === 0 ? `${tokens.mutedTextColor}06` : 'transparent',
                            color: isHeader ? '#fff' : tokens.textColor,
                            fontWeight: isHeader ? 700 : 400,
                            textAlign: 'left',
                            resize: isHeader ? 'horizontal' : undefined,
                            overflow: isHeader ? 'auto' : undefined,
                            minWidth: 60,
                            ...(isHeader && ri === 0 && ci === 0 ? { borderTopLeftRadius: tokens.borderRadius } : {}),
                            ...(isHeader && ri === 0 && ci === row.length - 1 ? { borderTopRightRadius: tokens.borderRadius } : {}),
                          }}>
                            <EditableText
                              value={cell}
                              onSave={(t) => {
                                const rows = block.rows.map(r => [...r]);
                                rows[ri][ci] = t;
                                save({ rows } as any);
                              }}
                              isEditing={editing}
                              tag="span"
                            />
                          </Tag>
                        );
                      })}
                      {/* Remove row button */}
            {block.rows.length > 1 && (
                        <td style={{ padding: '4px', verticalAlign: 'middle', border: 'none', width: 28, backgroundColor: 'transparent' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); save({ rows: block.rows.filter((_: any, idx: number) => idx !== ri) } as any); }}
                            style={{ width: 22, height: 22, borderRadius: '50%', border: `1px solid ${tokens.mutedTextColor}30`, background: 'transparent', color: tokens.mutedTextColor, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Remove row"
                          >×</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Table editing controls */}
            {(
              <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderTop: `1px solid ${tokens.mutedTextColor}15` }}>
                <button
                  onClick={(e) => { e.stopPropagation(); const colCount = block.rows[0]?.length || 2; save({ rows: [...block.rows, Array(colCount).fill('Cell')] } as any); }}
                  style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6, border: `1px dashed ${effectiveAccent}40`, background: `${effectiveAccent}06`, color: effectiveAccent, cursor: 'pointer', fontWeight: 600 }}
                >+ Row</button>
                <button
                  onClick={(e) => { e.stopPropagation(); const newRows = block.rows.map((r: string[], ri: number) => [...r, ri === 0 && block.hasHeader ? 'Header' : 'Cell']); save({ rows: newRows } as any); }}
                  style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6, border: `1px dashed ${effectiveAccent}40`, background: `${effectiveAccent}06`, color: effectiveAccent, cursor: 'pointer', fontWeight: 600 }}
                >+ Column</button>
                {block.rows[0]?.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); const newRows = block.rows.map((r: string[]) => r.slice(0, -1)); save({ rows: newRows } as any); }}
                    style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6, border: `1px dashed #ef444440`, background: '#ef444406', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
                  >− Column</button>
                )}
              </div>
            )}
          </div>
        );

      case 'todo-list':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {block.items.map((item, i) => (
              <div key={i} className="group/item" style={{
                display: 'flex', alignItems: 'center', gap: 12, fontSize: 20,
                padding: '12px 16px', borderRadius: tokens.borderRadius, position: 'relative',
                backgroundColor: item.checked ? `${tokens.accentColor}08` : `${tokens.mutedTextColor}06`,
                border: `1px solid ${item.checked ? tokens.accentColor + '20' : tokens.mutedTextColor + '10'}`,
                transition: 'all 0.2s ease',
              }}>
                <div onClick={(e) => { e.stopPropagation(); const items = [...block.items]; items[i] = { ...items[i], checked: !items[i].checked }; save({ items } as any); }} style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${item.checked ? tokens.accentColor : tokens.mutedTextColor}44`, backgroundColor: item.checked ? tokens.accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                  {item.checked && <RenderIcon name="Check" size={14} color={tokens.backgroundColor} />}
                </div>
                <EditableText value={item.text} onSave={(t) => { const items = [...block.items]; items[i] = { ...items[i], text: t }; save({ items } as any); }} isEditing={editing} tag="span" style={{ textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? tokens.mutedTextColor : tokens.textColor, transition: 'all 0.2s ease' }} />
                {editing && block.items.length > 1 && (
                  <RemoveItemButton onClick={() => save({ items: block.items.filter((_: any, idx: number) => idx !== i) } as any)} accentColor={tokens.accentColor} />
                )}
              </div>
            ))}
            {editing && (
              <AddItemButton onClick={() => save({ items: [...block.items, { text: 'New task', checked: false }] } as any)} accentColor={tokens.accentColor} />
            )}
          </div>
        );

      case 'divider': {
        const dividerStyles: Record<string, React.CSSProperties> = {
          solid: { borderTop: `2px solid ${tokens.mutedTextColor}33` },
          dashed: { borderTop: `2px dashed ${tokens.mutedTextColor}33` },
          dotted: { borderTop: `2px dotted ${tokens.mutedTextColor}33` },
          gradient: { height: 2, background: `linear-gradient(to right, transparent, ${tokens.accentColor}, transparent)`, border: 'none' },
        };
        return <hr style={{ width: '100%', margin: '16px 0', ...dividerStyles[block.dividerStyle] }} />;
      }

      case 'code':
        return (
          <div style={{ width: '100%', borderRadius: tokens.borderRadius, overflow: 'hidden', backgroundColor: '#1e1e2e', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              {editing ? (
                <EditableText
                  value={block.language || 'javascript'}
                  onSave={(t) => save({ language: t } as any)}
                  isEditing={editing}
                  tag="span"
                  style={{ fontSize: 12, color: '#a6adc8', fontFamily: 'monospace', textTransform: 'uppercase' }}
                />
              ) : (
                <span style={{ fontSize: 12, color: '#a6adc8', fontFamily: 'monospace', textTransform: 'uppercase' }}>{block.language}</span>
              )}
            </div>
            {editing ? (
              <pre
                contentEditable
                suppressContentEditableWarning
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => save({ code: e.currentTarget.textContent || '' } as any)}
                onKeyDown={(e) => e.stopPropagation()}
                style={{ margin: 0, fontFamily: '"Fira Code", "JetBrains Mono", monospace', fontSize: 16, lineHeight: 1.6, color: '#cdd6f4', whiteSpace: 'pre-wrap', wordBreak: 'break-all', outline: 'none', cursor: 'text', minHeight: 40 }}
              >{block.code}</pre>
            ) : (
              <pre style={{ margin: 0, fontFamily: '"Fira Code", "JetBrains Mono", monospace', fontSize: 16, lineHeight: 1.6, color: '#cdd6f4', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                <code>{block.code}</code>
              </pre>
            )}
          </div>
        );

      case 'stats':
        return renderStats(block, effectiveTokens, accentGrad, editing, save);

      case 'steps':
        return renderSteps(block, effectiveTokens, accentGrad, editing, save);

      case 'cycle-diagram':
        return renderCycleDiagram(block, effectiveTokens, accentGrad, editing, save);

      case 'venn-diagram':
        return renderVennDiagram(block, effectiveTokens, editing, save);

      case 'process-flow':
        return renderProcessFlow(block, effectiveTokens, accentGrad, editing, save);

      case 'gallery':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${block.columns || 3}, 1fr)`, gap: 12, width: '100%' }}>
            {block.images.map((img, i) => (
              <GalleryCell
                key={i}
                img={img}
                index={i}
                tokens={tokens}
                editing={editing}
                onImageChange={(src) => {
                  const images = [...block.images];
                  images[i] = { ...images[i], src };
                  save({ images } as any);
                }}
              />
            ))}
          </div>
        );

      case 'button-block': {
        const btnVariants = ['primary', 'secondary', 'outline', 'ghost'] as const;
        const currentVariant = block.variant || 'primary';
        const btnStyles: Record<string, React.CSSProperties> = {
          primary: { background: accentGrad, color: tokens.backgroundColor, border: 'none' },
          secondary: { background: tokens.surfaceColor, color: tokens.textColor, border: `1px solid ${tokens.mutedTextColor}33` },
          outline: { background: 'transparent', color: tokens.accentColor, border: `2px solid ${tokens.accentColor}` },
          ghost: { background: 'transparent', color: tokens.accentColor, border: 'none' },
        };
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 10 }}>
            <div
              style={{ padding: '14px 32px', borderRadius: tokens.borderRadius, fontSize: 18, fontWeight: 600, cursor: editing ? 'text' : 'pointer', ...btnStyles[currentVariant], textDecoration: 'none', display: 'inline-block' }}
              onClick={() => { if (!editing && block.url && block.url !== '#') window.open(block.url, block.target || '_blank', 'noopener,noreferrer'); }}
            >
              <EditableText
                value={block.text}
                onSave={(t) => save({ text: t } as any)}
                isEditing={editing}
                tag="span"
              />
            </div>
            {editing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 360, marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="url"
                  defaultValue={block.url || ''}
                  placeholder="Button URL (https://...)"
                  onBlur={(e) => save({ url: e.target.value } as any)}
                  onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                  style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: `1px solid ${tokens.mutedTextColor}33`, background: tokens.surfaceColor, color: tokens.textColor, outline: 'none', width: '100%' }}
                />
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  {btnVariants.map((v) => (
                    <button
                      key={v}
                      onClick={() => save({ variant: v } as any)}
                      style={{ padding: '3px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer', border: currentVariant === v ? `2px solid ${tokens.accentColor}` : `1px solid ${tokens.mutedTextColor}33`, background: currentVariant === v ? `${tokens.accentColor}15` : 'transparent', color: tokens.textColor, fontWeight: currentVariant === v ? 700 : 400, textTransform: 'capitalize' }}
                    >
                      {v}
                    </button>
                  ))}
                  <span style={{ fontSize: 11, color: tokens.mutedTextColor, marginLeft: 8 }}>Open in:</span>
                  {(['_blank', '_self'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => save({ target: t } as any)}
                      style={{ padding: '3px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer', border: (block.target || '_blank') === t ? `2px solid ${tokens.accentColor}` : `1px solid ${tokens.mutedTextColor}33`, background: (block.target || '_blank') === t ? `${tokens.accentColor}15` : 'transparent', color: tokens.textColor, fontWeight: (block.target || '_blank') === t ? 700 : 400 }}
                    >
                      {t === '_blank' ? 'New Tab' : 'Same Tab'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'quote-box':
        if (block.variant === 'speech-bubble') {
          return (
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{ ...cardStyle, borderRadius: 20, padding: 32, position: 'relative' }}>
                <EditableText
                  value={block.text}
                  onSave={(t) => save({ text: t } as any)}
                  isEditing={editing}
                  tag="div"
                  multiline
                  style={{ fontSize: 24, fontStyle: 'italic', lineHeight: 1.6 }}
                />
              </div>
              <div style={{ width: 0, height: 0, borderLeft: '16px solid transparent', borderRight: '16px solid transparent', borderTop: `16px solid ${tokens.surfaceColor}`, marginLeft: 40 }} />
              {(block.attribution || editing) && (
                <EditableText
                  value={block.attribution || ''}
                  onSave={(t) => save({ attribution: t } as any)}
                  isEditing={editing}
                  tag="div"
                  style={{ fontSize: 16, fontWeight: 600, marginTop: 8, marginLeft: 32, color: tokens.accentColor }}
                  placeholder="Attribution..."
                />
              )}
            </div>
          );
        }
        return (
          <div style={{ ...cardStyle, borderLeft: `5px solid ${tokens.accentColor}`, width: '100%' }}>
            <div style={{ fontSize: 48, color: tokens.accentColor, opacity: 0.3, lineHeight: 1, marginBottom: 8, fontFamily: 'Georgia, serif' }}>"</div>
            <EditableText
              value={block.text}
              onSave={(t) => save({ text: t } as any)}
              isEditing={editing}
              tag="div"
              multiline
              style={{ fontSize: 24, fontStyle: 'italic', lineHeight: 1.6 }}
            />
            {(block.attribution || editing) && (
              <EditableText
                value={block.attribution || ''}
                onSave={(t) => save({ attribution: t } as any)}
                isEditing={editing}
                tag="div"
                style={{ fontSize: 16, color: tokens.mutedTextColor, marginTop: 16, fontWeight: 600 }}
                placeholder="— Attribution..."
              />
            )}
          </div>
        );

      case 'icon-grid':
        return renderIconGrid(block, effectiveTokens, accentGrad, editing, save, innerCardStyle, effectiveIconColor, effectiveIconBgColor, effectiveIconSize);

      case 'embed':
        return renderEmbed(block, tokens, editing, save);

      case 'scene-3d': {
        const Scene3D = React.lazy(() => import('./Scene3DRenderer'));
        const presetOptions = ['rotating-cube', 'sphere', 'torus-knot', 'globe', 'product-stage', 'particles'];
        return (
          <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 300 }}>
            <React.Suspense fallback={<div style={{ width: '100%', height: '100%', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.mutedTextColor }}>Loading 3D…</div>}>
              <Scene3D preset={block.preset} autoRotate={block.autoRotate} backgroundColor={block.backgroundColor} cameraPosition={block.cameraPosition} accentColor={tokens.accentColor} />
            </React.Suspense>
            {editing && (
              <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 8 }} onClick={(e) => e.stopPropagation()}>
                <label style={{ fontSize: 11, color: '#ccc', fontWeight: 600 }}>Preset</label>
                <select
                  value={block.preset || 'rotating-cube'}
                  onChange={(e) => save({ preset: e.target.value } as any)}
                  style={{ fontSize: 13, padding: '4px 8px', borderRadius: 4, border: 'none', background: '#333', color: '#fff' }}
                >
                  {presetOptions.map((p) => <option key={p} value={p}>{p.replace(/-/g, ' ')}</option>)}
                </select>
                <label style={{ fontSize: 11, color: '#ccc', fontWeight: 600, marginTop: 4 }}>Auto Rotate</label>
                <input type="checkbox" checked={block.autoRotate !== false} onChange={(e) => save({ autoRotate: e.target.checked } as any)} />
              </div>
            )}
          </div>
        );
      }

      case 'countdown':
        return <CountdownRendererComp targetDate={block.targetDate} label={block.label} completedText={block.completedText} tokens={tokens} isEditing={editing} onSave={(patch) => save(patch as any)} />;

      case 'animated-counter':
        return <AnimatedCounterRendererComp value={block.value} prefix={block.prefix} suffix={block.suffix} duration={block.duration} label={block.label} tokens={tokens} isEditing={editing} onSave={(patch) => save(patch as any)} />;

      case 'before-after':
        return <BeforeAfterRendererComp beforeSrc={block.beforeSrc} afterSrc={block.afterSrc} beforeLabel={block.beforeLabel} afterLabel={block.afterLabel} tokens={tokens} isEditing={editing} onSave={(patch) => save(patch as any)} />;

      case 'toggle-reveal':
        return <ToggleRevealRendererComp prompt={block.prompt} reveal={block.reveal} variant={block.variant} tokens={tokens} isEditing={editing} onSave={(patch) => save(patch as any)} />;

      case 'live-ticker':
        return <LiveTickerRendererComp items={block.items} speed={block.speed} direction={block.direction} tokens={tokens} isEditing={editing} onSave={(patch) => save(patch as any)} />;

      // ── Phase 5 — Premium Components ──────────────────────────────

      case 'container': {
        const childBlocks = (allBlocks || []).filter(b => (b as any).parentId === block.id);
        const containerBg = bs?.backgroundGradientCSS || (bs?.backgroundImageUrl ? `url(${bs.backgroundImageUrl}) center/cover no-repeat` : undefined) || bs?.backgroundColor || (childBlocks.length === 0 ? `${tokens.surfaceColor}40` : undefined);
        return (
          <div style={{
            width: '100%', minHeight: 80,
            display: bs?.layoutMode === 'grid' ? 'grid' : 'flex',
            flexDirection: bs?.flexDirection || 'column',
            flexWrap: bs?.flexWrap || 'nowrap',
            justifyContent: bs?.justifyContent || 'flex-start',
            alignItems: bs?.alignItems || 'stretch',
            gridTemplateColumns: bs?.layoutMode === 'grid' ? `repeat(${bs?.gridColumns || 2}, 1fr)` : undefined,
            gap: bs?.gridGap ?? bs?.gap ?? 12,
            padding: paddingStr,
            border: editing ? `2px dashed ${tokens.accentColor}40` : bs?.borderWidth ? `${bs.borderWidth}px ${bs.borderStyle || 'solid'} ${bs.borderColor || tokens.accentColor}` : childBlocks.length === 0 ? `1px dashed ${tokens.mutedTextColor}20` : 'none',
            borderRadius: bs?.borderRadius ?? tokens.borderRadius,
            background: containerBg,
            boxShadow: computedBoxShadow,
            opacity: bs?.opacity ?? 1,
            filter: computedFilter,
            backdropFilter: bs?.backdropBlur ? `blur(${bs.backdropBlur}px)` : undefined,
            overflow: bs?.overflow || undefined,
          }}>
            {childBlocks.length > 0 ? childBlocks.map(child => (
              <ContentBlockRenderer key={child.id} block={child} tokens={tokens} isEditing={isEditing} slideId={slideId} allBlocks={allBlocks} />
            )) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.mutedTextColor, fontSize: 14, opacity: 0.6 }}>
                <RenderIcon name="LayoutGrid" size={16} color={tokens.mutedTextColor} />
                <span style={{ marginLeft: 6 }}>Container · Double-click to add blocks inside</span>
              </div>
            )}
            {isIsolated && (
              <button
                onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-slash-inside', { detail: { blockId: block.id, rect: (e.target as HTMLElement).getBoundingClientRect() } })); }}
                style={{ marginTop: 8, padding: '6px 16px', borderRadius: tokens.borderRadius, border: `1px dashed ${tokens.accentColor}60`, background: `${tokens.accentColor}10`, color: tokens.accentColor, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'center' }}>
                <RenderIcon name="Plus" size={14} color={tokens.accentColor} /> Add block
              </button>
            )}
          </div>
        );
      }

      case 'stack': {
        const stackChildren = (allBlocks || []).filter(b => (b as any).parentId === block.id);
        return (
          <div style={{
            width: '100%', minHeight: 60,
            display: 'flex',
            flexDirection: block.direction === 'horizontal' ? 'row' : 'column',
            gap: block.spacing ?? 12,
            alignItems: block.alignment === 'start' ? 'flex-start' : block.alignment === 'end' ? 'flex-end' : block.alignment === 'stretch' ? 'stretch' : 'center',
            border: editing ? `2px dashed ${tokens.accentColor}40` : stackChildren.length === 0 ? `1px dashed ${tokens.mutedTextColor}20` : 'none',
            borderRadius: tokens.borderRadius,
            padding: bs?.padding ?? 12,
          }}>
            {stackChildren.length > 0 ? stackChildren.map(child => (
              <ContentBlockRenderer key={child.id} block={child} tokens={tokens} isEditing={isEditing} slideId={slideId} allBlocks={allBlocks} />
            )) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tokens.mutedTextColor, fontSize: 13 }}>
                <RenderIcon name={block.direction === 'horizontal' ? 'Columns' : 'Rows3'} size={14} color={tokens.mutedTextColor} />
                <span>Stack · Double-click to add blocks inside</span>
              </div>
            )}
            {isIsolated && (
              <button
                onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-slash-inside', { detail: { blockId: block.id, rect: (e.target as HTMLElement).getBoundingClientRect() } })); }}
                style={{ marginTop: 8, padding: '6px 16px', borderRadius: tokens.borderRadius, border: `1px dashed ${tokens.accentColor}60`, background: `${tokens.accentColor}10`, color: tokens.accentColor, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'center' }}>
                <RenderIcon name="Plus" size={14} color={tokens.accentColor} /> Add block
              </button>
            )}
          </div>
        );
      }

      case 'accordion':
        return (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {block.items.map((item, i) => (
              <AccordionItem key={i} item={item} index={i} tokens={tokens} accentGrad={accentGrad} editing={editing} save={save} block={block} />
            ))}
            {editing && (
              <AddItemButton onClick={() => save({ items: [...block.items, { title: 'New Section', content: 'Content here...', defaultOpen: false }] } as any)} accentColor={tokens.accentColor} />
            )}
          </div>
        );

      case 'tabs':
        return <TabsRenderer block={block} tokens={tokens} editing={editing} save={save} cardStyle={cardStyle} />;

      case 'banner':
        return (
          <div style={{
            width: '100%', minHeight: block.height || 300, position: 'relative', borderRadius: tokens.borderRadius, overflow: 'hidden',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: block.backgroundGradient || (block.backgroundImage ? undefined : accentGrad),
            backgroundImage: block.backgroundImage ? `url(${block.backgroundImage})` : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center',
            padding: 48, textAlign: 'center', gap: 16,
          }}>
            {block.backgroundImage && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <EditableText value={block.heading} onSave={(t) => save({ heading: t } as any)} isEditing={editing} tag="h2" style={{ fontSize: 48, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 8 }} />
              {(block.subheading || editing) && <EditableText value={block.subheading || ''} onSave={(t) => save({ subheading: t } as any)} isEditing={editing} tag="p" style={{ fontSize: 20, color: 'rgba(255,255,255,0.85)', marginTop: 8 }} placeholder="Add subheading..." />}
              {(block.ctaText || editing) && (
                <div style={{ marginTop: 24, display: 'inline-block', padding: '14px 32px', borderRadius: tokens.borderRadius, background: '#fff', color: tokens.accentColor, fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>
                  <EditableText value={block.ctaText || 'Get Started'} onSave={(t) => save({ ctaText: t } as any)} isEditing={editing} tag="span" />
                </div>
              )}
            </div>
          </div>
        );

      case 'marquee': {
        const items = block.items || ['Item 1', 'Item 2', 'Item 3'];
        return (
          <div style={{ width: '100%', overflow: 'hidden', padding: '16px 0', position: 'relative' }}>
            <div style={{
              display: 'flex', gap: 48, whiteSpace: 'nowrap',
              animation: `marquee ${(block.speed || 20)}s linear infinite`,
              animationDirection: block.direction === 'right' ? 'reverse' : 'normal',
            }}>
              {[...items, ...items].map((item, i) => (
                <span key={i} style={{ fontSize: 24, fontWeight: 600, color: tokens.textColor, flexShrink: 0 }}>{item}</span>
              ))}
            </div>
            {editing && (
              <div style={{ marginTop: 8, fontSize: 11, color: tokens.mutedTextColor, textAlign: 'center' }}>Marquee · {items.length} items</div>
            )}
          </div>
        );
      }

      case 'avatar':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
            <div style={{
              width: block.size || 64, height: block.size || 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: block.src ? undefined : `linear-gradient(135deg, ${tokens.accentColor}, ${tokens.primaryColor || '#8b5cf6'})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {block.src ? <img src={block.src} alt={block.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                <span style={{ color: '#fff', fontSize: (block.size || 64) * 0.4, fontWeight: 700 }}>{block.name.charAt(0).toUpperCase()}</span>}
            </div>
            <div>
              <EditableText value={block.name} onSave={(t) => save({ name: t } as any)} isEditing={editing} tag="div" style={{ fontSize: 20, fontWeight: 700 }} />
              {(block.role || editing) && <EditableText value={block.role || ''} onSave={(t) => save({ role: t } as any)} isEditing={editing} tag="div" style={{ fontSize: 14, color: tokens.mutedTextColor }} placeholder="Role..." />}
            </div>
          </div>
        );

      case 'badge':
        const badgeColors = { default: tokens.accentColor, success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' };
        const badgeColor = badgeColors[block.variant] || tokens.accentColor;
        return (
          <span style={{
            display: 'inline-flex', padding: '6px 16px', borderRadius: 999, fontSize: 14, fontWeight: 600,
            backgroundColor: `${badgeColor}15`, color: badgeColor, border: `1px solid ${badgeColor}30`,
          }}>
            <EditableText value={block.text} onSave={(t) => save({ text: t } as any)} isEditing={editing} tag="span" />
          </span>
        );

      case 'spacer':
        return (
          <div style={{ width: '100%', height: block.size || 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {editing && <span style={{ fontSize: 10, color: tokens.mutedTextColor, opacity: 0.5 }}>Spacer · {block.size}px</span>}
          </div>
        );

      case 'gradient-shape': {
        const shapeColors = block.colors || [tokens.accentColor, tokens.primaryColor || '#8b5cf6'];
        const grad = `linear-gradient(135deg, ${shapeColors.join(', ')})`;
        const shapeStyles: Record<string, React.CSSProperties> = {
          circle: { borderRadius: '50%' },
          blob: { borderRadius: '40% 60% 55% 45% / 55% 40% 60% 45%' },
          rectangle: { borderRadius: tokens.borderRadius },
          triangle: { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
          ring: { borderRadius: '50%', background: 'transparent', border: `${block.size * 0.1}px solid`, borderImage: `${grad} 1` },
        };
        return (
          <div style={{
            width: block.size || 200, height: block.size || 200, background: block.shape !== 'ring' ? grad : undefined,
            filter: block.blur ? `blur(${block.blur}px)` : undefined,
            ...shapeStyles[block.shape || 'circle'],
            margin: '0 auto',
          }} />
        );
      }

      case 'video-bg':
        return (
          <div style={{ width: '100%', position: 'relative', borderRadius: tokens.borderRadius, overflow: 'hidden', minHeight: 200 }}>
            {block.src ? (
              <video src={block.src} poster={block.poster} autoPlay={block.autoplay !== false} loop={block.loop !== false} muted={block.muted !== false} playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tokens.surfaceColor, color: tokens.mutedTextColor, border: `2px dashed ${tokens.mutedTextColor}33` }}>
                <RenderIcon name="Video" size={32} color={tokens.mutedTextColor} />
                <span style={{ marginLeft: 8, fontSize: 14 }}>{editing ? 'Add video URL' : 'Video background'}</span>
              </div>
            )}
          </div>
        );

      case 'repeater':
        return (
          <div style={{
            width: '100%', display: 'grid',
            gridTemplateColumns: `repeat(${block.columns || 3}, 1fr)`,
            gap: 16,
          }}>
            {(block.data || []).map((row, i) => (
              <div key={i} style={{ ...cardStyle, padding: 16 }}>
                {Object.entries(row).map(([key, val]) => (
                  <div key={key}>
                    <div style={{ fontSize: 10, color: tokens.mutedTextColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{key}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>
            ))}
            {editing && <AddItemButton onClick={() => save({ data: [...(block.data || []), { title: 'New', value: '...' }] } as any)} accentColor={tokens.accentColor} />}
          </div>
        );

      case 'custom-svg':
        return (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {block.svgCode ? (
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.svgCode, { USE_PROFILES: { svg: true, svgFilters: true } }) }} style={{ maxWidth: '100%' }} />
            ) : (
              <div style={{ padding: 24, border: `2px dashed ${tokens.mutedTextColor}33`, borderRadius: tokens.borderRadius, textAlign: 'center', color: tokens.mutedTextColor }}>
                <RenderIcon name="Code" size={32} color={tokens.mutedTextColor} />
                <div style={{ marginTop: 8, fontSize: 14 }}>{editing ? 'Paste SVG code in properties' : 'Custom SVG'}</div>
              </div>
            )}
          </div>
        );

      case 'social-links': {
        const socialIcons: Record<string, string> = { twitter: 'Twitter', facebook: 'Facebook', instagram: 'Instagram', linkedin: 'Linkedin', youtube: 'Youtube', github: 'Github', tiktok: 'Music', website: 'Globe', email: 'Mail' };
        return (
          <div style={{ display: 'flex', gap: block.variant === 'pills' ? 8 : 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            {block.links.map((link, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                ...(block.variant === 'pills' ? { padding: '8px 16px', borderRadius: 999, background: `${tokens.accentColor}10`, border: `1px solid ${tokens.accentColor}20` } : {}),
              }} onClick={() => !editing && link.url && window.open(link.url, '_blank')}>
                <RenderIcon name={socialIcons[link.platform] || 'Link'} size={20} color={tokens.accentColor} />
                {block.variant !== 'icons-only' && <span style={{ fontSize: 14, fontWeight: 500 }}>{link.platform}</span>}
              </div>
            ))}
            {editing && <AddItemButton onClick={() => save({ links: [...block.links, { platform: 'website', url: '#' }] } as any)} accentColor={tokens.accentColor} />}
          </div>
        );
      }

      case 'pricing-table':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(block.plans.length, 3)}, 1fr)`, gap: 20, width: '100%' }}>
            {block.plans.map((plan, i) => (
              <div key={i} className="group/item" style={{
                ...cardStyle, ...innerCardStyle, position: 'relative', display: 'flex', flexDirection: 'column', gap: 16,
                borderTop: plan.highlighted ? `4px solid ${tokens.accentColor}` : undefined,
                transform: plan.highlighted ? 'scale(1.03)' : undefined,
                boxShadow: plan.highlighted ? `0 8px 32px ${tokens.accentColor}20` : innerCardStyle.boxShadow || cardStyle.boxShadow,
              }}>
                {plan.highlighted && <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: tokens.accentColor, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 999, textTransform: 'uppercase' }}>Popular</div>}
                <EditableText value={plan.name} onSave={(t) => { const plans = [...block.plans]; plans[i] = { ...plans[i], name: t }; save({ plans } as any); }} isEditing={editing} tag="div" style={{ fontSize: 20, fontWeight: 700 }} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <EditableText value={plan.price} onSave={(t) => { const plans = [...block.plans]; plans[i] = { ...plans[i], price: t }; save({ plans } as any); }} isEditing={editing} tag="span" style={{ fontSize: 40, fontWeight: 900, color: tokens.accentColor }} />
                  {plan.period && <span style={{ fontSize: 14, color: tokens.mutedTextColor }}>/{plan.period}</span>}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                  {plan.features.map((feat, fi) => (
                    <li key={fi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 15 }}>
                      <RenderIcon name="Check" size={16} color={tokens.accentColor} />
                      <EditableText value={feat} onSave={(t) => { const plans = [...block.plans]; const features = [...plans[i].features]; features[fi] = t; plans[i] = { ...plans[i], features }; save({ plans } as any); }} isEditing={editing} tag="span" />
                    </li>
                  ))}
                </ul>
                {(plan.ctaText || editing) && (
                  <div style={{ padding: '12px 24px', borderRadius: tokens.borderRadius, background: plan.highlighted ? accentGrad : `${tokens.accentColor}10`, color: plan.highlighted ? '#fff' : tokens.accentColor, textAlign: 'center', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
                    <EditableText value={plan.ctaText || 'Get Started'} onSave={(t) => { const plans = [...block.plans]; plans[i] = { ...plans[i], ctaText: t }; save({ plans } as any); }} isEditing={editing} tag="span" />
                  </div>
                )}
                {editing && block.plans.length > 1 && <RemoveItemButton onClick={() => save({ plans: block.plans.filter((_: any, idx: number) => idx !== i) } as any)} accentColor={tokens.accentColor} />}
              </div>
            ))}
            {editing && <AddItemButton onClick={() => save({ plans: [...block.plans, { name: 'Plan', price: '$29', features: ['Feature 1', 'Feature 2'] }] } as any)} accentColor={tokens.accentColor} />}
          </div>
        );

      case 'testimonial':
        return (
          <div style={{ ...cardStyle, ...innerCardStyle, display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
            {block.rating != null && (
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <RenderIcon key={i} name="Star" size={20} color={i < (block.rating || 0) ? '#f59e0b' : `${tokens.mutedTextColor}33`} />
                ))}
              </div>
            )}
            <EditableText value={block.quote} onSave={(t) => save({ quote: t } as any)} isEditing={editing} tag="div" multiline style={{ fontSize: 20, fontStyle: 'italic', lineHeight: 1.6 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: `linear-gradient(135deg, ${tokens.accentColor}, ${tokens.primaryColor || '#8b5cf6'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {block.avatarSrc ? <img src={block.avatarSrc} alt={block.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                  <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{block.name.charAt(0)}</span>}
              </div>
              <div>
                <EditableText value={block.name} onSave={(t) => save({ name: t } as any)} isEditing={editing} tag="div" style={{ fontSize: 16, fontWeight: 700 }} />
                {(block.role || editing) && <EditableText value={block.role || ''} onSave={(t) => save({ role: t } as any)} isEditing={editing} tag="div" style={{ fontSize: 13, color: tokens.mutedTextColor }} placeholder="Role..." />}
              </div>
            </div>
          </div>
        );

      case 'feature-grid': {
        const featColors = [effectiveAccent, tokens.primaryColor || '#8b5cf6', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];
        const fIconSize = effectiveIconSize || 24;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${block.columns || 3}, 1fr)`, gap: 24, width: '100%' }}>
            {block.features.map((feat, i) => {
              const fc = effectiveIconColor || featColors[i % featColors.length];
              const iconBg = effectiveIconBgColor || `${fc}15`;
              return (
                <div key={i} className="group/item" style={{ ...cardStyle, ...innerCardStyle, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
                  <div style={{ width: fIconSize * 2, height: fIconSize * 2, borderRadius: innerCardStyle.borderRadius ?? tokens.borderRadius, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EditableIcon name={feat.icon} size={fIconSize} color={fc} isEditing={editing} onSelect={(icon) => { const features = [...block.features]; features[i] = { ...features[i], icon }; save({ features } as any); }} tokens={effectiveTokens} />
                  </div>
                  <EditableText value={feat.title} onSave={(t) => { const features = [...block.features]; features[i] = { ...features[i], title: t }; save({ features } as any); }} isEditing={editing} tag="div" style={{ fontSize: 18, fontWeight: 700 }} />
                  <EditableText value={feat.description} onSave={(t) => { const features = [...block.features]; features[i] = { ...features[i], description: t }; save({ features } as any); }} isEditing={editing} tag="div" multiline style={{ fontSize: 14, color: tokens.mutedTextColor, lineHeight: 1.5 }} />
                  {editing && block.features.length > 1 && <RemoveItemButton onClick={() => save({ features: block.features.filter((_: any, idx: number) => idx !== i) } as any)} accentColor={effectiveAccent} />}
                </div>
              );
            })}
            {editing && <AddItemButton onClick={() => save({ features: [...block.features, { icon: 'Star', title: 'Feature', description: 'Description' }] } as any)} accentColor={effectiveAccent} />}
          </div>
        );
      }

      case 'logo-cloud':
        return (
          <div style={{
            display: block.variant === 'inline' ? 'flex' : 'grid',
            gridTemplateColumns: block.variant === 'grid' ? 'repeat(auto-fit, minmax(120px, 1fr))' : undefined,
            flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'center', width: '100%', padding: 16,
          }}>
            {block.logos.map((logo, i) => (
              <div key={i} className="group/item" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: tokens.borderRadius, transition: 'transform 0.2s' }}>
                {logo.src ? (
                  <img src={logo.src} alt={logo.alt} style={{ maxHeight: 48, maxWidth: 120, objectFit: 'contain', filter: 'grayscale(1)', opacity: 0.6, transition: 'all 0.2s' }} />
                ) : (
                  <div style={{ width: 80, height: 40, border: `2px dashed ${tokens.mutedTextColor}33`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: tokens.mutedTextColor }}>{logo.alt || 'Logo'}</div>
                )}
                {editing && block.logos.length > 1 && <RemoveItemButton onClick={() => save({ logos: block.logos.filter((_: any, idx: number) => idx !== i) } as any)} accentColor={tokens.accentColor} />}
              </div>
            ))}
            {editing && <AddItemButton onClick={() => save({ logos: [...block.logos, { src: '', alt: 'Logo' }] } as any)} accentColor={tokens.accentColor} />}
          </div>
        );

      case 'cta-section':
        return (
          <div style={{ width: '100%', textAlign: 'center', padding: '48px 24px', borderRadius: tokens.borderRadius, background: `linear-gradient(135deg, ${tokens.surfaceColor}, ${tokens.surfaceColor}88)` }}>
            <EditableText value={block.heading} onSave={(t) => save({ heading: t } as any)} isEditing={editing} tag="h2" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, marginBottom: 12 }} />
            {(block.subheading || editing) && <EditableText value={block.subheading || ''} onSave={(t) => save({ subheading: t } as any)} isEditing={editing} tag="p" style={{ fontSize: 18, color: tokens.mutedTextColor, marginBottom: 24, maxWidth: 600, margin: '0 auto 24px' }} placeholder="Add subheading..." />}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {(block.primaryButtonText || editing) && (
                <div style={{ padding: '14px 32px', borderRadius: tokens.borderRadius, background: accentGrad, color: tokens.backgroundColor, fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>
                  <EditableText value={block.primaryButtonText || 'Get Started'} onSave={(t) => save({ primaryButtonText: t } as any)} isEditing={editing} tag="span" />
                </div>
              )}
              {(block.secondaryButtonText || editing) && (
                <div style={{ padding: '14px 32px', borderRadius: tokens.borderRadius, border: `2px solid ${tokens.accentColor}`, color: tokens.accentColor, fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>
                  <EditableText value={block.secondaryButtonText || 'Learn More'} onSave={(t) => save({ secondaryButtonText: t } as any)} isEditing={editing} tag="span" />
                </div>
              )}
            </div>
          </div>
        );

      case 'nav-bar':
        return (
          <div style={{
            width: '100%', display: 'flex', alignItems: 'center', padding: '12px 24px',
            justifyContent: block.variant === 'centered' ? 'center' : 'space-between',
            gap: 24, borderRadius: tokens.borderRadius, backgroundColor: tokens.surfaceColor,
          }}>
            {block.logo ? (
              <img src={block.logo} alt="Logo" style={{ height: 32, objectFit: 'contain' }} />
            ) : (
              <div style={{ fontSize: 18, fontWeight: 800, color: tokens.accentColor }}>Logo</div>
            )}
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              {block.links.map((link, i) => (
                <span key={i} style={{ fontSize: 15, fontWeight: 500, color: tokens.textColor, cursor: 'pointer', transition: 'color 0.2s' }}>
                  <EditableText value={link.label} onSave={(t) => { const links = [...block.links]; links[i] = { ...links[i], label: t }; save({ links } as any); }} isEditing={editing} tag="span" />
                </span>
              ))}
              {editing && <AddItemButton onClick={() => save({ links: [...block.links, { label: 'Link', url: '#' }] } as any)} accentColor={tokens.accentColor} />}
            </div>
          </div>
        );

      // ── Phase 6 — Design-Centric Blocks ────────────────────────────

      case 'bento-grid': {
        const colors = [effectiveAccent, tokens.primaryColor || '#8b5cf6', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];
        const bentoItems = (block as any).items || [];
        const bIconSize = effectiveIconSize || 22;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: '180px', gap: 12, width: '100%' }}>
            {bentoItems.map((item: any, i: number) => {
              const span = item.span || 'normal';
              const gridColumn = span === 'wide' ? 'span 2' : span === 'large' ? 'span 2' : 'span 1';
              const gridRow = span === 'tall' ? 'span 2' : span === 'large' ? 'span 2' : 'span 1';
              const c = effectiveIconColor || colors[i % colors.length];
              const iconBg = effectiveIconBgColor || `${c}20`;
              return (
                <div key={i} className="group/item" style={{
                  gridColumn, gridRow, borderRadius: innerCardStyle.borderRadius ?? (tokens.borderRadius + 8),
                  background: innerCardStyle.backgroundColor || `linear-gradient(145deg, ${c}18, ${c}06)`,
                  border: innerCardStyle.borderColor ? `${innerCardStyle.borderWidth || 1}px solid ${innerCardStyle.borderColor}` : `1px solid ${c}25`,
                  padding: innerCardStyle.padding ?? 24,
                  boxShadow: innerCardStyle.boxShadow || undefined,
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `${c}10`, filter: 'blur(20px)' }} />
                  {item.icon && (
                    <div style={{ width: bIconSize * 2, height: bIconSize * 2, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <EditableIcon name={item.icon} size={bIconSize} color={c} isEditing={editing} onSelect={(icon) => { const items = [...bentoItems]; items[i] = { ...items[i], icon }; save({ items } as any); }} tokens={tokens} />
                    </div>
                  )}
                  <EditableText value={item.title} onSave={(t) => { const items = [...bentoItems]; items[i] = { ...items[i], title: t }; save({ items } as any); }} isEditing={editing} tag="div" style={{ fontSize: span === 'large' ? 28 : 18, fontWeight: 800, marginBottom: 4 }} />
                  <EditableText value={item.description} onSave={(t) => { const items = [...bentoItems]; items[i] = { ...items[i], description: t }; save({ items } as any); }} isEditing={editing} tag="div" multiline style={{ fontSize: 14, color: tokens.mutedTextColor, lineHeight: 1.5 }} />
                  {editing && bentoItems.length > 1 && <RemoveItemButton onClick={() => save({ items: bentoItems.filter((_: any, idx: number) => idx !== i) } as any)} accentColor={effectiveAccent} />}
                </div>
              );
            })}
            {editing && <AddItemButton onClick={() => save({ items: [...bentoItems, { title: 'New', description: 'Description', icon: 'Star', span: 'normal' }] } as any)} accentColor={effectiveAccent} />}
          </div>
        );
      }

      case 'glass-card': {
        const b = block as any;
        return (
          <div style={{
            width: '100%', minHeight: 280, borderRadius: tokens.borderRadius + 12,
            background: b.backgroundImage ? `url(${b.backgroundImage}) center/cover` : `linear-gradient(135deg, ${effectiveAccent}30, ${tokens.primaryColor || '#8b5cf6'}20)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'relative', zIndex: 2, padding: innerCardStyle.padding ?? 48, borderRadius: innerCardStyle.borderRadius ?? (tokens.borderRadius + 8),
              background: innerCardStyle.backgroundColor || `${tokens.backgroundColor}44`, backdropFilter: 'blur(24px) saturate(180%)',
              border: innerCardStyle.borderColor ? `${innerCardStyle.borderWidth || 1}px solid ${innerCardStyle.borderColor}` : `1px solid ${tokens.textColor}15`,
              maxWidth: '80%', textAlign: 'center',
              boxShadow: innerCardStyle.boxShadow || `0 8px 32px ${tokens.textColor}08, inset 0 1px 0 ${tokens.textColor}10`,
            }}>
              {b.icon && (
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: `${effectiveAccent}20`, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EditableIcon name={b.icon} size={28} color={effectiveAccent} isEditing={editing} onSelect={(icon) => save({ icon } as any)} tokens={tokens} />
                  </div>
                </div>
              )}
              <EditableText value={b.heading} onSave={(t) => save({ heading: t } as any)} isEditing={editing} tag="h3" style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }} />
              <EditableText value={b.description} onSave={(t) => save({ description: t } as any)} isEditing={editing} tag="p" multiline style={{ fontSize: 16, color: tokens.mutedTextColor, lineHeight: 1.6 }} />
            </div>
          </div>
        );
      }

      case 'gradient-text': {
        const b = block as any;
        const angle = b.gradientAngle ?? 135;
        return (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <EditableText
              value={b.text}
              onSave={(t) => save({ text: t } as any)}
              isEditing={editing}
              tag="h1"
              style={{
                fontSize: b.fontSize || 80, fontWeight: 900, lineHeight: 1.05, margin: 0,
                background: `linear-gradient(${angle}deg, ${b.gradientFrom}, ${b.gradientTo})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em',
              }}
            />
          </div>
        );
      }

      case 'mockup-frame': {
        const b = block as any;
        const frameType = b.frameType || 'browser';
        const browserChrome = (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: tokens.surfaceColor, borderBottom: `1px solid ${tokens.mutedTextColor}20`, borderRadius: `${tokens.borderRadius + 4}px ${tokens.borderRadius + 4}px 0 0` }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
            </div>
            <div style={{ flex: 1, padding: '4px 12px', borderRadius: 6, background: `${tokens.mutedTextColor}10`, fontSize: 12, color: tokens.mutedTextColor }}>
              <EditableText value={b.url || 'https://example.com'} onSave={(t) => save({ url: t } as any)} isEditing={editing} tag="span" />
            </div>
          </div>
        );
        const phoneFrame = (
          <div style={{ width: 320, margin: '0 auto', borderRadius: 32, border: `3px solid ${tokens.mutedTextColor}30`, background: tokens.surfaceColor, overflow: 'hidden', boxShadow: `0 20px 60px ${tokens.textColor}15` }}>
            <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 80, height: 5, borderRadius: 3, background: `${tokens.mutedTextColor}30` }} />
            </div>
            <div style={{ aspectRatio: '9/16', overflow: 'hidden' }}>
              {b.contentSrc ? <img src={b.contentSrc} alt="Phone content" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                <div style={{ width: '100%', height: '100%', background: `${tokens.mutedTextColor}08`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.mutedTextColor, fontSize: 14 }}>
                  {editing ? 'Add image in properties' : 'Phone mockup'}
                </div>}
            </div>
          </div>
        );
        const laptopFrame = (
          <div style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
            <div style={{ borderRadius: '12px 12px 0 0', border: `2px solid ${tokens.mutedTextColor}25`, borderBottom: 'none', overflow: 'hidden', background: tokens.surfaceColor }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: `${tokens.mutedTextColor}08` }}>
                <div style={{ display: 'flex', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} /><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} /><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} /></div>
              </div>
              <div style={{ aspectRatio: '16/10' }}>
                {b.contentSrc ? <img src={b.contentSrc} alt="Laptop content" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                  <div style={{ width: '100%', height: '100%', background: `${tokens.mutedTextColor}06`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.mutedTextColor }}>{editing ? 'Add screenshot' : 'Laptop mockup'}</div>}
              </div>
            </div>
            <div style={{ height: 14, background: `linear-gradient(180deg, ${tokens.mutedTextColor}15, ${tokens.mutedTextColor}08)`, borderRadius: '0 0 8px 8px', margin: '0 -8px' }} />
          </div>
        );

        return (
          <div style={{ width: '100%' }}>
            {frameType === 'browser' && (
              <div style={{ borderRadius: tokens.borderRadius + 4, border: `2px solid ${tokens.mutedTextColor}20`, overflow: 'hidden', boxShadow: `0 12px 40px ${tokens.textColor}10` }}>
                {browserChrome}
                <div style={{ aspectRatio: '16/10', overflow: 'hidden' }}>
                  {b.contentSrc ? <img src={b.contentSrc} alt="Browser content" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                    <div style={{ width: '100%', height: '100%', background: `${tokens.mutedTextColor}06`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.mutedTextColor, fontSize: 16 }}>
                      {editing ? 'Add screenshot in properties' : 'Browser mockup'}
                    </div>}
                </div>
              </div>
            )}
            {frameType === 'phone' && phoneFrame}
            {frameType === 'laptop' && laptopFrame}
          </div>
        );
      }

      case 'split-screen': {
        const b = block as any;
        const ratio = b.splitRatio || 50;
        return (
          <div style={{ display: 'flex', width: '100%', minHeight: 400, borderRadius: tokens.borderRadius + 8, overflow: 'hidden' }}>
            <div style={{ flex: `0 0 ${ratio}%`, padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: `linear-gradient(135deg, ${effectiveAccent}08, transparent)` }}>
              <EditableText value={b.leftContent?.heading || 'Heading'} onSave={(t) => save({ leftContent: { ...b.leftContent, heading: t } } as any)} isEditing={editing} tag="h2" style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }} />
              <EditableText value={b.leftContent?.description || 'Description'} onSave={(t) => save({ leftContent: { ...b.leftContent, description: t } } as any)} isEditing={editing} tag="p" multiline style={{ fontSize: 18, color: tokens.mutedTextColor, lineHeight: 1.6, marginBottom: 24 }} />
              {(b.leftContent?.ctaText || editing) && (
                <div style={{ alignSelf: 'flex-start', padding: '14px 32px', borderRadius: tokens.borderRadius, background: accentGrad, color: tokens.backgroundColor, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                  <EditableText value={b.leftContent?.ctaText || 'Get Started'} onSave={(t) => save({ leftContent: { ...b.leftContent, ctaText: t } } as any)} isEditing={editing} tag="span" />
                </div>
              )}
            </div>
            <div style={{ flex: `0 0 ${100 - ratio}%`, background: b.rightContent?.type === 'color' ? b.rightContent.value : `url(${b.rightContent?.value || ''}) center/cover`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(!b.rightContent?.value) && (
                <div style={{ color: tokens.mutedTextColor, textAlign: 'center', fontSize: 14 }}>
                  <RenderIcon name="Image" size={48} color={tokens.mutedTextColor} />
                  <div style={{ marginTop: 8 }}>{editing ? 'Set image in properties' : 'Right panel'}</div>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'floating-cards': {
        const b = block as any;
        const floatingCards = b.cards || [];
        const colors = [effectiveAccent, tokens.primaryColor || '#8b5cf6', '#22c55e', '#f59e0b'];
        return (
          <div style={{ display: 'flex', gap: 20, width: '100%', justifyContent: 'center', alignItems: 'center', minHeight: 300, perspective: '1000px' }}>
            {floatingCards.map((card: any, i: number) => {
              const rotation = card.rotation ?? (i % 2 === 0 ? -3 : 3);
              const c = colors[i % colors.length];
              return (
                <div key={i} className="group/item" style={{
                  flex: '0 0 240px', padding: 28, borderRadius: tokens.borderRadius + 8,
                  background: `linear-gradient(145deg, ${c}15, ${tokens.surfaceColor})`,
                  border: `1px solid ${c}25`,
                  boxShadow: `0 20px 40px ${c}12, 0 4px 12px ${tokens.textColor}08`,
                  transform: `rotate(${rotation}deg) translateY(${i % 2 === 0 ? 0 : -20}px)`,
                  transition: 'transform 0.3s ease', position: 'relative',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  {card.icon && (
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <EditableIcon name={card.icon} size={20} color={c} isEditing={editing} onSelect={(icon) => { const cards = [...floatingCards]; cards[i] = { ...cards[i], icon }; save({ cards } as any); }} tokens={tokens} />
                    </div>
                  )}
                  <EditableText value={card.title} onSave={(t) => { const cards = [...floatingCards]; cards[i] = { ...cards[i], title: t }; save({ cards } as any); }} isEditing={editing} tag="div" style={{ fontSize: 18, fontWeight: 800 }} />
                  <EditableText value={card.description} onSave={(t) => { const cards = [...floatingCards]; cards[i] = { ...cards[i], description: t }; save({ cards } as any); }} isEditing={editing} tag="div" multiline style={{ fontSize: 14, color: tokens.mutedTextColor, lineHeight: 1.5 }} />
                  {editing && floatingCards.length > 1 && <RemoveItemButton onClick={() => save({ cards: floatingCards.filter((_: any, idx: number) => idx !== i) } as any)} accentColor={effectiveAccent} />}
                </div>
              );
            })}
            {editing && <AddItemButton onClick={() => save({ cards: [...floatingCards, { title: 'New Card', description: 'Description', icon: 'Sparkles' }] } as any)} accentColor={effectiveAccent} />}
          </div>
        );
      }

      // ── Phase 7 — GIF, Lottie, Sticker, Shape ─────────────────────────

      case 'gif':
        return block.src ? (
          <img src={block.src} alt={block.alt} style={{ width: '100%', height: '100%', objectFit: block.fit, borderRadius: tokens.borderRadius }} />
        ) : (
          <ImageEmptyState editing={editing} tokens={tokens} onUrlChange={(src) => save({ src } as any)} />
        );

      case 'lottie':
        return block.src ? (
          <iframe
            src={block.src.includes('lottie.host') ? block.src : `https://lottie.host/embed/${block.src}`}
            style={{ width: '100%', height: '100%', minHeight: 300, border: 'none', borderRadius: tokens.borderRadius }}
            allowFullScreen
          />
        ) : (
          <div style={{ width: '100%', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${tokens.mutedTextColor}33`, borderRadius: tokens.borderRadius, color: tokens.mutedTextColor, flexDirection: 'column', gap: 8 }}>
            <RenderIcon name="Play" size={32} color={tokens.mutedTextColor} />
            <span style={{ fontSize: 14 }}>{editing ? 'Paste Lottie URL in properties' : 'Lottie animation'}</span>
          </div>
        );

      case 'sticker':
        return block.src ? (
          <img src={block.src} alt="Sticker" style={{ width: block.stickerSize || 200, height: block.stickerSize || 200, objectFit: 'contain', margin: '0 auto' }} />
        ) : (
          <ImageEmptyState editing={editing} tokens={tokens} onUrlChange={(src) => save({ src } as any)} />
        );

      case 'shape': {
        const sz = block.shapeSize || 300;
        const fc = bs?.accentColor || block.fillColor || '#6366f120';
        const sc = effectiveIconColor || block.strokeColor || '#6366f1';
        const sw = block.strokeWidth ?? 3;
        const cr = block.cornerRadius ?? 0;
        const shapeMap: Record<string, string> = {
          rectangle: `<rect x="${sw}" y="${sw}" width="${sz - sw * 2}" height="${sz * 0.75 - sw * 2}" rx="${cr}" fill="${fc}" stroke="${sc}" stroke-width="${sw}"/>`,
          circle: `<circle cx="${sz / 2}" cy="${sz / 2}" r="${sz / 2 - sw}" fill="${fc}" stroke="${sc}" stroke-width="${sw}"/>`,
          triangle: `<polygon points="${sz / 2},${sw} ${sz - sw},${sz - sw} ${sw},${sz - sw}" fill="${fc}" stroke="${sc}" stroke-width="${sw}"/>`,
          diamond: `<polygon points="${sz / 2},${sw} ${sz - sw},${sz / 2} ${sz / 2},${sz - sw} ${sw},${sz / 2}" fill="${fc}" stroke="${sc}" stroke-width="${sw}"/>`,
          star: `<polygon points="${sz / 2},${sw * 2} ${sz * 0.62},${sz * 0.38} ${sz - sw},${sz * 0.38} ${sz * 0.68},${sz * 0.58} ${sz * 0.78},${sz - sw} ${sz / 2},${sz * 0.72} ${sz * 0.22},${sz - sw} ${sz * 0.32},${sz * 0.58} ${sw},${sz * 0.38} ${sz * 0.38},${sz * 0.38}" fill="${fc}" stroke="${sc}" stroke-width="${sw}"/>`,
          heart: `<path d="M${sz / 2} ${sz * 0.88}L${sw * 3} ${sz * 0.4}a${sz * 0.18} ${sz * 0.18} 0 0 1 ${sz * 0.45} ${sw}L${sz / 2} ${sz * 0.35}L${sz - sw * 3 - sz * 0.45} ${sz * 0.4 + sw}a${sz * 0.18} ${sz * 0.18} 0 0 1 ${sz * 0.45} -${sw}Z" fill="${fc}" stroke="${sc}" stroke-width="${sw}"/>`,
          hexagon: `<polygon points="${sz / 2},${sw} ${sz - sw},${sz * 0.27} ${sz - sw},${sz * 0.73} ${sz / 2},${sz - sw} ${sw},${sz * 0.73} ${sw},${sz * 0.27}" fill="${fc}" stroke="${sc}" stroke-width="${sw}"/>`,
          pentagon: `<polygon points="${sz / 2},${sw} ${sz - sw},${sz * 0.38} ${sz * 0.82},${sz - sw} ${sz * 0.18},${sz - sw} ${sw},${sz * 0.38}" fill="${fc}" stroke="${sc}" stroke-width="${sw}"/>`,
          octagon: `<polygon points="${sz * 0.29},${sw} ${sz * 0.71},${sw} ${sz - sw},${sz * 0.29} ${sz - sw},${sz * 0.71} ${sz * 0.71},${sz - sw} ${sz * 0.29},${sz - sw} ${sw},${sz * 0.71} ${sw},${sz * 0.29}" fill="${fc}" stroke="${sc}" stroke-width="${sw}"/>`,
          arrow: `<polygon points="${sw},${sz * 0.35} ${sz * 0.7},${sz * 0.35} ${sz * 0.7},${sz * 0.15} ${sz - sw},${sz / 2} ${sz * 0.7},${sz * 0.85} ${sz * 0.7},${sz * 0.65} ${sw},${sz * 0.65}" fill="${fc}" stroke="${sc}" stroke-width="${sw}"/>`,
        };
        const svgContent = shapeMap[block.shape] || shapeMap.rectangle;
        return (
          <div style={{ width: sz, height: block.shape === 'rectangle' || block.shape === 'arrow' ? sz * 0.75 : sz, margin: '0 auto' }}
            dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 ${sz} ${block.shape === 'rectangle' || block.shape === 'arrow' ? sz * 0.75 : sz}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>` }}
          />
        );
      }

      default:
        return <div style={{ color: tokens.mutedTextColor, fontSize: 16 }}>Unsupported block type</div>;
    }
  };

  // Child blocks are now rendered as FloatingBlocks by SlideRenderer when isolated
  // So we don't render them here to avoid double-rendering

  // Noise overlay SVG data URI
  const noiseOverlay = (bs?.noiseIntensity ?? 0) > 0 ? (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${(bs?.noiseIntensity ?? 0.5) * 0.8}' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: '128px 128px',
      opacity: bs?.noiseOpacity ?? 0.15,
      mixBlendMode: 'overlay' as any,
      borderRadius: 'inherit',
      zIndex: 1,
    }} />
  ) : null;

  return (
    <div data-slide-block style={{ ...style, position: 'relative' }} onClick={onClick}>
      {renderContent()}
      {noiseOverlay}
      {isIsolated && block.type !== 'container' && block.type !== 'stack' && (
        <button
          onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-slash-inside', { detail: { blockId: block.id, rect: (e.target as HTMLElement).getBoundingClientRect() } })); }}
          style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 10, padding: '6px 16px', borderRadius: tokens.borderRadius, border: `1px dashed ${tokens.accentColor}60`, background: `${tokens.accentColor}10`, color: tokens.accentColor, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RenderIcon name="Plus" size={14} color={tokens.accentColor} /> Add block inside
        </button>
      )}
    </div>
  );
});

// ── Gallery Cell ─────────────────────────────────────────────────────

function GalleryCell({ img, index, tokens, editing, onImageChange }: {
  img: { src?: string; alt?: string };
  index: number;
  tokens: DesignTokens;
  editing: boolean;
  onImageChange: (src: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const triggerUpload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        setUploading(true);
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (dataUrl) onImageChange(dataUrl);
          setUploading(false);
        };
        reader.onerror = () => setUploading(false);
        reader.readAsDataURL(file);
      }
      document.body.removeChild(input);
    };
    input.click();
  }, [onImageChange]);

  return (
    <div style={{ borderRadius: tokens.borderRadius, overflow: 'hidden', aspectRatio: '16/10', backgroundColor: `${tokens.mutedTextColor}11`, position: 'relative' }}>
      {img.src ? (
        <>
          <img src={img.src} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {editing && (
            <div
              onClick={triggerUpload}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
            >
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 12 }}>{uploading ? 'Uploading...' : 'Replace'}</span>
            </div>
          )}
        </>
      ) : (
        <div
          onClick={triggerUpload}
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.mutedTextColor, cursor: 'pointer', flexDirection: 'column', gap: 4 }}
        >
          <RenderIcon name="Image" size={32} color={tokens.mutedTextColor} />
          <span style={{ fontSize: 10 }}>{uploading ? 'Uploading...' : 'Click to upload'}</span>
        </div>
      )}
    </div>
  );
}

// ── Image Empty State ────────────────────────────────────────────────

function ImageEmptyState({ editing, tokens, onUrlChange }: { editing: boolean; tokens: DesignTokens; onUrlChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const triggerUpload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Create a standalone file input on the document body so it survives React re-renders
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        setUploading(true);
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (dataUrl) onUrlChange(dataUrl);
          setUploading(false);
        };
        reader.onerror = () => setUploading(false);
        reader.readAsDataURL(file);
      }
      document.body.removeChild(input);
    };
    input.click();
  }, [onUrlChange]);

  return (
    <div
      onClick={triggerUpload}
      style={{
        width: '100%', height: '100%', minHeight: 200,
        background: `linear-gradient(135deg, ${tokens.surfaceColor}, ${tokens.surfaceColor}88)`,
        borderRadius: tokens.borderRadius, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: tokens.mutedTextColor, fontSize: 18, border: `2px dashed ${tokens.mutedTextColor}33`,
        cursor: 'pointer',
      }}
    >
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
        <RenderIcon name="Image" size={48} color={tokens.mutedTextColor} />
        <div>{uploading ? 'Uploading...' : 'Click to upload image'}</div>
      </div>
    </div>
  );
}

// ── Image Edit Overlay ───────────────────────────────────────────────

function ImageEditOverlay({ onUrlChange, tokens, inline }: { onUrlChange: (url: string) => void; tokens: DesignTokens; inline?: boolean }) {
  const [uploading, setUploading] = useState(false);

  const triggerUpload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        setUploading(true);
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (dataUrl) onUrlChange(dataUrl);
          setUploading(false);
        };
        reader.onerror = () => setUploading(false);
        reader.readAsDataURL(file);
      }
      document.body.removeChild(input);
    };
    input.click();
  }, [onUrlChange]);

  if (inline) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={triggerUpload}
        onKeyDown={(e) => { if (e.key === 'Enter') triggerUpload(e as any); }}
        style={{
          padding: '8px 16px', borderRadius: 8, border: 'none',
          background: tokens.accentColor, color: '#fff', fontWeight: 600,
          cursor: 'pointer', fontSize: 14, display: 'inline-block',
        }}
      >
        {uploading ? 'Uploading...' : 'Upload Image'}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', borderRadius: tokens.borderRadius, gap: 12,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', borderRadius: 12, padding: 16, minWidth: 180 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#000', marginBottom: 4 }}>Choose Source</div>
        <button onClick={triggerUpload} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 13, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
          Upload from PC
        </button>
        <button onClick={() => { /* TODO: brand picker */ }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 13, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/><circle cx="8.5" cy="15.5" r="2.5"/></svg>
          Choose from Brand
        </button>
        <button onClick={() => { /* TODO: canvas picker */ }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 13, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          Choose from Canvas
        </button>
      </div>
    </div>
  );
}

// ── Chart Renderer (no inline edit — uses ContentBlockEditor) ────────

function renderChart(block: any, tokens: DesignTokens, accentGrad: string, editing: boolean = false, save: (p: any) => void = () => {}) {
  const chartColors = block.data.map((d: any, i: number) => d.color || [tokens.accentColor, tokens.primaryColor, '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][i % 6]);
  const tooltipStyle = { backgroundColor: tokens.surfaceColor, border: 'none', borderRadius: 8, color: tokens.textColor, fontSize: 14 };

  const chartTitle = (block.title || editing) ? (
    <EditableText value={block.title || ''} onSave={(t) => save({ title: t })} isEditing={editing} tag="div" placeholder="Chart title..." style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }} />
  ) : null;

  if (block.chartType === 'pie' || block.chartType === 'donut') {
    return (
      <div style={{ width: '100%', height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {chartTitle}
        <ResponsiveContainer width="100%" height={250}>
          <PieChart><Pie data={block.data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={block.chartType === 'donut' ? '55%' : 0} outerRadius="80%" stroke={tokens.backgroundColor} strokeWidth={3}>
            {block.data.map((_: any, i: number) => <Cell key={i} fill={chartColors[i]} />)}
          </Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (block.chartType === 'area') {
    return (
      <div style={{ width: '100%', height: 300, display: 'flex', flexDirection: 'column' }}>
        {chartTitle}
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={block.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.mutedTextColor + '22'} />
            <XAxis dataKey="label" tick={{ fill: tokens.mutedTextColor, fontSize: 13 }} />
            <YAxis tick={{ fill: tokens.mutedTextColor, fontSize: 13 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke={tokens.accentColor} fill={tokens.accentColor} fillOpacity={0.2} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (block.chartType === 'scatter' || block.chartType === 'bubble') {
    return (
      <div style={{ width: '100%', height: 300, display: 'flex', flexDirection: 'column' }}>
        {chartTitle}
        <ResponsiveContainer width="100%" height={250}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.mutedTextColor + '22'} />
            <XAxis dataKey="value" tick={{ fill: tokens.mutedTextColor, fontSize: 13 }} name="X" />
            <YAxis dataKey="value2" tick={{ fill: tokens.mutedTextColor, fontSize: 13 }} name="Y" />
            <Tooltip contentStyle={tooltipStyle} />
            <Scatter data={block.data} fill={tokens.accentColor} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (block.chartType === 'radar') {
    return (
      <div style={{ width: '100%', height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {chartTitle}
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={block.data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke={tokens.mutedTextColor + '33'} />
            <PolarAngleAxis dataKey="label" tick={{ fill: tokens.mutedTextColor, fontSize: 12 }} />
            <PolarRadiusAxis tick={{ fill: tokens.mutedTextColor, fontSize: 10 }} />
            <RadarShape dataKey="value" stroke={tokens.accentColor} fill={tokens.accentColor} fillOpacity={0.3} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (block.chartType === 'stacked-bar') {
    return (
      <div style={{ width: '100%', height: 300, display: 'flex', flexDirection: 'column' }}>
        {chartTitle}
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={block.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.mutedTextColor + '22'} />
            <XAxis dataKey="label" tick={{ fill: tokens.mutedTextColor, fontSize: 13 }} />
            <YAxis tick={{ fill: tokens.mutedTextColor, fontSize: 13 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" stackId="a" fill={tokens.accentColor} radius={[0, 0, 0, 0]} />
            <Bar dataKey="value2" stackId="a" fill={tokens.primaryColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (block.chartType === 'combo') {
    return (
      <div style={{ width: '100%', height: 300, display: 'flex', flexDirection: 'column' }}>
        {chartTitle}
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={block.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.mutedTextColor + '22'} />
            <XAxis dataKey="label" tick={{ fill: tokens.mutedTextColor, fontSize: 13 }} />
            <YAxis tick={{ fill: tokens.mutedTextColor, fontSize: 13 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill={tokens.accentColor} radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="value2" stroke={tokens.primaryColor} strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (block.chartType === 'funnel') {
    return (
      <div style={{ width: '100%', height: '100%', minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {chartTitle}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
          {block.data.map((item: any, i: number) => {
            const maxVal = Math.max(...block.data.map((d: any) => d.value));
            const widthPct = (item.value / maxVal) * 90;
            return (
              <div key={i} style={{ width: `${widthPct}%`, padding: '12px 20px', backgroundColor: chartColors[i], borderRadius: 999, textAlign: 'center', color: '#fff', fontWeight: 600, fontSize: 15 }}>
                {item.label}: {item.value}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.chartType === 'waterfall') {
    let running = 0;
    const waterfallData = block.data.map((item: any, i: number) => {
      const start = i === 0 ? 0 : running;
      running = i === 0 ? item.value : running + item.value;
      return { ...item, start: Math.min(start, running), end: Math.max(start, running), isNeg: item.value < 0 };
    });
    return (
      <div style={{ width: '100%', height: 300, display: 'flex', flexDirection: 'column' }}>
        {chartTitle}
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={waterfallData}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.mutedTextColor + '22'} />
            <XAxis dataKey="label" tick={{ fill: tokens.mutedTextColor, fontSize: 13 }} />
            <YAxis tick={{ fill: tokens.mutedTextColor, fontSize: 13 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="start" stackId="a" fill="transparent" />
            <Bar dataKey="end" stackId="a" radius={[4, 4, 0, 0]}>
              {waterfallData.map((d: any, i: number) => <Cell key={i} fill={d.isNeg ? '#ef4444' : tokens.accentColor} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const ChartComponent = block.chartType === 'line' ? LineChart : BarChart;
  return (
    <div style={{ width: '100%', height: 300, display: 'flex', flexDirection: 'column' }}>
      {chartTitle}
      <ResponsiveContainer width="100%" height={250}>
        <ChartComponent data={block.data}>
          <CartesianGrid strokeDasharray="3 3" stroke={tokens.mutedTextColor + '22'} />
          <XAxis dataKey="label" tick={{ fill: tokens.mutedTextColor, fontSize: 13 }} axisLine={{ stroke: tokens.mutedTextColor + '33' }} />
          <YAxis tick={{ fill: tokens.mutedTextColor, fontSize: 13 }} axisLine={{ stroke: tokens.mutedTextColor + '33' }} />
          <Tooltip contentStyle={tooltipStyle} />
          {block.chartType === 'line' ? <Line type="monotone" dataKey="value" stroke={tokens.accentColor} strokeWidth={3} dot={{ r: 5, fill: tokens.accentColor }} /> : <Bar dataKey="value" radius={[6, 6, 0, 0]}>{block.data.map((_: any, i: number) => <Cell key={i} fill={chartColors[i]} />)}</Bar>}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

// ── Stats Renderer ───────────────────────────────────────────────────

function renderStats(block: any, tokens: DesignTokens, accentGrad: string, editing: boolean, save: (p: any) => void) {
  const { variant, items } = block;

  const saveItem = (i: number, patch: any) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], ...patch };
    save({ items: newItems });
  };

  if (variant === 'plain') {
    return (
      <div style={{ display: 'flex', gap: 40, justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
        {items.map((item: any, i: number) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <EditableText value={`${item.value}${item.suffix || ''}`} onSave={(t) => saveItem(i, { value: parseInt(t) || 0 })} isEditing={editing} tag="div" style={{ fontSize: 56, fontWeight: 900, color: tokens.accentColor }} />
            <EditableText value={item.label} onSave={(t) => saveItem(i, { label: t })} isEditing={editing} tag="div" style={{ fontSize: 16, color: tokens.mutedTextColor, marginTop: 8 }} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'circle' || variant === 'circle-bold') {
    const isBold = variant === 'circle-bold';
    const svgSize = isBold ? 160 : 140;
    const r = isBold ? 60 : 50;
    const center = svgSize / 2;
    const c = 2 * Math.PI * r;
    const sw = isBold ? 16 : 10;
    return (
      <div style={{ display: 'flex', gap: 40, justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
        {items.map((item: any, i: number) => {
          const pct = (item.value / (item.max || 100)) * 100;
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
                <circle cx={center} cy={center} r={r} fill="none" stroke={`${tokens.mutedTextColor}${isBold ? '15' : '22'}`} strokeWidth={sw} />
                <circle cx={center} cy={center} r={r} fill="none" stroke={tokens.accentColor} strokeWidth={sw} strokeDasharray={`${c * pct / 100} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${center} ${center})`} />
                <text x={center} y={isBold ? center - 5 : center} textAnchor="middle" dy="0.35em" style={{ fontSize: isBold ? 36 : 28, fontWeight: isBold ? 900 : 800, fill: tokens.textColor }}>{item.value}{item.suffix || ''}</text>
                {isBold && <text x={center} y={center + 20} textAnchor="middle" style={{ fontSize: 12, fill: tokens.mutedTextColor }}>{item.label}</text>}
              </svg>
              {!isBold && <EditableText value={item.label} onSave={(t) => saveItem(i, { label: t })} isEditing={editing} tag="div" style={{ fontSize: 14, color: tokens.mutedTextColor, marginTop: 4 }} />}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'bar') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
        {items.map((item: any, i: number) => {
          const pct = Math.min(100, (item.value / (item.max || 100)) * 100);
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <EditableText value={item.label} onSave={(t) => saveItem(i, { label: t })} isEditing={editing} tag="span" style={{ fontSize: 16, fontWeight: 600 }} />
                <span style={{ fontWeight: 700, color: tokens.accentColor }}>{item.value}{item.suffix || ''}</span>
              </div>
              <div style={{ height: 14, borderRadius: 7, backgroundColor: `${tokens.mutedTextColor}22`, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, borderRadius: 7, background: accentGrad }} /></div>
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'star-rating') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
        {items.map((item: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <EditableText value={item.label} onSave={(t) => saveItem(i, { label: t })} isEditing={editing} tag="span" style={{ fontSize: 16, fontWeight: 600, minWidth: 100 }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: item.max || 5 }).map((_, s) => (
                <RenderIcon key={s} name="Star" size={24} color={s < item.value ? '#f59e0b' : `${tokens.mutedTextColor}33`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'dot-line') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
        {items.map((item: any, i: number) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <EditableText value={item.label} onSave={(t) => saveItem(i, { label: t })} isEditing={editing} tag="span" style={{ fontSize: 16, fontWeight: 600 }} />
              <span style={{ fontWeight: 700, color: tokens.accentColor }}>{item.value}/{item.max || 5}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {Array.from({ length: item.max || 5 }).map((_, d) => (
                <React.Fragment key={d}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: d < item.value ? tokens.accentColor : `${tokens.mutedTextColor}22` }} />
                  {d < (item.max || 5) - 1 && <div style={{ flex: 1, height: 2, backgroundColor: d < item.value - 1 ? tokens.accentColor : `${tokens.mutedTextColor}22` }} />}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // dot-grid fallback
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      {items.map((item: any, i: number) => (
        <div key={i}>
          <EditableText value={item.label} onSave={(t) => saveItem(i, { label: t })} isEditing={editing} tag="div" style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Array.from({ length: item.max || 10 }).map((_, d) => (
              <div key={d} style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: d < item.value ? tokens.accentColor : `${tokens.mutedTextColor}22` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Steps Renderer ───────────────────────────────────────────────────

function renderSteps(block: any, tokens: DesignTokens, accentGrad: string, editing: boolean, save: (p: any) => void) {
  const { variant, items } = block;
  const colors = [tokens.accentColor, tokens.primaryColor, '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444'];

  const saveItem = (i: number, patch: any) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], ...patch };
    save({ items: newItems });
  };

  if (variant === 'funnel') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}>
        {items.map((item: any, i: number) => {
          const widthPct = 100 - (i * (60 / items.length));
          return (
            <div key={i} style={{ width: `${widthPct}%`, padding: '18px 28px', background: `linear-gradient(135deg, ${colors[i % colors.length]}30, ${colors[i % colors.length]}15)`, borderRadius: 999, textAlign: 'center', border: `1.5px solid ${colors[i % colors.length]}40`, backdropFilter: 'blur(4px)' }}>
              <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 18, fontWeight: 700 }} />
              {(item.description || editing) && <EditableText value={item.description || ''} onSave={(t) => saveItem(i, { description: t })} isEditing={editing} tag="div" style={{ fontSize: 14, color: tokens.mutedTextColor, marginTop: 4 }} placeholder="Description..." />}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'pyramid') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%' }}>
        {items.map((item: any, i: number) => {
          const widthPct = 30 + (i * (60 / items.length));
          return (
            <div key={i} style={{ width: `${widthPct}%`, padding: '14px 24px', background: `linear-gradient(135deg, ${colors[i % colors.length]}25, ${colors[i % colors.length]}10)`, borderRadius: 999, textAlign: 'center', border: `1px solid ${colors[i % colors.length]}30` }}>
              <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 18, fontWeight: 700 }} />
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'staircase') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%' }}>
        {items.map((item: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'stretch' }}>
            <div style={{ width: `${(i + 1) * (100 / items.length)}%`, padding: '16px 20px', background: `linear-gradient(135deg, ${colors[i % colors.length]}20, ${colors[i % colors.length]}08)`, borderRadius: `0 ${tokens.borderRadius + 8}px ${tokens.borderRadius + 8}px 0`, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, border: `1px solid ${colors[i % colors.length]}25` }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}cc)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
              <div>
                <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 16, fontWeight: 700 }} />
                {(item.description || editing) && <EditableText value={item.description || ''} onSave={(t) => saveItem(i, { description: t })} isEditing={editing} tag="div" style={{ fontSize: 13, color: tokens.mutedTextColor }} placeholder="Description..." />}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'steps-icons') {
    return (
      <div style={{ display: 'flex', gap: 16, width: '100%', alignItems: 'stretch' }}>
        {items.map((item: any, i: number) => (
          <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, textAlign: 'center', padding: 24, background: `linear-gradient(135deg, ${colors[i % colors.length]}12, ${colors[i % colors.length]}05)`, borderRadius: tokens.borderRadius + 4, border: `1px solid ${colors[i % colors.length]}20` }}>
              {item.icon && (
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${colors[i % colors.length]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EditableIcon name={item.icon} size={24} color={colors[i % colors.length]} isEditing={editing} onSelect={(icon) => saveItem(i, { icon })} tokens={tokens} />
                  </div>
                </div>
              )}
              <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 16, fontWeight: 700 }} />
              {(item.description || editing) && <EditableText value={item.description || ''} onSave={(t) => saveItem(i, { description: t })} isEditing={editing} tag="div" style={{ fontSize: 13, color: tokens.mutedTextColor, marginTop: 4 }} placeholder="Description..." />}
            </div>
            {i < items.length - 1 && (
              <svg width={32} height={32} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
                <path d="M4 16 C12 16, 20 8, 28 16" fill="none" stroke={tokens.accentColor} strokeWidth="2" strokeLinecap="round" />
                <path d="M22 12 L28 16 L22 20" fill="none" stroke={tokens.accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}
      </div>
    );
  }

  // box variant — stacked horizontal cards with big step number
  if (variant === 'box') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        {items.map((item: any, i: number) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'stretch', borderRadius: tokens.borderRadius + 4,
            overflow: 'hidden', border: `1px solid ${colors[i % colors.length]}25`,
            background: `linear-gradient(90deg, ${colors[i % colors.length]}12, transparent)`,
          }}>
            <div style={{
              width: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}bb)`,
              color: '#fff', fontSize: 28, fontWeight: 900, flexShrink: 0,
            }}>{i + 1}</div>
            <div style={{ padding: '18px 24px', flex: 1 }}>
              <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 18, fontWeight: 700 }} />
              {(item.description || editing) && <EditableText value={item.description || ''} onSave={(t) => saveItem(i, { description: t })} isEditing={editing} tag="div" style={{ fontSize: 14, color: tokens.mutedTextColor, marginTop: 4 }} placeholder="Description..." />}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // arrow variant — chevron shapes
  return (
    <div style={{ display: 'flex', gap: 0, width: '100%', alignItems: 'stretch' }}>
      {items.map((item: any, i: number) => (
        <div key={i} style={{
          flex: 1, position: 'relative',
          padding: '20px 32px 20px 40px',
          background: `linear-gradient(135deg, ${colors[i % colors.length]}30, ${colors[i % colors.length]}12)`,
          clipPath: i < items.length - 1
            ? 'polygon(0% 0%, calc(100% - 28px) 0%, 100% 50%, calc(100% - 28px) 100%, 0% 100%, 28px 50%)'
            : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 28px 50%)',
          marginLeft: i > 0 ? -14 : 0,
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: colors[i % colors.length], color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, marginBottom: 8,
          }}>{i + 1}</div>
          <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 15, fontWeight: 700 }} />
          {(item.description || editing) && <EditableText value={item.description || ''} onSave={(t) => saveItem(i, { description: t })} isEditing={editing} tag="div" style={{ fontSize: 12, color: tokens.mutedTextColor, marginTop: 2 }} placeholder="Description..." />}
        </div>
      ))}
    </div>
  );
}

// ── Cycle Diagram Renderer ───────────────────────────────────────────

function renderCycleDiagram(block: any, tokens: DesignTokens, _accentGrad: string, editing: boolean, save: (p: any) => void) {
  const { items, variant } = block;
  const colors = [tokens.accentColor, tokens.primaryColor, '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444'];

  const saveLabel = (i: number, label: string) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], label };
    save({ items: newItems });
  };

  const makeFO = (x: number, y: number, w: number, h: number, i: number, fontSize: number = 11) => {
    if (editing) {
      return (
        <foreignObject x={x - w/2} y={y - h/2} width={w} height={h} key={`fo-${i}`}>
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EditableText value={items[i].label} onSave={(t) => saveLabel(i, t)} isEditing={true} tag="div" style={{ fontSize, fontWeight: 700, color: tokens.textColor, textAlign: 'center', width: '100%' }} />
          </div>
        </foreignObject>
      );
    }
    return <text key={`t-${i}`} x={x} y={y} textAnchor="middle" dy="0.35em" style={{ fontSize, fontWeight: 700, fill: tokens.textColor }}>{items[i].label}</text>;
  };

  if (variant === 'ring') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <svg width={400} height={400} viewBox="0 0 400 400">
          {items.map((item: any, i: number) => {
            const r = 180 - (i * (140 / items.length));
            const opacity = 0.15 + (i * 0.12);
            return (
              <g key={i}>
                <circle cx={200} cy={200} r={r} fill={colors[i % colors.length]} opacity={opacity} />
                <circle cx={200} cy={200} r={r} fill="none" stroke={colors[i % colors.length]} strokeWidth={2} opacity={0.4} />
                {makeFO(200, 200 - r + 20, 80, 24, i, 13)}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (variant === 'semi-circle') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <svg width={400} height={250} viewBox="0 0 400 250">
          {items.map((item: any, i: number) => {
            const angle = (Math.PI / (items.length - 1 || 1)) * i;
            const r = 150;
            const x = 200 + r * Math.cos(Math.PI - angle);
            const y = 220 - r * Math.sin(Math.PI - angle);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={32} fill="none" stroke={colors[i % colors.length]} strokeWidth={3} />
                <circle cx={x} cy={y} r={28} fill={`${colors[i % colors.length]}20`} />
                {makeFO(x, y, 56, 20, i)}
              </g>
            );
          })}
          <path d={`M ${200 - 150} 220 A 150 150 0 0 1 ${200 + 150} 220`} fill="none" stroke={`${tokens.mutedTextColor}22`} strokeWidth={2} />
        </svg>
      </div>
    );
  }

  if (variant === 'flower') {
    const cx = 200, cy = 200, petalR = 80;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <svg width={400} height={400} viewBox="0 0 400 400">
          {items.map((item: any, i: number) => {
            const angle = (i * 360 / items.length - 90) * (Math.PI / 180);
            const px = cx + petalR * Math.cos(angle);
            const py = cy + petalR * Math.sin(angle);
            return (
              <g key={i}>
                <ellipse cx={px} cy={py} rx={55} ry={35} fill={colors[i % colors.length]} opacity={0.2} transform={`rotate(${i * 360 / items.length - 90} ${px} ${py})`} />
                <ellipse cx={px} cy={py} rx={55} ry={35} fill="none" stroke={colors[i % colors.length]} strokeWidth={2} opacity={0.5} transform={`rotate(${i * 360 / items.length - 90} ${px} ${py})`} />
                {makeFO(px, py, 60, 20, i)}
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={24} fill={tokens.accentColor} opacity={0.3} />
          <circle cx={cx} cy={cy} r={20} fill={tokens.accentColor} opacity={0.8} />
        </svg>
      </div>
    );
  }

  // Default cycle
  const cx = 200, cy = 200, r = 140;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <svg width={400} height={400} viewBox="0 0 400 400">
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={tokens.accentColor} opacity={0.6} />
          </marker>
        </defs>
        {items.map((_: any, i: number) => {
          const angle1 = (i * 360 / items.length - 90) * (Math.PI / 180);
          const angle2 = ((i + 1) % items.length * 360 / items.length - 90) * (Math.PI / 180);
          const x1 = cx + r * Math.cos(angle1), y1 = cy + r * Math.sin(angle1);
          const x2 = cx + r * Math.cos(angle2), y2 = cy + r * Math.sin(angle2);
          const midAngle = ((angle1 + angle2) / 2);
          const bulge = 30;
          const mx = cx + (r + bulge) * Math.cos(midAngle);
          const my = cy + (r + bulge) * Math.sin(midAngle);
          return <path key={`arc-${i}`} d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} fill="none" stroke={`${tokens.mutedTextColor}33`} strokeWidth={2} markerEnd="url(#arrowhead)" />;
        })}
        {items.map((item: any, i: number) => {
          const angle = (i * 360 / items.length - 90) * (Math.PI / 180);
          const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={38} fill={`${colors[i % colors.length]}20`} />
              <circle cx={x} cy={y} r={32} fill={`${colors[i % colors.length]}dd`} />
              {editing ? (
                <foreignObject x={x - 30} y={y - 10} width={60} height={20}>
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EditableText value={item.label} onSave={(t) => saveLabel(i, t)} isEditing={true} tag="div" style={{ fontSize: 11, fontWeight: 700, color: '#fff', textAlign: 'center', width: '100%' }} />
                  </div>
                </foreignObject>
              ) : (
                <text x={x} y={y} textAnchor="middle" dy="0.35em" style={{ fontSize: 11, fontWeight: 700, fill: '#fff' }}>{item.label}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Venn Diagram Renderer ────────────────────────────────────────────

function renderVennDiagram(block: any, tokens: DesignTokens, editing: boolean, save: (p: any) => void) {
  const colors = [tokens.accentColor, tokens.primaryColor, '#22c55e'];
  const positions = block.items.length === 2
    ? [{ cx: 160, cy: 200 }, { cx: 240, cy: 200 }]
    : [{ cx: 200, cy: 160 }, { cx: 160, cy: 230 }, { cx: 240, cy: 230 }];

  const saveLabel = (i: number, label: string) => {
    const newItems = [...block.items];
    newItems[i] = { ...newItems[i], label };
    save({ items: newItems });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <svg width={400} height={400} viewBox="0 0 400 400">
        {positions.map((pos, i) => (
          <g key={i}>
            <circle cx={pos.cx} cy={pos.cy} r={100} fill={colors[i % 3]} opacity={0.15} />
            <circle cx={pos.cx} cy={pos.cy} r={100} fill="none" stroke={colors[i % 3]} strokeWidth={2.5} opacity={0.5} />
            {editing ? (
              <foreignObject x={pos.cx - 40} y={pos.cy - 12} width={80} height={24}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EditableText value={block.items[i]?.label || ''} onSave={(t) => saveLabel(i, t)} isEditing={true} tag="div" style={{ fontSize: 14, fontWeight: 700, color: tokens.textColor, textAlign: 'center', width: '100%' }} />
                </div>
              </foreignObject>
            ) : (
              <text x={pos.cx} y={pos.cy} textAnchor="middle" dy="0.35em" style={{ fontSize: 14, fontWeight: 700, fill: tokens.textColor }}>{block.items[i]?.label}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Process Flow Renderer ────────────────────────────────────────────

function renderProcessFlow(block: any, tokens: DesignTokens, accentGrad: string, editing: boolean, save: (p: any) => void) {
  const { variant, items } = block;
  const colors = [tokens.accentColor, tokens.primaryColor, '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444'];

  const saveItem = (i: number, patch: any) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], ...patch };
    save({ items: newItems });
  };

  if (variant === 'pills') {
    return (
      <div style={{ display: 'flex', gap: 8, width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
        {items.map((item: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ padding: '12px 28px', borderRadius: 999, background: `linear-gradient(135deg, ${colors[i % colors.length]}20, ${colors[i % colors.length]}08)`, border: `2px solid ${colors[i % colors.length]}40`, fontSize: 16, fontWeight: 600 }}>
              <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="span" />
            </div>
            {i < items.length - 1 && (
              <svg width={24} height={24} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M4 12 L18 12" stroke={tokens.accentColor} strokeWidth="2" strokeLinecap="round" />
                <path d="M14 8 L18 12 L14 16" fill="none" stroke={tokens.accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'road') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <svg width={600} height={200} viewBox="0 0 600 200">
          <path d="M 30 150 C 150 150, 150 50, 300 50 S 450 150, 570 50" fill="none" stroke={`${tokens.mutedTextColor}30`} strokeWidth={40} strokeLinecap="round" />
          <path d="M 30 150 C 150 150, 150 50, 300 50 S 450 150, 570 50" fill="none" stroke={`${tokens.mutedTextColor}15`} strokeWidth={36} strokeLinecap="round" />
          <path d="M 30 150 C 150 150, 150 50, 300 50 S 450 150, 570 50" fill="none" stroke={tokens.accentColor} strokeWidth={3} strokeDasharray="12 8" strokeLinecap="round" opacity={0.5} />
          {items.map((item: any, i: number) => {
            const t = i / (items.length - 1 || 1);
            const x = 30 + t * 540;
            const y = i % 2 === 0 ? 150 - t * 100 : 50 + (1 - t) * 100;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={16} fill={colors[i % colors.length]} />
                <circle cx={x} cy={y} r={12} fill="#fff" opacity={0.3} />
                {editing ? (
                  <foreignObject x={x - 50} y={y - 45} width={100} height={24}>
                    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                      <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 12, fontWeight: 700, color: tokens.textColor, textAlign: 'center', width: '100%' }} />
                    </div>
                  </foreignObject>
                ) : (
                  <text x={x} y={y - 25} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: tokens.textColor }}>{item.title}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (variant === 'timeline-minimal') {
    return (
      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 16, left: '5%', right: '5%', height: 3, background: `linear-gradient(90deg, ${tokens.accentColor}44, ${tokens.accentColor}11)`, borderRadius: 2 }} />
        {items.map((item: any, i: number) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: `linear-gradient(135deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}cc)`, border: `3px solid ${tokens.backgroundColor}`, zIndex: 1, marginBottom: 12, boxShadow: `0 0 0 3px ${colors[i % colors.length]}33` }} />
            <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 15, fontWeight: 700, textAlign: 'center' }} />
            {(item.description || editing) && <EditableText value={item.description || ''} onSave={(t) => saveItem(i, { description: t })} isEditing={editing} tag="div" style={{ fontSize: 12, color: tokens.mutedTextColor, textAlign: 'center', marginTop: 4 }} placeholder="Description..." />}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'timeline-boxes') {
    return (
      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 16, left: '5%', right: '5%', height: 3, background: `linear-gradient(90deg, ${tokens.accentColor}44, ${tokens.accentColor}11)`, borderRadius: 2 }} />
        {items.map((item: any, i: number) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: `linear-gradient(135deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}cc)`, border: `3px solid ${tokens.backgroundColor}`, zIndex: 1, marginBottom: 12, boxShadow: `0 0 0 3px ${colors[i % colors.length]}33` }} />
            <div style={{ textAlign: 'center', padding: 16, width: '90%', background: `linear-gradient(135deg, ${colors[i % colors.length]}10, ${colors[i % colors.length]}05)`, borderRadius: tokens.borderRadius + 4, border: `1px solid ${colors[i % colors.length]}20` }}>
              <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 15, fontWeight: 700 }} />
              {(item.description || editing) && <EditableText value={item.description || ''} onSave={(t) => saveItem(i, { description: t })} isEditing={editing} tag="div" style={{ fontSize: 12, color: tokens.mutedTextColor, marginTop: 4 }} placeholder="Description..." />}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'slanted-labels') {
    return (
      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-end', gap: 0 }}>
        {items.map((item: any, i: number) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ padding: '16px 8px', background: `linear-gradient(135deg, ${colors[i % colors.length]}25, ${colors[i % colors.length]}10)`, width: '100%', textAlign: 'center', clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' }}>
              <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 14, fontWeight: 700 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // arrows variant — chevron-shaped nodes with large numbered circles
  return (
    <div style={{ display: 'flex', gap: 0, width: '100%', alignItems: 'stretch' }}>
      {items.map((item: any, i: number) => (
        <div key={i} style={{
          flex: 1, position: 'relative',
          padding: '22px 30px 22px 38px',
          background: `linear-gradient(135deg, ${colors[i % colors.length]}25, ${colors[i % colors.length]}08)`,
          clipPath: i < items.length - 1
            ? 'polygon(0% 0%, calc(100% - 24px) 0%, 100% 50%, calc(100% - 24px) 100%, 0% 100%, 24px 50%)'
            : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 24px 50%)',
          marginLeft: i > 0 ? -12 : 0,
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: colors[i % colors.length], color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, marginBottom: 8,
          }}>{i + 1}</div>
          <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 15, fontWeight: 700 }} />
          {(item.description || editing) && <EditableText value={item.description || ''} onSave={(t) => saveItem(i, { description: t })} isEditing={editing} tag="div" style={{ fontSize: 12, color: tokens.mutedTextColor, marginTop: 4 }} placeholder="Description..." />}
        </div>
      ))}
    </div>
  );
}

// ── Icon Grid Renderer ───────────────────────────────────────────────

function renderIconGrid(block: any, tokens: DesignTokens, accentGrad: string, editing: boolean, save: (p: any) => void, innerCardStyle: React.CSSProperties = {}, overrideIconColor?: string, overrideIconBgColor?: string, overrideIconSize?: number) {
  const { variant, items } = block;
  const cols = Math.min(items.length, items.length <= 2 ? 2 : items.length <= 4 ? 2 : 3);
  const cardBase = getCardStyle(tokens);
  const iSize = overrideIconSize || 28;

  const saveItem = (i: number, patch: any) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], ...patch };
    save({ items: newItems });
  };

  if (variant === 'alternating') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
        {items.map((item: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24, flexDirection: i % 2 === 0 ? 'row' : 'row-reverse' }}>
            <div style={{ width: iSize * 2, height: iSize * 2, borderRadius: tokens.borderRadius, background: overrideIconBgColor || `${tokens.accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <EditableIcon name={item.icon} size={iSize} color={overrideIconColor || tokens.accentColor} isEditing={editing} onSelect={(icon) => saveItem(i, { icon })} tokens={tokens} />
            </div>
            <div style={{ flex: 1 }}>
              <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 18, fontWeight: 700 }} />
              {(item.description || editing) && <EditableText value={item.description || ''} onSave={(t) => saveItem(i, { description: t })} isEditing={editing} tag="div" multiline style={{ fontSize: 14, color: tokens.mutedTextColor, lineHeight: 1.5, marginTop: 4 }} placeholder="Description..." />}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const colors = [tokens.accentColor, tokens.primaryColor || '#8b5cf6', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];

  const variantStyles: Record<string, (i: number) => React.CSSProperties> = {
    'solid-boxes': (i) => ({ ...cardBase, ...innerCardStyle, background: innerCardStyle.backgroundColor || `linear-gradient(135deg, ${colors[i % colors.length]}12, ${colors[i % colors.length]}04)`, borderTop: `3px solid ${colors[i % colors.length]}` }),
    'solid-icons': (i) => ({ ...cardBase, ...innerCardStyle, background: innerCardStyle.backgroundColor || `linear-gradient(135deg, ${colors[i % colors.length]}10, transparent)` }),
    'outline-boxes': () => ({ ...cardBase, ...innerCardStyle, backgroundColor: innerCardStyle.backgroundColor || 'transparent', border: `1.5px dashed ${tokens.mutedTextColor}30`, borderRadius: innerCardStyle.borderRadius ?? (tokens.borderRadius + 4) }),
    'side-line': () => ({ ...cardBase, ...innerCardStyle, backgroundColor: innerCardStyle.backgroundColor || 'transparent', borderLeft: `4px solid ${tokens.accentColor}`, borderRadius: 0 }),
    'side-line-text': () => ({ ...cardBase, ...innerCardStyle, backgroundColor: innerCardStyle.backgroundColor || 'transparent', borderLeft: `4px solid ${tokens.accentColor}`, borderRadius: 0, paddingLeft: 20 }),
    'top-line': (i) => ({ ...cardBase, ...innerCardStyle, backgroundColor: innerCardStyle.backgroundColor || 'transparent', borderTop: `4px solid ${colors[i % colors.length]}` }),
    'top-line-text': (i) => ({ ...cardBase, ...innerCardStyle, backgroundColor: innerCardStyle.backgroundColor || 'transparent', borderTop: `3px solid ${colors[i % colors.length]}`, paddingTop: 20 }),
    'top-circle': () => ({ ...cardBase, ...innerCardStyle, paddingTop: 48 }),
    'joined': (i) => ({ ...cardBase, ...innerCardStyle, borderRadius: 0, borderRight: i < items.length - 1 ? `1px solid ${tokens.mutedTextColor}22` : 'none', backgroundColor: innerCardStyle.backgroundColor || (i % 2 === 0 ? `${tokens.mutedTextColor}06` : 'transparent') }),
    'joined-icons': (i) => ({ ...cardBase, ...innerCardStyle, borderRadius: 0, borderRight: i < items.length - 1 ? `1px solid ${tokens.mutedTextColor}22` : 'none', backgroundColor: innerCardStyle.backgroundColor || (i % 2 === 0 ? `${tokens.mutedTextColor}06` : 'transparent') }),
    'leaf': (i) => ({ ...cardBase, ...innerCardStyle, borderRadius: innerCardStyle.borderRadius ?? `${tokens.borderRadius * 3}px ${tokens.borderRadius}px ${tokens.borderRadius * 3}px ${tokens.borderRadius}px`, background: innerCardStyle.backgroundColor || `linear-gradient(135deg, ${colors[i % colors.length]}10, ${colors[i % colors.length]}03)`, border: `1px solid ${colors[i % colors.length]}20` }),
    'labeled': () => ({ ...cardBase, ...innerCardStyle }),
  };

  const getStyle = variantStyles[variant] || variantStyles['solid-boxes'];
  const isJoined = variant === 'joined' || variant === 'joined-icons';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: isJoined ? 0 : 16, width: '100%' }}>
      {items.map((item: any, i: number) => {
        const ic = overrideIconColor || tokens.accentColor;
        const icBg = overrideIconBgColor || `${tokens.accentColor}15`;
        return (
          <div key={i} style={{ ...getStyle(i), padding: innerCardStyle.padding ?? 24, display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
            {variant === 'top-circle' && (
              <div style={{ position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)', width: iSize * 2, height: iSize * 2, borderRadius: '50%', background: overrideIconBgColor || accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EditableIcon name={item.icon} size={iSize} color={overrideIconColor || "#fff"} isEditing={editing} onSelect={(icon) => saveItem(i, { icon })} tokens={tokens} />
              </div>
            )}
            {(variant === 'solid-icons' || variant === 'joined-icons') && (
              <div style={{ width: iSize * 2, height: iSize * 2, borderRadius: '50%', background: icBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EditableIcon name={item.icon} size={iSize} color={ic} isEditing={editing} onSelect={(icon) => saveItem(i, { icon })} tokens={tokens} />
              </div>
            )}
            {variant !== 'top-circle' && variant !== 'solid-icons' && variant !== 'joined-icons' && (
              <EditableIcon name={item.icon} size={iSize} color={ic} isEditing={editing} onSelect={(icon) => saveItem(i, { icon })} tokens={tokens} />
            )}
            <EditableText value={item.title} onSave={(t) => saveItem(i, { title: t })} isEditing={editing} tag="div" style={{ fontSize: 18, fontWeight: 700 }} />
            {(item.description || editing) && <EditableText value={item.description || ''} onSave={(t) => saveItem(i, { description: t })} isEditing={editing} tag="div" multiline style={{ fontSize: 14, color: tokens.mutedTextColor, lineHeight: 1.5 }} placeholder="Description..." />}
          </div>
        );
      })}
    </div>
  );
}

// ── Embed Renderer ───────────────────────────────────────────────────

const embedServiceMeta: Record<string, { label: string; iconName: string; color: string }> = {
  youtube: { label: 'YouTube', iconName: 'Play', color: '#FF0000' },
  vimeo: { label: 'Vimeo', iconName: 'Play', color: '#1ab7ea' },
  loom: { label: 'Loom', iconName: 'Video', color: '#625DF5' },
  tiktok: { label: 'TikTok', iconName: 'Music', color: '#000' },
  spotify: { label: 'Spotify', iconName: 'Music', color: '#1DB954' },
  figma: { label: 'Figma', iconName: 'PenTool', color: '#F24E1E' },
  miro: { label: 'Miro', iconName: 'Layout', color: '#FFD02F' },
  airtable: { label: 'Airtable', iconName: 'Database', color: '#18BFFF' },
  tweet: { label: 'Twitter/X', iconName: 'MessageCircle', color: '#1DA1F2' },
  instagram: { label: 'Instagram', iconName: 'Camera', color: '#E4405F' },
  'google-drive': { label: 'Google Drive', iconName: 'Folder', color: '#4285F4' },
  'google-form': { label: 'Google Form', iconName: 'FileText', color: '#673AB7' },
  typeform: { label: 'Typeform', iconName: 'ClipboardList', color: '#262627' },
  calendly: { label: 'Calendly', iconName: 'Calendar', color: '#006BFF' },
  jotform: { label: 'Jotform', iconName: 'FileText', color: '#FF6100' },
  tally: { label: 'Tally', iconName: 'ClipboardList', color: '#000' },
  powerbi: { label: 'Power BI', iconName: 'BarChart3', color: '#F2C811' },
  office365: { label: 'Office 365', iconName: 'FileText', color: '#D83B01' },
  amplitude: { label: 'Amplitude', iconName: 'TrendingUp', color: '#1A73E8' },
  webpage: { label: 'Webpage', iconName: 'Globe', color: '#4A90D9' },
  video: { label: 'Video', iconName: 'Video', color: '#333' },
  custom: { label: 'Embed', iconName: 'Link', color: '#666' },
};

function getEmbedUrl(url: string, embedType: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (embedType === 'youtube') { const videoId = u.searchParams.get('v') || u.pathname.split('/').pop(); return `https://www.youtube.com/embed/${videoId}`; }
    if (embedType === 'vimeo') { const id = u.pathname.split('/').pop(); return `https://player.vimeo.com/video/${id}`; }
    if (embedType === 'loom') return url.replace('/share/', '/embed/');
    if (embedType === 'figma') return `https://www.figma.com/embed?embed_host=lovable&url=${encodeURIComponent(url)}`;
    if (embedType === 'spotify') return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    return url;
  } catch { return url; }
}

function renderEmbed(block: any, tokens: DesignTokens, editing: boolean = false, save: (p: any) => void = () => {}) {
  const meta = embedServiceMeta[block.embedType] || embedServiceMeta.custom;
  const embedUrl = getEmbedUrl(block.url, block.embedType);

  if (!block.url || (editing && !block.url)) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: tokens.borderRadius, border: `2px dashed ${tokens.mutedTextColor}33`, backgroundColor: tokens.surfaceColor, gap: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {BrandLogoMap[block.embedType] ? (
            <BrandLogoIcon embedType={block.embedType} size={32} />
          ) : (
            <RenderIcon name={meta.iconName} size={32} color={meta.color} />
          )}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: tokens.textColor }}>{meta.label}</div>
        {editing ? (
          <input
            type="text"
            placeholder={`Paste ${meta.label} URL...`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') save({ url: (e.target as HTMLInputElement).value }); }}
            onBlur={(e) => { if (e.target.value) save({ url: e.target.value }); }}
            style={{
              width: '80%', maxWidth: 400, padding: '10px 16px', fontSize: 14,
              borderRadius: 8, border: `1px solid ${tokens.accentColor}40`,
              background: `${tokens.accentColor}08`, color: tokens.textColor, outline: 'none',
              textAlign: 'center',
            }}
          />
        ) : (
          <div style={{ fontSize: 14, color: tokens.mutedTextColor }}>Click to add URL</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, borderRadius: tokens.borderRadius, overflow: 'hidden' }}>
      <iframe src={embedUrl || block.url} style={{ width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={meta.label} />
      {editing && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }} onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            defaultValue={block.url}
            placeholder="Edit URL..."
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') save({ url: (e.target as HTMLInputElement).value }); }}
            onBlur={(e) => { if (e.target.value !== block.url) save({ url: e.target.value }); }}
            style={{
              padding: '6px 12px', fontSize: 12, borderRadius: 6,
              border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fff',
              outline: 'none', width: 250,
            }}
          />
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePresentationStore } from '@/stores/presentationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings2, Copy, Trash2, Plus, X, Package,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Rows3, Columns3, Eye,
  Monitor, Smartphone, Square, FileText, RectangleHorizontal,
  Palette, ImageIcon, Layers, Upload, Loader2 } from
'lucide-react';
import type { ContentBlock, Slide, SlideBackground, BlockStyle } from '@/types/presentation';
import { cn } from '@/lib/utils';
import CornerRadiusSvg from '@/assets/icons/corner-radius.svg?react';
import {
  PanelSection,
  PanelToggleGroup,
  StepperInput,
  ColorPickerInline,
  SliderControl,
  AlignmentGrid } from
'./panel-primitives';
import { SaveComponentDialog } from './SaveComponentDialog';
import { InteractionConfig } from './InteractionConfig';
import { GradientEditorPanel } from './GradientEditorPanel';
import { MeshGradientEditor } from './MeshGradientEditor';
import { PatternPicker } from './PatternPicker';
import { FontPickerDropdown } from './FontPickerDropdown';

// ── Padding/Margin Editor ───────────────────────────────────────────
function PaddingMarginEditor({ label, values, onChange, onChangeAll }: {
  label: string;
  values: { top: number; right: number; bottom: number; left: number };
  onChange: (side: 'top' | 'right' | 'bottom' | 'left', val: number) => void;
  onChangeAll: (val: number) => void;
}) {
  const [linked, setLinked] = useState(values.top === values.right && values.right === values.bottom && values.bottom === values.left);

  const handleChange = (side: 'top' | 'right' | 'bottom' | 'left', val: number) => {
    if (linked) {
      onChangeAll(val);
    } else {
      onChange(side, val);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setLinked(!linked)}
          className={cn(
            "w-5 h-5 rounded flex items-center justify-center text-[9px] border transition-colors",
            linked ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"
          )}
          title={linked ? "Unlink sides" : "Link all sides"}
        >
          {linked ? "🔗" : "⛓️‍💥"}
        </button>
        <span className="text-[9px] text-muted-foreground">{linked ? 'Uniform' : 'Per side'}</span>
      </div>
      {linked ? (
        <StepperInput label="All" value={values.top} onChange={(v) => onChangeAll(v)} max={200} step={4} suffix="px" />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <StepperInput label="T" value={values.top} onChange={(v) => handleChange('top', v)} max={200} step={4} suffix="px" />
          <StepperInput label="R" value={values.right} onChange={(v) => handleChange('right', v)} max={200} step={4} suffix="px" />
          <StepperInput label="B" value={values.bottom} onChange={(v) => handleChange('bottom', v)} max={200} step={4} suffix="px" />
          <StepperInput label="L" value={values.left} onChange={(v) => handleChange('left', v)} max={200} step={4} suffix="px" />
        </div>
      )}
    </div>
  );
}

const TEXT_BLOCK_TYPES = ['title', 'subtitle', 'callout', 'quote', 'bullets', 'numbered-list', 'code', 'metric', 'text', 'paragraph', 'features', 'stats', 'steps', 'process-flow', 'timeline', 'faq', 'testimonial', 'icon-list', 'icon-grid', 'card-grid', 'todo-list', 'comparison', 'progress', 'cycle-diagram', 'venn-diagram', 'quote-box', 'button-block'];

const SLIDE_FORMATS = [
{ id: '16:9', label: '16:9', icon: Monitor, w: 1920, h: 1080 },
{ id: '4:3', label: '4:3', icon: RectangleHorizontal, w: 1440, h: 1080 },
{ id: 'A4', label: 'A4', icon: FileText, w: 1080, h: 1528 },
{ id: '1:1', label: 'Square', icon: Square, w: 1080, h: 1080 },
{ id: '9:16', label: 'Story', icon: Smartphone, w: 1080, h: 1920 },
{ id: 'web', label: 'Web', icon: Monitor, w: 1440, h: 900 },
{ id: 'web-long', label: 'Page', icon: FileText, w: 1440, h: 2560 }];


// ── Style Controls ──────────────────────────────────────────────────

function StyleControls({ block, slideId }: {block: ContentBlock;slideId: string;}) {
  const updateBlock = usePresentationStore((s) => s.updateBlock);
  const st = block.style || {};
  const isTextBlock = TEXT_BLOCK_TYPES.includes(block.type);

  const setStyle = (patch: Partial<BlockStyle>) => {
    updateBlock(slideId, block.id, { style: { ...st, ...patch } } as any);
  };

  return (
    <>
      {/* ── Position ── */}
      <PanelSection title="Position">
        <label className="flex items-center gap-2 text-[9px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={!!(st.posX != null && st.posY != null)}
            onChange={(e) => {
              if (e.target.checked) {
                setStyle({ posX: 100, posY: 100 });
              } else {
                const { posX, posY, ...rest } = st as any;
                updateBlock(slideId, block.id, { style: rest } as any);
              }
            }}
            className="w-3 h-3 rounded" />

          Free position
        </label>

        <div className="flex items-start gap-3">
          <AlignmentGrid alignSelf={st.alignSelf} justifySelf={st.justifySelf} onChange={setStyle} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground w-6">Auto</span>
              <PanelToggleGroup
                options={[
                { value: 'column' as const, label: <Rows3 className="h-3 w-3" /> },
                { value: 'row' as const, label: <Columns3 className="h-3 w-3" /> }]
                }
                value={(st.autoLayout || 'column') as 'column' | 'row'}
                onChange={(v) => setStyle({ autoLayout: v })} className="mx-0 px-0" />

            </div>
            <StepperInput label="Gap" value={st.gap ?? 12} onChange={(v) => setStyle({ gap: v })} max={100} step={2} suffix="px" />
          </div>
        </div>

        {/* Sizing mode */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground w-6">Size</span>
          <PanelToggleGroup
            options={[
              { value: 'hug', label: 'Hug' },
              { value: 'fill', label: 'Fill' },
              { value: 'fixed', label: 'Fixed' },
            ]}
            value={st.width === '100%' ? 'fill' : (st.width && st.width !== 'auto') ? 'fixed' : 'hug'}
            onChange={(v) => {
              if (v === 'hug') setStyle({ width: undefined, height: undefined });
              else if (v === 'fill') setStyle({ width: '100%', height: undefined });
              else setStyle({ width: '400px', height: undefined });
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StepperInput label="W" value={parseInt(st.width || '0') || 0} onChange={(v) => setStyle({ width: v ? `${v}px` : undefined })} max={1920} step={10} suffix="px" />
          <StepperInput label="H" value={parseInt(st.height || '0') || 0} onChange={(v) => setStyle({ height: v ? `${v}px` : undefined })} max={1080} step={10} suffix="px" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StepperInput label="Min W" value={parseInt((st as any).minWidth || '0') || 0} onChange={(v) => setStyle({ minWidth: v ? `${v}px` : undefined } as any)} max={1920} step={10} suffix="px" />
          <StepperInput label="Max W" value={parseInt((st as any).maxWidth || '0') || 0} onChange={(v) => setStyle({ maxWidth: v ? `${v}px` : undefined } as any)} max={1920} step={10} suffix="px" />
        </div>

        {st.posX != null && st.posY != null &&
        <div className="grid grid-cols-2 gap-2">
            <StepperInput label="X" value={st.posX ?? 0} onChange={(v) => setStyle({ posX: v })} max={1920} step={10} suffix="px" />
            <StepperInput label="Y" value={st.posY ?? 0} onChange={(v) => setStyle({ posY: v })} max={1080} step={10} suffix="px" />
          </div>
        }
      </PanelSection>

      {/* ── Padding ── */}
      <PanelSection title="Padding">
        <PaddingMarginEditor
          label="Padding"
          values={{
            top: st.paddingTop ?? st.padding ?? 16,
            right: st.paddingRight ?? st.padding ?? 16,
            bottom: st.paddingBottom ?? st.padding ?? 16,
            left: st.paddingLeft ?? st.padding ?? 16,
          }}
          onChange={(side, val) => {
            setStyle({ [`padding${side.charAt(0).toUpperCase() + side.slice(1)}`]: val } as any);
          }}
          onChangeAll={(val) => {
            setStyle({ padding: val, paddingTop: undefined, paddingRight: undefined, paddingBottom: undefined, paddingLeft: undefined } as any);
          }}
        />
      </PanelSection>

      {/* ── Margin ── */}
      <PanelSection title="Margin">
        <PaddingMarginEditor
          label="Margin"
          values={{
            top: st.marginTop ?? st.margin ?? 0,
            right: st.marginRight ?? st.margin ?? 0,
            bottom: st.marginBottom ?? st.margin ?? 0,
            left: st.marginLeft ?? st.margin ?? 0,
          }}
          onChange={(side, val) => {
            setStyle({ [`margin${side.charAt(0).toUpperCase() + side.slice(1)}`]: val } as any);
          }}
          onChangeAll={(val) => {
            setStyle({ margin: val, marginTop: undefined, marginRight: undefined, marginBottom: undefined, marginLeft: undefined } as any);
          }}
        />
      </PanelSection>

      {/* ── Text ── */}
      {isTextBlock &&
      <PanelSection title="Text">
          <FontPickerDropdown
            value={st.fontFamily || ''}
            onChange={(f) => setStyle({ fontFamily: f || undefined })}
            placeholder="Theme default"
          />

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <span className="text-[8px] text-muted-foreground block mb-1">Align</span>
              <PanelToggleGroup
              options={[
              { value: 'left' as const, label: <AlignLeft className="h-3 w-3" /> },
              { value: 'center' as const, label: <AlignCenter className="h-3 w-3" /> },
              { value: 'right' as const, label: <AlignRight className="h-3 w-3" /> },
              { value: 'justify' as const, label: <AlignJustify className="h-3 w-3" /> }]
              }
              value={(st.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify'}
              onChange={(v) => setStyle({ textAlign: v })} className="px-0" />

            </div>
            <div className="w-[80px]">
              <StepperInput label="Sz" value={st.fontSize ?? (block.type === 'title' ? 64 : 22)} onChange={(v) => setStyle({ fontSize: v })} min={8} max={200} step={2} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[8px] text-muted-foreground block mb-1">Weight</span>
              <PanelToggleGroup
              options={[
              { value: '300', label: 'L' },
              { value: '400', label: 'R' },
              { value: '500', label: 'M' },
              { value: '700', label: 'B' },
              { value: '900', label: 'Bk' }]
              }
              value={String(st.fontWeight ?? 400)}
              onChange={(v) => setStyle({ fontWeight: Number(v) })} />

            </div>
            <div>
              <span className="text-[8px] text-muted-foreground block mb-1">Transform</span>
              <PanelToggleGroup
              options={[
              { value: 'none' as const, label: 'Aa' },
              { value: 'uppercase' as const, label: 'AA' },
              { value: 'lowercase' as const, label: 'aa' },
              { value: 'capitalize' as const, label: 'Ab' }]
              }
              value={(st.textTransform || 'none') as 'none' | 'uppercase' | 'lowercase' | 'capitalize'}
              onChange={(v) => setStyle({ textTransform: v })} />

            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StepperInput label="L/H" value={st.lineHeight ?? 1.4} onChange={(v) => setStyle({ lineHeight: v })} min={0.5} max={4} step={0.1} />
            <StepperInput label="L/S" value={st.letterSpacing ?? 0} onChange={(v) => setStyle({ letterSpacing: v })} min={-5} max={20} step={0.5} />
          </div>

          <ColorPickerInline label="Color" value={st.color || ''} onChange={(v) => setStyle({ color: v })} placeholder="Auto" />
        </PanelSection>
      }

      {/* ── Fill & Stroke ── */}
      <PanelSection title="Fill & Stroke" className="py-0 my-px pb-[6px]">
        <ColorPickerInline label="Fill" value={st.backgroundColor || ''} onChange={(v) => setStyle({ backgroundColor: v })} placeholder="none" />
        <ColorPickerInline label="Accent" value={st.accentColor || ''} onChange={(v) => setStyle({ accentColor: v })} placeholder="Theme" />
        <ColorPickerInline label="Stroke" value={st.borderColor || ''} onChange={(v) => setStyle({ borderColor: v })} placeholder="none" />
        {st.borderColor &&
        <>
            <StepperInput label="Width" value={st.borderWidth ?? 1} onChange={(v) => setStyle({ borderWidth: v })} max={20} suffix="px" />
            <PanelToggleGroup
            options={[
            { value: 'solid' as const, label: '—' },
            { value: 'dashed' as const, label: '- -' },
            { value: 'dotted' as const, label: '···' }]
            }
            value={(st.borderStyle || 'solid') as 'solid' | 'dashed' | 'dotted'}
            onChange={(v) => setStyle({ borderStyle: v })} />

          </>
        }
        <SliderControl
          icon={<CornerRadiusSvg className="h-3 w-3" />}
          value={st.borderRadius ?? 8}
          onChange={(v) => setStyle({ borderRadius: v })}
          min={0}
          max={50}
          step={1} className="py-[5px]" />

      </PanelSection>

      {/* ── Card & Icon (conditional) ── */}
      {(() => {
        const CARD_ICON_TYPES = ['card-grid', 'icon-list', 'icon-grid', 'bento-grid', 'steps', 'process-flow', 'stats', 'feature-grid', 'pricing-table', 'comparison', 'timeline', 'team-grid', 'testimonials', 'testimonial', 'faq', 'floating-cards', 'cta-section', 'logo-cloud', 'repeater', 'gallery', 'numbered-list', 'progress', 'nav-bar', 'accordion', 'social-links', 'cycle-diagram', 'todo-list'];
        const ICON_ONLY_TYPES = ['icon-list', 'icon-grid', 'steps', 'process-flow'];
        const CARD_ONLY_TYPES = ['card-grid', 'bento-grid', 'floating-cards'];
        if (!CARD_ICON_TYPES.includes(block.type)) return null;
        const sectionTitle = ICON_ONLY_TYPES.includes(block.type) ? 'Icon Style' : CARD_ONLY_TYPES.includes(block.type) ? 'Card Style' : 'Card & Icon';
        return (
          <PanelSection title={sectionTitle} defaultOpen={true}>
            {!CARD_ONLY_TYPES.includes(block.type) && <>
              <ColorPickerInline label="Icon Color" value={st.iconColor || ''} onChange={(v) => setStyle({ iconColor: v })} placeholder="Auto" />
              <ColorPickerInline label="Icon Bg" value={st.iconBgColor || ''} onChange={(v) => setStyle({ iconBgColor: v })} placeholder="Auto" />
              <StepperInput label="Icon Sz" value={st.iconSize ?? 24} onChange={(v) => setStyle({ iconSize: v })} min={8} max={128} step={2} suffix="px" />
            </>}
            {!ICON_ONLY_TYPES.includes(block.type) && <>
              <ColorPickerInline label="Card Bg" value={st.cardBgColor || ''} onChange={(v) => setStyle({ cardBgColor: v })} placeholder="Auto" />
              <SliderControl
                icon={<CornerRadiusSvg className="h-3 w-3" />}
                value={st.cardBorderRadius ?? 8}
                onChange={(v) => setStyle({ cardBorderRadius: v })}
                min={0} max={50} step={1} className="py-[5px]" />
              <ColorPickerInline label="Card Border" value={st.cardBorderColor || ''} onChange={(v) => setStyle({ cardBorderColor: v })} placeholder="none" />
              {st.cardBorderColor && <StepperInput label="Card Bdr W" value={st.cardBorderWidth ?? 1} onChange={(v) => setStyle({ cardBorderWidth: v })} max={10} suffix="px" />}
              <div>
                <span className="text-[9px] text-muted-foreground block mb-1">Card Shadow</span>
                <PanelToggleGroup
                  options={[
                    { value: 'none', label: 'None' },
                    { value: '0 2px 8px rgba(0,0,0,0.1)', label: 'S' },
                    { value: '0 4px 16px rgba(0,0,0,0.15)', label: 'M' },
                    { value: '0 8px 32px rgba(0,0,0,0.2)', label: 'L' },
                  ]}
                  value={st.cardShadow || 'none'}
                  onChange={(v) => setStyle({ cardShadow: v === 'none' ? undefined : v })} />
              </div>
              <StepperInput label="Inner Pad" value={st.innerPadding ?? 24} onChange={(v) => setStyle({ innerPadding: v })} max={100} step={4} suffix="px" />
            </>}
          </PanelSection>
        );
      })()}

      {/* ── Block Background ── */}
      <PanelSection title="Block Background" defaultOpen={false}>
        <div className="space-y-2">
          <span className="text-[9px] text-muted-foreground block">Gradient Presets</span>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
              'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
              'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)',
            ].map((grad, i) => (
              <button
                key={i}
                className={cn(
                  "h-8 rounded-md border transition-all hover:scale-105",
                  st.backgroundGradientCSS === grad ? "border-foreground ring-1 ring-foreground" : "border-border"
                )}
                style={{ background: grad }}
                onClick={() => setStyle({ backgroundGradientCSS: grad, backgroundImageUrl: undefined })}
              />
            ))}
          </div>
          {st.backgroundGradientCSS && (
            <button
              className="text-[9px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setStyle({ backgroundGradientCSS: undefined })}
            >
              Clear gradient
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <span className="text-[9px] text-muted-foreground block">Background Image</span>
          <BgImageUploader
            value={st.backgroundImageUrl || ''}
            onChange={(url) => setStyle({ backgroundImageUrl: url, backgroundGradientCSS: undefined })}
          />
          {st.backgroundImageUrl && (
            <button
              className="text-[9px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setStyle({ backgroundImageUrl: undefined })}
            >
              Clear image
            </button>
          )}
        </div>
        {(st.backgroundGradientCSS || st.backgroundImageUrl) && (
          <div className="h-12 rounded-lg border border-border overflow-hidden"
            style={{
              background: st.backgroundGradientCSS || (st.backgroundImageUrl ? `url(${st.backgroundImageUrl}) center/cover` : undefined),
            }} />
        )}
      </PanelSection>

      {/* ── Effects ── */}
      <PanelSection title="Effects" defaultOpen={false}>
        <SliderControl
          icon={<Eye className="h-3 w-3" />}
          value={Math.round((st.opacity ?? 1) * 100)}
          onChange={(v) => setStyle({ opacity: v / 100 })}
          min={0}
          max={100}
          step={1}
          suffix="%" />

        {/* ── Drop Shadow ── */}
        <div>
          <span className="text-[9px] text-muted-foreground block mb-1">Shadow Type</span>
          <PanelToggleGroup
            options={[
              { value: 'none', label: 'None' },
              { value: 'drop', label: 'Drop' },
              { value: 'inner', label: 'Inner' },
              { value: 'both', label: 'Both' },
            ]}
            value={st.shadowType || 'none'}
            onChange={(v) => setStyle({
              shadowType: v === 'none' ? undefined : v as any,
              boxShadow: undefined,
              ...(v !== 'none' && !st.shadowBlur ? { shadowX: 0, shadowY: 4, shadowBlur: 16, shadowSpread: 0, shadowColor: '#000000', shadowOpacity: 0.15 } : {}),
              ...(v === 'inner' || v === 'both' ? (!st.innerShadowBlur ? { innerShadowX: 0, innerShadowY: 2, innerShadowBlur: 8, innerShadowSpread: 0, innerShadowColor: '#000000', innerShadowOpacity: 0.1 } : {}) : {}),
            })} />
        </div>

        {/* Quick Presets */}
        {!st.shadowType && (
          <div>
            <span className="text-[9px] text-muted-foreground block mb-1">Quick Shadow</span>
            <PanelToggleGroup
              options={[
                { value: 'none', label: 'None' },
                { value: '0 2px 8px rgba(0,0,0,0.1)', label: 'S' },
                { value: '0 4px 16px rgba(0,0,0,0.15)', label: 'M' },
                { value: '0 8px 32px rgba(0,0,0,0.2)', label: 'L' },
              ]}
              value={st.boxShadow || 'none'}
              onChange={(v) => setStyle({ boxShadow: v === 'none' ? undefined : v })} />
          </div>
        )}

        {/* Drop Shadow Controls */}
        {(st.shadowType === 'drop' || st.shadowType === 'both') && (
          <div className="space-y-2 pl-1 border-l-2 border-primary/20">
            <span className="text-[9px] font-medium text-foreground block">Drop Shadow</span>
            <div className="grid grid-cols-2 gap-2">
              <StepperInput label="X" value={st.shadowX ?? 0} onChange={(v) => setStyle({ shadowX: v })} min={-100} max={100} step={1} suffix="px" />
              <StepperInput label="Y" value={st.shadowY ?? 4} onChange={(v) => setStyle({ shadowY: v })} min={-100} max={100} step={1} suffix="px" />
              <StepperInput label="Blur" value={st.shadowBlur ?? 16} onChange={(v) => setStyle({ shadowBlur: v })} min={0} max={200} step={1} suffix="px" />
              <StepperInput label="Spread" value={st.shadowSpread ?? 0} onChange={(v) => setStyle({ shadowSpread: v })} min={-100} max={100} step={1} suffix="px" />
            </div>
            <div className="flex items-center gap-2">
              <ColorPickerInline label="Color" value={st.shadowColor || '#000000'} onChange={(v) => setStyle({ shadowColor: v })} />
              <div className="flex-1">
                <SliderControl icon={<span className="text-[8px]">Op</span>} value={Math.round((st.shadowOpacity ?? 0.15) * 100)} onChange={(v) => setStyle({ shadowOpacity: v / 100 })} min={0} max={100} step={1} suffix="%" />
              </div>
            </div>
          </div>
        )}

        {/* Inner Shadow Controls */}
        {(st.shadowType === 'inner' || st.shadowType === 'both') && (
          <div className="space-y-2 pl-1 border-l-2 border-accent/20">
            <span className="text-[9px] font-medium text-foreground block">Inner Shadow</span>
            <div className="grid grid-cols-2 gap-2">
              <StepperInput label="X" value={st.innerShadowX ?? 0} onChange={(v) => setStyle({ innerShadowX: v })} min={-100} max={100} step={1} suffix="px" />
              <StepperInput label="Y" value={st.innerShadowY ?? 2} onChange={(v) => setStyle({ innerShadowY: v })} min={-100} max={100} step={1} suffix="px" />
              <StepperInput label="Blur" value={st.innerShadowBlur ?? 8} onChange={(v) => setStyle({ innerShadowBlur: v })} min={0} max={200} step={1} suffix="px" />
              <StepperInput label="Spread" value={st.innerShadowSpread ?? 0} onChange={(v) => setStyle({ innerShadowSpread: v })} min={-100} max={100} step={1} suffix="px" />
            </div>
            <div className="flex items-center gap-2">
              <ColorPickerInline label="Color" value={st.innerShadowColor || '#000000'} onChange={(v) => setStyle({ innerShadowColor: v })} />
              <div className="flex-1">
                <SliderControl icon={<span className="text-[8px]">Op</span>} value={Math.round((st.innerShadowOpacity ?? 0.1) * 100)} onChange={(v) => setStyle({ innerShadowOpacity: v / 100 })} min={0} max={100} step={1} suffix="%" />
              </div>
            </div>
          </div>
        )}

        {/* ── Blur ── */}
        <div>
          <span className="text-[9px] text-muted-foreground block mb-1">Layer Blur</span>
          <SliderControl icon={<span className="text-[8px]">B</span>} value={st.blur ?? 0} onChange={(v) => setStyle({ blur: v || undefined })} min={0} max={50} step={1} suffix="px" />
        </div>
        <div>
          <span className="text-[9px] text-muted-foreground block mb-1">Backdrop Blur</span>
          <SliderControl icon={<span className="text-[8px]">Bd</span>} value={st.backdropBlur ?? 0} onChange={(v) => setStyle({ backdropBlur: v || undefined })} min={0} max={50} step={1} suffix="px" />
        </div>

        {/* ── Noise ── */}
        <div>
          <span className="text-[9px] text-muted-foreground block mb-1">Noise Overlay</span>
          <SliderControl icon={<span className="text-[8px]">N</span>} value={Math.round((st.noiseIntensity ?? 0) * 100)} onChange={(v) => setStyle({ noiseIntensity: v / 100, noiseOpacity: st.noiseOpacity ?? 0.15 })} min={0} max={100} step={1} suffix="%" />
          {(st.noiseIntensity ?? 0) > 0 && (
            <SliderControl icon={<span className="text-[8px]">Op</span>} value={Math.round((st.noiseOpacity ?? 0.15) * 100)} onChange={(v) => setStyle({ noiseOpacity: v / 100 })} min={0} max={100} step={1} suffix="%" />
          )}
        </div>

        {/* ── CSS Filters ── */}
        <div>
          <span className="text-[9px] text-muted-foreground block mb-1">Filters</span>
          <div className="space-y-1">
            <SliderControl icon={<span className="text-[8px]">Br</span>} value={st.filterBrightness ?? 100} onChange={(v) => setStyle({ filterBrightness: v })} min={0} max={200} step={1} suffix="%" />
            <SliderControl icon={<span className="text-[8px]">Ct</span>} value={st.filterContrast ?? 100} onChange={(v) => setStyle({ filterContrast: v })} min={0} max={200} step={1} suffix="%" />
            <SliderControl icon={<span className="text-[8px]">Sa</span>} value={st.filterSaturate ?? 100} onChange={(v) => setStyle({ filterSaturate: v })} min={0} max={200} step={1} suffix="%" />
            <SliderControl icon={<span className="text-[8px]">Hu</span>} value={st.filterHueRotate ?? 0} onChange={(v) => setStyle({ filterHueRotate: v })} min={0} max={360} step={1} suffix="°" />
          </div>
        </div>

        {/* ── Blend Mode ── */}
        <div>
          <span className="text-[9px] text-muted-foreground block mb-1">Blend Mode</span>
          <select
            className="w-full h-7 rounded-md border border-input bg-background px-2 text-[10px]"
            value={st.mixBlendMode || 'normal'}
            onChange={(e) => setStyle({ mixBlendMode: e.target.value === 'normal' ? undefined : e.target.value })}
          >
            {['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion','hue','saturation','color','luminosity'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </PanelSection>

      {/* ── Animate ── */}
      <PanelSection title="Animate" defaultOpen={false}>
        <div>
          <span className="text-[9px] text-muted-foreground block mb-1">Entrance</span>
          <PanelToggleGroup
            options={[
            { value: 'none', label: 'None' },
            { value: 'fade-in', label: 'Fade' },
            { value: 'fade-up', label: 'Up' },
            { value: 'scale-in', label: 'Scale' }]
            }
            value={st.animation?.effect || 'none'}
            onChange={(v) => setStyle({ animation: { ...(st.animation || { effect: 'none' }), effect: v as any } })} />

        </div>
        {st.animation?.effect && st.animation.effect !== 'none' &&
        <div className="grid grid-cols-2 gap-2">
            <StepperInput label="Delay" value={st.animation?.delay ?? 0} onChange={(v) => setStyle({ animation: { ...st.animation!, delay: v } })} min={0} max={3000} step={100} suffix="ms" />
            <StepperInput label="Dur" value={st.animation?.duration ?? 500} onChange={(v) => setStyle({ animation: { ...st.animation!, duration: v } })} min={100} max={3000} step={100} suffix="ms" />
          </div>
        }
      </PanelSection>
    </>);

}

// ── Background Image Uploader ────────────────────────────────────────

function BgImageUploader({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Sign in to upload'); return; }
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/slide-bg/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('design-assets').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) { toast.error('Upload failed'); return; }
      const { data: urlData, error: urlError } = await supabase.storage.from('design-assets').createSignedUrl(filePath, 60 * 60 * 24 * 365);
      if (!urlError && urlData?.signedUrl) {
        onChange(urlData.signedUrl);
        toast.success('Background image set');
      } else {
        toast.error('Failed to get image URL');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [onChange]);

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative rounded-lg overflow-hidden border border-border h-20">
          <img src={value} alt="Background" className="w-full h-full object-cover" />
          <button
            onClick={() => onChange('')}
            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full h-8 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:bg-muted/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        {uploading ? 'Uploading…' : value ? 'Replace Image' : 'Upload Image'}
      </button>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste image URL…"
        className="h-7 text-[10px] bg-muted/30 border-0"
      />
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
    </div>
  );
}

// ── Per-Item Style Editor (reusable) ─────────────────────────────────

const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)',
];

const PATTERN_PRESETS = [
  { label: 'Dots', value: 'radial-gradient(circle, currentColor 1px, transparent 1px)', size: '10px 10px' },
  { label: 'Grid', value: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', size: '20px 20px' },
  { label: 'Diag', value: 'repeating-linear-gradient(45deg, currentColor, currentColor 1px, transparent 1px, transparent 10px)', size: '' },
  { label: 'Cross', value: 'radial-gradient(circle, transparent 5px, currentColor 5px, currentColor 6px, transparent 6px)', size: '16px 16px' },
];

function ItemStyleEditor({ item, index, items, arrayKey, update }: {
  item: any;
  index: number;
  items: any[];
  arrayKey: string;
  update: (patch: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasBg = item.bgColor || item.bgGradient || item.bgImage || item.textColor;

  const patchItem = (patch: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...patch };
    update({ [arrayKey]: newItems });
  };

  const clearItemStyle = () => {
    const newItems = [...items];
    const { bgColor, bgGradient, bgImage, textColor, accentColor, ...rest } = newItems[index];
    newItems[index] = rest;
    update({ [arrayKey]: newItems });
  };

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 text-[8px] w-full py-0.5 transition-colors rounded",
          hasBg ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Palette className="w-2.5 h-2.5" />
        {open ? '▾ Style' : '▸ Style'}
        {hasBg && <span className="w-2 h-2 rounded-full bg-primary ml-auto" />}
      </button>
      {open && (
        <div className="space-y-1.5 pl-1 pt-1 border-l border-border ml-1">
          <ColorPickerInline label="Bg" value={item.bgColor || ''} onChange={(v) => patchItem({ bgColor: v, bgGradient: undefined, bgImage: undefined })} placeholder="none" />
          <ColorPickerInline label="Text" value={item.textColor || ''} onChange={(v) => patchItem({ textColor: v })} placeholder="Auto" />
          <ColorPickerInline label="Accent" value={item.accentColor || ''} onChange={(v) => patchItem({ accentColor: v })} placeholder="Auto" />

          <div>
            <span className="text-[7px] text-muted-foreground block mb-0.5">Gradients</span>
            <div className="grid grid-cols-4 gap-1">
              {GRADIENT_PRESETS.map((grad, gi) => (
                <button
                  key={gi}
                  className={cn(
                    "h-5 rounded border transition-all hover:scale-110",
                    item.bgGradient === grad ? "border-foreground ring-1 ring-foreground" : "border-border"
                  )}
                  style={{ background: grad }}
                  onClick={() => patchItem({ bgGradient: grad, bgColor: undefined, bgImage: undefined })}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="text-[7px] text-muted-foreground block mb-0.5">Patterns</span>
            <div className="grid grid-cols-4 gap-1">
              {PATTERN_PRESETS.map((pat, pi) => (
                <button
                  key={pi}
                  className={cn(
                    "h-5 rounded border text-[6px] transition-all hover:scale-110",
                    item.bgGradient === `pattern:${pi}` ? "border-foreground" : "border-border"
                  )}
                  style={{
                    backgroundImage: pat.value.replace(/currentColor/g, '#666'),
                    backgroundSize: pat.size || undefined,
                  }}
                  onClick={() => patchItem({ bgGradient: pat.value.replace(/currentColor/g, item.bgColor || '#888'), bgColor: undefined, bgImage: undefined })}
                  title={pat.label}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="text-[7px] text-muted-foreground block mb-0.5">Mesh Gradient</span>
            <div className="grid grid-cols-4 gap-1">
              {[
                'radial-gradient(at 40% 20%, #667eea 0%, transparent 50%), radial-gradient(at 80% 80%, #f093fb 0%, transparent 50%), radial-gradient(at 10% 90%, #4facfe 0%, transparent 50%)',
                'radial-gradient(at 20% 30%, #ff6b6b 0%, transparent 50%), radial-gradient(at 70% 70%, #feca57 0%, transparent 50%), radial-gradient(at 90% 10%, #48dbfb 0%, transparent 50%)',
                'radial-gradient(at 50% 0%, #a18cd1 0%, transparent 60%), radial-gradient(at 100% 100%, #fbc2eb 0%, transparent 50%), radial-gradient(at 0% 100%, #667eea 0%, transparent 50%)',
                'radial-gradient(at 30% 70%, #0c3483 0%, transparent 50%), radial-gradient(at 80% 20%, #a2b6df 0%, transparent 50%), radial-gradient(at 60% 90%, #43e97b 0%, transparent 50%)',
              ].map((mesh, mi) => (
                <button
                  key={mi}
                  className={cn(
                    "h-5 rounded border transition-all hover:scale-110",
                    item.bgGradient === mesh ? "border-foreground ring-1 ring-foreground" : "border-border"
                  )}
                  style={{ background: mesh }}
                  onClick={() => patchItem({ bgGradient: mesh, bgColor: undefined, bgImage: undefined })}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="text-[7px] text-muted-foreground block mb-0.5">Image</span>
            <Input
              value={item.bgImage || ''}
              onChange={(e) => patchItem({ bgImage: e.target.value, bgColor: undefined, bgGradient: undefined })}
              placeholder="Paste image URL…"
              className="h-5 text-[8px] bg-muted/30 border-0"
            />
          </div>

          {hasBg && (
            <button onClick={clearItemStyle} className="text-[7px] text-destructive hover:underline">
              Clear style
            </button>
          )}
        </div>
      )}
    </div>
  );
}


// ── SVG Color Editor ─────────────────────────────────────────────────

function SvgColorEditor({ block, update }: { block: any; update: (patch: any) => void }) {
  const src = block.src as string;
  const [fetchedSvg, setFetchedSvg] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  // Check if it's a data URL SVG
  const isDataUrl = src?.startsWith('data:image/svg+xml');
  // Check if it's an external SVG URL (e.g., Iconify)
  const isExternalSvg = src && !isDataUrl && (src.endsWith('.svg') || src.includes('/svg') || src.includes('iconify'));

  // For external SVGs, provide a "Fetch & Edit" button
  const handleFetchSvg = useCallback(async () => {
    if (!src) return;
    setFetching(true);
    try {
      const res = await fetch(src);
      if (!res.ok) { toast.error('Failed to fetch SVG'); return; }
      const text = await res.text();
      if (!text.includes('<svg')) { toast.error('Not a valid SVG'); return; }
      // Convert to data URL
      const encoded = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
      update({ src: encoded });
      setFetchedSvg(text);
      toast.success('SVG loaded for color editing');
    } catch {
      toast.error('Failed to fetch SVG');
    } finally {
      setFetching(false);
    }
  }, [src, update]);

  if (!src) return null;

  // If external SVG (not yet converted), show fetch button
  if (isExternalSvg) {
    return (
      <div className="space-y-1.5 pt-1">
        <span className="text-[9px] text-muted-foreground font-medium block">SVG Colors</span>
        <button
          onClick={handleFetchSvg}
          disabled={fetching}
          className="w-full h-7 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:bg-muted/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {fetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Palette className="h-3 w-3" />}
          {fetching ? 'Loading…' : 'Edit SVG Colors'}
        </button>
      </div>
    );
  }

  if (!isDataUrl) return null;

  // Decode SVG from data URL
  let svgString = '';
  try {
    if (src.includes(';base64,')) {
      svgString = atob(src.split(';base64,')[1]);
    } else if (src.includes(',')) {
      svgString = decodeURIComponent(src.split(',')[1]);
    }
  } catch { return null; }
  if (!svgString) return null;

  // Parse SVG and extract unique colors
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const elements = doc.querySelectorAll('[fill], [stroke]');
  const colorMap = new Map<string, string>(); // normalized -> original
  elements.forEach((el) => {
    const fill = el.getAttribute('fill');
    const stroke = el.getAttribute('stroke');
    if (fill && fill !== 'none' && fill !== 'currentColor' && !fill.startsWith('url(')) {
      colorMap.set(fill.toLowerCase(), fill);
    }
    if (stroke && stroke !== 'none' && stroke !== 'currentColor' && !stroke.startsWith('url(')) {
      colorMap.set(stroke.toLowerCase(), stroke);
    }
  });
  // Also check the root SVG fill
  const rootFill = doc.documentElement.getAttribute('fill');
  if (rootFill && rootFill !== 'none' && rootFill !== 'currentColor') {
    colorMap.set(rootFill.toLowerCase(), rootFill);
  }

  const uniqueColors = Array.from(colorMap.entries());
  if (uniqueColors.length === 0) return null;

  const handleColorChange = (oldColor: string, newColor: string) => {
    // Replace all occurrences of the old color with the new color in the SVG string
    const regex = new RegExp(oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const newSvg = svgString.replace(regex, newColor);
    const encoded = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(newSvg)))}`;
    update({ src: encoded });
  };

  return (
    <div className="space-y-1.5 pt-1">
      <span className="text-[9px] text-muted-foreground font-medium block">SVG Colors</span>
      {uniqueColors.map(([normalized, original], i) => (
        <ColorPickerInline
          key={`${normalized}-${i}`}
          label={`Color ${i + 1}`}
          value={normalized}
          onChange={(v) => handleColorChange(original, v)}
          placeholder="#"
        />
      ))}
    </div>
  );
}

// ── Slide Properties ────────────────────────────────────────────────

function SlideProperties({ slide }: {slide: Slide;}) {
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const tokens = usePresentationStore((s) => s.designTokens);
  const slideLogo = usePresentationStore((s) => s.slideLogo);
  const setSlideLogo = usePresentationStore((s) => s.setSlideLogo);
  const bg = slide.background || { type: 'solid' as const, value: '' };
  const logoFileRef = React.useRef<HTMLInputElement>(null);

  const setBg = (patch: Partial<SlideBackground>) => {
    updateSlide(slide.id, { background: { ...bg, ...patch } as SlideBackground });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) setSlideLogo({ url, position: slideLogo?.position || 'top-left' });
    };
    reader.readAsDataURL(file);
  };

  const LOGO_POSITIONS: Array<{id: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';label: string;}> = [
  { id: 'top-left', label: '↖' }, { id: 'top-center', label: '↑' }, { id: 'top-right', label: '↗' },
  { id: 'bottom-left', label: '↙' }, { id: 'bottom-center', label: '↓' }, { id: 'bottom-right', label: '↘' }];


  return (
    <div className="space-y-0">
      <PanelSection title="Slide Format">
        <div className="grid grid-cols-4 gap-2">
          {SLIDE_FORMATS.map((fmt) => {
            const slideWidth = usePresentationStore.getState().slideWidth;
            const slideHeight = usePresentationStore.getState().slideHeight;
            const isActive = slideWidth === fmt.w && slideHeight === fmt.h;
            return (
              <button
                key={fmt.id}
                onClick={() => usePresentationStore.getState().setSlideSize(fmt.w, fmt.h)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors",
                  isActive ?
                  "border-foreground bg-foreground text-background" :
                  "border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
                title={`${fmt.w}×${fmt.h}`}>

                <fmt.icon className="h-4 w-4" />
                <span className="text-[8px] font-medium">{fmt.label}</span>
              </button>);

          })}
        </div>
      </PanelSection>

      <PanelSection title="Background">
        <PanelToggleGroup
          options={[
          { value: 'solid' as const, label: <><Palette className="h-3 w-3 mr-0.5" />Solid</> },
          { value: 'gradient' as const, label: <><Layers className="h-3 w-3 mr-0.5" />Grad</> },
          { value: 'mesh-gradient' as const, label: <>Mesh</> },
          { value: 'pattern' as const, label: <>Pattern</> },
          { value: 'image' as const, label: <><ImageIcon className="h-3 w-3 mr-0.5" />Image</> }]
          }
          value={bg.type as any}
          onChange={(v) => setBg({ type: v as SlideBackground['type'] })} />

        {bg.type === 'solid' ?
        <ColorPickerInline label="Color" value={bg.value || ''} onChange={(v) => setBg({ value: v })} placeholder="#ffffff" /> :
        bg.type === 'gradient' ?
        <GradientEditorPanel config={bg.gradientConfig} onChange={(config, css) => setBg({ gradientConfig: config, value: css })} /> :
        bg.type === 'mesh-gradient' ?
        <MeshGradientEditor points={bg.meshPoints} onChange={(points, css) => setBg({ meshPoints: points, value: css })} /> :
        bg.type === 'pattern' ?
        <PatternPicker config={bg.patternConfig} onChange={(config, css) => setBg({ patternConfig: config, value: css })} /> :
        <BgImageUploader value={bg.value || ''} onChange={(v) => setBg({ value: v })} />
        }
        <ColorPickerInline label="Overlay" value={bg.overlay || ''} onChange={(v) => setBg({ overlay: v })} placeholder="rgba(0,0,0,0.3)" />
        {bg.type === 'image' &&
        <StepperInput label="Blur" value={bg.blur ?? 0} onChange={(v) => setBg({ blur: v })} max={50} step={1} suffix="px" />
        }
      </PanelSection>

      {/* Logo */}
      <PanelSection title="Logo" defaultOpen={false}>
        {slideLogo?.url ?
        <div className="space-y-2">
            <div className="flex items-center gap-2">
              <img src={slideLogo.url} alt="Logo" className="h-8 object-contain rounded border border-border" />
              <button onClick={() => setSlideLogo(null)} className="text-[9px] text-destructive hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {LOGO_POSITIONS.map((pos) =>
            <button
              key={pos.id}
              onClick={() => setSlideLogo({ ...slideLogo, position: pos.id })}
              className={cn("h-7 rounded text-xs border transition-colors", slideLogo.position === pos.id ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted/50 text-muted-foreground")}>

                  {pos.label}
                </button>
            )}
            </div>
          </div> :

        <button onClick={() => logoFileRef.current?.click()} className="w-full h-8 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:bg-muted/30 flex items-center justify-center gap-1">
            <ImageIcon className="h-3 w-3" /> Upload Logo
          </button>
        }
        <input ref={logoFileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
      </PanelSection>

      <PanelSection title="Design Tokens" defaultOpen={false}>
        <div className="grid grid-cols-4 gap-2">
          {[
          { label: 'Accent', color: tokens.accentColor },
          { label: 'Primary', color: tokens.primaryColor },
          { label: 'Surface', color: tokens.surfaceColor },
          { label: 'Text', color: tokens.textColor }].
          map((t) =>
          <div key={t.label} className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-md border border-border" style={{ backgroundColor: t.color }} />
              <span className="text-[7px] text-muted-foreground">{t.label}</span>
            </div>
          )}
        </div>
        <div className="text-[9px] text-muted-foreground space-y-0.5">
          <div>Heading: {tokens.headingFont}</div>
          <div>Body: {tokens.bodyFont}</div>
          <div>Radius: {tokens.borderRadius}px</div>
        </div>
      </PanelSection>

      <PanelSection title="Speaker Notes" defaultOpen={false}>
        <Textarea
          value={slide.speakerNotes}
          onChange={(e) => updateSlide(slide.id, { speakerNotes: e.target.value })}
          className="text-[10px] bg-muted/30 border-0 min-h-[60px] resize-none"
          placeholder="Add speaker notes..." />

      </PanelSection>
    </div>);

}

// ── Block Data Editor ───────────────────────────────────────────────

function BlockDataEditor({ block, slideId }: {block: ContentBlock;slideId: string;}) {
  const updateBlock = usePresentationStore((s) => s.updateBlock);
  const update = (patch: Partial<ContentBlock>) => updateBlock(slideId, block.id, patch);

  return (
    <PanelSection title="Content">
      {(block.type === 'title' || block.type === 'subtitle' || block.type === 'callout' || block.type === 'quote') &&
      <>
          <Textarea value={block.text} onChange={(e) => update({ text: e.target.value } as any)} className="text-[10px] bg-muted/30 border-0 min-h-[48px] resize-none" />
          <ColorPickerInline label="Text Color" value={(block as any).textColor || ''} onChange={(v) => update({ textColor: v } as any)} placeholder="Auto" />
        </>
      }

      {block.type === 'title' &&
      <PanelToggleGroup
        options={[{ value: '1', label: 'H1' }, { value: '2', label: 'H2' }, { value: '3', label: 'H3' }]}
        value={String(block.level)}
        onChange={(v) => update({ level: Number(v) as 1 | 2 | 3 } as any)} />

      }

      {block.type === 'bullets' &&
      <div className="space-y-1">
          {block.items.map((item, i) =>
        <div key={i} className="flex gap-1">
              <Input value={item} onChange={(e) => {const items = [...block.items];items[i] = e.target.value;update({ items } as any);}} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" />
              <button onClick={() => update({ items: block.items.filter((_, j) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
            </div>
        )}
          <button onClick={() => update({ items: [...block.items, 'New item'] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add item</button>
        </div>
      }

      {block.type === 'image' &&
      <>
          <Input value={block.src} onChange={(e) => update({ src: e.target.value } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Image URL..." />
          <PanelToggleGroup
          options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'fill', label: 'Fill' }]}
          value={block.fit}
          onChange={(v) => update({ fit: v as any } as any)} />

          <div>
            <span className="text-[9px] text-muted-foreground block mb-1">Mask</span>
            <PanelToggleGroup
            options={[
            { value: 'none', label: 'None' },
            { value: 'circle', label: '●' },
            { value: 'rounded', label: '▢' },
            { value: 'diamond', label: '◆' },
            { value: 'hexagon', label: '⬡' }]
            }
           value={(block as any).mask || 'none'}
            onChange={(v) => update({ mask: v } as any)} />

          </div>
          <ColorPickerInline label="Tint Color" value={(block as any).tintColor || ''} onChange={(v) => update({ tintColor: v || undefined } as any)} placeholder="None" />
          <SvgColorEditor block={block} update={update} />
        </>
      }

      {block.type === 'callout' &&
      <>
          <select value={block.variant} onChange={(e) => update({ variant: e.target.value } as any)} className="w-full h-7 text-[10px] rounded-lg bg-muted/30 border border-border px-2 text-foreground">
            {['info', 'success', 'warning', 'accent', 'note', 'caution', 'question'].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <ColorPickerInline label="Bg Color" value={(block as any).bgColor || ''} onChange={(v) => update({ bgColor: v } as any)} placeholder="Auto" />
        </>
      }

      {block.type === 'icon-list' &&
      <>
          <StepperInput label="Icon Size" value={(block as any).iconSize ?? 24} onChange={(v) => update({ iconSize: v } as any)} min={12} max={64} step={2} />
          <ColorPickerInline label="Icon Color" value={(block as any).iconColor || ''} onChange={(v) => update({ iconColor: v } as any)} placeholder="Auto" />
          <ColorPickerInline label="Background" value={(block as any).bgColor || ''} onChange={(v) => update({ bgColor: v } as any)} placeholder="Auto" />
        </>
      }

      {block.type === 'chart' &&
      <>
          <Input value={block.title || ''} onChange={(e) => update({ title: e.target.value } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Chart title" />
          <select value={block.chartType} onChange={(e) => update({ chartType: e.target.value } as any)} className="w-full h-7 text-[10px] rounded-lg bg-muted/30 border border-border px-2 text-foreground">
            {['bar', 'line', 'pie', 'donut', 'area', 'scatter', 'radar', 'stacked-bar', 'funnel', 'waterfall', 'combo'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {block.data.map((d, i) =>
        <div key={i} className="flex gap-1 items-center">
              <Input value={d.label} onChange={(e) => {const data = [...block.data];data[i] = { ...d, label: e.target.value };update({ data } as any);}} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Label" />
              <Input type="number" value={d.value} onChange={(e) => {const data = [...block.data];data[i] = { ...d, value: Number(e.target.value) };update({ data } as any);}} className="h-6 text-[9px] bg-muted/30 border-0 w-16" />
              <ColorPickerInline label="" value={(d as any).color || ''} onChange={(v) => {const data = [...block.data];data[i] = { ...d, color: v };update({ data } as any);}} placeholder="#" />
              <button onClick={() => update({ data: block.data.filter((_, j) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
            </div>
        )}
          <button onClick={() => update({ data: [...block.data, { label: 'New', value: 50 }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add data</button>
        </>
      }

      {block.type === 'embed' &&
      <>
          <select value={block.embedType} onChange={(e) => update({ embedType: e.target.value } as any)} className="w-full h-7 text-[10px] rounded-lg bg-muted/30 border border-border px-2 text-foreground">
            {['youtube', 'vimeo', 'loom', 'figma', 'webpage', 'spotify', 'tweet', 'instagram', 'miro', 'calendly', 'typeform', 'google-form', 'custom'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input value={block.url} onChange={(e) => update({ url: e.target.value } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Paste URL..." />
          <ColorPickerInline label="Background" value={(block as any).bgColor || ''} onChange={(v) => update({ bgColor: v } as any)} placeholder="Auto" />
        </>
      }

      {block.type === 'callout' &&
      <select value={block.variant} onChange={(e) => update({ variant: e.target.value } as any)} className="w-full h-7 text-[10px] rounded-lg bg-muted/30 border border-border px-2 text-foreground">
          {['info', 'success', 'warning', 'accent', 'note', 'caution', 'question'].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      }

      {block.type === 'metric' &&
      <div className="grid grid-cols-2 gap-2">
          <Input value={block.value} onChange={(e) => update({ value: e.target.value } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Value" />
          <Input value={block.label} onChange={(e) => update({ label: e.target.value } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Label" />
          <Input value={block.suffix || ''} onChange={(e) => update({ suffix: e.target.value } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Suffix" />
          <select value={block.trend || ''} onChange={(e) => update({ trend: (e.target.value || undefined) as any } as any)} className="h-7 text-[10px] rounded-lg bg-muted/30 border border-border px-2 text-foreground">
            <option value="">No trend</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>
      }

      {block.type === 'code' &&
      <>
          <Input value={block.language} onChange={(e) => update({ language: e.target.value } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Language" />
          <Textarea value={block.code} onChange={(e) => update({ code: e.target.value } as any)} className="text-[9px] bg-muted/30 border-0 min-h-[60px] font-mono resize-none" />
        </>
      }

      {block.type === 'table' &&
      <div className="space-y-1">
          {block.rows.map((row, ri) =>
        <div key={ri} className="flex gap-1">
              {row.map((cell, ci) =>
          <Input key={ci} value={cell} onChange={(e) => {
            const rows = block.rows.map((r) => [...r]);
            rows[ri][ci] = e.target.value;
            update({ rows } as any);
          }} className="h-6 text-[8px] bg-muted/30 border-0 flex-1 min-w-0 px-1" />
          )}
            </div>
        )}
          <div className="flex gap-2">
            <button onClick={() => update({ rows: [...block.rows, Array(block.rows[0]?.length || 2).fill('')] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground flex-1 py-1"><Plus className="w-2.5 h-2.5" />Row</button>
            <button onClick={() => update({ rows: block.rows.map((r) => [...r, '']) } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground flex-1 py-1"><Plus className="w-2.5 h-2.5" />Col</button>
          </div>
        </div>
      }

      {block.type === 'quote' && block.attribution !== undefined &&
      <Input value={block.attribution || ''} onChange={(e) => update({ attribution: e.target.value } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Attribution" />
      }

      {block.type === 'shape' &&
      <div className="space-y-2">
          <select value={(block as any).shape || 'rectangle'} onChange={(e) => update({ shape: e.target.value } as any)} className="w-full h-7 text-[10px] rounded-lg bg-muted/30 border border-border px-2 text-foreground">
            {['rectangle','circle','triangle','diamond','star','heart','hexagon','pentagon','octagon','arrow'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <ColorPickerInline label="Fill" value={(block as any).fillColor || ''} onChange={(v) => update({ fillColor: v } as any)} placeholder="#6366f120" />
          <ColorPickerInline label="Stroke" value={(block as any).strokeColor || ''} onChange={(v) => update({ strokeColor: v } as any)} placeholder="#6366f1" />
          <StepperInput label="Stroke W" value={(block as any).strokeWidth ?? 3} onChange={(v) => update({ strokeWidth: v } as any)} min={0} max={20} step={1} />
          <StepperInput label="Corner R" value={(block as any).cornerRadius ?? 0} onChange={(v) => update({ cornerRadius: v } as any)} min={0} max={100} step={2} />
          <StepperInput label="Size" value={(block as any).shapeSize ?? 300} onChange={(v) => update({ shapeSize: v } as any)} min={50} max={1000} step={10} />
        </div>
      }

      {block.type === 'gif' &&
      <>
          <Input value={(block as any).src || ''} onChange={(e) => update({ src: e.target.value } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="GIF URL..." />
          <PanelToggleGroup options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }]} value={(block as any).fit || 'contain'} onChange={(v) => update({ fit: v } as any)} />
        </>
      }

      {block.type === 'lottie' &&
      <>
          <Input value={(block as any).src || ''} onChange={(e) => update({ src: e.target.value } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Lottie URL (lottie.host/embed/...)" />
          <label className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <input type="checkbox" checked={(block as any).loop !== false} onChange={(e) => update({ loop: e.target.checked } as any)} className="w-3 h-3" /> Loop
          </label>
        </>
      }

      {block.type === 'sticker' &&
      <>
          <Input value={(block as any).src || ''} onChange={(e) => update({ src: e.target.value } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Sticker URL (PNG/SVG)..." />
          <StepperInput label="Size" value={(block as any).stickerSize ?? 200} onChange={(v) => update({ stickerSize: v } as any)} min={20} max={800} step={10} />
        </>
      }

      {(block.type === 'stats' || block.type === 'steps' || block.type === 'process-flow' || block.type === 'icon-grid' || block.type === 'cycle-diagram') && 'variant' in block &&
      <Input value={(block as any).variant || ''} onChange={(e) => update({ variant: e.target.value } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Variant" />
      }

      {/* ── Generic list-based item editors ── */}
      {block.type === 'stats' && 'items' in block &&
      <div className="space-y-1">
          {(block as any).items.map((item: any, i: number) =>
        <div key={i} className="p-1.5 rounded border border-border bg-muted/20 space-y-1">
              <div className="flex gap-1">
                <Input value={item.label || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, label: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Label" />
                <Input type="number" value={item.value ?? 0} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, value: Number(e.target.value) }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 w-16" placeholder="Value" />
                <button onClick={() => update({ items: (block as any).items.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
              <Input value={item.suffix || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, suffix: e.target.value }; update({ items } as any); }} className="h-5 text-[8px] bg-muted/30 border-0" placeholder="Suffix (e.g. %)" />
              <ItemStyleEditor item={item} index={i} items={(block as any).items} arrayKey="items" update={update} />
            </div>
        )}
          <button onClick={() => update({ items: [...(block as any).items, { label: 'New', value: 50, suffix: '' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add stat</button>
        </div>
      }

      {block.type === 'steps' && 'items' in block &&
      <div className="space-y-1">
          {(block as any).items.map((item: any, i: number) =>
        <div key={i} className="p-1.5 rounded border border-border bg-muted/20 space-y-1">
              <div className="flex gap-1">
                <Input value={item.title || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, title: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Title" />
                <Input value={item.icon || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, icon: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 w-16" placeholder="Icon" />
                <button onClick={() => update({ items: (block as any).items.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
              <Input value={item.description || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, description: e.target.value }; update({ items } as any); }} className="h-5 text-[8px] bg-muted/30 border-0" placeholder="Description" />
              <ItemStyleEditor item={item} index={i} items={(block as any).items} arrayKey="items" update={update} />
            </div>
        )}
          <button onClick={() => update({ items: [...(block as any).items, { title: 'New Step', description: '', icon: 'Star' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add step</button>
        </div>
      }

      {block.type === 'process-flow' && 'items' in block &&
      <div className="space-y-1">
          {(block as any).items.map((item: any, i: number) =>
        <div key={i} className="p-1.5 rounded border border-border bg-muted/20 space-y-1">
              <div className="flex gap-1">
                <Input value={item.title || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, title: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Title" />
                <button onClick={() => update({ items: (block as any).items.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
              <Input value={item.description || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, description: e.target.value }; update({ items } as any); }} className="h-5 text-[8px] bg-muted/30 border-0" placeholder="Description" />
              <ItemStyleEditor item={item} index={i} items={(block as any).items} arrayKey="items" update={update} />
            </div>
        )}
          <button onClick={() => update({ items: [...(block as any).items, { title: 'New', description: '' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add step</button>
        </div>
      }

      {block.type === 'icon-grid' && 'items' in block &&
      <div className="space-y-1">
          {(block as any).items.map((item: any, i: number) =>
        <div key={i} className="p-1.5 rounded border border-border bg-muted/20 space-y-1">
              <div className="flex gap-1">
                <Input value={item.icon || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, icon: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 w-16" placeholder="Icon" />
                <Input value={item.title || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, title: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Title" />
                <button onClick={() => update({ items: (block as any).items.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
              <Input value={item.description || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, description: e.target.value }; update({ items } as any); }} className="h-5 text-[8px] bg-muted/30 border-0" placeholder="Description" />
              <ItemStyleEditor item={item} index={i} items={(block as any).items} arrayKey="items" update={update} />
            </div>
        )}
          <button onClick={() => update({ items: [...(block as any).items, { icon: 'Star', title: 'New', description: '' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add item</button>
        </div>
      }

      {block.type === 'cycle-diagram' && 'items' in block &&
      <div className="space-y-1">
          {(block as any).items.map((item: any, i: number) =>
        <div key={i} className="flex gap-1">
              <Input value={item.label || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, label: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Label" />
              <button onClick={() => update({ items: (block as any).items.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              <ItemStyleEditor item={item} index={i} items={(block as any).items} arrayKey="items" update={update} />
            </div>
        )}
          <button onClick={() => update({ items: [...(block as any).items, { label: 'New' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add item</button>
        </div>
      }

      {block.type === 'timeline' && 'items' in block &&
      <div className="space-y-1">
          {(block as any).items.map((item: any, i: number) =>
        <div key={i} className="p-1.5 rounded border border-border bg-muted/20 space-y-1">
              <div className="flex gap-1">
                <Input value={item.year || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, year: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 w-16" placeholder="Year" />
                <Input value={item.title || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, title: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Title" />
                <button onClick={() => update({ items: (block as any).items.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
              <Input value={item.description || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, description: e.target.value }; update({ items } as any); }} className="h-5 text-[8px] bg-muted/30 border-0" placeholder="Description" />
              <ItemStyleEditor item={item} index={i} items={(block as any).items} arrayKey="items" update={update} />
            </div>
        )}
          <button onClick={() => update({ items: [...(block as any).items, { year: '2025', title: 'New', description: '' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add item</button>
        </div>
      }

      {block.type === 'numbered-list' && 'items' in block &&
      <div className="space-y-1">
          {(block as any).items.map((item: any, i: number) =>
        <div key={i} className="p-1.5 rounded border border-border bg-muted/20 space-y-1">
              <div className="flex gap-1">
                <Input value={item.title || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, title: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Title" />
                <button onClick={() => update({ items: (block as any).items.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
              <Input value={item.description || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, description: e.target.value }; update({ items } as any); }} className="h-5 text-[8px] bg-muted/30 border-0" placeholder="Description" />
              <ItemStyleEditor item={item} index={i} items={(block as any).items} arrayKey="items" update={update} />
            </div>
        )}
          <button onClick={() => update({ items: [...(block as any).items, { title: 'New', description: '' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add item</button>
        </div>
      }

      {block.type === 'progress' && 'items' in block &&
      <div className="space-y-1">
          {(block as any).items.map((item: any, i: number) =>
        <div key={i} className="flex gap-1">
              <Input value={item.label || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, label: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Label" />
              <Input type="number" value={item.value ?? 0} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, value: Number(e.target.value) }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 w-16" />
              <button onClick={() => update({ items: (block as any).items.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              <ItemStyleEditor item={item} index={i} items={(block as any).items} arrayKey="items" update={update} />
            </div>
        )}
          <button onClick={() => update({ items: [...(block as any).items, { label: 'New', value: 50 }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add bar</button>
        </div>
      }

      {block.type === 'todo-list' && 'items' in block &&
      <div className="space-y-1">
          {(block as any).items.map((item: any, i: number) =>
        <div key={i} className="flex gap-1 items-center">
              <input type="checkbox" checked={item.checked} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, checked: e.target.checked }; update({ items } as any); }} className="w-3 h-3" />
              <Input value={item.text || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, text: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Task" />
              <button onClick={() => update({ items: (block as any).items.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              <ItemStyleEditor item={item} index={i} items={(block as any).items} arrayKey="items" update={update} />
            </div>
        )}
          <button onClick={() => update({ items: [...(block as any).items, { text: 'New task', checked: false }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add task</button>
        </div>
      }

      {block.type === 'accordion' && 'items' in block &&
      <div className="space-y-1">
          {(block as any).items.map((item: any, i: number) =>
        <div key={i} className="p-1.5 rounded border border-border bg-muted/20 space-y-1">
              <div className="flex gap-1">
                <Input value={item.title || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, title: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Title" />
                <button onClick={() => update({ items: (block as any).items.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
              <Textarea value={item.content || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, content: e.target.value }; update({ items } as any); }} className="text-[8px] bg-muted/30 border-0 min-h-[32px] resize-none" placeholder="Content" />
              <ItemStyleEditor item={item} index={i} items={(block as any).items} arrayKey="items" update={update} />
            </div>
        )}
          <button onClick={() => update({ items: [...(block as any).items, { title: 'New Section', content: '' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add section</button>
        </div>
      }

      {block.type === 'bento-grid' && 'items' in block &&
      <div className="space-y-1">
          {(block as any).items.map((item: any, i: number) =>
        <div key={i} className="p-1.5 rounded border border-border bg-muted/20 space-y-1">
              <div className="flex gap-1">
                <Input value={item.icon || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, icon: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 w-14" placeholder="Icon" />
                <Input value={item.title || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, title: e.target.value }; update({ items } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Title" />
                <select value={item.span || 'normal'} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, span: e.target.value }; update({ items } as any); }} className="h-6 text-[8px] rounded bg-muted/30 border border-border px-1 text-foreground w-14">
                  {['normal', 'wide', 'tall', 'large'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => update({ items: (block as any).items.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
              <Input value={item.description || ''} onChange={(e) => { const items = [...(block as any).items]; items[i] = { ...item, description: e.target.value }; update({ items } as any); }} className="h-5 text-[8px] bg-muted/30 border-0" placeholder="Description" />
            </div>
        )}
          <button onClick={() => update({ items: [...(block as any).items, { icon: 'Star', title: 'New', description: '', span: 'normal' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add item</button>
        </div>
      }

      {block.type === 'feature-grid' && 'features' in block &&
      <div className="space-y-1">
          {(block as any).features.map((item: any, i: number) =>
        <div key={i} className="p-1.5 rounded border border-border bg-muted/20 space-y-1">
              <div className="flex gap-1">
                <Input value={item.icon || ''} onChange={(e) => { const features = [...(block as any).features]; features[i] = { ...item, icon: e.target.value }; update({ features } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 w-14" placeholder="Icon" />
                <Input value={item.title || ''} onChange={(e) => { const features = [...(block as any).features]; features[i] = { ...item, title: e.target.value }; update({ features } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Title" />
                <button onClick={() => update({ features: (block as any).features.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
              <Input value={item.description || ''} onChange={(e) => { const features = [...(block as any).features]; features[i] = { ...item, description: e.target.value }; update({ features } as any); }} className="h-5 text-[8px] bg-muted/30 border-0" placeholder="Description" />
            </div>
        )}
          <button onClick={() => update({ features: [...(block as any).features, { icon: 'Star', title: 'New', description: '' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add feature</button>
        </div>
      }

      {block.type === 'pricing-table' && 'plans' in block &&
      <div className="space-y-1">
          {(block as any).plans.map((plan: any, i: number) =>
        <div key={i} className="p-1.5 rounded border border-border bg-muted/20 space-y-1">
              <div className="flex gap-1">
                <Input value={plan.name || ''} onChange={(e) => { const plans = [...(block as any).plans]; plans[i] = { ...plan, name: e.target.value }; update({ plans } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Plan Name" />
                <Input value={plan.price || ''} onChange={(e) => { const plans = [...(block as any).plans]; plans[i] = { ...plan, price: e.target.value }; update({ plans } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 w-16" placeholder="$99" />
                <button onClick={() => update({ plans: (block as any).plans.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
              <Input value={(plan.features || []).join(', ')} onChange={(e) => { const plans = [...(block as any).plans]; plans[i] = { ...plan, features: e.target.value.split(',').map((s: string) => s.trim()) }; update({ plans } as any); }} className="h-5 text-[8px] bg-muted/30 border-0" placeholder="Features (comma-separated)" />
            </div>
        )}
          <button onClick={() => update({ plans: [...(block as any).plans, { name: 'New Plan', price: '$0', features: [] }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add plan</button>
        </div>
      }

      {block.type === 'gallery' && 'images' in block &&
      <div className="space-y-1">
          {(block as any).images.map((img: any, i: number) =>
        <div key={i} className="flex gap-1">
              <Input value={img.src || ''} onChange={(e) => { const images = [...(block as any).images]; images[i] = { ...img, src: e.target.value }; update({ images } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Image URL" />
              <button onClick={() => update({ images: (block as any).images.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
            </div>
        )}
          <button onClick={() => update({ images: [...(block as any).images, { src: '', alt: '' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add image</button>
        </div>
      }

      {block.type === 'logo-cloud' && 'logos' in block &&
      <div className="space-y-1">
          {(block as any).logos.map((logo: any, i: number) =>
        <div key={i} className="flex gap-1">
              <Input value={logo.src || ''} onChange={(e) => { const logos = [...(block as any).logos]; logos[i] = { ...logo, src: e.target.value }; update({ logos } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Logo URL" />
              <Input value={logo.alt || ''} onChange={(e) => { const logos = [...(block as any).logos]; logos[i] = { ...logo, alt: e.target.value }; update({ logos } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 w-20" placeholder="Alt" />
              <button onClick={() => update({ logos: (block as any).logos.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
            </div>
        )}
          <button onClick={() => update({ logos: [...(block as any).logos, { src: '', alt: '' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add logo</button>
        </div>
      }

      {block.type === 'social-links' && 'links' in block &&
      <div className="space-y-1">
          {(block as any).links.map((link: any, i: number) =>
        <div key={i} className="flex gap-1">
              <Input value={link.platform || ''} onChange={(e) => { const links = [...(block as any).links]; links[i] = { ...link, platform: e.target.value }; update({ links } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 w-20" placeholder="Platform" />
              <Input value={link.url || ''} onChange={(e) => { const links = [...(block as any).links]; links[i] = { ...link, url: e.target.value }; update({ links } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="URL" />
              <button onClick={() => update({ links: (block as any).links.filter((_: any, j: number) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
            </div>
        )}
          <button onClick={() => update({ links: [...(block as any).links, { platform: 'twitter', url: '' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add link</button>
        </div>
      }

      {block.type === 'comparison' && 'left' in block &&
      <div className="space-y-2">
          <div className="space-y-1">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Left</span>
            <Input value={(block as any).left?.title || ''} onChange={(e) => update({ left: { ...(block as any).left, title: e.target.value } } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Title" />
            {((block as any).left?.items || []).map((item: string, i: number) =>
          <div key={i} className="flex gap-1">
                <Input value={item} onChange={(e) => { const items = [...((block as any).left?.items || [])]; items[i] = e.target.value; update({ left: { ...(block as any).left, items } } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" />
                <button onClick={() => update({ left: { ...(block as any).left, items: (block as any).left.items.filter((_: any, j: number) => j !== i) } } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
          )}
            <button onClick={() => update({ left: { ...(block as any).left, items: [...((block as any).left?.items || []), 'New'] } } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add</button>
          </div>
          <div className="space-y-1">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Right</span>
            <Input value={(block as any).right?.title || ''} onChange={(e) => update({ right: { ...(block as any).right, title: e.target.value } } as any)} className="h-6 text-[9px] bg-muted/30 border-0" placeholder="Title" />
            {((block as any).right?.items || []).map((item: string, i: number) =>
          <div key={i} className="flex gap-1">
                <Input value={item} onChange={(e) => { const items = [...((block as any).right?.items || [])]; items[i] = e.target.value; update({ right: { ...(block as any).right, items } } as any); }} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" />
                <button onClick={() => update({ right: { ...(block as any).right, items: (block as any).right.items.filter((_: any, j: number) => j !== i) } } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
          )}
            <button onClick={() => update({ right: { ...(block as any).right, items: [...((block as any).right?.items || []), 'New'] } } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add</button>
          </div>
        </div>
      }

      {block.type === 'card-grid' &&
      <div className="space-y-2">
          {block.cards.map((card, i) =>
        <div key={i} className="p-2 rounded-lg border border-border bg-muted/20 space-y-1">
              <div className="flex gap-1">
                <Input value={card.icon || ''} onChange={(e) => {const cards = [...block.cards];cards[i] = { ...card, icon: e.target.value };update({ cards } as any);}} className="h-6 text-[9px] bg-muted/30 border-0 w-16" placeholder="Icon" />
                <Input value={card.title} onChange={(e) => {const cards = [...block.cards];cards[i] = { ...card, title: e.target.value };update({ cards } as any);}} className="h-6 text-[9px] bg-muted/30 border-0 flex-1" placeholder="Title" />
                <button onClick={() => update({ cards: block.cards.filter((_, j) => j !== i) } as any)} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
              </div>
              <Input value={card.description} onChange={(e) => {const cards = [...block.cards];cards[i] = { ...card, description: e.target.value };update({ cards } as any);}} className="h-6 text-[8px] bg-muted/30 border-0" placeholder="Description" />
              <div className="flex gap-2">
                <ColorPickerInline label="Bg" value={(card as any).bgColor || ''} onChange={(v) => {const cards = [...block.cards];cards[i] = { ...card, bgColor: v };update({ cards } as any);}} placeholder="Auto" />
                <ColorPickerInline label="Accent" value={(card as any).accent || ''} onChange={(v) => {const cards = [...block.cards];cards[i] = { ...card, accent: v };update({ cards } as any);}} placeholder="Auto" />
              </div>
            </div>
        )}
          <button onClick={() => update({ cards: [...block.cards, { title: 'New', description: '', icon: 'Star' }] } as any)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full py-1"><Plus className="w-3 h-3" />Add card</button>
        </div>
      }
    </PanelSection>);

}

// ── Block Properties ────────────────────────────────────────────────

function BlockProperties({ block, slideId }: {block: ContentBlock;slideId: string;}) {
  const removeBlock = usePresentationStore((s) => s.removeBlock);
  const duplicateBlock = usePresentationStore((s) => s.duplicateBlock);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{block.type}</span>
        <div className="flex gap-1">
          <button onClick={() => setShowSaveDialog(true)} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors" title="Save as Component"><Package className="w-3.5 h-3.5" /></button>
          <button onClick={() => duplicateBlock(slideId, block.id)} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"><Copy className="w-3.5 h-3.5" /></button>
          <button onClick={() => removeBlock(slideId, block.id)} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <BlockDataEditor block={block} slideId={slideId} />
      <StyleControls block={block} slideId={slideId} />
      <InteractionConfig blockId={block.id} slideId={slideId} />
      <SaveComponentDialog open={showSaveDialog} onOpenChange={setShowSaveDialog} block={block} slideId={slideId} />
    </div>);

}

// ── Main Export ──────────────────────────────────────────────────────

export function PropertiesTab() {
  const activeSlideId = usePresentationStore((s) => s.activeSlideId);
  const selectedBlockId = usePresentationStore((s) => s.selectedBlockId);
  const editingBlockId = usePresentationStore((s) => s.editingBlockId);
  const slides = usePresentationStore((s) => s.slides);

  const activeSlide = slides.find((s) => s.id === activeSlideId);
  const blockId = editingBlockId || selectedBlockId;
  const activeBlock = activeSlide?.contentBlocks.find((b) => b.id === blockId);

  if (!activeSlide) {
    return (
      <div className="flex flex-col items-center gap-3 pt-8 text-center p-8">
        <Settings2 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No slide selected.</p>
      </div>);

  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {activeBlock ?
        <BlockProperties block={activeBlock} slideId={activeSlide.id} /> :

        <SlideProperties slide={activeSlide} />
        }
      </div>
    </ScrollArea>);

}
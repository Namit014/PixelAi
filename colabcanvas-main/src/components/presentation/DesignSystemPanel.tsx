import { useState, useCallback, memo } from 'react';
import { Palette, Type, Square, Layers2, Download, Upload, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePresentationStore } from '@/stores/presentationStore';
import { ColorField, PanelSection, StepperInput, PanelToggleGroup } from './panel-primitives';
import type { DesignTokens } from '@/types/presentation';
import { toast } from 'sonner';
import { FontPickerDropdown } from './FontPickerDropdown';

// ── Sub-tabs ────────────────────────────────────────────────────────

type DesignTab = 'colors' | 'typography' | 'spacing' | 'effects';

const TABS: { id: DesignTab; icon: React.ElementType; label: string }[] = [
  { id: 'colors', icon: Palette, label: 'Colors' },
  { id: 'typography', icon: Type, label: 'Type' },
  { id: 'spacing', icon: Square, label: 'Space' },
  { id: 'effects', icon: Layers2, label: 'Effects' },
];

// ── Spacing Presets ─────────────────────────────────────────────────

const SPACING_PRESETS: { label: string; value: number }[] = [
  { label: 'Compact', value: 0.75 },
  { label: 'Default', value: 1 },
  { label: 'Spacious', value: 1.25 },
  { label: 'Airy', value: 1.5 },
];

// ── Card Style Options ──────────────────────────────────────────────

const CARD_STYLES: { value: 'flat' | 'elevated' | 'glass' | 'outlined'; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'elevated', label: 'Raised' },
  { value: 'glass', label: 'Glass' },
  { value: 'outlined', label: 'Outline' },
];

// ── Google Fonts Suggestions ────────────────────────────────────────

const HEADING_FONTS = [
  'Inter', 'Plus Jakarta Sans', 'Space Grotesk', 'DM Sans', 'Outfit',
  'Sora', 'Manrope', 'Satoshi', 'Cabinet Grotesk', 'General Sans',
  'Clash Display', 'Poppins', 'Montserrat', 'Playfair Display', 'Lora',
];

const BODY_FONTS = [
  'Inter', 'DM Sans', 'Plus Jakarta Sans', 'Source Sans 3', 'Nunito Sans',
  'Lato', 'Roboto', 'Open Sans', 'Work Sans', 'IBM Plex Sans',
];

// ── Main Component ──────────────────────────────────────────────────

export const DesignSystemPanel = memo(function DesignSystemPanel() {
  const [activeTab, setActiveTab] = useState<DesignTab>('colors');
  const { designTokens, setDesignTokens } = usePresentationStore();

  const updateToken = useCallback(
    (patch: Partial<DesignTokens>) => setDesignTokens(patch),
    [setDesignTokens]
  );

  const handleExport = useCallback(() => {
    const json = JSON.stringify(designTokens, null, 2);
    navigator.clipboard.writeText(json);
    toast.success('Design tokens copied to clipboard');
  }, [designTokens]);

  const handleImport = useCallback(() => {
    const input = prompt('Paste design tokens JSON:');
    if (!input) return;
    try {
      const parsed = JSON.parse(input);
      setDesignTokens(parsed);
      toast.success('Design tokens imported');
    } catch {
      toast.error('Invalid JSON');
    }
  }, [setDesignTokens]);

  return (
    <div className="space-y-0">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-0.5 px-1 py-1.5 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Colors ── */}
      {activeTab === 'colors' && (
        <div className="p-3 space-y-4">
          <PanelSection title="Core Palette" collapsible={false}>
            <div className="grid grid-cols-3 gap-3">
              <ColorField label="Primary" value={designTokens.primaryColor} onChange={(v) => updateToken({ primaryColor: v })} />
              <ColorField label="Accent" value={designTokens.accentColor} onChange={(v) => updateToken({ accentColor: v })} />
              <ColorField label="Background" value={designTokens.backgroundColor} onChange={(v) => updateToken({ backgroundColor: v })} />
              <ColorField label="Surface" value={designTokens.surfaceColor} onChange={(v) => updateToken({ surfaceColor: v })} />
              <ColorField label="Text" value={designTokens.textColor} onChange={(v) => updateToken({ textColor: v })} />
              <ColorField label="Muted" value={designTokens.mutedTextColor} onChange={(v) => updateToken({ mutedTextColor: v })} />
            </div>
          </PanelSection>

          <PanelSection title="Gradient" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Start" value={designTokens.gradientStart || designTokens.primaryColor} onChange={(v) => updateToken({ gradientStart: v })} />
              <ColorField label="End" value={designTokens.gradientEnd || designTokens.accentColor} onChange={(v) => updateToken({ gradientEnd: v })} />
            </div>
            {designTokens.gradientStart && designTokens.gradientEnd && (
              <div
                className="h-6 rounded-md mt-2 border border-border"
                style={{
                  background: `linear-gradient(135deg, ${designTokens.gradientStart}, ${designTokens.gradientEnd})`,
                }}
              />
            )}
          </PanelSection>
        </div>
      )}

      {/* ── Typography ── */}
      {activeTab === 'typography' && (
        <div className="p-3 space-y-4">
          <PanelSection title="Heading Font" collapsible={false}>
            <FontPickerDropdown
              value={designTokens.headingFont}
              onChange={(v) => updateToken({ headingFont: v })}
            />
            <div
              className="mt-2 text-lg font-bold text-foreground"
              style={{ fontFamily: designTokens.headingFont }}
            >
              The quick brown fox
            </div>
          </PanelSection>

          <PanelSection title="Body Font" collapsible={false}>
            <FontPickerDropdown
              value={designTokens.bodyFont}
              onChange={(v) => updateToken({ bodyFont: v })}
            />
            <div
              className="mt-2 text-sm text-foreground"
              style={{ fontFamily: designTokens.bodyFont }}
            >
              The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
            </div>
          </PanelSection>

          <PanelSection title="Type Scale Preview" defaultOpen={false}>
            <div className="space-y-1" style={{ fontFamily: designTokens.headingFont }}>
              {[
                { label: 'H1', size: 48 },
                { label: 'H2', size: 36 },
                { label: 'H3', size: 28 },
                { label: 'H4', size: 24 },
                { label: 'H5', size: 20 },
                { label: 'H6', size: 16 },
              ].map(({ label, size }) => (
                <div key={label} className="flex items-baseline gap-2">
                  <span className="text-[9px] text-muted-foreground w-6 shrink-0">{label}</span>
                  <span className="text-foreground font-semibold truncate" style={{ fontSize: size * 0.4 }}>
                    Heading {label}
                  </span>
                </div>
              ))}
            </div>
          </PanelSection>
        </div>
      )}

      {/* ── Spacing ── */}
      {activeTab === 'spacing' && (
        <div className="p-3 space-y-4">
          <PanelSection title="Spacing Scale" collapsible={false}>
            <PanelToggleGroup
              options={SPACING_PRESETS.map((p) => ({ value: String(p.value), label: p.label }))}
              value={String(designTokens.spacingScale)}
              onChange={(v) => updateToken({ spacingScale: Number(v) })}
            />
          </PanelSection>

          <PanelSection title="Border Radius" collapsible={false}>
            <StepperInput
              label="Radius"
              value={designTokens.borderRadius}
              onChange={(v) => updateToken({ borderRadius: v })}
              min={0}
              max={32}
              step={2}
              suffix="px"
            />
            <div className="flex gap-2 mt-2">
              {[0, 4, 8, 12, 16, 24].map((r) => (
                <button
                  key={r}
                  onClick={() => updateToken({ borderRadius: r })}
                  className={cn(
                    'w-8 h-8 border-2 transition-all',
                    designTokens.borderRadius === r
                      ? 'border-foreground bg-foreground/10'
                      : 'border-border bg-muted/30 hover:border-foreground/40'
                  )}
                  style={{ borderRadius: r }}
                />
              ))}
            </div>
          </PanelSection>

          <PanelSection title="Card Style" collapsible={false}>
            <PanelToggleGroup
              options={CARD_STYLES.map((s) => ({ value: s.value, label: s.label }))}
              value={designTokens.cardStyle || 'flat'}
              onChange={(v) => updateToken({ cardStyle: v as any })}
            />
          </PanelSection>
        </div>
      )}

      {/* ── Effects ── */}
      {activeTab === 'effects' && (
        <div className="p-3 space-y-4">
          <PanelSection title="Token Preview" collapsible={false}>
            <div
              className="p-4 rounded-lg border border-border"
              style={{
                backgroundColor: designTokens.surfaceColor,
                borderRadius: designTokens.borderRadius,
                boxShadow: designTokens.cardStyle === 'elevated' ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
              }}
            >
              <h3
                className="font-bold mb-1"
                style={{
                  fontFamily: designTokens.headingFont,
                  color: designTokens.textColor,
                  fontSize: 14,
                }}
              >
                Card Title
              </h3>
              <p
                style={{
                  fontFamily: designTokens.bodyFont,
                  color: designTokens.mutedTextColor,
                  fontSize: 11,
                }}
              >
                This is how your design tokens look in practice.
              </p>
              <div
                className="mt-2 px-3 py-1 inline-block text-[11px] font-medium text-white"
                style={{
                  backgroundColor: designTokens.primaryColor,
                  borderRadius: designTokens.borderRadius,
                }}
              >
                Primary Button
              </div>
            </div>
          </PanelSection>

          <PanelSection title="Import / Export" collapsible={false}>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md border border-border bg-muted/30 text-[10px] font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy JSON
              </button>
              <button
                onClick={handleImport}
                className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md border border-border bg-muted/30 text-[10px] font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <Upload className="w-3 h-3" />
                Import
              </button>
            </div>
          </PanelSection>
        </div>
      )}
    </div>
  );
});

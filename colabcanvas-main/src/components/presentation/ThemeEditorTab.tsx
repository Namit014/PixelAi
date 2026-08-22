import { useState, useEffect } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import { defaultThemes } from './ThemeRegistry';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Building2, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { PanelSection, CardSelector, ColorField } from './panel-primitives';

// ── Font options ─────────────────────────────────────────────────────

const fontOptions = [
{ label: 'Inter', value: "'Inter', sans-serif" },
{ label: 'Georgia', value: "'Georgia', serif" },
{ label: 'Playfair Display', value: "'Playfair Display', serif" },
{ label: 'DM Sans', value: "'DM Sans', sans-serif" },
{ label: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
{ label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
{ label: 'Lora', value: "'Lora', serif" },
{ label: 'Poppins', value: "'Poppins', sans-serif" }];


// ── Brand Item Type ─────────────────────────────────────────────────

interface BrandItem {
  id: string;
  name: string;
  industry: string | null;
  brand_voice: string | null;
  target_audience: string | null;
  brand_system_snapshot: any;
}

// ── Main Component ──────────────────────────────────────────────────

export function ThemeEditorTab() {
  const tokens = usePresentationStore((s) => s.designTokens);
  const themeId = usePresentationStore((s) => s.themeId);
  const setTheme = usePresentationStore((s) => s.setTheme);
  const setDesignTokens = usePresentationStore((s) => s.setDesignTokens);
  const activeBrandId = usePresentationStore((s) => s.activeBrandId);
  const setActiveBrand = usePresentationStore((s) => s.setActiveBrand);

  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBrands = async () => {
      setLoadingBrands(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {setLoadingBrands(false);return;}
      const { data } = await supabase.
      from('brands').
      select('id, name, industry, brand_voice, target_audience, brand_system_snapshot').
      eq('user_id', user.id).
      is('deleted_at', null).
      order('name');
      if (data) setBrands(data as BrandItem[]);
      setLoadingBrands(false);
    };
    fetchBrands();
  }, []);

  const applyBrandTheme = (brand: BrandItem) => {
    const snapshot = brand.brand_system_snapshot as any;
    if (!snapshot) {toast.error('This brand has no design system configured');return;}
    const colors = snapshot.colors || {};
    const typography = snapshot.typography || {};
    const primaryColor = colors.primary || tokens.primaryColor;
    const accentColor = colors.accent || colors.primary || tokens.accentColor;
    const bgColor = colors.background || tokens.backgroundColor;
    const textColor = colors.text || tokens.textColor;
    const surfaceColor = colors.surface || colors.secondary || tokens.surfaceColor;

    setDesignTokens({
      primaryColor, accentColor, backgroundColor: bgColor, textColor, surfaceColor,
      mutedTextColor: colors.muted || tokens.mutedTextColor,
      headingFont: typography.heading?.fontFamily || tokens.headingFont,
      bodyFont: typography.body?.fontFamily || tokens.bodyFont,
      gradientStart: colors.gradientStart || accentColor,
      gradientEnd: colors.gradientEnd || primaryColor
    });

    setActiveBrand(brand.id, {
      name: brand.name, industry: brand.industry || undefined,
      voice: brand.brand_voice || undefined, targetAudience: brand.target_audience || undefined,
      archetype: snapshot.archetype || snapshot.brandArchetype || undefined,
      brandValues: snapshot.brandValues || snapshot.values || undefined,
      designStyle: snapshot.designStyle || snapshot.style || undefined,
      logoUrl: snapshot.logoUrl || snapshot.logo || undefined,
      colors: { primary: primaryColor, accent: accentColor, background: bgColor, surface: surfaceColor, text: textColor, muted: colors.muted },
      fonts: { heading: typography.heading?.fontFamily, body: typography.body?.fontFamily }
    });
    toast.success(`Applied ${brand.name} brand theme`);
  };

  const getBrandSwatches = (brand: BrandItem) => {
    const snap = brand.brand_system_snapshot as any;
    if (!snap?.colors) return ['#6366f1', '#818cf8', '#e2e8f0'];
    const c = snap.colors;
    return [c.primary, c.accent || c.secondary, c.background || c.surface].filter(Boolean).slice(0, 4);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-0">

        {/* ── Brand Themes ── */}
        {(brands.length > 0 || loadingBrands) &&
        <PanelSection title="Brand Themes">
            {loadingBrands ?
          <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div> :

          <div className="grid grid-cols-2 gap-2">
                {brands.map((brand) =>
            <button
              key={brand.id}
              onClick={() => applyBrandTheme(brand)}
              className={cn("relative flex-col p-2.5 rounded-xl border text-left transition-all gap-0 flex items-start justify-center",

              activeBrandId === brand.id ?
              "border-foreground ring-1 ring-foreground bg-foreground/5" :
              "border-border hover:border-foreground/40 bg-muted/20"
              )}>

                    <span className="text-foreground truncate w-full text-base mx-[8px] font-normal">{brand.name}</span>
                    <div className="flex gap-1">
                      {getBrandSwatches(brand).map((color, i) =>
                <div key={i} className="w-4 h-4 rounded-full border border-border/50" style={{ backgroundColor: color }} />
                )}
                    </div>
                    {activeBrandId === brand.id &&
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-foreground flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-background" />
                      </div>
              }
                  </button>
            )}
                <button
              onClick={() => navigate('/brands')}
              className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border border-dashed border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground transition-colors min-h-[56px]">

                  <Plus className="w-5 h-5" />
                  <span className="text-base font-medium">New Brand</span>
                </button>
              </div>
          }
          </PanelSection>
        }

        {/* ── Presets ── */}
        <PanelSection title="Presets">
          <div className="grid grid-cols-3 gap-2">
            {defaultThemes.map((theme) => {
              const isActive = themeId === theme.id && !activeBrandId;
              return (
                <button
                  key={theme.id}
                  onClick={() => {setTheme(theme.id);setActiveBrand(null, null);}}
                  className={cn(
                    "relative rounded-xl border overflow-hidden transition-all aspect-[4/3]",
                    isActive ?
                    "border-foreground ring-1 ring-foreground" :
                    "border-border hover:border-foreground/40"
                  )}
                  title={theme.name}>

                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 p-2"
                    style={{ background: theme.tokens.backgroundColor }}>

                    <div
                      className="text-[30px] font-bold truncate max-w-full"
                      style={{ color: theme.tokens.primaryColor, fontFamily: theme.tokens.headingFont }}>

                      Title
                    </div>
                    <div
                      className="text-[13px] truncate max-w-full"
                      style={{ color: theme.tokens.mutedTextColor, fontFamily: theme.tokens.bodyFont }}>

                      Subheading
                    </div>
                    <div className="flex gap-0.5 mt-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.tokens.accentColor }} />
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.tokens.surfaceColor, border: '1px solid ' + theme.tokens.mutedTextColor + '30' }} />
                    </div>
                  </div>
                  {isActive &&
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-foreground flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-background" />
                    </div>
                  }
                </button>);

            })}
          </div>
        </PanelSection>

        {/* ── Colours ── */}
        <PanelSection title="Colours">
          <div className="grid grid-cols-4 gap-3">
            <ColorField label="Primary" value={tokens.accentColor} onChange={(v) => setDesignTokens({ accentColor: v })} />
            <ColorField label="Background" value={tokens.backgroundColor} onChange={(v) => setDesignTokens({ backgroundColor: v })} />
            <ColorField label="Surface" value={tokens.surfaceColor} onChange={(v) => setDesignTokens({ surfaceColor: v })} />
            <ColorField label="Text" value={tokens.textColor} onChange={(v) => setDesignTokens({ textColor: v })} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <ColorField label="Heading" value={tokens.primaryColor} onChange={(v) => setDesignTokens({ primaryColor: v })} />
            <ColorField label="Muted" value={tokens.mutedTextColor} onChange={(v) => setDesignTokens({ mutedTextColor: v })} />
            <ColorField label="Grad Start" value={tokens.gradientStart || tokens.accentColor} onChange={(v) => setDesignTokens({ gradientStart: v })} />
            <ColorField label="Grad End" value={tokens.gradientEnd || tokens.accentColor} onChange={(v) => setDesignTokens({ gradientEnd: v })} />
          </div>
        </PanelSection>

        {/* ── Typography ── */}
        <PanelSection title="Typography">
          <div className="space-y-3">
            <div>
              <span className="text-[9px] text-muted-foreground block mb-1">Heading</span>
              <select
                value={tokens.headingFont}
                onChange={(e) => setDesignTokens({ headingFont: e.target.value })}
                className="w-full h-8 text-[11px] rounded-lg bg-muted/30 border border-border px-2 text-foreground">

                {fontOptions.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground block mb-1">Body</span>
              <select
                value={tokens.bodyFont}
                onChange={(e) => setDesignTokens({ bodyFont: e.target.value })}
                className="w-full h-8 text-[11px] rounded-lg bg-muted/30 border border-border px-2 text-foreground">

                {fontOptions.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
        </PanelSection>

        {/* ── Border Radius ── */}
        <PanelSection title="Border Radius">
          <div className="grid grid-cols-4 gap-2">
            {[
            { value: 0, label: 'None' },
            { value: 6, label: 'Small' },
            { value: 12, label: 'Medium' },
            { value: 24, label: 'Large' }].
            map((opt) =>
            <CardSelector
              key={opt.value}
              active={tokens.borderRadius === opt.value}
              onClick={() => setDesignTokens({ borderRadius: opt.value })}
              label={opt.label}>

                <div
                className="w-8 h-6 border-2 border-foreground/60"
                style={{ borderRadius: `${opt.value}px` }} />

              </CardSelector>
            )}
          </div>
        </PanelSection>

        {/* ── Card Shadow ── */}
        <PanelSection title="Card Shadow">
          <div className="grid grid-cols-4 gap-2">
            {[
            { value: 'flat' as const, label: 'None', shadow: 'none' },
            { value: 'elevated' as const, label: 'Subtle', shadow: '0 2px 8px rgba(0,0,0,0.08)' },
            { value: 'glass' as const, label: 'Medium', shadow: '0 4px 16px rgba(0,0,0,0.12)' },
            { value: 'outlined' as const, label: 'Deep', shadow: '0 8px 32px rgba(0,0,0,0.18)' }].
            map((opt) =>
            <CardSelector
              key={opt.value}
              active={tokens.cardStyle === opt.value}
              onClick={() => setDesignTokens({ cardStyle: opt.value })}
              label={opt.label}>

                <div
                className="w-8 h-5 rounded bg-background border border-border"
                style={{ boxShadow: opt.shadow }} />

              </CardSelector>
            )}
          </div>
        </PanelSection>

        {/* ── Card Style ── */}
        <PanelSection title="Card Style">
          <div className="grid grid-cols-4 gap-2">
            {[
            { value: 'flat' as const, label: 'Flat' },
            { value: 'elevated' as const, label: 'Elevated' },
            { value: 'glass' as const, label: 'Glass' },
            { value: 'outlined' as const, label: 'Outlined' }].
            map((cs) =>
            <CardSelector
              key={cs.value}
              active={tokens.cardStyle === cs.value}
              onClick={() => setDesignTokens({ cardStyle: cs.value })}
              label={cs.label}>

                <div className={cn(
                "w-9 h-6 rounded flex items-center justify-center",
                cs.value === 'flat' && "bg-muted",
                cs.value === 'elevated' && "bg-background shadow-md border border-border/50",
                cs.value === 'glass' && "bg-background/40 backdrop-blur border border-white/20",
                cs.value === 'outlined' && "bg-transparent border-2 border-foreground/30"
              )}>
                  <div className="w-4 h-0.5 bg-foreground/40 rounded" />
                </div>
              </CardSelector>
            )}
          </div>
        </PanelSection>

        {/* ── Spacing ── */}
        <PanelSection title="Spacing">
          <div className="grid grid-cols-4 gap-2">
            {[
            { value: 0.8, label: 'Tight' },
            { value: 1.0, label: 'Normal' },
            { value: 1.1, label: 'Relaxed' },
            { value: 1.3, label: 'Loose' }].
            map((opt) =>
            <CardSelector
              key={opt.value}
              active={Math.abs(tokens.spacingScale - opt.value) < 0.05}
              onClick={() => setDesignTokens({ spacingScale: opt.value })}
              label={opt.label}>

                <div className="flex flex-col items-center gap-[2px]">
                  <div className="w-6 h-0.5 bg-foreground/40 rounded" />
                  <div style={{ height: `${opt.value * 4}px` }} />
                  <div className="w-6 h-0.5 bg-foreground/40 rounded" />
                  <div style={{ height: `${opt.value * 4}px` }} />
                  <div className="w-6 h-0.5 bg-foreground/40 rounded" />
                </div>
              </CardSelector>
            )}
          </div>
        </PanelSection>

      </div>
    </ScrollArea>);

}
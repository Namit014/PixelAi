/**
 * WebsiteCodePanel — "Studio" editor for the live generated landing page.
 *
 * Three top-level surfaces:
 *   • Layers     — section + nested element tree with selection
 *   • Inspector  — edit selected element fields (text, link, CTA, style) without raw JSON
 *   • Code       — split tabs: Site JSON · Theme JSON · Custom CSS · Custom JS
 *
 * Saves write back into `rumi_autonomous_jobs.checkpoint.websiteResult.siteData`
 * and broadcast to the preview iframe via the `RUMI_AGENT` postMessage protocol.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2, Layers, Loader2, Save, RotateCcw, Check, AlertCircle,
  Settings2, Palette, FileCode2, Braces, ChevronRight, ChevronDown,
  Type as TypeIcon, MousePointerClick, Link2, Image as ImageIcon,
  Sparkles, Copy, Wand2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  jobId: string;
  /** iframe ref — code edits broadcast to it as `website_set_data`. */
  iframeRef?: React.RefObject<HTMLIFrameElement>;
}

type Section = {
  type: string;
  heading?: string;
  subheading?: string;
  body?: string;
  ctaText?: string;
  secondaryCtaText?: string;
  ctaHref?: string;
  layoutVariant?: string;
  imageUrl?: string | null;
  bullets?: string[];
  features?: Array<{ title: string; description: string; icon?: string }>;
  testimonials?: Array<{ quote: string; name: string; role?: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  navLinks?: Array<{ label: string; href?: string }>;
  [k: string]: unknown;
};

type SiteData = {
  siteTitle?: string;
  metaDescription?: string;
  theme?: Record<string, any>;
  brand?: Record<string, any>;
  customCss?: string;
  customJs?: string;
  sections?: Section[];
};

type Selection =
  | { kind: 'section'; sectionIndex: number }
  | { kind: 'field'; sectionIndex: number; fieldPath: string }
  | null;

const SECTION_ICONS: Record<string, typeof TypeIcon> = {
  hero: Sparkles,
  cta: MousePointerClick,
  features: Layers,
  navigation: Link2,
  footer: Link2,
  gallery: ImageIcon,
};

function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}
function setByPath(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const next = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  let cur: any = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = cur[k] == null ? {} : Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] };
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
}

export function WebsiteCodePanel({ jobId, iframeRef }: Props) {
  const [activeSurface, setActiveSurface] = useState('layers');
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // Code tab drafts (independent textareas, only flushed to siteData on Save).
  const [siteDraft, setSiteDraft] = useState('');
  const [themeDraft, setThemeDraft] = useState('');
  const [cssDraft, setCssDraft] = useState('');
  const [jsDraft, setJsDraft] = useState('');
  const lastLoadedRef = useRef<string>('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('rumi_autonomous_jobs')
        .select('checkpoint')
        .eq('id', jobId)
        .maybeSingle();
      if (qErr) throw qErr;
      const site = ((data?.checkpoint as any)?.websiteResult?.siteData ?? null) as SiteData | null;
      applyLoadedSite(site);
    } catch (e: any) {
      setError(e?.message || 'Failed to load site data');
    } finally {
      setLoading(false);
    }
  };

  const applyLoadedSite = (site: SiteData | null) => {
    setSiteData(site);
    const json = site ? JSON.stringify(site, null, 2) : '';
    setSiteDraft(json);
    setThemeDraft(JSON.stringify(site?.theme ?? {}, null, 2));
    setCssDraft(String(site?.customCss ?? ''));
    setJsDraft(String(site?.customJs ?? ''));
    lastLoadedRef.current = json;
  };

  useEffect(() => { load(); }, [jobId]);

  // Realtime: keep in sync as the agent streams more sections in.
  useEffect(() => {
    const channel = supabase
      .channel(`code-panel-${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rumi_autonomous_jobs', filter: `id=eq.${jobId}` },
        (payload) => {
          const next = ((payload.new as any)?.checkpoint?.websiteResult?.siteData ?? null) as SiteData | null;
          if (!next) return;
          // Only auto-update if user hasn't started editing (siteDraft still matches lastLoaded).
          if (siteDraft === lastLoadedRef.current) applyLoadedSite(next);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId, siteDraft]);

  const isDirty = siteDraft !== lastLoadedRef.current;

  const parsedSite = useMemo<{ ok: boolean; value?: SiteData; error?: string }>(() => {
    if (!siteDraft.trim()) return { ok: false, error: 'Empty' };
    try {
      const v = JSON.parse(siteDraft);
      if (typeof v !== 'object' || v === null) return { ok: false, error: 'Must be an object' };
      return { ok: true, value: v as SiteData };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Invalid JSON' };
    }
  }, [siteDraft]);

  const parsedTheme = useMemo<{ ok: boolean; value?: any; error?: string }>(() => {
    if (!themeDraft.trim()) return { ok: true, value: {} };
    try { return { ok: true, value: JSON.parse(themeDraft) }; }
    catch (e: any) { return { ok: false, error: e?.message }; }
  }, [themeDraft]);

  const broadcastToPreview = (next: SiteData) => {
    const iframe = iframeRef?.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { source: 'RUMI_AGENT', command: 'website_set_data', payload: { websiteData: next }, actionId: `code-edit-${Date.now()}` },
      '*',
    );
  };

  /** Persist current siteDraft (+ theme/css/js overrides) back to the job. */
  const handleSave = async () => {
    if (!parsedSite.ok || !parsedSite.value) return;
    if (!parsedTheme.ok) {
      toast.error('Theme JSON is invalid');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const merged: SiteData = {
        ...parsedSite.value,
        theme: parsedTheme.value || parsedSite.value.theme,
        customCss: cssDraft || undefined,
        customJs: jsDraft || undefined,
      };
      const { data: cur, error: rErr } = await supabase
        .from('rumi_autonomous_jobs')
        .select('checkpoint')
        .eq('id', jobId)
        .maybeSingle();
      if (rErr) throw rErr;
      const checkpoint = { ...((cur?.checkpoint as any) || {}) };
      checkpoint.websiteResult = { ...(checkpoint.websiteResult || {}), siteData: merged };
      const { error: uErr } = await supabase
        .from('rumi_autonomous_jobs')
        .update({ checkpoint })
        .eq('id', jobId);
      if (uErr) throw uErr;
      applyLoadedSite(merged);
      setSavedAt(Date.now());
      broadcastToPreview(merged);
      toast.success('Saved');
    } catch (e: any) {
      setError(e?.message || 'Save failed');
      toast.error(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    if (siteData) applyLoadedSite(siteData);
    setError(null);
  };

  /** Inspector: update a field on a section + immediately preview + mark dirty. */
  const updateSectionField = (sectionIndex: number, fieldPath: string, value: any) => {
    if (!siteData) return;
    const nextSections = [...(siteData.sections || [])];
    nextSections[sectionIndex] = setByPath(nextSections[sectionIndex] || {}, fieldPath, value);
    const next: SiteData = { ...siteData, sections: nextSections };
    setSiteData(next);
    setSiteDraft(JSON.stringify(next, null, 2));
    broadcastToPreview(next);
  };

  /** Ask RUMI to rewrite a field via the edit-landing-section function. */
  const askRumi = async (sectionIndex: number, fieldPath: string, instruction: string) => {
    try {
      toast.info('RUMI is editing…');
      const { data, error: fnErr } = await supabase.functions.invoke('edit-landing-section', {
        body: { jobId, sectionIndex, fieldPath, instruction },
      });
      if (fnErr) throw fnErr;
      if (data?.siteData) {
        applyLoadedSite(data.siteData);
        broadcastToPreview(data.siteData);
        toast.success('Updated');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Edit failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-500 gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading studio…
      </div>
    );
  }

  const sections = siteData?.sections || [];
  const selSection = selection && selection.kind !== null ? sections[selection.sectionIndex] : null;

  return (
    <Tabs value={activeSurface} onValueChange={setActiveSurface} className="flex flex-col h-full">
      {/* Top bar: tabs + save state */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3 shrink-0">
        <Select value={activeSurface} onValueChange={setActiveSurface}>
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="layers"><span className="inline-flex items-center gap-2"><Layers className="h-3.5 w-3.5" /> Layers</span></SelectItem>
            <SelectItem value="inspector"><span className="inline-flex items-center gap-2"><Settings2 className="h-3.5 w-3.5" /> Inspector</span></SelectItem>
            <SelectItem value="code"><span className="inline-flex items-center gap-2"><Code2 className="h-3.5 w-3.5" /> Code</span></SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          {isDirty
            ? <span className="text-[10px] text-amber-600">Unsaved</span>
            : savedAt && <span className="text-[10px] text-emerald-600">Saved</span>}
          <Button size="sm" variant="ghost" onClick={handleRevert} disabled={!isDirty || saving} className="h-7 text-[10px] gap-1">
            <RotateCcw className="h-3 w-3" /> Revert
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isDirty || !parsedSite.ok || saving} className="h-7 text-[10px] gap-1">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </Button>
        </div>
      </div>

      {/* LAYERS — section/element tree */}
      <TabsContent value="layers" className="flex-1 overflow-y-auto px-3 pb-3 mt-2 space-y-1">
        {sections.length === 0 && (
          <p className="text-xs text-zinc-500 italic px-1 py-4">No sections yet — the agent is still building.</p>
        )}
        {sections.map((s, i) => {
          const Icon = SECTION_ICONS[s.type] || Layers;
          const isOpen = expanded[i] ?? false;
          const isSelected = selection?.sectionIndex === i && selection?.kind === 'section';
          return (
            <div key={i} className={cn(
              'rounded-md border transition-colors',
              isSelected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 bg-white hover:border-zinc-300',
            )}>
              <button
                type="button"
                onClick={() => { setSelection({ kind: 'section', sectionIndex: i }); setExpanded(p => ({ ...p, [i]: !p[i] })); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
              >
                {isOpen ? <ChevronDown className="h-3 w-3 text-zinc-400" /> : <ChevronRight className="h-3 w-3 text-zinc-400" />}
                <Icon className="h-3.5 w-3.5 text-zinc-700" />
                <span className="text-[11px] font-medium text-zinc-900 capitalize flex-1 truncate">{s.type?.replace(/_/g, ' ')}</span>
                {s.layoutVariant && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono">{String(s.layoutVariant)}</span>
                )}
              </button>
              {isOpen && (
                <div className="border-t border-zinc-100 px-2 py-1 space-y-0.5">
                  {(['heading', 'subheading', 'body', 'ctaText', 'secondaryCtaText', 'imageUrl'] as const).map((key) => {
                    const val = (s as any)[key];
                    if (val == null || val === '') return null;
                    const isSel = selection?.kind === 'field' && selection.sectionIndex === i && selection.fieldPath === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelection({ kind: 'field', sectionIndex: i, fieldPath: key })}
                        className={cn(
                          'w-full flex items-center gap-2 px-1.5 py-1 rounded text-left',
                          isSel ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-50',
                        )}
                      >
                        <TypeIcon className={cn('h-3 w-3', isSel ? 'text-white' : 'text-zinc-400')} />
                        <span className={cn('text-[10px] font-mono', isSel ? 'text-white' : 'text-zinc-500')}>{key}</span>
                        <span className={cn('text-[10px] truncate flex-1', isSel ? 'text-white/80' : 'text-zinc-700')}>
                          {String(val).slice(0, 40)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </TabsContent>

      {/* INSPECTOR — edit selected section/field without raw JSON */}
      <TabsContent value="inspector" className="flex-1 overflow-y-auto px-3 pb-3 mt-2">
        {!selSection && (
          <p className="text-xs text-zinc-500 italic px-1 py-4">
            Select a section or element from Layers to inspect and edit it here.
          </p>
        )}
        {selSection && selection && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Section</p>
                <p className="text-sm font-medium capitalize">{selSection.type?.replace(/_/g, ' ')}</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                onClick={() => askRumi(selection.sectionIndex, 'heading', 'Rewrite this section to be sharper, more specific, and on-brand.')}
              >
                <Wand2 className="h-3 w-3" /> Ask RUMI
              </Button>
            </div>

            {(['heading', 'subheading', 'ctaText', 'secondaryCtaText', 'ctaHref', 'imageUrl'] as const).map((key) => (
              selSection[key] !== undefined && (
                <div key={key} className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-zinc-500">{key}</Label>
                  <Input
                    value={String((selSection as any)[key] ?? '')}
                    onChange={(e) => updateSectionField(selection.sectionIndex, key, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )
            ))}

            {selSection.body !== undefined && (
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-zinc-500">Body</Label>
                <Textarea
                  value={String(selSection.body ?? '')}
                  onChange={(e) => updateSectionField(selection.sectionIndex, 'body', e.target.value)}
                  className="text-xs min-h-[100px] font-mono"
                />
              </div>
            )}

            {Array.isArray(selSection.bullets) && selSection.bullets.length > 0 && (
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-zinc-500">Bullets</Label>
                {selSection.bullets.map((b, idx) => (
                  <Input
                    key={idx}
                    value={b}
                    onChange={(e) => {
                      const next = [...(selSection.bullets || [])];
                      next[idx] = e.target.value;
                      updateSectionField(selection.sectionIndex, 'bullets', next);
                    }}
                    className="h-8 text-xs"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </TabsContent>

      {/* CODE — Site / Theme / CSS / JS */}
      <TabsContent value="code" className="flex-1 flex flex-col mt-2 px-3 pb-3 min-h-0">
        <Tabs defaultValue="site" className="flex flex-col flex-1 min-h-0">
          <TabsList className="grid grid-cols-4 w-full max-w-[460px] shrink-0">
            <TabsTrigger value="site" className="text-[10px] gap-1"><Braces className="h-3 w-3" /> Site</TabsTrigger>
            <TabsTrigger value="theme" className="text-[10px] gap-1"><Palette className="h-3 w-3" /> Theme</TabsTrigger>
            <TabsTrigger value="css" className="text-[10px] gap-1"><FileCode2 className="h-3 w-3" /> CSS</TabsTrigger>
            <TabsTrigger value="js" className="text-[10px] gap-1"><Code2 className="h-3 w-3" /> JS</TabsTrigger>
          </TabsList>

          <div className="flex items-center justify-between gap-2 mt-2 mb-1">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              {parsedSite.ok ? <><Check className="h-3 w-3 text-emerald-600" /> Valid Site JSON</>
                : <><AlertCircle className="h-3 w-3 text-amber-600" /> {parsedSite.error}</>}
              {!parsedTheme.ok && <span className="text-amber-600 ml-2">· Theme: {parsedTheme.error}</span>}
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1"
              onClick={() => { navigator.clipboard.writeText(siteDraft); toast.success('Copied'); }}>
              <Copy className="h-3 w-3" /> Copy
            </Button>
          </div>

          <TabsContent value="site" className="flex-1 min-h-0 mt-0">
            <textarea
              value={siteDraft}
              onChange={(e) => setSiteDraft(e.target.value)}
              spellCheck={false}
              className={cn(
                'w-full h-full font-mono text-[11px] leading-relaxed p-3 rounded-md border bg-zinc-950 text-zinc-100 resize-none',
                'focus:outline-none focus:ring-2 focus:ring-primary/30',
                !parsedSite.ok && 'border-amber-500/40',
              )}
            />
          </TabsContent>
          <TabsContent value="theme" className="flex-1 min-h-0 mt-0">
            <textarea
              value={themeDraft}
              onChange={(e) => setThemeDraft(e.target.value)}
              spellCheck={false}
              className={cn(
                'w-full h-full font-mono text-[11px] leading-relaxed p-3 rounded-md border bg-zinc-950 text-zinc-100 resize-none',
                'focus:outline-none focus:ring-2 focus:ring-primary/30',
                !parsedTheme.ok && 'border-amber-500/40',
              )}
            />
          </TabsContent>
          <TabsContent value="css" className="flex-1 min-h-0 mt-0">
            <textarea
              value={cssDraft}
              onChange={(e) => setCssDraft(e.target.value)}
              spellCheck={false}
              placeholder="/* Custom CSS injected into the published site */"
              className="w-full h-full font-mono text-[11px] leading-relaxed p-3 rounded-md border bg-zinc-950 text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </TabsContent>
          <TabsContent value="js" className="flex-1 min-h-0 mt-0">
            <textarea
              value={jsDraft}
              onChange={(e) => setJsDraft(e.target.value)}
              spellCheck={false}
              placeholder="// Custom JavaScript injected into the published site"
              className="w-full h-full font-mono text-[11px] leading-relaxed p-3 rounded-md border bg-zinc-950 text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </TabsContent>
        </Tabs>
        {error && <p className="text-[10px] text-destructive mt-1">{error}</p>}
      </TabsContent>
    </Tabs>
  );
}

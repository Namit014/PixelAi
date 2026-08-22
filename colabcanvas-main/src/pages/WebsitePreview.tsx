import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Nav, Footer } from '@/components/website/NavFooter';
import { assignVariantsWithVariety, dispatchSection } from '@/components/website/dispatchSection';
import { SkeletonShell } from '@/components/website/SkeletonShell';
import { generateDesignDNA, dnaToCssVars } from '@/components/website/designSystem';
import { artDirectionToCssVars, deriveArtDirection, type ArtDirection } from '@/components/website/artDirection';
import type { SectionData, Theme, Brand } from '@/components/website/types';

type WebsiteData = {
  siteTitle?: string;
  metaDescription?: string;
  theme?: Partial<Theme> & { fontFamily?: string; headingFont?: string; bodyFont?: string };
  brand?: Brand;
  sections?: SectionData[];
  artDirection?: ArtDirection;
};

const defaultTheme: Theme = {
  primary: '#0f172a',
  secondary: '#475569',
  accent: '#d97706',
  background: '#fafaf9',
  foreground: '#0a0a0a',
  surface: '#f4f4f5',
};

function loadFont(family: string) {
  if (!family) return;
  const id = `wp-font-${family.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

export default function WebsitePreview() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');
  const projectId = searchParams.get('projectId');
  const isAgentMode = searchParams.get('agentMode') === 'true';
  const editable = searchParams.get('editable') === 'true';

  // Brand overrides via URL
  const brandPrimary = searchParams.get('brandPrimary');
  const brandAccent = searchParams.get('brandAccent');
  const brandSecondary = searchParams.get('brandSecondary');
  const brandBackground = searchParams.get('brandBackground');
  const brandForeground = searchParams.get('brandForeground');
  const brandHeadingFont = searchParams.get('brandHeadingFont');
  const brandBodyFont = searchParams.get('brandBodyFont');
  const brandLogoUrl = searchParams.get('brandLogoUrl');
  const brandName = searchParams.get('brandName');

  const [websiteData, setWebsiteData] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(true);

  // Notify parent on ready
  useEffect(() => {
    if (!isAgentMode) return;
    window.parent.postMessage({ source: 'RUMI_AGENT', type: 'READY' }, '*');
  }, [isAgentMode]);

  // Listen for streamed sections and edit acks
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (!msg || msg.source !== 'RUMI_AGENT') return;

      if (msg.command === 'website_set_data' && msg.payload?.websiteData) {
        setWebsiteData(msg.payload.websiteData as WebsiteData);
      }

      if (msg.command === 'website_update_section') {
        const payload = msg.payload || {};
        const sectionIndex = payload.sectionIndex as number;
        const section = payload.section as SectionData | undefined;
        const nextData = payload.websiteData as WebsiteData | undefined;
        setWebsiteData(prev => {
          if (nextData) return nextData;
          const base = prev || { sections: [] };
          const sections = [...(base.sections || [])];
          if (section && Number.isInteger(sectionIndex)) sections[sectionIndex] = section;
          return { ...base, sections };
        });
      }

      if (msg?.actionId) {
        window.parent.postMessage({ source: 'RUMI_AGENT', ack: true, actionId: msg.actionId, success: true }, '*');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Load initial data + subscribe to job changes
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (jobId) {
          const { data } = await supabase.from('rumi_autonomous_jobs').select('checkpoint, project_id').eq('id', jobId).maybeSingle();
          const website = (data?.checkpoint as any)?.websiteResult || null;
          if (mounted && website) setWebsiteData((website.siteData || website) as WebsiteData);
        }
        if (projectId && !websiteData) {
          const { data } = await supabase.from('projects').select('canvas_data').eq('id', projectId).maybeSingle();
          const website = (data?.canvas_data as any)?.rumi_campaign?.website || (data?.canvas_data as any)?.website || null;
          if (mounted && website) setWebsiteData((website.siteData || website) as WebsiteData);
        }
      } catch (err) {
        console.warn('[WebsitePreview] Load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();

    if (!jobId) return () => { mounted = false; };
    const channel = supabase
      .channel(`website-preview-${jobId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rumi_autonomous_jobs', filter: `id=eq.${jobId}` },
        (payload) => {
          const website = (payload.new as any)?.checkpoint?.websiteResult;
          if (website && mounted) setWebsiteData((website.siteData || website) as WebsiteData);
        },
      ).subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, projectId]);

  // Theme — defaults → siteData → URL overrides
  const theme: Theme = useMemo(() => {
    const base: Theme = { ...defaultTheme, ...(websiteData?.theme as any || {}) };
    if (brandPrimary) base.primary = `#${brandPrimary}`;
    if (brandAccent) base.accent = `#${brandAccent}`;
    if (brandSecondary) base.secondary = `#${brandSecondary}`;
    if (brandBackground) base.background = `#${brandBackground}`;
    if (brandForeground) base.foreground = `#${brandForeground}`;
    return base;
  }, [websiteData, brandPrimary, brandAccent, brandSecondary, brandBackground, brandForeground]);

  const brand: Brand = useMemo(() => ({
    name: brandName || websiteData?.brand?.name || websiteData?.siteTitle || '',
    logoUrl: brandLogoUrl || websiteData?.brand?.logoUrl || '',
    headingFont: brandHeadingFont || websiteData?.brand?.headingFont || (websiteData?.theme as any)?.headingFont || 'Inter',
    bodyFont: brandBodyFont || websiteData?.brand?.bodyFont || (websiteData?.theme as any)?.bodyFont || 'Inter',
  }), [brandName, brandLogoUrl, brandHeadingFont, brandBodyFont, websiteData]);

  // Load fonts
  useEffect(() => {
    if (brand.headingFont) loadFont(brand.headingFont);
    if (brand.bodyFont && brand.bodyFont !== brand.headingFont) loadFont(brand.bodyFont);
  }, [brand.headingFont, brand.bodyFont]);

  const rawSections = websiteData?.sections || [];

  // Per-site Design DNA: deterministic from job/project id or title.
  const dna = useMemo(() => {
    const seed = jobId || projectId || websiteData?.siteTitle || brand.name || 'colab';
    return generateDesignDNA(seed, theme);
  }, [jobId, projectId, websiteData?.siteTitle, brand.name, theme]);

  const art = useMemo(() => websiteData?.artDirection || deriveArtDirection({
    seedId: jobId || projectId || websiteData?.siteTitle || brand.name || 'colab',
    voice: (websiteData as any)?.brandVoice,
    tone: searchParams.get('tone') || undefined,
    industry: (websiteData as any)?.industry,
    audience: rawSections.find(s => s.type === 'hero')?.subheading || websiteData?.metaDescription,
    objective: websiteData?.metaDescription,
    sectionMix: rawSections.map(s => s.type),
  }), [websiteData, jobId, projectId, brand.name, rawSections, searchParams]);

  const sections = useMemo(() => assignVariantsWithVariety(rawSections, art), [rawSections, art]);

  const navCta = useMemo(() => {
    const heroCta = sections.find(s => s.type === 'hero')?.ctaText;
    return heroCta || sections.find(s => s.ctaText)?.ctaText;
  }, [sections]);

  if (loading && sections.length === 0) return <SkeletonShell />;
  if (sections.length === 0) return <SkeletonShell />;

  const cssVars: React.CSSProperties = {
    background: theme.background,
    color: theme.foreground,
    // @ts-expect-error - CSS custom properties
    '--brand-primary': theme.primary,
    '--brand-accent': theme.accent,
    '--brand-surface': theme.surface,
    '--font-heading': `'${brand.headingFont}', system-ui, sans-serif`,
    '--font-body': `'${brand.bodyFont}', system-ui, sans-serif`,
    fontFamily: `var(--font-body)`,
    ...dnaToCssVars(dna),
    ...artDirectionToCssVars(art),
  };

  return (
    <div style={cssVars} className="min-h-screen w-full antialiased" data-dna-scene={dna.heroScene} data-dna-type={dna.typeScale} data-art-signature={art.vector.signature}>
      <Nav brand={brand} theme={theme} ctaText={navCta} />

      <main>
        <AnimatePresence>
          {sections.map((section, index) => (
            <motion.div
              key={section.id || `${section.type}-${index}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              layout
            >
              {dispatchSection({ section, index, theme, brand, editable, dna, art })}
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      <Footer brand={brand} theme={theme} />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Nav, Footer } from '@/components/website/NavFooter';
import { assignVariantsWithVariety, dispatchSection } from '@/components/website/dispatchSection';
import { SkeletonShell } from '@/components/website/SkeletonShell';
import { generateDesignDNA, dnaToCssVars } from '@/components/website/designSystem';
import { artDirectionToCssVars, deriveArtDirection } from '@/components/website/artDirection';
import type { SectionData, Theme, Brand } from '@/components/website/types';

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

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
  const id = `pl-font-${family.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

interface PublishedPage {
  id: string;
  slug: string;
  title?: string | null;
  meta_description?: string | null;
  og_image_url?: string | null;
  favicon_url?: string | null;
  site_data: any;
  custom_code?: { head?: string; bodyEnd?: string; css?: string };
  settings?: Record<string, unknown>;
  integrations?: Record<string, unknown>;
}

export default function PublishedLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState<PublishedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    (async () => {
      try {
        const params = new URLSearchParams(searchParams);
        params.set('slug', slug);
        const resp = await fetch(`${FUNCTIONS_BASE}/get-published-page?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (!resp.ok) {
          if (mounted) setNotFound(true);
          return;
        }
        const data = await resp.json();
        if (!mounted) return;
        setPage(data);
        if (data.title) document.title = data.title;
        if (data.meta_description) {
          const meta = document.querySelector('meta[name="description"]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'description' }));
          meta.setAttribute('content', data.meta_description);
        }
        if (data.favicon_url) {
          const link = (document.querySelector("link[rel='icon']") as HTMLLinkElement) || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }));
          link.href = data.favicon_url;
        }
      } catch {
        if (mounted) setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug, searchParams]);

  const siteData = page?.site_data || {};
  const rawSections: SectionData[] = siteData.sections || [];

  const theme: Theme = useMemo(() => ({ ...defaultTheme, ...(siteData.theme || {}) }), [siteData.theme]);
  const brand: Brand = useMemo(() => ({
    name: siteData.brand?.name || siteData.siteTitle,
    logoUrl: siteData.brand?.logoUrl,
    headingFont: siteData.brand?.headingFont || siteData.theme?.headingFont || 'Inter',
    bodyFont: siteData.brand?.bodyFont || siteData.theme?.bodyFont || 'Inter',
  }), [siteData]);

  useEffect(() => {
    if (brand.headingFont) loadFont(brand.headingFont);
    if (brand.bodyFont && brand.bodyFont !== brand.headingFont) loadFont(brand.bodyFont);
  }, [brand.headingFont, brand.bodyFont]);

  const dna = useMemo(() => generateDesignDNA(slug || siteData.siteTitle || brand.name || 'colab', theme), [slug, siteData.siteTitle, brand.name, theme]);
  const art = useMemo(() => siteData.artDirection || deriveArtDirection({
    seedId: slug || siteData.siteTitle || brand.name || 'colab',
    voice: siteData.brandVoice,
    industry: siteData.industry,
    audience: rawSections.find(s => s.type === 'hero')?.subheading || siteData.metaDescription,
    objective: siteData.metaDescription,
    sectionMix: rawSections.map(s => s.type),
  }), [slug, siteData, brand.name, rawSections]);
  const sections = useMemo(() => assignVariantsWithVariety(rawSections, art), [rawSections, art]);

  // Inject custom code
  useEffect(() => {
    const cc = page?.custom_code;
    if (!cc) return;
    const nodes: HTMLElement[] = [];
    if (cc.css) {
      const style = document.createElement('style');
      style.textContent = cc.css;
      document.head.appendChild(style);
      nodes.push(style);
    }
    if (cc.head) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = cc.head;
      Array.from(wrapper.children).forEach((el) => { document.head.appendChild(el); nodes.push(el as HTMLElement); });
    }
    if (cc.bodyEnd) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = cc.bodyEnd;
      Array.from(wrapper.children).forEach((el) => { document.body.appendChild(el); nodes.push(el as HTMLElement); });
    }
    return () => { nodes.forEach((n) => n.remove()); };
  }, [page?.custom_code]);

  if (loading) return <SkeletonShell />;
  if (notFound || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-zinc-400 text-sm">This page is not available.</p>
        </div>
      </div>
    );
  }

  const navCta = sections.find(s => s.type === 'hero')?.ctaText || sections.find(s => s.ctaText)?.ctaText;
  const cssVars: React.CSSProperties = {
    background: theme.background,
    color: theme.foreground,
    // @ts-expect-error CSS vars
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
    <div style={cssVars} className="min-h-screen w-full antialiased" data-page-id={page.id} data-art-signature={art.vector.signature}>
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
              {dispatchSection({ section, index, theme, brand, editable: false, dna, art })}
            </motion.div>
          ))}
        </AnimatePresence>
      </main>
      <Footer brand={brand} theme={theme} />
    </div>
  );
}

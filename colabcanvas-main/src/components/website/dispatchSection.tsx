import { HeroAsymmetric, HeroSplit, HeroFullbleed } from './Heroes';
import { FeatureBento, StickyScrollFeatures, MagazineGrid } from './Features';
import { TestimonialMarquee, StatBand, FaqAccordion, PricingTiers, CtaBanner } from './SocialAndCta';
import { HeroKineticType } from './HeroKineticType';
import { HeroSplitScroll } from './HeroSplitScroll';
import { HeroOversizedMark } from './HeroOversizedMark';
import { HeroVideoLoop } from './HeroVideoLoop';
import { HeroDraggableGallery } from './HeroDraggableGallery';
import { MarqueeWall } from './MarqueeWall';
import { FeatureSplitImage } from './FeatureSplitImage';
import { BentoWithMedia } from './BentoWithMedia';
import { HorizontalScroll } from './HorizontalScroll';
import { LogoMarquee } from './LogoMarquee';
import { WorkGrid } from './WorkGrid';
import { ComparisonSlider } from './ComparisonSlider';
import { FooterMassive } from './FooterMassive';
import { CtaOversizedQuestion } from './CtaOversizedQuestion';
import type { SectionProps, SectionData } from './types';
import type { ArtDirection, Signature } from './artDirection';

const HERO_VARIANTS = [
  'asymmetric', 'split', 'fullbleed',
  'kinetic_type', 'split_scroll', 'oversized_mark', 'video_loop', 'drag_gallery',
] as const;

const FEATURE_VARIANTS = [
  'bento', 'sticky_scroll', 'magazine',
  'split_image', 'bento_media', 'horiz_scroll', 'marquee_wall',
] as const;

/** Pick a hero variant from the art direction signature + composition. */
export function pickHeroVariant(art: ArtDirection | undefined, fallback?: string): string {
  if (!art) return fallback || 'asymmetric';
  const sig = art.vector.signature;
  if (sig === 'kineticType') return 'kinetic_type';
  if (sig === 'massiveMark') return 'oversized_mark';
  if (sig === 'dragGallery') return 'drag_gallery';
  if (sig === 'videoLoop') return 'video_loop';
  if (sig === 'horizScroll') return 'split_scroll';
  // composition fallback
  const comp = art.vector.composition;
  if (comp === 'split') return 'split';
  if (comp === 'oversized') return 'oversized_mark';
  if (comp === 'centered') return 'fullbleed';
  if (comp === 'editorial') return 'asymmetric';
  return 'asymmetric';
}

/** Pick a feature variant from the art direction. */
export function pickFeatureVariant(art: ArtDirection | undefined, position: number): string {
  if (!art) return 'bento';
  const seedMix = ((art.seed >> 5) ^ position * 31) >>> 0;
  const candidates: string[] =
    art.vector.signature === 'horizScroll' ? ['horiz_scroll', 'split_image', 'bento_media'] :
    art.vector.signature === 'marquee'     ? ['marquee_wall', 'split_image', 'bento_media'] :
    art.vector.composition === 'editorial' ? ['split_image', 'magazine', 'bento_media'] :
    art.vector.composition === 'split'     ? ['bento_media', 'split_image', 'sticky_scroll'] :
    art.vector.type === 'brutalist'        ? ['bento_media', 'horiz_scroll', 'magazine'] :
    art.vector.type === 'minimal'          ? ['split_image', 'magazine', 'bento'] :
                                              ['bento_media', 'sticky_scroll', 'split_image'];
  return candidates[seedMix % candidates.length];
}

/** Render a single section by variant. */
function renderByVariant(variant: string, props: SectionProps) {
  switch (variant) {
    // heroes
    case 'split': return <HeroSplit {...props} />;
    case 'fullbleed': return <HeroFullbleed {...props} />;
    case 'kinetic_type': return <HeroKineticType {...props} />;
    case 'split_scroll': return <HeroSplitScroll {...props} />;
    case 'oversized_mark': return <HeroOversizedMark {...props} />;
    case 'video_loop': return <HeroVideoLoop {...props} />;
    case 'drag_gallery': return <HeroDraggableGallery {...props} />;
    case 'asymmetric': return <HeroAsymmetric {...props} />;
    // features
    case 'bento': return <FeatureBento {...props} />;
    case 'sticky_scroll': return <StickyScrollFeatures {...props} />;
    case 'magazine': return <MagazineGrid {...props} />;
    case 'split_image': return <FeatureSplitImage {...props} />;
    case 'bento_media': return <BentoWithMedia {...props} />;
    case 'horiz_scroll': return <HorizontalScroll {...props} />;
    case 'marquee_wall': return <MarqueeWall {...props} />;
    // showcase
    case 'logo_marquee': return <LogoMarquee {...props} />;
    case 'work_grid': return <WorkGrid {...props} />;
    case 'comparison': return <ComparisonSlider {...props} />;
    // closers
    case 'footer_massive': return <FooterMassive {...props} />;
    case 'cta_oversized': return <CtaOversizedQuestion {...props} />;
    case 'banner': return <CtaBanner {...props} />;
    case 'marquee': return <TestimonialMarquee {...props} />;
    case 'band': return <StatBand {...props} />;
    case 'accordion': return <FaqAccordion {...props} />;
    case 'tiers': return <PricingTiers {...props} />;
  }
  return null;
}

/**
 * Pick the best renderer for each section based on type + (optional) art direction.
 * Anti-clone: tries to avoid repeating the same variant in adjacent sections.
 */
export function dispatchSection(props: SectionProps) {
  const { section } = props;
  const variant = section.layoutVariant;
  const type = section.type;
  const art = props.art;

  // Hero
  if (type === 'hero' || type === 'header') {
    const v = variant || pickHeroVariant(art);
    return renderByVariant(v, props) || <HeroAsymmetric {...props} />;
  }

  // Features / solution / product
  if (type === 'features' || type === 'solution' || type === 'product') {
    const v = variant || pickFeatureVariant(art, props.index);
    return renderByVariant(v, props) || <FeatureBento {...props} />;
  }

  // Problem
  if (type === 'problem' || type === 'pain') {
    const v = variant || (art?.vector.composition === 'editorial' ? 'split_image' : 'magazine');
    return renderByVariant(v, props) || <MagazineGrid {...props} />;
  }

  // Showcase
  if (type === 'showcase' || type === 'work' || type === 'gallery') {
    return <WorkGrid {...props} />;
  }
  if (type === 'comparison' || type === 'before_after') return <ComparisonSlider {...props} />;
  if (type === 'logos' || type === 'clients' || type === 'press') return <LogoMarquee {...props} />;
  if (type === 'marquee' || type === 'values') return <MarqueeWall {...props} />;

  // Social proof
  if (type === 'social_proof' || type === 'testimonials') return <TestimonialMarquee {...props} />;

  // Stats
  if (type === 'stats' || type === 'metrics') return <StatBand {...props} />;

  // FAQ
  if (type === 'faq' || type === 'faqs') return <FaqAccordion {...props} />;

  // Pricing
  if (type === 'pricing' || type === 'plans') return <PricingTiers {...props} />;

  // Final CTA
  if (type === 'final_cta' || type === 'cta' || type === 'closing') {
    const v = variant || (art?.vector.composition === 'oversized' || art?.vector.type === 'brutalist' ? 'cta_oversized' : 'banner');
    return renderByVariant(v, props) || <CtaBanner {...props} />;
  }

  // Footer
  if (type === 'footer') {
    return <FooterMassive {...props} />;
  }

  // Fallback by content shape
  if (props.section.testimonials?.length) return <TestimonialMarquee {...props} />;
  if (props.section.stats?.length) return <StatBand {...props} />;
  if (props.section.faqs?.length) return <FaqAccordion {...props} />;
  if (props.section.pricing?.length) return <PricingTiers {...props} />;
  if (props.section.features?.length) return <FeatureBento {...props} />;
  return <MagazineGrid {...props} />;
}

/**
 * Pre-process sections to inject layoutVariants from the art vector and to
 * GUARANTEE no two adjacent sections share the same variant. Call once
 * before rendering the page.
 */
export function assignVariantsWithVariety(sections: SectionData[], art?: ArtDirection): SectionData[] {
  const out: SectionData[] = [];
  let lastVariant: string | undefined;
  sections.forEach((s, i) => {
    let v = s.layoutVariant;
    if (!v) {
      if (s.type === 'hero' || s.type === 'header') v = pickHeroVariant(art);
      else if (s.type === 'features' || s.type === 'solution' || s.type === 'product') v = pickFeatureVariant(art, i);
      else if (s.type === 'final_cta' || s.type === 'cta' || s.type === 'closing') {
        v = art?.vector.composition === 'oversized' || art?.vector.type === 'brutalist' ? 'cta_oversized' : 'banner';
      }
    }
    // Anti-clone: nudge feature variant if adjacent
    if (v && v === lastVariant && (s.type === 'features' || s.type === 'solution' || s.type === 'product')) {
      const alts = ['bento_media', 'split_image', 'horiz_scroll', 'sticky_scroll', 'magazine', 'marquee_wall'].filter((x) => x !== v);
      v = alts[(i + (art?.seed ?? 0)) % alts.length];
    }
    out.push({ ...s, layoutVariant: v });
    if (v) lastVariant = v;
  });
  return out;
}

/** Available signatures for backend prompt building. */
export const SIGNATURES_LIST: Signature[] = [
  'marquee', 'massiveMark', 'dragGallery', 'horizScroll', 'videoLoop', 'kineticType',
];

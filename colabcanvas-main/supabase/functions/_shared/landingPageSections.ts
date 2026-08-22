/**
 * Landing Page Section Templates — Conversion-First Defaults
 * Each section maps to a Cosmo slide with appropriate layout and content fields.
 */

export interface LandingPageSection {
  id: string;
  type: string;
  label: string;
  layout: string;
  requiredFields: string[];
  conversionGuidance: string;
  blockTemplate: any[];
}

export const LANDING_PAGE_SECTIONS: LandingPageSection[] = [
  {
    id: 'hero',
    type: 'hero',
    label: 'Hero Section',
    layout: 'title',
    requiredFields: ['headline', 'subheadline', 'cta_text', 'hero_image_prompt'],
    conversionGuidance: 'Headline must communicate value in under 8 words. CTA above fold. Hero image should evoke aspiration. Subheadline expands on the headline with a benefit statement.',
    blockTemplate: [
      { type: 'heading', style: { fontSize: 64, fontWeight: 'bold', textAlign: 'center' } },
      { type: 'text', style: { fontSize: 22, textAlign: 'center', color: '#666' } },
      { type: 'button', style: { fontSize: 18, padding: '16px 48px', borderRadius: 12 } },
    ],
  },
  {
    id: 'problem',
    type: 'problem',
    label: 'Problem Section',
    layout: 'content',
    requiredFields: ['headline', 'pain_points', 'emotional_hook'],
    conversionGuidance: 'Frame the problem the audience faces. Use emotional language. 3 pain points max. Make reader feel understood before presenting solution.',
    blockTemplate: [
      { type: 'heading', style: { fontSize: 40, fontWeight: 'bold' } },
      { type: 'text', style: { fontSize: 18 } },
      { type: 'bullets', style: { fontSize: 16 } },
    ],
  },
  {
    id: 'solution',
    type: 'solution',
    label: 'Solution Section',
    layout: 'image-text',
    requiredFields: ['headline', 'value_proposition', 'solution_image_prompt'],
    conversionGuidance: 'Present your product/service as the answer. Focus on transformation, not features. Show before/after or the ideal outcome.',
    blockTemplate: [
      { type: 'heading', style: { fontSize: 40, fontWeight: 'bold' } },
      { type: 'text', style: { fontSize: 18 } },
    ],
  },
  {
    id: 'features',
    type: 'features',
    label: 'Features Section',
    layout: 'two-column',
    requiredFields: ['headline', 'features'],
    conversionGuidance: '3-4 features max. Each feature: icon/visual + benefit-led title + one-line description. Lead with benefits, not specs.',
    blockTemplate: [
      { type: 'heading', style: { fontSize: 40, fontWeight: 'bold', textAlign: 'center' } },
      { type: 'grid', style: { columns: 3, gap: 24 } },
    ],
  },
  {
    id: 'social_proof',
    type: 'social_proof',
    label: 'Social Proof Section',
    layout: 'quote',
    requiredFields: ['headline', 'testimonials', 'stats'],
    conversionGuidance: 'Include at least 2 testimonials with names and roles. Add 2-3 stats (users, revenue, satisfaction). Logos of known clients if available.',
    blockTemplate: [
      { type: 'heading', style: { fontSize: 40, fontWeight: 'bold', textAlign: 'center' } },
      { type: 'stats', style: { fontSize: 48 } },
      { type: 'testimonial', style: { fontSize: 16, fontStyle: 'italic' } },
    ],
  },
  {
    id: 'pricing',
    type: 'pricing',
    label: 'Pricing Section',
    layout: 'content',
    requiredFields: ['headline', 'tiers'],
    conversionGuidance: 'Highlight the recommended tier. Use anchoring (show highest price first or strike-through). Include a free tier or trial CTA. Max 3 tiers.',
    blockTemplate: [
      { type: 'heading', style: { fontSize: 40, fontWeight: 'bold', textAlign: 'center' } },
      { type: 'grid', style: { columns: 3, gap: 24 } },
    ],
  },
  {
    id: 'faq',
    type: 'faq',
    label: 'FAQ Section',
    layout: 'content',
    requiredFields: ['headline', 'questions'],
    conversionGuidance: '5-7 questions addressing common objections. Each answer should reinforce the value proposition. End with a soft CTA.',
    blockTemplate: [
      { type: 'heading', style: { fontSize: 40, fontWeight: 'bold', textAlign: 'center' } },
      { type: 'faq', style: { fontSize: 16 } },
    ],
  },
  {
    id: 'final_cta',
    type: 'final_cta',
    label: 'Final CTA Section',
    layout: 'title',
    requiredFields: ['headline', 'subheadline', 'cta_text', 'urgency_element'],
    conversionGuidance: 'Create urgency (limited time, limited spots). Restate the core value. Make CTA action-oriented (not "Submit" — use "Get Started Free"). Add trust signals (money-back guarantee, no credit card).',
    blockTemplate: [
      { type: 'heading', style: { fontSize: 48, fontWeight: 'bold', textAlign: 'center' } },
      { type: 'text', style: { fontSize: 20, textAlign: 'center' } },
      { type: 'button', style: { fontSize: 20, padding: '18px 56px', borderRadius: 12 } },
      { type: 'text', style: { fontSize: 14, textAlign: 'center', color: '#999' } },
    ],
  },
];

export const SECTION_GENERATION_PROMPT = `You are a conversion copywriter and landing page architect. Generate content for each landing page section.

CONVERSION PSYCHOLOGY RULES:
1. Above-fold CTA — hero must have a clear call to action
2. Benefit-first headlines — lead with outcomes, not features
3. Social proof before pricing — build trust before asking for money
4. Urgency in final CTA — limited time, limited spots, or fear of missing out
5. One CTA per section maximum — don't overwhelm the visitor
6. Scannable copy — short paragraphs, bullet points, bold key phrases
7. Address objections in FAQ — preempt "why should I trust you?" and "is it worth it?"

For each section, return JSON with the required fields filled in.
Copy should be persuasive, specific, and aligned with the brand voice.
Avoid generic marketing speak — be concrete and outcome-focused.`;

export const DEFAULT_SECTION_ORDER = ['hero', 'problem', 'solution', 'features', 'social_proof', 'faq', 'final_cta'];
export const FULL_SECTION_ORDER = ['hero', 'problem', 'solution', 'features', 'social_proof', 'pricing', 'faq', 'final_cta'];

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const uid = () => crypto.randomUUID();

// ── Rich Themes with distinct fonts ─────────────────────────────────
const THEMES = {
  noir: { headingFont:"'Playfair Display', serif", bodyFont:"'Inter', sans-serif", primaryColor:'#ffffff', accentColor:'#f5c518', backgroundColor:'#0a0a0a', surfaceColor:'#1a1a1a', textColor:'#ffffff', mutedTextColor:'#888888', spacingScale:1.1, borderRadius:0, gradientStart:'#f5c518', gradientEnd:'#ff6b35', cardStyle:'flat' as const },
  arctic: { headingFont:"'Space Grotesk', sans-serif", bodyFont:"'Inter', sans-serif", primaryColor:'#0f172a', accentColor:'#38bdf8', backgroundColor:'#f0f9ff', surfaceColor:'#e0f2fe', textColor:'#0c4a6e', mutedTextColor:'#64748b', spacingScale:1, borderRadius:16, gradientStart:'#38bdf8', gradientEnd:'#818cf8', cardStyle:'glass' as const },
  ember: { headingFont:"'DM Serif Display', serif", bodyFont:"'DM Sans', sans-serif", primaryColor:'#fef2f2', accentColor:'#ef4444', backgroundColor:'#1c1917', surfaceColor:'#292524', textColor:'#fef2f2', mutedTextColor:'#a8a29e', spacingScale:1.05, borderRadius:12, gradientStart:'#ef4444', gradientEnd:'#f97316', cardStyle:'glass' as const },
  sage: { headingFont:"'Fraunces', serif", bodyFont:"'Inter', sans-serif", primaryColor:'#14532d', accentColor:'#22c55e', backgroundColor:'#f0fdf4', surfaceColor:'#dcfce7', textColor:'#14532d', mutedTextColor:'#4ade80', spacingScale:1, borderRadius:20, gradientStart:'#22c55e', gradientEnd:'#06b6d4', cardStyle:'elevated' as const },
  midnight: { headingFont:"'Poppins', sans-serif", bodyFont:"'Inter', sans-serif", primaryColor:'#f5f3ff', accentColor:'#a855f7', backgroundColor:'#0c0a1a', surfaceColor:'#1e1333', textColor:'#f5f3ff', mutedTextColor:'#c4b5fd', spacingScale:1, borderRadius:16, gradientStart:'#7c3aed', gradientEnd:'#ec4899', cardStyle:'glass' as const },
  coral: { headingFont:"'Outfit', sans-serif", bodyFont:"'Inter', sans-serif", primaryColor:'#fff1f2', accentColor:'#fb7185', backgroundColor:'#1f1215', surfaceColor:'#2d1b1f', textColor:'#fff1f2', mutedTextColor:'#fda4af', spacingScale:1.05, borderRadius:24, gradientStart:'#fb7185', gradientEnd:'#f472b6', cardStyle:'glass' as const },
  ocean: { headingFont:"'Sora', sans-serif", bodyFont:"'Inter', sans-serif", primaryColor:'#082f49', accentColor:'#0ea5e9', backgroundColor:'#f0f9ff', surfaceColor:'#bae6fd', textColor:'#082f49', mutedTextColor:'#0369a1', spacingScale:1, borderRadius:12, gradientStart:'#0ea5e9', gradientEnd:'#6366f1', cardStyle:'elevated' as const },
  sand: { headingFont:"'Libre Baskerville', serif", bodyFont:"'Inter', sans-serif", primaryColor:'#451a03', accentColor:'#d97706', backgroundColor:'#fffbeb', surfaceColor:'#fef3c7', textColor:'#451a03', mutedTextColor:'#92400e', spacingScale:1.1, borderRadius:8, gradientStart:'#d97706', gradientEnd:'#ea580c', cardStyle:'outlined' as const },
};

const themeKeys = Object.keys(THEMES) as (keyof typeof THEMES)[];

function decos(accent: string, patterns: number[][] = [[85,15,300],[10,80,200],[70,70,250],[5,20,180]]) {
  const types = ['circle','ring','blob','dots','line'] as const;
  return patterns.map((p, i) => ({
    type: types[i % types.length], x: p[0], y: p[1], size: p[2],
    color: accent, opacity: [0.08, 0.12, 0.06, 0.1, 0.05][i % 5],
  }));
}

function bg(color1: string, color2: string, angle = 135) {
  return { type: 'gradient' as const, value: `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)` };
}

function solidBg(color: string) {
  return { type: 'solid' as const, value: color };
}

function block(regionId: string, type: string, data: any) {
  return { id: uid(), regionId, type, ...data };
}

// ── IMAGE URLs (Unsplash) ────────────────────────────────────────────
const IMG = {
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  team: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
  city: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
  nature: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
  fashion: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
  office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  health: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  finance: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
  education: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
  space: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
  abstract: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80',
  realestate: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
  travel: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
  ai: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
  sustainability: 'https://images.unsplash.com/photo-1473830394358-91588751b241?w=800&q=80',
};

// ── PITCH DECKS (each genuinely unique) ──────────────────────────────

function pitchTechStartup() {
  const t = THEMES.midnight;
  return {
    title: 'AI-Powered Analytics', category: 'pitch-deck', subcategory: 'tech-startup',
    design_tokens: t, format: '16:9', is_featured: true,
    tags: ['pitch', 'tech', 'ai', 'startup', 'saas'],
    slides: [
      { id: uid(), layoutId: 'full-image', speakerNotes: 'Opening hook', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[90,10,400],[5,85,300],[50,50,500]]),
        contentBlocks: [
          block('image', 'image', { src: IMG.ai, alt: 'AI visualization', fit: 'cover' }),
          block('title', 'title', { text: 'The Future of Data Intelligence', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Turning complexity into clarity with AI-powered analytics' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Problem', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[85,20,250],[10,75,180]]),
        contentBlocks: [
          block('title', 'title', { text: '73% of enterprise data goes unused', level: 2 }),
          block('body', 'stats', { variant: 'circle-bold', items: [{ label: 'Data Unused', value: 73, max: 100, suffix: '%' }, { label: 'Manual Hours', value: 40, max: 100, suffix: 'hrs/wk' }] }),
        ] },
      { id: uid(), layoutId: 'image-right', speakerNotes: 'Solution', background: bg(t.surfaceColor, t.backgroundColor, 180), decorations: decos(t.accentColor, [[80,30,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'Autonomous Data Pipeline', level: 2 }),
          block('body', 'icon-grid', { variant: 'solid-boxes', items: [
            { icon: '🧠', title: 'Auto-Discovery', description: 'ML finds patterns humans miss' },
            { icon: '⚡', title: 'Real-time', description: 'Sub-second query response' },
            { icon: '🔒', title: 'SOC2 Compliant', description: 'Enterprise-grade security' },
            { icon: '📊', title: 'Natural Language', description: 'Ask questions in plain English' },
          ] }),
          block('image', 'image', { src: IMG.tech, alt: 'Technology', fit: 'cover' }),
        ] },
      { id: uid(), layoutId: 'metrics-grid', speakerNotes: 'Traction', background: bg(t.backgroundColor, '#1a0a2e'), decorations: decos(t.accentColor, [[50,90,350],[90,10,200],[10,50,250]]),
        contentBlocks: [
          block('title', 'title', { text: 'Traction & Growth', level: 2 }),
          block('metrics', 'metric', { value: '$4.2M', label: 'ARR', suffix: '', trend: 'up' }),
          block('metrics', 'metric', { value: '520%', label: 'YoY Growth', suffix: '', trend: 'up' }),
          block('metrics', 'metric', { value: '12K', label: 'Active Users', suffix: '+', trend: 'up' }),
          block('metrics', 'metric', { value: '98.9%', label: 'Uptime', suffix: '', trend: 'neutral' }),
        ] },
      { id: uid(), layoutId: 'two-column', speakerNotes: 'Market', background: solidBg(t.surfaceColor), decorations: decos(t.accentColor),
        contentBlocks: [
          block('title', 'title', { text: 'Market Opportunity', level: 2 }),
          block('left', 'chart', { chartType: 'bar', data: [{ label: '2024', value: 45 }, { label: '2025', value: 78 }, { label: '2026', value: 142 }, { label: '2027', value: 230 }], title: 'TAM ($B)' }),
          block('right', 'steps', { variant: 'pyramid', items: [
            { title: '$230B', description: 'Total Addressable Market' },
            { title: '$45B', description: 'Serviceable Market' },
            { title: '$8B', description: 'Our Beachhead' },
          ] }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Team', background: bg(t.backgroundColor, t.surfaceColor, 45), decorations: decos(t.accentColor, [[20,80,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'World-Class Team', level: 2 }),
          block('body', 'card-grid', { cards: [
            { icon: '👩‍💻', title: 'Sarah Chen, CEO', description: 'Ex-Google AI Lead, Stanford PhD' },
            { icon: '👨‍🔬', title: 'Marcus Wright, CTO', description: 'Ex-Meta, Built systems for 2B users' },
            { icon: '📈', title: 'Priya Sharma, VP Sales', description: 'Grew Snowflake from $10M to $100M' },
          ] }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Roadmap', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[85,50,200],[15,30,150]]),
        contentBlocks: [
          block('title', 'title', { text: 'Product Roadmap', level: 2 }),
          block('body', 'process-flow', { variant: 'timeline-minimal', items: [
            { title: 'Q1 2026', description: 'Launch Enterprise SDK' },
            { title: 'Q2 2026', description: 'Multi-cloud support' },
            { title: 'Q3 2026', description: 'Self-serve marketplace' },
            { title: 'Q4 2026', description: 'Series B raise' },
          ] }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'Close', background: bg('#1a0a2e', t.backgroundColor), decorations: decos(t.accentColor, [[50,50,500],[80,20,300],[20,80,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Raising $15M Series A', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Join us in building the future of data intelligence\nhello@dataflow.ai' }),
        ] },
    ],
  };
}

function pitchRestaurant() {
  const t = THEMES.ember;
  return {
    title: 'Farm-to-Table Dining', category: 'pitch-deck', subcategory: 'restaurant',
    design_tokens: t, format: '16:9', is_featured: true,
    tags: ['pitch', 'restaurant', 'food', 'hospitality'],
    slides: [
      { id: uid(), layoutId: 'full-image', speakerNotes: 'Opening', background: bg(t.backgroundColor, '#2d1b1b'), decorations: decos(t.accentColor, [[90,5,350],[5,90,250]]),
        contentBlocks: [
          block('image', 'image', { src: IMG.food, alt: 'Gourmet dish', fit: 'cover' }),
          block('title', 'title', { text: 'Ember Kitchen', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Where fire meets flavor — a farm-to-table experience' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Concept', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[80,30,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'The Concept', level: 2 }),
          block('body', 'callout', { text: 'Only 12% of restaurants source directly from local farms. We partner with 40+ regional growers.', icon: '🌱', variant: 'accent' }),
          block('body', 'icon-grid', { variant: 'leaf', items: [
            { icon: '🔥', title: 'Live Fire Cooking', description: 'Wood-fired everything' },
            { icon: '🌿', title: 'Seasonal Menu', description: 'Changes weekly with harvest' },
            { icon: '🍷', title: 'Natural Wine', description: 'Curated biodynamic selection' },
            { icon: '🎵', title: 'Live Music', description: 'Jazz nights every Friday' },
          ] }),
        ] },
      { id: uid(), layoutId: 'metrics-grid', speakerNotes: 'Numbers', background: bg(t.surfaceColor, t.backgroundColor), decorations: decos(t.accentColor, [[50,50,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Proof of Concept', level: 2 }),
          block('metrics', 'metric', { value: '$1.8M', label: 'Year 1 Revenue', trend: 'up' }),
          block('metrics', 'metric', { value: '4.8', label: 'Yelp Rating', suffix: '★', trend: 'up' }),
          block('metrics', 'metric', { value: '92%', label: 'Table Occupancy', trend: 'up' }),
        ] },
      { id: uid(), layoutId: 'two-column', speakerNotes: 'Revenue', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[85,20,200],[15,70,180]]),
        contentBlocks: [
          block('title', 'title', { text: 'Revenue Streams', level: 2 }),
          block('left', 'chart', { chartType: 'donut', data: [{ label: 'Dine-in', value: 55 }, { label: 'Catering', value: 25 }, { label: 'Events', value: 15 }, { label: 'Retail', value: 5 }], title: 'Revenue Mix' }),
          block('right', 'numbered-list', { items: [
            { title: 'Dine-in Experience', description: 'Premium 8-course tasting menu at $185/person' },
            { title: 'Corporate Catering', description: 'Farm-to-office lunch program, 200+ companies' },
            { title: 'Private Events', description: 'Chef\'s table for 12, exclusive wine pairings' },
          ] }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Expansion', background: bg(t.backgroundColor, t.surfaceColor, 200), decorations: decos(t.accentColor, [[10,10,350],[90,85,250]]),
        contentBlocks: [
          block('title', 'title', { text: 'Expansion Plan', level: 2 }),
          block('body', 'process-flow', { variant: 'arrows', items: [
            { title: 'Location 2', description: 'Brooklyn, Q3 2026' },
            { title: 'Location 3', description: 'Austin, Q1 2027' },
            { title: 'Franchise', description: 'License model by 2028' },
          ] }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'Ask', background: bg('#2d1b1b', t.backgroundColor), decorations: decos(t.accentColor, [[50,50,450],[80,20,250],[20,80,250]]),
        contentBlocks: [
          block('title', 'title', { text: 'Seeking $2.5M for Growth', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Let\'s bring real food back to the table\nchef@emberkitchen.com' }),
        ] },
    ],
  };
}

function pitchFashion() {
  const t = THEMES.coral;
  return {
    title: 'Sustainable Fashion Brand', category: 'pitch-deck', subcategory: 'fashion',
    design_tokens: t, format: '16:9', is_featured: true,
    tags: ['pitch', 'fashion', 'sustainability', 'dtc'],
    slides: [
      { id: uid(), layoutId: 'full-image', speakerNotes: 'Opening', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[85,10,400],[10,85,300]]),
        contentBlocks: [
          block('image', 'image', { src: IMG.fashion, alt: 'Fashion', fit: 'cover' }),
          block('title', 'title', { text: 'NOVA Collective', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Fashion that feels as good as it looks — zero waste, full style' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Problem', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[80,50,220]]),
        contentBlocks: [
          block('title', 'title', { text: 'The Fashion Industry\'s Dirty Secret', level: 2 }),
          block('body', 'comparison', { left: { title: 'Fast Fashion', items: ['92M tons waste/year', '10% global carbon', '20% water pollution', '$500B lost annually'] }, right: { title: 'NOVA Way', items: ['Zero-waste patterns', 'Carbon negative', 'Closed-loop water', 'Profitable from day 1'] } }),
        ] },
      { id: uid(), layoutId: 'image-left', speakerNotes: 'Product', background: bg(t.surfaceColor, t.backgroundColor, 180), decorations: decos(t.accentColor, [[90,30,180]]),
        contentBlocks: [
          block('image', 'image', { src: IMG.abstract, alt: 'Materials', fit: 'cover' }),
          block('title', 'title', { text: 'Our Product Lines', level: 2 }),
          block('body', 'card-grid', { cards: [
            { icon: '👗', title: 'Essentials', description: 'Timeless basics from ocean plastic' },
            { icon: '✨', title: 'Atelier', description: 'Limited drops, deadstock fabrics' },
            { icon: '♻️', title: 'Re:NOVA', description: 'Buy-back & resale program' },
          ] }),
        ] },
      { id: uid(), layoutId: 'metrics-grid', speakerNotes: 'Traction', background: bg(t.backgroundColor, '#2d1b1f'), decorations: decos(t.accentColor, [[50,10,350],[10,80,250]]),
        contentBlocks: [
          block('title', 'title', { text: 'DTC Traction', level: 2 }),
          block('metrics', 'metric', { value: '$3.2M', label: 'Revenue', trend: 'up' }),
          block('metrics', 'metric', { value: '45K', label: 'Customers', suffix: '+', trend: 'up' }),
          block('metrics', 'metric', { value: '68%', label: 'Repeat Rate', trend: 'up' }),
          block('metrics', 'metric', { value: '4.9', label: 'Avg Rating', suffix: '★', trend: 'up' }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'CTA', background: bg('#2d1b1f', t.backgroundColor), decorations: decos(t.accentColor, [[50,50,500]]),
        contentBlocks: [
          block('title', 'title', { text: 'Series A: $8M', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Building the Patagonia of fashion for Gen Z\ninvest@novacollective.co' }),
        ] },
    ],
  };
}

function pitchRealEstate() {
  const t = THEMES.sand;
  return {
    title: 'Smart Property Investment', category: 'pitch-deck', subcategory: 'real-estate',
    design_tokens: t, format: '16:9', is_featured: false,
    tags: ['pitch', 'real estate', 'proptech', 'investment'],
    slides: [
      { id: uid(), layoutId: 'full-image', speakerNotes: 'Opening', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[85,15,300],[10,80,250]]),
        contentBlocks: [
          block('image', 'image', { src: IMG.realestate, alt: 'Modern property', fit: 'cover' }),
          block('title', 'title', { text: 'PropVault', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Democratizing real estate investment through fractional ownership' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Problem', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[80,30,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'The $300T Problem', level: 2 }),
          block('body', 'stats', { variant: 'bar', items: [{ label: 'Locked Capital', value: 85, max: 100, suffix: '%' }, { label: 'Avg Entry Cost', value: 75, max: 100, suffix: '$250K+' }] }),
          block('body', 'callout', { text: '90% of millennials cannot afford traditional real estate investment', icon: '🏠', variant: 'warning' }),
        ] },
      { id: uid(), layoutId: 'two-column', speakerNotes: 'Solution', background: bg(t.surfaceColor, t.backgroundColor, 180), decorations: decos(t.accentColor),
        contentBlocks: [
          block('title', 'title', { text: 'Fractional Ownership Platform', level: 2 }),
          block('left', 'icon-grid', { variant: 'outline-boxes', items: [
            { icon: '💰', title: 'Start at $100', description: 'Buy property fractions' },
            { icon: '📈', title: 'Monthly Yields', description: '8-12% annual returns' },
            { icon: '🏢', title: 'Premium Assets', description: 'Vetted commercial properties' },
            { icon: '💱', title: 'Liquid Market', description: 'Trade fractions anytime' },
          ] }),
          block('right', 'chart', { chartType: 'line', data: [{ label: 'Q1', value: 8 }, { label: 'Q2', value: 9.5 }, { label: 'Q3', value: 11 }, { label: 'Q4', value: 12.5 }], title: 'Avg Yield (%)' }),
        ] },
      { id: uid(), layoutId: 'metrics-grid', speakerNotes: 'Traction', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[50,50,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Platform Metrics', level: 2 }),
          block('metrics', 'metric', { value: '$52M', label: 'AUM', trend: 'up' }),
          block('metrics', 'metric', { value: '28K', label: 'Investors', suffix: '+', trend: 'up' }),
          block('metrics', 'metric', { value: '11.2%', label: 'Avg Return', trend: 'up' }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'Close', background: bg(t.surfaceColor, t.backgroundColor), decorations: decos(t.accentColor, [[50,50,500],[80,20,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Seeking $20M Series B', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Building the Robinhood of real estate\nfounders@propvault.io' }),
        ] },
    ],
  };
}

function pitchHealthTech() {
  const t = THEMES.arctic;
  return {
    title: 'Digital Health Platform', category: 'pitch-deck', subcategory: 'health-tech',
    design_tokens: t, format: '16:9', is_featured: false,
    tags: ['pitch', 'health', 'medtech', 'ai'],
    slides: [
      { id: uid(), layoutId: 'full-image', speakerNotes: 'Opening', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[85,10,350],[15,85,280]]),
        contentBlocks: [
          block('image', 'image', { src: IMG.health, alt: 'Health tech', fit: 'cover' }),
          block('title', 'title', { text: 'MediSync', level: 1 }),
          block('subtitle', 'subtitle', { text: 'AI-powered preventive healthcare for everyone' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Problem', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[80,30,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'Healthcare is Reactive, Not Proactive', level: 2 }),
          block('body', 'stats', { variant: 'circle', items: [{ label: 'Preventable Deaths', value: 40, max: 100, suffix: '%' }, { label: 'Late Diagnosis', value: 60, max: 100, suffix: '%' }] }),
        ] },
      { id: uid(), layoutId: 'image-right', speakerNotes: 'Solution', background: bg(t.surfaceColor, t.backgroundColor, 200), decorations: decos(t.accentColor, [[90,50,250]]),
        contentBlocks: [
          block('title', 'title', { text: 'Predictive Health Intelligence', level: 2 }),
          block('body', 'icon-grid', { variant: 'top-circle', items: [
            { icon: '🩺', title: 'AI Screening', description: 'Early detection from wearable data' },
            { icon: '📱', title: 'Mobile First', description: 'Check health from your phone' },
            { icon: '🧬', title: 'Genetic Insights', description: 'Personalized risk profiles' },
            { icon: '🤝', title: 'Doctor Network', description: '10K+ verified physicians' },
          ] }),
          block('image', 'image', { src: IMG.tech, alt: 'Health tech', fit: 'cover' }),
        ] },
      { id: uid(), layoutId: 'metrics-grid', speakerNotes: 'Traction', background: bg(t.backgroundColor, '#e0f2fe'), decorations: decos(t.accentColor, [[50,90,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Impact & Scale', level: 2 }),
          block('metrics', 'metric', { value: '2.1M', label: 'Users', suffix: '+', trend: 'up' }),
          block('metrics', 'metric', { value: '340K', label: 'Screenings/mo', trend: 'up' }),
          block('metrics', 'metric', { value: '89%', label: 'Accuracy', trend: 'up' }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'Ask', background: bg('#e0f2fe', t.backgroundColor), decorations: decos(t.accentColor, [[50,50,400]]),
        contentBlocks: [
          block('title', 'title', { text: 'Raising $25M to Save Lives', level: 1 }),
          block('subtitle', 'subtitle', { text: 'team@medisync.health' }),
        ] },
    ],
  };
}

// ── SOCIAL POSTS ─────────────────────────────────────────────────────

function socialProductLaunch() {
  const t = THEMES.noir;
  return {
    title: 'Product Launch Carousel', category: 'social-post', subcategory: 'product-launch',
    design_tokens: t, format: '1:1', is_featured: true,
    tags: ['social', 'product', 'launch', 'carousel'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Hook', background: bg('#0a0a0a', '#1a1a1a'), decorations: decos(t.accentColor, [[50,50,500],[80,20,250]]),
        contentBlocks: [
          block('title', 'title', { text: 'Something Big is Coming', level: 1 }),
          block('subtitle', 'subtitle', { text: 'We\'ve been building in silence for 18 months...' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Reveal', background: solidBg('#0a0a0a'), decorations: decos(t.accentColor, [[85,50,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Introducing Nova X1', level: 2 }),
          block('body', 'icon-grid', { variant: 'solid-boxes', items: [
            { icon: '⚡', title: '10x Faster', description: 'Than anything else' },
            { icon: '🎨', title: 'Beautiful', description: 'Designed obsessively' },
            { icon: '🔋', title: '48hr Battery', description: 'Go anywhere' },
          ] }),
        ] },
      { id: uid(), layoutId: 'metrics-grid', speakerNotes: 'Specs', background: bg('#1a1a1a', '#0a0a0a'), decorations: decos(t.accentColor, [[10,10,200],[90,90,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'By the Numbers', level: 2 }),
          block('metrics', 'metric', { value: '0.3s', label: 'Wake Time', trend: 'up' }),
          block('metrics', 'metric', { value: '48hr', label: 'Battery Life', trend: 'up' }),
          block('metrics', 'metric', { value: '4K', label: 'Resolution', suffix: 'HDR', trend: 'up' }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'CTA', background: bg('#0a0a0a', '#1a1a1a'), decorations: decos(t.accentColor, [[50,50,600]]),
        contentBlocks: [
          block('title', 'title', { text: 'Pre-order Now', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Link in bio → First 1000 get 40% off' }),
        ] },
    ],
  };
}

function socialTipsCarousel() {
  const t = THEMES.sage;
  return {
    title: 'Tips & Tricks Carousel', category: 'social-post', subcategory: 'tips',
    design_tokens: t, format: '1:1', is_featured: true,
    tags: ['social', 'tips', 'education', 'carousel'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Hook', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[85,10,350],[15,85,300]]),
        contentBlocks: [
          block('title', 'title', { text: '5 Design Rules\nPros Never Break', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Save this for later ↓' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Rules', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[80,30,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'Rule #1: Hierarchy', level: 2 }),
          block('body', 'callout', { text: 'Not everything can be important. Create visual hierarchy with size, weight, and color contrast.', icon: '👁️', variant: 'accent' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Rules 2-3', background: bg(t.surfaceColor, t.backgroundColor, 180), decorations: decos(t.accentColor, [[50,50,250]]),
        contentBlocks: [
          block('title', 'title', { text: 'Rule #2: White Space', level: 2 }),
          block('body', 'comparison', { left: { title: '❌ Cramped', items: ['Elements touching', 'No breathing room', 'Visual chaos'] }, right: { title: '✅ Spacious', items: ['Generous padding', 'Clear grouping', 'Easy scanning'] } }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Rules 4-5', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[85,70,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Rule #3: Consistency', level: 2 }),
          block('body', 'numbered-list', { items: [
            { title: 'Stick to 2 fonts max', description: 'One for headings, one for body' },
            { title: 'Use a color system', description: 'Primary, secondary, accent — that\'s it' },
            { title: 'Align everything', description: 'Use a grid, always' },
          ] }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'CTA', background: bg(t.surfaceColor, t.backgroundColor), decorations: decos(t.accentColor, [[50,50,400]]),
        contentBlocks: [
          block('title', 'title', { text: 'Follow for More\nDesign Tips', level: 1 }),
          block('subtitle', 'subtitle', { text: '❤️ Like & Save • 🔄 Share with a friend' }),
        ] },
    ],
  };
}

function socialDataStory() {
  const t = THEMES.ocean;
  return {
    title: 'Data Story Post', category: 'social-post', subcategory: 'data-story',
    design_tokens: t, format: '1:1', is_featured: true,
    tags: ['social', 'data', 'infographic', 'linkedin'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Hook', background: bg(t.backgroundColor, '#bae6fd'), decorations: decos(t.accentColor, [[85,15,400],[15,80,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Remote Work in 2026:\nThe Real Numbers', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Data from 50,000 companies worldwide' }),
        ] },
      { id: uid(), layoutId: 'metrics-grid', speakerNotes: 'Key stats', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[50,50,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'The Big Picture', level: 2 }),
          block('metrics', 'metric', { value: '67%', label: 'Hybrid Workers', trend: 'up' }),
          block('metrics', 'metric', { value: '23%', label: 'Fully Remote', trend: 'up' }),
          block('metrics', 'metric', { value: '+18%', label: 'Productivity', trend: 'up' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Chart', background: bg('#bae6fd', t.backgroundColor, 200), decorations: decos(t.accentColor, [[80,50,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'Employee Satisfaction by Model', level: 2 }),
          block('body', 'chart', { chartType: 'bar', data: [{ label: 'Remote', value: 92 }, { label: 'Hybrid', value: 87 }, { label: 'Office', value: 64 }], title: 'Satisfaction %' }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'CTA', background: bg(t.backgroundColor, '#bae6fd'), decorations: decos(t.accentColor, [[50,50,450]]),
        contentBlocks: [
          block('title', 'title', { text: 'The Future is Flexible', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Agree? Share your thoughts below 👇' }),
        ] },
    ],
  };
}

// ── REPORTS ──────────────────────────────────────────────────────────

function reportQuarterly() {
  const t = THEMES.arctic;
  return {
    title: 'Q4 Business Report', category: 'report', subcategory: 'quarterly',
    design_tokens: t, format: '16:9', is_featured: true,
    tags: ['report', 'quarterly', 'business', 'data'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Title', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[85,10,400],[15,85,300],[50,50,350]]),
        contentBlocks: [
          block('title', 'title', { text: 'Q4 2025 Report', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Performance Review & Strategic Outlook' }),
        ] },
      { id: uid(), layoutId: 'metrics-grid', speakerNotes: 'KPIs', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[90,10,250],[10,90,250]]),
        contentBlocks: [
          block('title', 'title', { text: 'Executive Summary', level: 2 }),
          block('metrics', 'metric', { value: '$18.4M', label: 'Revenue', trend: 'up' }),
          block('metrics', 'metric', { value: '24%', label: 'Growth QoQ', trend: 'up' }),
          block('metrics', 'metric', { value: '$2.1M', label: 'Net Profit', trend: 'up' }),
          block('metrics', 'metric', { value: '156', label: 'New Clients', suffix: '+', trend: 'up' }),
        ] },
      { id: uid(), layoutId: 'chart-focus', speakerNotes: 'Revenue trend', background: bg(t.surfaceColor, t.backgroundColor, 180), decorations: decos(t.accentColor, [[80,30,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'Revenue Trend', level: 2 }),
          block('chart', 'chart', { chartType: 'area', data: [{ label: 'Jan', value: 12 }, { label: 'Feb', value: 13.5 }, { label: 'Mar', value: 14.2 }, { label: 'Apr', value: 13.8 }, { label: 'May', value: 15.6 }, { label: 'Jun', value: 16.1 }, { label: 'Jul', value: 15.9 }, { label: 'Aug', value: 17.2 }, { label: 'Sep', value: 17.8 }, { label: 'Oct', value: 18.4 }], title: 'Monthly Revenue ($M)' }),
          block('insights', 'callout', { text: 'Revenue exceeded forecast by 12% in Q4, driven by enterprise expansion', icon: '📈', variant: 'success' }),
        ] },
      { id: uid(), layoutId: 'two-column', speakerNotes: 'Breakdown', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[85,50,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'Segment Performance', level: 2 }),
          block('left', 'chart', { chartType: 'pie', data: [{ label: 'Enterprise', value: 55 }, { label: 'Mid-Market', value: 30 }, { label: 'SMB', value: 15 }], title: 'Revenue by Segment' }),
          block('right', 'table', { hasHeader: true, rows: [['Segment', 'Revenue', 'Growth'], ['Enterprise', '$10.1M', '+32%'], ['Mid-Market', '$5.5M', '+18%'], ['SMB', '$2.8M', '+12%']] }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Progress', background: bg(t.surfaceColor, t.backgroundColor, 200), decorations: decos(t.accentColor, [[10,10,200],[90,90,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'Strategic Goals Progress', level: 2 }),
          block('body', 'progress', { items: [
            { label: 'Revenue Target', value: 92 },
            { label: 'Customer Acquisition', value: 108 },
            { label: 'Product Launches', value: 75 },
            { label: 'NPS Score', value: 85 },
          ] }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Next steps', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[80,70,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Q1 2026 Priorities', level: 2 }),
          block('body', 'steps', { variant: 'arrow', items: [
            { title: 'Launch v3.0', description: 'Complete platform redesign' },
            { title: 'APAC Expansion', description: 'Open Tokyo and Singapore offices' },
            { title: 'AI Integration', description: 'Ship predictive analytics module' },
            { title: 'Series C Prep', description: 'Target $50M at $500M valuation' },
          ] }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'Close', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[50,50,500]]),
        contentBlocks: [
          block('title', 'title', { text: 'Strong Quarter, Stronger Future', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Questions? Discussion follows.' }),
        ] },
    ],
  };
}

function reportMarketing() {
  const t = THEMES.midnight;
  return {
    title: 'Marketing Performance Report', category: 'report', subcategory: 'marketing',
    design_tokens: t, format: '16:9', is_featured: true,
    tags: ['report', 'marketing', 'analytics', 'performance'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Title', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[85,10,350],[15,85,280]]),
        contentBlocks: [
          block('title', 'title', { text: 'Marketing Performance\nH2 2025', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Channel Analysis & Campaign Results' }),
        ] },
      { id: uid(), layoutId: 'metrics-grid', speakerNotes: 'Highlights', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[50,50,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Campaign Highlights', level: 2 }),
          block('metrics', 'metric', { value: '2.4M', label: 'Impressions', trend: 'up' }),
          block('metrics', 'metric', { value: '4.8%', label: 'CTR', trend: 'up' }),
          block('metrics', 'metric', { value: '$12', label: 'CAC', trend: 'down' }),
          block('metrics', 'metric', { value: '340%', label: 'ROAS', trend: 'up' }),
        ] },
      { id: uid(), layoutId: 'two-column', speakerNotes: 'Channels', background: bg(t.surfaceColor, t.backgroundColor, 180), decorations: decos(t.accentColor, [[80,30,220]]),
        contentBlocks: [
          block('title', 'title', { text: 'Channel Performance', level: 2 }),
          block('left', 'chart', { chartType: 'bar', data: [{ label: 'Paid Social', value: 42 }, { label: 'SEO', value: 28 }, { label: 'Email', value: 18 }, { label: 'Referral', value: 12 }], title: 'Revenue Attribution (%)' }),
          block('right', 'icon-list', { items: [
            { icon: '📱', title: 'Paid Social', description: 'Best performing: TikTok +180% ROAS' },
            { icon: '🔍', title: 'Organic Search', description: '#1 ranking for 45 target keywords' },
            { icon: '📧', title: 'Email', description: '38% open rate, 12% click rate' },
          ] }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Funnel', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[85,50,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'Conversion Funnel', level: 2 }),
          block('body', 'steps', { variant: 'funnel', items: [
            { title: '2.4M Impressions', description: 'Top of funnel awareness' },
            { title: '115K Clicks', description: '4.8% click-through rate' },
            { title: '23K Signups', description: '20% conversion rate' },
            { title: '8.2K Customers', description: '35.6% activation rate' },
          ] }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'Close', background: bg(t.backgroundColor, '#1e1333'), decorations: decos(t.accentColor, [[50,50,450]]),
        contentBlocks: [
          block('title', 'title', { text: 'Double Down on What Works', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Recommendation: Increase paid social budget by 40%' }),
        ] },
    ],
  };
}

function reportAnalytics() {
  const t = THEMES.sage;
  return {
    title: 'Analytics Dashboard Report', category: 'report', subcategory: 'analytics',
    design_tokens: t, format: '16:9', is_featured: true,
    tags: ['report', 'analytics', 'dashboard', 'kpi'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Title', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[85,10,350],[15,85,280]]),
        contentBlocks: [
          block('title', 'title', { text: 'Product Analytics\nMonthly Deep Dive', level: 1 }),
          block('subtitle', 'subtitle', { text: 'User behavior, retention & engagement metrics' }),
        ] },
      { id: uid(), layoutId: 'metrics-grid', speakerNotes: 'Overview', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[50,50,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Monthly Active Users', level: 2 }),
          block('metrics', 'metric', { value: '847K', label: 'MAU', trend: 'up' }),
          block('metrics', 'metric', { value: '12.4min', label: 'Avg Session', trend: 'up' }),
          block('metrics', 'metric', { value: '72%', label: 'D7 Retention', trend: 'up' }),
          block('metrics', 'metric', { value: '4.2', label: 'Sessions/User', trend: 'neutral' }),
        ] },
      { id: uid(), layoutId: 'chart-focus', speakerNotes: 'Growth', background: bg(t.surfaceColor, t.backgroundColor, 180), decorations: decos(t.accentColor, [[80,30,220]]),
        contentBlocks: [
          block('title', 'title', { text: 'User Growth Trajectory', level: 2 }),
          block('chart', 'chart', { chartType: 'area', data: [{ label: 'W1', value: 620 }, { label: 'W2', value: 680 }, { label: 'W3', value: 720 }, { label: 'W4', value: 847 }], title: 'Weekly MAU (K)' }),
          block('insights', 'bullets', { items: ['Growth accelerating: +8% WoW', 'Viral coefficient reached 1.3', 'Organic installs up 45%'] }),
        ] },
      { id: uid(), layoutId: 'two-column', speakerNotes: 'Retention', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[85,50,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'Retention Cohort Analysis', level: 2 }),
          block('left', 'table', { hasHeader: true, rows: [['Cohort', 'D1', 'D7', 'D30'], ['Jan', '82%', '65%', '42%'], ['Feb', '85%', '70%', '48%'], ['Mar', '88%', '72%', '52%']] }),
          block('right', 'progress', { items: [
            { label: 'D1 Retention', value: 88 },
            { label: 'D7 Retention', value: 72 },
            { label: 'D30 Retention', value: 52 },
          ] }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'Close', background: bg(t.surfaceColor, t.backgroundColor), decorations: decos(t.accentColor, [[50,50,400]]),
        contentBlocks: [
          block('title', 'title', { text: 'Retention is Our Moat', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Focus: Improve D30 to 60% by end of Q2' }),
        ] },
    ],
  };
}

// ── AD CREATIVES ─────────────────────────────────────────────────────

function adProductShowcase() {
  const t = THEMES.noir;
  return {
    title: 'Premium Product Ad', category: 'ad-creative', subcategory: 'product',
    design_tokens: t, format: '1:1', is_featured: true,
    tags: ['ad', 'product', 'premium', 'ecommerce'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Hero', background: bg('#0a0a0a', '#1a1a1a'), decorations: decos(t.accentColor, [[50,50,600],[80,20,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Engineered\nfor Perfection', level: 1 }),
          block('subtitle', 'subtitle', { text: 'The all-new ProMax Series' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Features', background: solidBg('#0a0a0a'), decorations: decos(t.accentColor, [[85,50,250]]),
        contentBlocks: [
          block('title', 'title', { text: 'What\'s Inside', level: 2 }),
          block('body', 'icon-grid', { variant: 'side-line', items: [
            { icon: '💎', title: 'Sapphire Glass', description: 'Virtually scratchproof' },
            { icon: '🔋', title: '72hr Battery', description: 'Longest in its class' },
            { icon: '📸', title: '200MP Camera', description: 'Professional-grade optics' },
          ] }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'CTA', background: bg('#1a1a1a', '#0a0a0a'), decorations: decos(t.accentColor, [[50,50,500]]),
        contentBlocks: [
          block('title', 'title', { text: 'Available Now\nStarting at $999', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Free shipping worldwide → Shop now' }),
        ] },
    ],
  };
}

function adSaasTrialAd() {
  const t = THEMES.arctic;
  return {
    title: 'SaaS Free Trial Ad', category: 'ad-creative', subcategory: 'saas-trial',
    design_tokens: t, format: '1:1', is_featured: true,
    tags: ['ad', 'saas', 'trial', 'b2b'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Hook', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[85,15,350],[15,80,280]]),
        contentBlocks: [
          block('title', 'title', { text: 'Still Managing\nProjects in Spreadsheets?', level: 1 }),
          block('subtitle', 'subtitle', { text: 'There\'s a better way. Try free for 30 days.' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Benefits', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[80,50,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'Why Teams Switch', level: 2 }),
          block('body', 'comparison', { left: { title: 'Before', items: ['Scattered tools', 'Missed deadlines', 'No visibility'] }, right: { title: 'After', items: ['Single dashboard', '98% on-time delivery', 'Real-time insights'] } }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Social proof', background: bg(t.surfaceColor, t.backgroundColor, 180), decorations: decos(t.accentColor, [[50,50,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Trusted by 10,000+ Teams', level: 2 }),
          block('body', 'quote-box', { variant: 'speech-bubble', text: 'We cut project delivery time by 40% in the first month. Game changer.', attribution: 'VP Engineering, Stripe' }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'CTA', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[50,50,400]]),
        contentBlocks: [
          block('title', 'title', { text: 'Start Your Free Trial', level: 1 }),
          block('subtitle', 'subtitle', { text: 'No credit card required • Setup in 2 minutes' }),
        ] },
    ],
  };
}

function adTestimonialAd() {
  const t = THEMES.coral;
  return {
    title: 'Customer Testimonial Ad', category: 'ad-creative', subcategory: 'testimonial',
    design_tokens: t, format: '1:1', is_featured: true,
    tags: ['ad', 'testimonial', 'social-proof', 'review'],
    slides: [
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Testimonial', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[85,10,300],[15,85,250]]),
        contentBlocks: [
          block('title', 'title', { text: 'What Our Customers Say', level: 2 }),
          block('body', 'quote-box', { variant: 'quote-box', text: 'This platform literally doubled our conversion rate in 6 weeks. We went from struggling to scaling.', attribution: 'Jessica Park, CEO of GrowthLab' }),
        ] },
      { id: uid(), layoutId: 'metrics-grid', speakerNotes: 'Results', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[50,50,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Their Results', level: 2 }),
          block('metrics', 'metric', { value: '2x', label: 'Conversions', trend: 'up' }),
          block('metrics', 'metric', { value: '-60%', label: 'Bounce Rate', trend: 'down' }),
          block('metrics', 'metric', { value: '+$1.2M', label: 'Revenue', trend: 'up' }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'CTA', background: bg(t.surfaceColor, t.backgroundColor), decorations: decos(t.accentColor, [[50,50,450]]),
        contentBlocks: [
          block('title', 'title', { text: 'Get Results Like These', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Start free → yourproduct.com/trial' }),
        ] },
    ],
  };
}

// ── THUMBNAILS / LANDING ────────────────────────────────────────────

function thumbnailYouTube() {
  const t = THEMES.ember;
  return {
    title: 'Bold YouTube Thumbnail', category: 'thumbnail', subcategory: 'youtube',
    design_tokens: t, format: '16:9', is_featured: true,
    tags: ['thumbnail', 'youtube', 'bold', 'video'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Thumbnail', background: bg(t.backgroundColor, '#2d1b1b'), decorations: decos(t.accentColor, [[50,50,600],[80,20,350],[20,80,350]]),
        contentBlocks: [
          block('title', 'title', { text: 'I Tried This\nfor 30 Days', level: 1 }),
          block('subtitle', 'subtitle', { text: 'The results shocked everyone' }),
        ] },
    ],
  };
}

function thumbnailPodcast() {
  const t = THEMES.midnight;
  return {
    title: 'Podcast Cover Art', category: 'thumbnail', subcategory: 'podcast',
    design_tokens: t, format: '1:1', is_featured: true,
    tags: ['thumbnail', 'podcast', 'cover', 'audio'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Cover', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[50,50,500],[85,15,300],[15,85,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'The Deep Dive', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Technology • Culture • Future\nNew episodes every Monday' }),
        ] },
    ],
  };
}

function thumbnailWebinar() {
  const t = THEMES.sage;
  return {
    title: 'Webinar Cover', category: 'thumbnail', subcategory: 'webinar',
    design_tokens: t, format: '16:9', is_featured: true,
    tags: ['thumbnail', 'webinar', 'event', 'cover'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Cover', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[85,10,400],[15,85,350]]),
        contentBlocks: [
          block('title', 'title', { text: 'Live Masterclass:\nScaling to $10M ARR', level: 1 }),
          block('subtitle', 'subtitle', { text: 'March 15, 2026 • 2:00 PM EST\nFeaturing industry leaders from Stripe, Notion & Figma' }),
        ] },
    ],
  };
}

function landingStartup() {
  const t = THEMES.noir;
  return {
    title: 'Startup Landing Page', category: 'landing-page', subcategory: 'startup',
    design_tokens: t, format: '16:9', is_featured: true,
    tags: ['landing', 'startup', 'hero', 'website'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Hero', background: bg('#0a0a0a', '#1a1a1a'), decorations: decos(t.accentColor, [[50,50,600],[80,20,300],[20,80,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Build Products\nUsers Actually Love', level: 1 }),
          block('subtitle', 'subtitle', { text: 'The all-in-one platform for product teams to ship faster and learn quicker' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Features', background: solidBg('#0a0a0a'), decorations: decos(t.accentColor, [[85,50,250]]),
        contentBlocks: [
          block('title', 'title', { text: 'Everything You Need', level: 2 }),
          block('body', 'icon-grid', { variant: 'solid-boxes', items: [
            { icon: '🎯', title: 'User Research', description: 'Built-in surveys and heatmaps' },
            { icon: '🚀', title: 'Feature Flags', description: 'Progressive rollouts' },
            { icon: '📊', title: 'Analytics', description: 'Real-time product metrics' },
            { icon: '🔄', title: 'A/B Testing', description: 'Statistical significance built in' },
          ] }),
        ] },
      { id: uid(), layoutId: 'metrics-grid', speakerNotes: 'Social proof', background: bg('#1a1a1a', '#0a0a0a'), decorations: decos(t.accentColor, [[50,50,300]]),
        contentBlocks: [
          block('title', 'title', { text: 'Trusted by Leading Teams', level: 2 }),
          block('metrics', 'metric', { value: '10K+', label: 'Teams', trend: 'up' }),
          block('metrics', 'metric', { value: '4.9', label: 'Rating', suffix: '★', trend: 'up' }),
          block('metrics', 'metric', { value: '99.99%', label: 'Uptime', trend: 'neutral' }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'CTA', background: bg('#0a0a0a', '#1a1a1a'), decorations: decos(t.accentColor, [[50,50,500]]),
        contentBlocks: [
          block('title', 'title', { text: 'Start Building Today', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Free plan available • No credit card required' }),
        ] },
    ],
  };
}

function landingSaas() {
  const t = THEMES.arctic;
  return {
    title: 'SaaS Landing Page', category: 'landing-page', subcategory: 'saas',
    design_tokens: t, format: '16:9', is_featured: true,
    tags: ['landing', 'saas', 'website', 'conversion'],
    slides: [
      { id: uid(), layoutId: 'title-center', speakerNotes: 'Hero', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[85,10,400],[15,85,350],[50,50,500]]),
        contentBlocks: [
          block('title', 'title', { text: 'Your Workflow,\nSupercharged', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Connect all your tools. Automate everything. Ship 10x faster.' }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Benefits', background: solidBg(t.backgroundColor), decorations: decos(t.accentColor, [[80,30,200]]),
        contentBlocks: [
          block('title', 'title', { text: 'Why Teams Love Us', level: 2 }),
          block('body', 'card-grid', { cards: [
            { icon: '⚡', title: 'Instant Setup', description: 'Connect 200+ tools in one click' },
            { icon: '🤖', title: 'AI Automation', description: 'Smart workflows that learn' },
            { icon: '📱', title: 'Mobile Ready', description: 'Manage everything on the go' },
          ] }),
        ] },
      { id: uid(), layoutId: 'content-left', speakerNotes: 'Pricing', background: bg(t.surfaceColor, t.backgroundColor, 180), decorations: decos(t.accentColor, [[50,50,250]]),
        contentBlocks: [
          block('title', 'title', { text: 'Simple, Transparent Pricing', level: 2 }),
          block('body', 'table', { hasHeader: true, rows: [['Plan', 'Price', 'Features'], ['Starter', 'Free', '5 workflows, 1K runs/mo'], ['Pro', '$29/mo', 'Unlimited workflows, 50K runs'], ['Enterprise', 'Custom', 'Dedicated support, SLA, SSO']] }),
        ] },
      { id: uid(), layoutId: 'closing', speakerNotes: 'CTA', background: bg(t.backgroundColor, t.surfaceColor), decorations: decos(t.accentColor, [[50,50,500]]),
        contentBlocks: [
          block('title', 'title', { text: 'Ready to Automate?', level: 1 }),
          block('subtitle', 'subtitle', { text: 'Join 10,000+ teams already shipping faster' }),
        ] },
    ],
  };
}

// ── MAIN HANDLER ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Generate all templates
    const allTemplates = [
      pitchTechStartup(),
      pitchRestaurant(),
      pitchFashion(),
      pitchRealEstate(),
      pitchHealthTech(),
      socialProductLaunch(),
      socialTipsCarousel(),
      socialDataStory(),
      reportQuarterly(),
      reportMarketing(),
      reportAnalytics(),
      adProductShowcase(),
      adSaasTrialAd(),
      adTestimonialAd(),
      thumbnailYouTube(),
      thumbnailPodcast(),
      thumbnailWebinar(),
      landingStartup(),
      landingSaas(),
    ];

    // Clear existing templates
    await sb.from('cosmo_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert in batches
    const batchSize = 5;
    let inserted = 0;
    for (let i = 0; i < allTemplates.length; i += batchSize) {
      const batch = allTemplates.slice(i, i + batchSize).map(t => ({
        title: t.title,
        category: t.category,
        subcategory: t.subcategory,
        slides: t.slides as any,
        design_tokens: t.design_tokens as any,
        format: t.format,
        is_featured: t.is_featured,
        tags: t.tags,
        downloads_count: 0,
      }));

      const { error } = await sb.from('cosmo_templates').insert(batch);
      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, count: inserted, message: `Seeded ${inserted} premium templates` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Seed error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

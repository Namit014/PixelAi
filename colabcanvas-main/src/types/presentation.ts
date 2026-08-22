// ── Presentation Data Model ──────────────────────────────────────────

export interface Presentation {
  id: string;
  title: string;
  themeId: string;
  designTokens: DesignTokens;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
}

export interface MeshGradientPoint {
  id: string;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  color: string;
  intensity: number; // 0-1 blending radius
}

export interface GradientStop {
  id: string;
  color: string;
  position: number; // 0-100
  opacity?: number;
}

export interface BackgroundGradientConfig {
  type: 'linear' | 'radial';
  angle: number; // for linear
  stops: GradientStop[];
}

export interface PatternConfig {
  patternId: string;
  color: string;
  scale: number;
  opacity: number;
}

export interface SlideBackground {
  type: 'solid' | 'gradient' | 'image' | 'pattern' | 'mesh-gradient';
  value: string;
  overlay?: string;
  blur?: number;
  opacity?: number;
  gradientConfig?: BackgroundGradientConfig;
  meshPoints?: MeshGradientPoint[];
  patternConfig?: PatternConfig;
}

export interface Slide {
  id: string;
  layoutId: string;
  contentBlocks: ContentBlock[];
  speakerNotes: string;
  animationConfig: AnimationConfig;
  background?: SlideBackground;
  decorations?: SlideDecoration[];
}

export interface SlideDecoration {
  type: 'circle' | 'blob' | 'line' | 'dots' | 'ring';
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  rotation?: number;
}

// ── Content Blocks ───────────────────────────────────────────────────

export type ContentBlock =
  | TitleBlock
  | SubtitleBlock
  | BulletGroupBlock
  | ImageBlock
  | ChartBlock
  | CalloutBlock
  | QuoteBlock
  | MetricBlock
  | IconListBlock
  | TimelineBlock
  | ComparisonBlock
  | NumberedListBlock
  | ProgressBlock
  | CardGridBlock
  | TableBlock
  | TodoListBlock
  | DividerBlock
  | CodeBlock
  | StatsBlock
  | StepsBlock
  | CycleDiagramBlock
  | VennDiagramBlock
  | ProcessFlowBlock
  | GalleryBlock
  | ButtonBlockType
  | QuoteBoxBlock
  | IconGridBlock
  | EmbedBlock
  | Scene3DBlock
  | CountdownBlock
  | AnimatedCounterBlock
  | BeforeAfterBlock
  | ToggleRevealBlock
  | LiveTickerBlock
  // Phase 5 — Premium Components
  | ContainerBlock
  | StackBlock
  | AccordionBlock
  | TabsBlock
  | BannerBlock
  | MarqueeBlock
  | AvatarBlock
  | BadgeBlock
  | SpacerBlock
  | GradientShapeBlock
  | VideoBgBlock
  | RepeaterBlock
  | CustomSvgBlock
  | SocialLinksBlock
  | PricingTableBlock
  | TestimonialBlock
  | FeatureGridBlock
  | LogoCloudBlock
  | CtaSectionBlock
  | NavBarBlock
  // Phase 6 — Design-Centric Blocks
  | BentoGridBlock
  | GlassmorphismCardBlock
  | GradientTextBlock
  | MockupFrameBlock
  | SplitScreenBlock
  | FloatingCardsBlock
  // Phase 7 — Advanced Media & Shapes
  | GifBlock
  | LottieBlock
  | StickerBlock
  | ShapeBlock;

// ── Block Style ─────────────────────────────────────────────────────

export interface GradientStop {
  color: string;
  position: number;
}

export interface BackgroundGradient {
  type: 'linear' | 'radial' | 'conic';
  angle?: number;
  stops: GradientStop[];
}

export interface BlockConstraints {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  centerH?: boolean;
  centerV?: boolean;
}

export interface BlockAnimation {
  effect: 'none' | 'fade-in' | 'fade-up' | 'slide-in-left' | 'slide-in-right' | 'scale-in' | 'bounce';
  delay?: number;
  duration?: number;
}

export interface BlockStyle {
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  color?: string;
  accentColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: number;
  opacity?: number;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  margin?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  alignSelf?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justifySelf?: 'flex-start' | 'center' | 'flex-end';
  boxShadow?: string;
  autoLayout?: 'row' | 'column';
  gap?: number;
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  posX?: number;
  posY?: number;
  locked?: boolean;
  hidden?: boolean;
  hoverScale?: number;
  hoverOpacity?: number;
  hoverColor?: string;
  animation?: BlockAnimation;
  zIndex?: number;

  // Phase 2 — Auto-Layout Engine
  layoutMode?: 'none' | 'flex' | 'grid';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap';
  justifyContent?: string;
  alignItems?: string;
  gridColumns?: number;
  gridRows?: number;
  gridGap?: number;
  sizingMode?: 'hug' | 'fill' | 'fixed';
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';

  // Phase 3 — Typography
  textDecoration?: string;
  textShadow?: string;
  textColumns?: number;
  highlightColor?: string;

  // Phase 3 — Gradient
  backgroundGradient?: BackgroundGradient;

  // Phase 3 — Effects
  blur?: number;
  backdropBlur?: number;
  mixBlendMode?: string;
  filter?: string;
  clipPath?: string;
  rotation?: number;

  // Phase 8 — Advanced Shadow & Noise
  shadowType?: 'drop' | 'inner' | 'both';
  shadowColor?: string;
  shadowX?: number;
  shadowY?: number;
  shadowBlur?: number;
  shadowSpread?: number;
  shadowOpacity?: number;
  innerShadowColor?: string;
  innerShadowX?: number;
  innerShadowY?: number;
  innerShadowBlur?: number;
  innerShadowSpread?: number;
  innerShadowOpacity?: number;
  noiseIntensity?: number;
  noiseOpacity?: number;
  filterBrightness?: number;
  filterContrast?: number;
  filterSaturate?: number;
  filterHueRotate?: number;

  // Phase 4 — Constraints
  constraints?: BlockConstraints;
  aspectRatioLock?: boolean;

  // Phase 7 — Deep Sub-Element Customization
  iconColor?: string;
  iconBgColor?: string;
  iconSize?: number;
  cardBgColor?: string;
  cardBorderRadius?: number;
  cardBorderColor?: string;
  cardBorderWidth?: number;
  cardShadow?: string;
  innerPadding?: number;
  backgroundGradientCSS?: string;
  backgroundImageUrl?: string;
}

// ── Base Block ──────────────────────────────────────────────────────

interface BaseBlock {
  id: string;
  regionId: string;
  label?: string;
  componentId?: string;
  componentVariant?: string;
  style?: BlockStyle;
  parentId?: string;
  isGroup?: boolean;
  // Phase 4 — Responsive breakpoint overrides
  blockStyleOverrides?: Record<string, Partial<BlockStyle>>;
}

// ── Existing Block Types ────────────────────────────────────────────

export interface TitleBlock extends BaseBlock {
  type: 'title';
  text: string;
  level: 1 | 2 | 3;
}

export interface SubtitleBlock extends BaseBlock {
  type: 'subtitle';
  text: string;
}

export interface BulletGroupBlock extends BaseBlock {
  type: 'bullets';
  items: string[];
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt: string;
  fit: 'cover' | 'contain' | 'fill';
  mask?: 'none' | 'circle' | 'rounded' | 'blob' | 'diamond' | 'hexagon';
  fullHeight?: boolean;
  fullHeightPosition?: 'left' | 'right' | 'top' | 'bottom';
}

export interface ChartBlock extends BaseBlock {
  type: 'chart';
  chartType: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'bubble' | 'funnel' | 'waterfall' | 'combo' | 'stacked-bar' | 'radar';
  data: { label: string; value: number; color?: string; value2?: number }[];
  title?: string;
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  text: string;
  icon?: string;
  variant: 'info' | 'success' | 'warning' | 'accent' | 'note' | 'caution' | 'question';
  bgColor?: string;
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote';
  text: string;
  attribution?: string;
}

export interface MetricBlock extends BaseBlock {
  type: 'metric';
  value: string;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  suffix?: string;
}

export interface IconListBlock extends BaseBlock {
  type: 'icon-list';
  items: { icon: string; title: string; description: string; bgColor?: string; iconColor?: string }[];
  iconSize?: number;
}

export interface TimelineBlock extends BaseBlock {
  type: 'timeline';
  items: { year: string; title: string; description: string }[];
}

export interface ComparisonBlock extends BaseBlock {
  type: 'comparison';
  left: { title: string; items: string[] };
  right: { title: string; items: string[] };
}

export interface NumberedListBlock extends BaseBlock {
  type: 'numbered-list';
  items: { title: string; description: string }[];
}

export interface ProgressBlock extends BaseBlock {
  type: 'progress';
  items: { label: string; value: number; max?: number }[];
}

export interface CardGridBlock extends BaseBlock {
  type: 'card-grid';
  cards: { icon?: string; title: string; description: string; accent?: string; bgColor?: string }[];
}

export interface TableBlock extends BaseBlock {
  type: 'table';
  rows: string[][];
  hasHeader: boolean;
}

export interface TodoListBlock extends BaseBlock {
  type: 'todo-list';
  items: { text: string; checked: boolean }[];
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  dividerStyle: 'solid' | 'dashed' | 'dotted' | 'gradient';
}

export interface CodeBlock extends BaseBlock {
  type: 'code';
  language: string;
  code: string;
}

export interface StatsBlock extends BaseBlock {
  type: 'stats';
  variant: 'plain' | 'circle' | 'bar' | 'dot-grid' | 'star-rating' | 'dot-line' | 'circle-bold';
  items: { label: string; value: number; max?: number; suffix?: string }[];
}

export interface StepsBlock extends BaseBlock {
  type: 'steps';
  variant: 'staircase' | 'box' | 'arrow' | 'pyramid' | 'funnel' | 'steps-icons';
  items: { title: string; description: string; icon?: string }[];
}

export interface CycleDiagramBlock extends BaseBlock {
  type: 'cycle-diagram';
  variant: 'cycle' | 'flower' | 'ring' | 'semi-circle';
  items: { label: string; description?: string }[];
}

export interface VennDiagramBlock extends BaseBlock {
  type: 'venn-diagram';
  items: { label: string; description?: string }[];
}

export interface ProcessFlowBlock extends BaseBlock {
  type: 'process-flow';
  variant: 'arrows' | 'pills' | 'road' | 'timeline-minimal' | 'timeline-boxes' | 'slanted-labels';
  items: { title: string; description?: string }[];
}

export interface GalleryBlock extends BaseBlock {
  type: 'gallery';
  images: { src: string; alt: string }[];
  columns?: number;
}

export interface ButtonBlockType extends BaseBlock {
  type: 'button-block';
  text: string;
  url: string;
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  target?: '_blank' | '_self';
}

export interface QuoteBoxBlock extends BaseBlock {
  type: 'quote-box';
  variant: 'quote-box' | 'speech-bubble';
  text: string;
  attribution?: string;
}

export interface IconGridBlock extends BaseBlock {
  type: 'icon-grid';
  variant: 'solid-boxes' | 'outline-boxes' | 'side-line' | 'top-line' | 'top-circle' | 'joined' | 'leaf' | 'labeled' | 'solid-icons' | 'alternating' | 'side-line-text' | 'top-line-text' | 'joined-icons';
  items: { icon: string; title: string; description: string }[];
}

export interface EmbedBlock extends BaseBlock {
  type: 'embed';
  embedType: 'video' | 'webpage' | 'figma' | 'youtube' | 'vimeo' | 'loom' | 'tiktok' | 'spotify' | 'tweet' | 'instagram' | 'miro' | 'airtable' | 'google-drive' | 'google-form' | 'typeform' | 'calendly' | 'jotform' | 'tally' | 'powerbi' | 'office365' | 'amplitude' | 'custom';
  url: string;
  aspectRatio?: string;
}

export interface Scene3DBlock extends BaseBlock {
  type: 'scene-3d';
  preset: 'cube' | 'sphere' | 'torus' | 'globe' | 'product-stage' | 'particles';
  modelUrl?: string;
  autoRotate?: boolean;
  backgroundColor?: string;
  lightColor?: string;
  cameraPosition?: [number, number, number];
}

export interface CountdownBlock extends BaseBlock {
  type: 'countdown';
  targetDate: string;
  label?: string;
  completedText?: string;
}

export interface AnimatedCounterBlock extends BaseBlock {
  type: 'animated-counter';
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  label?: string;
}

export interface BeforeAfterBlock extends BaseBlock {
  type: 'before-after';
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export interface ToggleRevealBlock extends BaseBlock {
  type: 'toggle-reveal';
  prompt: string;
  reveal: string;
  variant?: 'flip' | 'fade' | 'slide';
}

export interface LiveTickerBlock extends BaseBlock {
  type: 'live-ticker';
  items: string[];
  speed?: number;
  direction?: 'left' | 'right';
}

// ── Phase 5 — New Block Types ───────────────────────────────────────

export interface ContainerBlock extends BaseBlock {
  type: 'container';
  children: string[];
  containerLayout: 'flex' | 'grid';
}

export interface StackBlock extends BaseBlock {
  type: 'stack';
  children: string[];
  direction: 'horizontal' | 'vertical';
  spacing: number;
  alignment: 'start' | 'center' | 'end' | 'stretch';
}

export interface AccordionBlock extends BaseBlock {
  type: 'accordion';
  items: { title: string; content: string; defaultOpen?: boolean }[];
}

export interface TabsBlock extends BaseBlock {
  type: 'tabs';
  tabs: { label: string; content: string }[];
}

export interface BannerBlock extends BaseBlock {
  type: 'banner';
  heading: string;
  subheading?: string;
  ctaText?: string;
  ctaUrl?: string;
  backgroundImage?: string;
  backgroundGradient?: string;
  height?: number;
}

export interface MarqueeBlock extends BaseBlock {
  type: 'marquee';
  items: string[];
  speed?: number;
  direction?: 'left' | 'right';
  pauseOnHover?: boolean;
}

export interface AvatarBlock extends BaseBlock {
  type: 'avatar';
  src: string;
  name: string;
  role?: string;
  size?: number;
}

export interface BadgeBlock extends BaseBlock {
  type: 'badge';
  text: string;
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  size: number;
}

export interface GradientShapeBlock extends BaseBlock {
  type: 'gradient-shape';
  shape: 'circle' | 'blob' | 'rectangle' | 'triangle' | 'ring';
  colors: string[];
  size: number;
  blur?: number;
}

export interface VideoBgBlock extends BaseBlock {
  type: 'video-bg';
  src: string;
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export interface RepeaterBlock extends BaseBlock {
  type: 'repeater';
  templateBlockType: string;
  data: Record<string, string>[];
  columns?: number;
}

export interface CustomSvgBlock extends BaseBlock {
  type: 'custom-svg';
  svgCode: string;
  viewBox?: string;
}

export interface SocialLinksBlock extends BaseBlock {
  type: 'social-links';
  links: { platform: string; url: string; icon?: string }[];
  variant: 'icons-only' | 'icons-text' | 'pills';
}

export interface PricingTableBlock extends BaseBlock {
  type: 'pricing-table';
  plans: {
    name: string;
    price: string;
    period?: string;
    features: string[];
    ctaText?: string;
    ctaUrl?: string;
    highlighted?: boolean;
  }[];
}

export interface TestimonialBlock extends BaseBlock {
  type: 'testimonial';
  quote: string;
  name: string;
  role?: string;
  avatarSrc?: string;
  rating?: number;
}

export interface FeatureGridBlock extends BaseBlock {
  type: 'feature-grid';
  features: { icon: string; title: string; description: string }[];
  columns?: number;
}

export interface LogoCloudBlock extends BaseBlock {
  type: 'logo-cloud';
  logos: { src: string; alt: string; url?: string }[];
  variant: 'grid' | 'marquee' | 'inline';
}

export interface CtaSectionBlock extends BaseBlock {
  type: 'cta-section';
  heading: string;
  subheading?: string;
  primaryButtonText?: string;
  primaryButtonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
}

export interface NavBarBlock extends BaseBlock {
  type: 'nav-bar';
  logo?: string;
  links: { label: string; url: string }[];
  variant: 'minimal' | 'centered' | 'full';
}

// ── Phase 6 — Design-Centric Blocks ─────────────────────────────────

export interface BentoGridBlock extends BaseBlock {
  type: 'bento-grid';
  items: { title: string; description: string; icon?: string; span?: 'wide' | 'tall' | 'large' | 'normal' }[];
}

export interface GlassmorphismCardBlock extends BaseBlock {
  type: 'glass-card';
  heading: string;
  description: string;
  icon?: string;
  backgroundImage?: string;
}

export interface GradientTextBlock extends BaseBlock {
  type: 'gradient-text';
  text: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle?: number;
  fontSize?: number;
}

export interface MockupFrameBlock extends BaseBlock {
  type: 'mockup-frame';
  frameType: 'browser' | 'phone' | 'laptop';
  contentSrc: string;
  url?: string;
}

export interface SplitScreenBlock extends BaseBlock {
  type: 'split-screen';
  leftContent: { heading: string; description: string; ctaText?: string };
  rightContent: { type: 'image' | 'color'; value: string };
  splitRatio?: number;
}

export interface FloatingCardsBlock extends BaseBlock {
  type: 'floating-cards';
  cards: { title: string; description: string; icon?: string; rotation?: number }[];
}

// ── Phase 7 — Advanced Media & Shapes ────────────────────────────────

export interface GifBlock extends BaseBlock {
  type: 'gif';
  src: string;
  alt: string;
  fit: 'cover' | 'contain';
}

export interface LottieBlock extends BaseBlock {
  type: 'lottie';
  src: string;
  loop: boolean;
  autoplay: boolean;
}

export interface StickerBlock extends BaseBlock {
  type: 'sticker';
  src: string;
  stickerSize: number;
}

export interface ShapeBlock extends BaseBlock {
  type: 'shape';
  shape: 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'star' | 'heart' | 'hexagon' | 'arrow' | 'pentagon' | 'octagon';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  cornerRadius: number;
  shapeSize: number;
}

// ── Design Tokens ────────────────────────────────────────────────────

export interface DesignTokens {
  headingFont: string;
  bodyFont: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  spacingScale: number;
  borderRadius: number;
  gradientStart?: string;
  gradientEnd?: string;
  cardStyle?: 'flat' | 'elevated' | 'glass' | 'outlined';
}

// ── Layouts ──────────────────────────────────────────────────────────

export type SemanticType =
  | 'title'
  | 'section'
  | 'content'
  | 'problem'
  | 'solution'
  | 'comparison'
  | 'metrics'
  | 'timeline'
  | 'roadmap'
  | 'closing';

export interface LayoutRegion {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accepts: ContentBlock['type'][];
  minFontSize?: number;
  maxFontSize?: number;
}

export interface SlideLayout {
  id: string;
  name: string;
  semantic: SemanticType;
  regions: LayoutRegion[];
  thumbnail?: string;
  defaultBackground?: SlideBackground;
  defaultDecorations?: SlideDecoration[];
}

// ── Animation ────────────────────────────────────────────────────────

export interface AnimationConfig {
  transition: 'none' | 'fade' | 'slide' | 'zoom' | 'morph';
  elementAnimations: ElementAnimation[];
}

export interface ElementAnimation {
  blockId: string;
  effect: 'appear' | 'fade-up' | 'slide-in' | 'scale';
  delay: number;
  duration: number;
}

// ── Theme ────────────────────────────────────────────────────────────

export interface PresentationTheme {
  id: string;
  name: string;
  tokens: DesignTokens;
  preview: string;
}

// ── Tool Rail ────────────────────────────────────────────────────────

export type SlideToolId =
  | 'slides'
  | 'layers'
  | 'layouts'
  | 'themes'
  | 'components'
  | 'charts'
  | 'media'
  | 'ai'
  | 'settings'
  | 'blocks'
  | 'pen'
  | 'assets'
  | 'templates';

// ── AI Panel Actions ─────────────────────────────────────────────────

export type AIAction =
  | 'generate-deck'
  | 'add-section'
  | 'rewrite-slide'
  | 'improve-clarity'
  | 'add-visual'
  | 'to-bullets'
  | 'shorten'
  | 'expand'
  | 'add-notes';

// All block type strings for convenience
export const ALL_BLOCK_TYPES: ContentBlock['type'][] = [
  'title', 'subtitle', 'bullets', 'image', 'chart', 'callout', 'quote',
  'metric', 'icon-list', 'timeline', 'comparison', 'numbered-list',
  'progress', 'card-grid', 'table', 'todo-list', 'divider', 'code',
  'stats', 'steps', 'cycle-diagram', 'venn-diagram', 'process-flow',
  'gallery', 'button-block', 'quote-box', 'icon-grid', 'embed',
  'scene-3d', 'countdown', 'animated-counter', 'before-after', 'toggle-reveal', 'live-ticker',
  // Phase 5
  'container', 'stack', 'accordion', 'tabs', 'banner', 'marquee',
  'avatar', 'badge', 'spacer', 'gradient-shape', 'video-bg', 'repeater',
  'custom-svg', 'social-links', 'pricing-table', 'testimonial',
  'feature-grid', 'logo-cloud', 'cta-section', 'nav-bar',
  // Phase 6
  'bento-grid', 'glass-card', 'gradient-text', 'mockup-frame', 'split-screen', 'floating-cards',
  // Phase 7
  'gif', 'lottie', 'sticker', 'shape',
];

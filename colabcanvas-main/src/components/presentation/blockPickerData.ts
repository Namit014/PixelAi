import {
  Type, Heading1, Heading2, Heading3, Quote, Tag,
  Table, List, ListOrdered, CheckSquare, AlertCircle, Info, AlertTriangle,
  ShieldAlert, CheckCircle, HelpCircle, MousePointer, ToggleLeft, Minus,
  Code, Image, GalleryHorizontalEnd,
  Columns2, Columns3, Columns4,
  Square, SquareDashed, SeparatorHorizontal, CircleDot, Leaf, LayoutGrid,
  ArrowRight, Footprints, BarChart3, Target, Star, Hash, Circle,
  RefreshCw, Flower2, CircleDashed,
  MessageSquare, MessageCircle,
  TrendingUp, Box, ArrowRightLeft, Triangle, ChevronDown,
  Orbit, Puzzle, Crosshair, Split, Infinity, Gem,
  Globe, FileText, Frame, Map, Calendar,
  ExternalLink, Music, Video,
  AreaChart, ScatterChart, PieChart, Radar,
  QrCode, Sparkles, ImagePlus, Shapes, Palette,
  Pentagon, Hexagon, Octagon, Diamond, Heart, Zap,
  ArrowUp, ArrowDown, ArrowLeft, MoveRight,
  PenTool, Search,
  Timer, Play, Eye, AlignHorizontalSpaceAround, Layers,
  // Phase 6 design-centric
  LayoutDashboard, GlassWater, Paintbrush, Monitor, Smartphone,
  Laptop, SplitSquareHorizontal, CreditCard, Grip,
} from 'lucide-react';
import {
  YouTubeIcon, VimeoIcon, TikTokIcon, InstagramIcon, SpotifyIcon,
  FigmaIcon, TwitterIcon, GoogleDriveIcon, PowerBIIcon, LoomIcon,
  MiroIcon, AirtableIcon, CalendlyIcon, TypeformIcon,
} from './BrandLogos';
import type { ContentBlock } from '@/types/presentation';

export interface BlockDef {
  id: string;
  label: string;
  icon: React.ElementType;
  createBlock: () => Omit<ContentBlock, 'id' | 'regionId'>;
}

export interface BlockCategory {
  name: string;
  items: BlockDef[];
}

export const blockCategories: BlockCategory[] = [
  {
    name: 'Text',
    items: [
      { id: 'title-h1', label: 'Title', icon: Type, createBlock: () => ({ type: 'title' as const, text: 'Title', level: 1 as const }) },
      { id: 'title-h2', label: 'Heading 2', icon: Heading1, createBlock: () => ({ type: 'title' as const, text: 'Heading', level: 2 as const }) },
      { id: 'title-h3', label: 'Heading 3', icon: Heading2, createBlock: () => ({ type: 'title' as const, text: 'Subheading', level: 3 as const }) },
      { id: 'subtitle', label: 'Body text', icon: Heading3, createBlock: () => ({ type: 'subtitle' as const, text: 'Body text goes here' }) },
      { id: 'blockquote', label: 'Blockquote', icon: Quote, createBlock: () => ({ type: 'quote' as const, text: 'A meaningful quote', attribution: 'Author' }) },
      { id: 'label', label: 'Label', icon: Tag, createBlock: () => ({ type: 'callout' as const, text: 'Label text', variant: 'accent' as const }) },
    ],
  },
  {
    name: 'Tables',
    items: [
      { id: 'table-2x2', label: '2×2 Table', icon: Table, createBlock: () => ({ type: 'table' as const, rows: [['Header 1', 'Header 2'], ['Cell', 'Cell']], hasHeader: true }) },
      { id: 'table-3x3', label: '3×3 Table', icon: Table, createBlock: () => ({ type: 'table' as const, rows: [['H1', 'H2', 'H3'], ['A', 'B', 'C'], ['D', 'E', 'F']], hasHeader: true }) },
      { id: 'table-4x4', label: '4×4 Table', icon: Table, createBlock: () => ({ type: 'table' as const, rows: [['H1', 'H2', 'H3', 'H4'], ['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['I', 'J', 'K', 'L']], hasHeader: true }) },
    ],
  },
  {
    name: 'Lists',
    items: [
      { id: 'bullets', label: 'Bulleted', icon: List, createBlock: () => ({ type: 'bullets' as const, items: ['Item 1', 'Item 2', 'Item 3'] }) },
      { id: 'numbered', label: 'Numbered', icon: ListOrdered, createBlock: () => ({ type: 'numbered-list' as const, items: [{ title: 'Step 1', description: 'Description' }, { title: 'Step 2', description: 'Description' }] }) },
      { id: 'todo', label: 'Todo list', icon: CheckSquare, createBlock: () => ({ type: 'todo-list' as const, items: [{ text: 'Task 1', checked: false }, { text: 'Task 2', checked: true }, { text: 'Task 3', checked: false }] }) },
    ],
  },
  {
    name: 'Callout Boxes',
    items: [
      { id: 'callout-note', label: 'Note', icon: AlertCircle, createBlock: () => ({ type: 'callout' as const, text: 'Note content', icon: 'FileText', variant: 'accent' as const }) },
      { id: 'callout-info', label: 'Info', icon: Info, createBlock: () => ({ type: 'callout' as const, text: 'Info content', icon: 'Lightbulb', variant: 'info' as const }) },
      { id: 'callout-warning', label: 'Warning', icon: AlertTriangle, createBlock: () => ({ type: 'callout' as const, text: 'Warning content', icon: 'AlertTriangle', variant: 'warning' as const }) },
      { id: 'callout-caution', label: 'Caution', icon: ShieldAlert, createBlock: () => ({ type: 'callout' as const, text: 'Caution content', icon: 'ShieldAlert', variant: 'caution' as const }) },
      { id: 'callout-success', label: 'Success', icon: CheckCircle, createBlock: () => ({ type: 'callout' as const, text: 'Success content', icon: 'CheckCircle', variant: 'success' as const }) },
      { id: 'callout-question', label: 'Question', icon: HelpCircle, createBlock: () => ({ type: 'callout' as const, text: 'Question?', icon: 'HelpCircle', variant: 'question' as const }) },
    ],
  },
  {
    name: 'Interactive',
    items: [
      { id: 'button', label: 'Button', icon: MousePointer, createBlock: () => ({ type: 'button-block' as const, text: 'Click me', url: '#', variant: 'primary' as const }) },
      { id: 'divider-solid', label: 'Divider', icon: Minus, createBlock: () => ({ type: 'divider' as const, dividerStyle: 'solid' as const }) },
      { id: 'divider-gradient', label: 'Gradient Line', icon: ToggleLeft, createBlock: () => ({ type: 'divider' as const, dividerStyle: 'gradient' as const }) },
    ],
  },
  {
    name: 'Other',
    items: [
      { id: 'code', label: 'Code block', icon: Code, createBlock: () => ({ type: 'code' as const, language: 'javascript', code: '// Your code here\nconsole.log("Hello!");' }) },
    ],
  },
  // ── Shapes & Lines (Dynamic with color customization) ──
  {
    name: 'Shapes & Lines',
    items: [
      { id: 'shape-rect', label: 'Rectangle', icon: Square, createBlock: () => ({ type: 'shape' as const, shape: 'rectangle' as const, fillColor: '#6366f120', strokeColor: '#6366f1', strokeWidth: 3, cornerRadius: 16, shapeSize: 300 }) },
      { id: 'shape-circle', label: 'Circle', icon: Circle, createBlock: () => ({ type: 'shape' as const, shape: 'circle' as const, fillColor: '#6366f120', strokeColor: '#6366f1', strokeWidth: 3, cornerRadius: 0, shapeSize: 300 }) },
      { id: 'shape-triangle', label: 'Triangle', icon: Triangle, createBlock: () => ({ type: 'shape' as const, shape: 'triangle' as const, fillColor: '#6366f120', strokeColor: '#6366f1', strokeWidth: 3, cornerRadius: 0, shapeSize: 300 }) },
      { id: 'shape-diamond', label: 'Diamond', icon: Diamond, createBlock: () => ({ type: 'shape' as const, shape: 'diamond' as const, fillColor: '#6366f120', strokeColor: '#6366f1', strokeWidth: 3, cornerRadius: 0, shapeSize: 300 }) },
      { id: 'shape-star', label: 'Star', icon: Star, createBlock: () => ({ type: 'shape' as const, shape: 'star' as const, fillColor: '#6366f120', strokeColor: '#6366f1', strokeWidth: 3, cornerRadius: 0, shapeSize: 300 }) },
      { id: 'shape-heart', label: 'Heart', icon: Heart, createBlock: () => ({ type: 'shape' as const, shape: 'heart' as const, fillColor: '#ef444420', strokeColor: '#ef4444', strokeWidth: 2, cornerRadius: 0, shapeSize: 300 }) },
      { id: 'shape-hexagon', label: 'Hexagon', icon: Hexagon, createBlock: () => ({ type: 'shape' as const, shape: 'hexagon' as const, fillColor: '#6366f120', strokeColor: '#6366f1', strokeWidth: 3, cornerRadius: 0, shapeSize: 300 }) },
      { id: 'shape-pentagon', label: 'Pentagon', icon: Pentagon, createBlock: () => ({ type: 'shape' as const, shape: 'pentagon' as const, fillColor: '#22c55e20', strokeColor: '#22c55e', strokeWidth: 3, cornerRadius: 0, shapeSize: 300 }) },
      { id: 'shape-octagon', label: 'Octagon', icon: Octagon, createBlock: () => ({ type: 'shape' as const, shape: 'octagon' as const, fillColor: '#f59e0b20', strokeColor: '#f59e0b', strokeWidth: 3, cornerRadius: 0, shapeSize: 300 }) },
      { id: 'shape-arrow-r', label: 'Arrow →', icon: ArrowRight, createBlock: () => ({ type: 'shape' as const, shape: 'arrow' as const, fillColor: '#6366f120', strokeColor: '#6366f1', strokeWidth: 3, cornerRadius: 0, shapeSize: 300 }) },
      { id: 'shape-line-h', label: 'Line —', icon: Minus, createBlock: () => ({ type: 'divider' as const, dividerStyle: 'solid' as const }) },
      { id: 'shape-line-gradient', label: 'Line ∿', icon: Zap, createBlock: () => ({ type: 'divider' as const, dividerStyle: 'gradient' as const }) },
    ],
  },
  {
    name: 'Images',
    items: [
      { id: 'image', label: 'Image', icon: Image, createBlock: () => ({ type: 'image' as const, src: '', alt: 'Image', fit: 'cover' as const }) },
      { id: 'image-full-left', label: 'Full Left', icon: ArrowLeft, createBlock: () => ({ type: 'image' as const, src: '', alt: 'Full Image', fit: 'cover' as const, fullHeight: true, fullHeightPosition: 'left' as const, style: { width: '960', height: '1080', padding: 0, posX: 0, posY: 0 } }) },
      { id: 'image-full-right', label: 'Full Right', icon: MoveRight, createBlock: () => ({ type: 'image' as const, src: '', alt: 'Full Image', fit: 'cover' as const, fullHeight: true, fullHeightPosition: 'right' as const, style: { width: '960', height: '1080', padding: 0, posX: 960, posY: 0 } }) },
      { id: 'image-full-top', label: 'Full Top', icon: ArrowUp, createBlock: () => ({ type: 'image' as const, src: '', alt: 'Full Image', fit: 'cover' as const, fullHeight: true, fullHeightPosition: 'top' as const, style: { width: '1920', height: '540', padding: 0, posX: 0, posY: 0 } }) },
      { id: 'image-full-bottom', label: 'Full Bottom', icon: ArrowDown, createBlock: () => ({ type: 'image' as const, src: '', alt: 'Full Image', fit: 'cover' as const, fullHeight: true, fullHeightPosition: 'bottom' as const, style: { width: '1920', height: '540', padding: 0, posX: 0, posY: 540 } }) },
      { id: 'gallery', label: 'Gallery', icon: GalleryHorizontalEnd, createBlock: () => ({ type: 'gallery' as const, images: [{ src: '', alt: 'Image 1' }, { src: '', alt: 'Image 2' }, { src: '', alt: 'Image 3' }], columns: 3 }) },
      { id: 'image-ai', label: 'AI Image', icon: Sparkles, createBlock: () => ({ type: 'image' as const, src: '', alt: 'AI Generated Image', fit: 'cover' as const }) },
      { id: 'image-icons', label: 'Icons', icon: Shapes, createBlock: () => ({ type: 'image' as const, src: '', alt: 'Icon', fit: 'contain' as const }) },
      { id: 'image-accent', label: 'Accent image', icon: Palette, createBlock: () => ({ type: 'image' as const, src: '', alt: 'Accent', fit: 'contain' as const }) },
      { id: 'qr-code', label: 'QR Code', icon: QrCode, createBlock: () => ({ type: 'embed' as const, embedType: 'custom' as const, url: '', aspectRatio: '1:1' }) },
    ],
  },
  // ── Icons Set ──
  {
    name: 'Icon Sets',
    items: [
      { id: 'icon-set-business', label: 'Business Icons', icon: BarChart3, createBlock: () => ({ type: 'icon-grid' as const, variant: 'solid-icons' as const, items: [{ icon: 'BarChart3', title: 'Analytics', description: '' }, { icon: 'DollarSign', title: 'Revenue', description: '' }, { icon: 'TrendingUp', title: 'Growth', description: '' }, { icon: 'Users', title: 'Partners', description: '' }] }) },
      { id: 'icon-set-tech', label: 'Tech Icons', icon: Zap, createBlock: () => ({ type: 'icon-grid' as const, variant: 'solid-icons' as const, items: [{ icon: 'Zap', title: 'Speed', description: '' }, { icon: 'Shield', title: 'Security', description: '' }, { icon: 'Cloud', title: 'Cloud', description: '' }, { icon: 'Cpu', title: 'AI', description: '' }] }) },
      { id: 'icon-set-social', label: 'Social Icons', icon: Heart, createBlock: () => ({ type: 'icon-grid' as const, variant: 'solid-icons' as const, items: [{ icon: 'Heart', title: 'Love', description: '' }, { icon: 'Users', title: 'Community', description: '' }, { icon: 'Globe', title: 'Global', description: '' }, { icon: 'Sparkles', title: 'Impact', description: '' }] }) },
      { id: 'icon-set-nature', label: 'Nature Icons', icon: Leaf, createBlock: () => ({ type: 'icon-grid' as const, variant: 'solid-icons' as const, items: [{ icon: 'Sprout', title: 'Growth', description: '' }, { icon: 'Leaf', title: 'Eco', description: '' }, { icon: 'Droplets', title: 'Water', description: '' }, { icon: 'Sun', title: 'Energy', description: '' }] }) },
      { id: 'icon-set-custom', label: 'Custom Grid', icon: LayoutGrid, createBlock: () => ({ type: 'icon-grid' as const, variant: 'solid-boxes' as const, items: [{ icon: 'Target', title: 'Item 1', description: 'Add description' }, { icon: 'Rocket', title: 'Item 2', description: 'Add description' }, { icon: 'Lightbulb', title: 'Item 3', description: 'Add description' }] }) },
    ],
  },
  {
    name: 'Charts & Graphs',
    items: [
      { id: 'chart-bar', label: 'Bar chart', icon: BarChart3, createBlock: () => ({ type: 'chart' as const, chartType: 'bar' as const, data: [{ label: 'A', value: 40 }, { label: 'B', value: 65 }, { label: 'C', value: 85 }], title: 'Bar Chart' }) },
      { id: 'chart-line', label: 'Line chart', icon: TrendingUp, createBlock: () => ({ type: 'chart' as const, chartType: 'line' as const, data: [{ label: 'Jan', value: 20 }, { label: 'Feb', value: 45 }, { label: 'Mar', value: 70 }], title: 'Line Chart' }) },
      { id: 'chart-area', label: 'Area chart', icon: AreaChart, createBlock: () => ({ type: 'chart' as const, chartType: 'area' as const, data: [{ label: 'Q1', value: 30 }, { label: 'Q2', value: 55 }, { label: 'Q3', value: 80 }, { label: 'Q4', value: 65 }], title: 'Area Chart' }) },
      { id: 'chart-pie', label: 'Pie chart', icon: PieChart, createBlock: () => ({ type: 'chart' as const, chartType: 'pie' as const, data: [{ label: 'A', value: 40 }, { label: 'B', value: 35 }, { label: 'C', value: 25 }], title: 'Pie Chart' }) },
      { id: 'chart-donut', label: 'Donut chart', icon: Circle, createBlock: () => ({ type: 'chart' as const, chartType: 'donut' as const, data: [{ label: 'A', value: 40 }, { label: 'B', value: 35 }, { label: 'C', value: 25 }], title: 'Donut Chart' }) },
      { id: 'chart-scatter', label: 'Scatter plot', icon: ScatterChart, createBlock: () => ({ type: 'chart' as const, chartType: 'scatter' as const, data: [{ label: 'A', value: 30, value2: 40 }, { label: 'B', value: 50, value2: 60 }, { label: 'C', value: 70, value2: 45 }], title: 'Scatter Plot' }) },
      { id: 'chart-radar', label: 'Radar chart', icon: Radar, createBlock: () => ({ type: 'chart' as const, chartType: 'radar' as const, data: [{ label: 'Speed', value: 80 }, { label: 'Power', value: 65 }, { label: 'Agility', value: 90 }, { label: 'Endurance', value: 70 }, { label: 'Skill', value: 85 }], title: 'Radar Chart' }) },
      { id: 'chart-stacked', label: 'Stacked bar', icon: BarChart3, createBlock: () => ({ type: 'chart' as const, chartType: 'stacked-bar' as const, data: [{ label: 'Q1', value: 40, value2: 30 }, { label: 'Q2', value: 55, value2: 25 }, { label: 'Q3', value: 45, value2: 35 }], title: 'Stacked Bar' }) },
      { id: 'chart-funnel', label: 'Funnel chart', icon: ChevronDown, createBlock: () => ({ type: 'chart' as const, chartType: 'funnel' as const, data: [{ label: 'Visitors', value: 1000 }, { label: 'Leads', value: 600 }, { label: 'Prospects', value: 300 }, { label: 'Customers', value: 100 }], title: 'Funnel' }) },
      { id: 'chart-waterfall', label: 'Waterfall', icon: BarChart3, createBlock: () => ({ type: 'chart' as const, chartType: 'waterfall' as const, data: [{ label: 'Start', value: 100 }, { label: 'Revenue', value: 50 }, { label: 'Costs', value: -30 }, { label: 'Tax', value: -10 }, { label: 'Net', value: 110 }], title: 'Waterfall' }) },
      { id: 'chart-combo', label: 'Combo chart', icon: BarChart3, createBlock: () => ({ type: 'chart' as const, chartType: 'combo' as const, data: [{ label: 'Jan', value: 40, value2: 20 }, { label: 'Feb', value: 55, value2: 35 }, { label: 'Mar', value: 70, value2: 50 }], title: 'Combo Chart' }) },
    ],
  },
  {
    name: 'Videos & Media',
    items: [
      { id: 'embed-video', label: 'Video', icon: Video, createBlock: () => ({ type: 'embed' as const, embedType: 'video' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-youtube', label: 'YouTube', icon: YouTubeIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'youtube' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-vimeo', label: 'Vimeo', icon: VimeoIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'vimeo' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-loom', label: 'Loom', icon: LoomIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'loom' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-tiktok', label: 'TikTok', icon: TikTokIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'tiktok' as const, url: '', aspectRatio: '9:16' }) },
      { id: 'embed-spotify', label: 'Spotify', icon: SpotifyIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'spotify' as const, url: '', aspectRatio: '16:9' }) },
    ],
  },
  {
    name: 'Embed Apps & Web',
    items: [
      { id: 'embed-webpage', label: 'Webpage', icon: Globe, createBlock: () => ({ type: 'embed' as const, embedType: 'webpage' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-figma', label: 'Figma', icon: FigmaIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'figma' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-gdrive', label: 'Google Drive', icon: GoogleDriveIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'google-drive' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-tweet', label: 'Tweet', icon: TwitterIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'tweet' as const, url: '' }) },
      { id: 'embed-instagram', label: 'Instagram', icon: InstagramIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'instagram' as const, url: '' }) },
      { id: 'embed-miro', label: 'Miro', icon: MiroIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'miro' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-airtable', label: 'Airtable', icon: AirtableIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'airtable' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-powerbi', label: 'Power BI', icon: PowerBIIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'powerbi' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-office', label: 'Office 365', icon: FileText, createBlock: () => ({ type: 'embed' as const, embedType: 'office365' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-amplitude', label: 'Amplitude', icon: TrendingUp, createBlock: () => ({ type: 'embed' as const, embedType: 'amplitude' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-custom', label: 'Custom embed', icon: ExternalLink, createBlock: () => ({ type: 'embed' as const, embedType: 'custom' as const, url: '', aspectRatio: '16:9' }) },
    ],
  },
  {
    name: 'Forms & Buttons',
    items: [
      { id: 'btn-primary', label: 'Button', icon: MousePointer, createBlock: () => ({ type: 'button-block' as const, text: 'Click me', url: '#', variant: 'primary' as const }) },
      { id: 'btn-outline', label: 'Outline btn', icon: MousePointer, createBlock: () => ({ type: 'button-block' as const, text: 'Learn more', url: '#', variant: 'outline' as const }) },
      { id: 'embed-calendly', label: 'Calendly', icon: CalendlyIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'calendly' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-typeform', label: 'Typeform', icon: TypeformIcon, createBlock: () => ({ type: 'embed' as const, embedType: 'typeform' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-gform', label: 'Google Form', icon: FileText, createBlock: () => ({ type: 'embed' as const, embedType: 'google-form' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-jotform', label: 'Jotform', icon: FileText, createBlock: () => ({ type: 'embed' as const, embedType: 'jotform' as const, url: '', aspectRatio: '16:9' }) },
      { id: 'embed-tally', label: 'Tally', icon: FileText, createBlock: () => ({ type: 'embed' as const, embedType: 'tally' as const, url: '', aspectRatio: '16:9' }) },
    ],
  },
  {
    name: 'Smart Layouts › Columns',
    items: [
      { id: 'icon-grid-2col', label: '2 Columns', icon: Columns2, createBlock: () => ({ type: 'icon-grid' as const, variant: 'solid-boxes' as const, items: [{ icon: 'MapPin', title: 'Column 1', description: 'Content' }, { icon: 'MapPin', title: 'Column 2', description: 'Content' }] }) },
      { id: 'icon-grid-3col', label: '3 Columns', icon: Columns3, createBlock: () => ({ type: 'icon-grid' as const, variant: 'solid-boxes' as const, items: [{ icon: 'MapPin', title: 'Col 1', description: 'Content' }, { icon: 'MapPin', title: 'Col 2', description: 'Content' }, { icon: 'MapPin', title: 'Col 3', description: 'Content' }] }) },
      { id: 'icon-grid-4col', label: '4 Columns', icon: Columns4, createBlock: () => ({ type: 'icon-grid' as const, variant: 'solid-boxes' as const, items: [{ icon: 'MapPin', title: 'Col 1', description: '' }, { icon: 'MapPin', title: 'Col 2', description: '' }, { icon: 'MapPin', title: 'Col 3', description: '' }, { icon: 'MapPin', title: 'Col 4', description: '' }] }) },
    ],
  },
  {
    name: 'Smart Layouts › Boxes',
    items: [
      { id: 'boxes-solid', label: 'Solid boxes', icon: Square, createBlock: () => ({ type: 'icon-grid' as const, variant: 'solid-boxes' as const, items: [{ icon: 'Target', title: 'Item 1', description: 'Description' }, { icon: 'Rocket', title: 'Item 2', description: 'Description' }, { icon: 'Lightbulb', title: 'Item 3', description: 'Description' }] }) },
      { id: 'boxes-solid-icons', label: 'Solid + icons', icon: Square, createBlock: () => ({ type: 'icon-grid' as const, variant: 'solid-icons' as const, items: [{ icon: 'Target', title: 'Item 1', description: 'Description' }, { icon: 'Rocket', title: 'Item 2', description: 'Description' }, { icon: 'Lightbulb', title: 'Item 3', description: 'Description' }] }) },
      { id: 'boxes-outline', label: 'Outline', icon: SquareDashed, createBlock: () => ({ type: 'icon-grid' as const, variant: 'outline-boxes' as const, items: [{ icon: 'Target', title: 'Item 1', description: 'Description' }, { icon: 'Rocket', title: 'Item 2', description: 'Description' }, { icon: 'Lightbulb', title: 'Item 3', description: 'Description' }] }) },
      { id: 'boxes-sideline', label: 'Side line', icon: SeparatorHorizontal, createBlock: () => ({ type: 'icon-grid' as const, variant: 'side-line' as const, items: [{ icon: 'Target', title: 'Item 1', description: 'Description' }, { icon: 'Rocket', title: 'Item 2', description: 'Description' }] }) },
      { id: 'boxes-sideline-text', label: 'Side line text', icon: SeparatorHorizontal, createBlock: () => ({ type: 'icon-grid' as const, variant: 'side-line-text' as const, items: [{ icon: 'Target', title: 'Item 1', description: 'Description' }, { icon: 'Rocket', title: 'Item 2', description: 'Description' }] }) },
      { id: 'boxes-topline', label: 'Top line', icon: Minus, createBlock: () => ({ type: 'icon-grid' as const, variant: 'top-line' as const, items: [{ icon: 'Target', title: 'Item 1', description: 'Description' }, { icon: 'Rocket', title: 'Item 2', description: 'Description' }] }) },
      { id: 'boxes-topline-text', label: 'Top line text', icon: Minus, createBlock: () => ({ type: 'icon-grid' as const, variant: 'top-line-text' as const, items: [{ icon: 'Target', title: 'Item 1', description: 'Description' }, { icon: 'Rocket', title: 'Item 2', description: 'Description' }] }) },
      { id: 'boxes-topcircle', label: 'Top circle', icon: CircleDot, createBlock: () => ({ type: 'icon-grid' as const, variant: 'top-circle' as const, items: [{ icon: 'Target', title: 'Item 1', description: 'Description' }, { icon: 'Rocket', title: 'Item 2', description: 'Description' }] }) },
      { id: 'boxes-joined', label: 'Joined', icon: LayoutGrid, createBlock: () => ({ type: 'icon-grid' as const, variant: 'joined' as const, items: [{ icon: 'Target', title: 'Item 1', description: 'Desc' }, { icon: 'Rocket', title: 'Item 2', description: 'Desc' }, { icon: 'Lightbulb', title: 'Item 3', description: 'Desc' }] }) },
      { id: 'boxes-joined-icons', label: 'Joined + icons', icon: LayoutGrid, createBlock: () => ({ type: 'icon-grid' as const, variant: 'joined-icons' as const, items: [{ icon: 'Target', title: 'Item 1', description: 'Desc' }, { icon: 'Rocket', title: 'Item 2', description: 'Desc' }] }) },
      { id: 'boxes-leaf', label: 'Leaf', icon: Leaf, createBlock: () => ({ type: 'icon-grid' as const, variant: 'leaf' as const, items: [{ icon: 'Sprout', title: 'Item 1', description: 'Description' }, { icon: 'Leaf', title: 'Item 2', description: 'Description' }] }) },
      { id: 'boxes-labeled', label: 'Labeled', icon: Tag, createBlock: () => ({ type: 'icon-grid' as const, variant: 'labeled' as const, items: [{ icon: 'Tag', title: 'Label 1', description: 'Description' }, { icon: 'Tag', title: 'Label 2', description: 'Description' }] }) },
      { id: 'boxes-alternating', label: 'Alternating', icon: ArrowRightLeft, createBlock: () => ({ type: 'icon-grid' as const, variant: 'alternating' as const, items: [{ icon: 'Target', title: 'Left 1', description: 'Description' }, { icon: 'Rocket', title: 'Right 1', description: 'Description' }, { icon: 'Lightbulb', title: 'Left 2', description: 'Description' }, { icon: 'Star', title: 'Right 2', description: 'Description' }] }) },
    ],
  },
  {
    name: 'Smart Layouts › Bullets',
    items: [
      { id: 'card-grid-lg', label: 'Large bullets', icon: List, createBlock: () => ({ type: 'card-grid' as const, cards: [{ icon: 'Target', title: 'Point 1', description: 'Detailed description' }, { icon: 'Rocket', title: 'Point 2', description: 'Detailed description' }] }) },
      { id: 'icon-list-sm', label: 'Small bullets', icon: List, createBlock: () => ({ type: 'icon-list' as const, items: [{ icon: 'ArrowRight', title: 'Point 1', description: 'Brief' }, { icon: 'ArrowRight', title: 'Point 2', description: 'Brief' }] }) },
      { id: 'icon-list-arrow', label: 'Arrow bullets', icon: ArrowRight, createBlock: () => ({ type: 'icon-list' as const, items: [{ icon: 'ChevronRight', title: 'Item 1', description: 'Detail' }, { icon: 'ChevronRight', title: 'Item 2', description: 'Detail' }] }) },
      { id: 'process-steps', label: 'Process steps', icon: Footprints, createBlock: () => ({ type: 'numbered-list' as const, items: [{ title: 'Step 1', description: 'Do this' }, { title: 'Step 2', description: 'Then this' }, { title: 'Step 3', description: 'Finally' }] }) },
    ],
  },
  {
    name: 'Smart Layouts › Sequence',
    items: [
      { id: 'timeline-full', label: 'Timeline', icon: ArrowRightLeft, createBlock: () => ({ type: 'timeline' as const, items: [{ year: '2023', title: 'Phase 1', description: 'Start' }, { year: '2024', title: 'Phase 2', description: 'Grow' }, { year: '2025', title: 'Phase 3', description: 'Scale' }] }) },
      { id: 'process-minimal', label: 'Minimal', icon: Minus, createBlock: () => ({ type: 'process-flow' as const, variant: 'timeline-minimal' as const, items: [{ title: 'Step 1' }, { title: 'Step 2' }, { title: 'Step 3' }] }) },
      { id: 'process-timeline-boxes', label: 'Timeline boxes', icon: Box, createBlock: () => ({ type: 'process-flow' as const, variant: 'timeline-boxes' as const, items: [{ title: 'Phase 1', description: 'Start' }, { title: 'Phase 2', description: 'Build' }, { title: 'Phase 3', description: 'Launch' }] }) },
      { id: 'process-arrows', label: 'Arrows', icon: ArrowRight, createBlock: () => ({ type: 'process-flow' as const, variant: 'arrows' as const, items: [{ title: 'Start', description: 'Begin here' }, { title: 'Process', description: 'Work happens' }, { title: 'End', description: 'Complete' }] }) },
      { id: 'process-pills', label: 'Pills', icon: ToggleLeft, createBlock: () => ({ type: 'process-flow' as const, variant: 'pills' as const, items: [{ title: 'Phase 1' }, { title: 'Phase 2' }, { title: 'Phase 3' }, { title: 'Phase 4' }] }) },
      { id: 'process-slanted', label: 'Slanted labels', icon: ArrowRight, createBlock: () => ({ type: 'process-flow' as const, variant: 'slanted-labels' as const, items: [{ title: 'Discover' }, { title: 'Define' }, { title: 'Develop' }, { title: 'Deliver' }] }) },
    ],
  },
  {
    name: 'Smart Layouts › Numbers',
    items: [
      { id: 'stats-plain', label: 'Stats', icon: Hash, createBlock: () => ({ type: 'stats' as const, variant: 'plain' as const, items: [{ label: 'Users', value: 10000, suffix: '+' }, { label: 'Revenue', value: 2.5, suffix: 'M' }, { label: 'Growth', value: 42, suffix: '%' }] }) },
      { id: 'stats-circle', label: 'Circle stats', icon: Circle, createBlock: () => ({ type: 'stats' as const, variant: 'circle' as const, items: [{ label: 'Complete', value: 75, max: 100 }, { label: 'Active', value: 60, max: 100 }] }) },
      { id: 'stats-circle-bold', label: 'Circle bold', icon: Circle, createBlock: () => ({ type: 'stats' as const, variant: 'circle-bold' as const, items: [{ label: 'Score', value: 92, max: 100 }, { label: 'Accuracy', value: 87, max: 100 }] }) },
      { id: 'stats-bar', label: 'Bar stats', icon: BarChart3, createBlock: () => ({ type: 'stats' as const, variant: 'bar' as const, items: [{ label: 'Q1', value: 80, max: 100 }, { label: 'Q2', value: 65, max: 100 }, { label: 'Q3', value: 90, max: 100 }] }) },
      { id: 'stats-star', label: 'Star rating', icon: Star, createBlock: () => ({ type: 'stats' as const, variant: 'star-rating' as const, items: [{ label: 'Quality', value: 4, max: 5 }, { label: 'Service', value: 5, max: 5 }] }) },
      { id: 'stats-dots', label: 'Dot grid', icon: Target, createBlock: () => ({ type: 'stats' as const, variant: 'dot-grid' as const, items: [{ label: 'Progress', value: 7, max: 10 }] }) },
      { id: 'stats-dot-line', label: 'Dot line', icon: Minus, createBlock: () => ({ type: 'stats' as const, variant: 'dot-line' as const, items: [{ label: 'Stage', value: 3, max: 5 }] }) },
    ],
  },
  {
    name: 'Smart Layouts › Circles',
    items: [
      { id: 'cycle', label: 'Cycle', icon: RefreshCw, createBlock: () => ({ type: 'cycle-diagram' as const, variant: 'cycle' as const, items: [{ label: 'Plan' }, { label: 'Do' }, { label: 'Check' }, { label: 'Act' }] }) },
      { id: 'flower', label: 'Flower', icon: Flower2, createBlock: () => ({ type: 'cycle-diagram' as const, variant: 'flower' as const, items: [{ label: 'Petal 1' }, { label: 'Petal 2' }, { label: 'Petal 3' }, { label: 'Petal 4' }, { label: 'Petal 5' }] }) },
      { id: 'ring', label: 'Ring', icon: Circle, createBlock: () => ({ type: 'cycle-diagram' as const, variant: 'ring' as const, items: [{ label: 'Segment 1' }, { label: 'Segment 2' }, { label: 'Segment 3' }] }) },
      { id: 'semi-circle', label: 'Semi-circle', icon: CircleDashed, createBlock: () => ({ type: 'cycle-diagram' as const, variant: 'semi-circle' as const, items: [{ label: 'A' }, { label: 'B' }, { label: 'C' }] }) },
    ],
  },
  {
    name: 'Smart Layouts › Quotes',
    items: [
      { id: 'quote-box', label: 'Quote box', icon: MessageSquare, createBlock: () => ({ type: 'quote-box' as const, variant: 'quote-box' as const, text: 'A powerful quote goes here', attribution: 'Speaker Name' }) },
      { id: 'speech-bubble', label: 'Speech bubble', icon: MessageCircle, createBlock: () => ({ type: 'quote-box' as const, variant: 'speech-bubble' as const, text: 'What they said...', attribution: 'Person' }) },
    ],
  },
  {
    name: 'Smart Layouts › Steps',
    items: [
      { id: 'steps-staircase', label: 'Staircase', icon: TrendingUp, createBlock: () => ({ type: 'steps' as const, variant: 'staircase' as const, items: [{ title: 'Step 1', description: 'Begin' }, { title: 'Step 2', description: 'Progress' }, { title: 'Step 3', description: 'Complete' }] }) },
      { id: 'steps-box', label: 'Box steps', icon: Box, createBlock: () => ({ type: 'steps' as const, variant: 'box' as const, items: [{ title: 'Phase 1', description: 'Foundation' }, { title: 'Phase 2', description: 'Build' }, { title: 'Phase 3', description: 'Launch' }] }) },
      { id: 'steps-arrow', label: 'Arrow steps', icon: ArrowRight, createBlock: () => ({ type: 'steps' as const, variant: 'arrow' as const, items: [{ title: 'Input', description: '' }, { title: 'Process', description: '' }, { title: 'Output', description: '' }] }) },
      { id: 'steps-icons', label: 'Icon steps', icon: Sparkles, createBlock: () => ({ type: 'steps' as const, variant: 'steps-icons' as const, items: [{ title: 'Research', description: 'Gather data', icon: 'Search' }, { title: 'Design', description: 'Create solution', icon: 'Palette' }, { title: 'Build', description: 'Implement', icon: 'Wrench' }] }) },
      { id: 'steps-pyramid', label: 'Pyramid', icon: Triangle, createBlock: () => ({ type: 'steps' as const, variant: 'pyramid' as const, items: [{ title: 'Top', description: '' }, { title: 'Middle', description: '' }, { title: 'Base', description: '' }] }) },
      { id: 'steps-funnel', label: 'Funnel', icon: ChevronDown, createBlock: () => ({ type: 'steps' as const, variant: 'funnel' as const, items: [{ title: 'Awareness', description: '1000' }, { title: 'Interest', description: '500' }, { title: 'Decision', description: '200' }, { title: 'Action', description: '50' }] }) },
    ],
  },
  {
    name: 'Smart Diagrams',
    items: [
      { id: 'venn', label: 'Venn', icon: Circle, createBlock: () => ({ type: 'venn-diagram' as const, items: [{ label: 'Set A', description: 'First group' }, { label: 'Set B', description: 'Second group' }, { label: 'Both', description: 'Overlap' }] }) },
      { id: 'target-diagram', label: 'Target', icon: Target, createBlock: () => ({ type: 'cycle-diagram' as const, variant: 'ring' as const, items: [{ label: 'Core' }, { label: 'Inner' }, { label: 'Outer' }] }) },
      { id: 'orbit-diagram', label: 'Orbit', icon: Orbit, createBlock: () => ({ type: 'cycle-diagram' as const, variant: 'cycle' as const, items: [{ label: 'Center' }, { label: 'Satellite 1' }, { label: 'Satellite 2' }, { label: 'Satellite 3' }] }) },
      { id: 'quadrant', label: 'Quadrant', icon: LayoutGrid, createBlock: () => ({ type: 'comparison' as const, left: { title: 'Category A', items: ['High Impact', 'Low Impact'] }, right: { title: 'Category B', items: ['High Effort', 'Low Effort'] } }) },
      { id: 'versus', label: 'Versus', icon: Split, createBlock: () => ({ type: 'comparison' as const, left: { title: 'Option A', items: ['Pro 1', 'Pro 2'] }, right: { title: 'Option B', items: ['Pro 1', 'Pro 2'] } }) },
      { id: 'puzzle', label: 'Puzzle', icon: Puzzle, createBlock: () => ({ type: 'icon-grid' as const, variant: 'joined' as const, items: [{ icon: 'Puzzle', title: 'Piece 1', description: 'Part of whole' }, { icon: 'Puzzle', title: 'Piece 2', description: 'Part of whole' }, { icon: 'Puzzle', title: 'Piece 3', description: 'Part of whole' }, { icon: 'Puzzle', title: 'Piece 4', description: 'Part of whole' }] }) },
      { id: 'bullseye', label: 'Bullseye', icon: Crosshair, createBlock: () => ({ type: 'stats' as const, variant: 'circle' as const, items: [{ label: 'Target', value: 95, max: 100 }] }) },
      { id: 'infinity-loop', label: 'Infinity', icon: Infinity, createBlock: () => ({ type: 'process-flow' as const, variant: 'pills' as const, items: [{ title: 'Create' }, { title: 'Test' }, { title: 'Deploy' }, { title: 'Monitor' }] }) },
    ],
  },
  {
    name: 'Metrics',
    items: [
      { id: 'metric-single', label: 'Metric', icon: Hash, createBlock: () => ({ type: 'metric' as const, value: '99%', label: 'Uptime', trend: 'up' as const }) },
      { id: 'progress-bar', label: 'Progress bars', icon: BarChart3, createBlock: () => ({ type: 'progress' as const, items: [{ label: 'Complete', value: 75 }, { label: 'In Progress', value: 45 }] }) },
    ],
  },
  {
    name: 'Logos',
    items: [
      { id: 'logo-google', label: 'Google Logo', icon: Globe, createBlock: () => ({ type: 'image' as const, src: 'https://www.google.com/s2/favicons?domain=google.com&sz=128', alt: 'Google', fit: 'contain' as const }) },
      { id: 'logo-apple', label: 'Apple Logo', icon: Globe, createBlock: () => ({ type: 'image' as const, src: 'https://www.google.com/s2/favicons?domain=apple.com&sz=128', alt: 'Apple', fit: 'contain' as const }) },
      { id: 'logo-microsoft', label: 'Microsoft Logo', icon: Globe, createBlock: () => ({ type: 'image' as const, src: 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=128', alt: 'Microsoft', fit: 'contain' as const }) },
      { id: 'logo-amazon', label: 'Amazon Logo', icon: Globe, createBlock: () => ({ type: 'image' as const, src: 'https://www.google.com/s2/favicons?domain=amazon.com&sz=128', alt: 'Amazon', fit: 'contain' as const }) },
      { id: 'logo-meta', label: 'Meta Logo', icon: Globe, createBlock: () => ({ type: 'image' as const, src: 'https://www.google.com/s2/favicons?domain=meta.com&sz=128', alt: 'Meta', fit: 'contain' as const }) },
      { id: 'logo-netflix', label: 'Netflix Logo', icon: Globe, createBlock: () => ({ type: 'image' as const, src: 'https://www.google.com/s2/favicons?domain=netflix.com&sz=128', alt: 'Netflix', fit: 'contain' as const }) },
      { id: 'logo-slack', label: 'Slack Logo', icon: Globe, createBlock: () => ({ type: 'image' as const, src: 'https://www.google.com/s2/favicons?domain=slack.com&sz=128', alt: 'Slack', fit: 'contain' as const }) },
      { id: 'logo-stripe', label: 'Stripe Logo', icon: Globe, createBlock: () => ({ type: 'image' as const, src: 'https://www.google.com/s2/favicons?domain=stripe.com&sz=128', alt: 'Stripe', fit: 'contain' as const }) },
      { id: 'logo-custom', label: 'Custom Logo (domain)', icon: Search, createBlock: () => ({ type: 'image' as const, src: 'https://www.google.com/s2/favicons?domain=example.com&sz=128', alt: 'Custom Logo', fit: 'contain' as const }) },
    ],
  },
  {
    name: 'Diagram Builder',
    items: [
      { id: 'diagram-builder', label: 'Open Diagram Builder', icon: PenTool, createBlock: () => ({ type: 'image' as const, src: '', alt: 'Diagram', fit: 'contain' as const }) },
    ],
  },
  {
    name: '3D Objects',
    items: [
      { id: '3d-cube', label: 'Rotating Cube', icon: Box, createBlock: () => ({ type: 'scene-3d' as const, preset: 'cube' as const, autoRotate: true }) },
      { id: '3d-sphere', label: 'Sphere', icon: Circle, createBlock: () => ({ type: 'scene-3d' as const, preset: 'sphere' as const, autoRotate: true }) },
      { id: '3d-torus', label: 'Torus Knot', icon: Infinity, createBlock: () => ({ type: 'scene-3d' as const, preset: 'torus' as const, autoRotate: true }) },
      { id: '3d-globe', label: 'Globe', icon: Globe, createBlock: () => ({ type: 'scene-3d' as const, preset: 'globe' as const, autoRotate: true }) },
      { id: '3d-product', label: 'Product Stage', icon: Layers, createBlock: () => ({ type: 'scene-3d' as const, preset: 'product-stage' as const, autoRotate: true }) },
      { id: '3d-particles', label: 'Particles', icon: Sparkles, createBlock: () => ({ type: 'scene-3d' as const, preset: 'particles' as const, autoRotate: true }) },
    ],
  },
  {
    name: 'Dynamic & Interactive',
    items: [
      { id: 'countdown', label: 'Countdown', icon: Timer, createBlock: () => ({ type: 'countdown' as const, targetDate: new Date(Date.now() + 7 * 86400000).toISOString(), label: 'Launching in' }) },
      { id: 'animated-counter', label: 'Counter', icon: Hash, createBlock: () => ({ type: 'animated-counter' as const, value: 10000, prefix: '', suffix: '+', label: 'Users worldwide', duration: 2000 }) },
      { id: 'before-after', label: 'Before / After', icon: AlignHorizontalSpaceAround, createBlock: () => ({ type: 'before-after' as const, beforeSrc: '', afterSrc: '', beforeLabel: 'Before', afterLabel: 'After' }) },
      { id: 'toggle-reveal', label: 'Toggle Reveal', icon: Eye, createBlock: () => ({ type: 'toggle-reveal' as const, prompt: 'What is the answer?', reveal: 'Click to find out!', variant: 'flip' as const }) },
      { id: 'live-ticker', label: 'Live Ticker', icon: Play, createBlock: () => ({ type: 'live-ticker' as const, items: ['Breaking News', 'Important Update', 'New Feature Released', 'Join us today'], speed: 30, direction: 'left' as const }) },
    ],
  },
  // ── Phase 5 — Premium Components ──
  {
    name: 'Containers & Layout',
    items: [
      { id: 'container-flex', label: 'Flex Container', icon: Frame, createBlock: () => ({ type: 'container' as const, children: [], containerLayout: 'flex' as const }) },
      { id: 'container-grid', label: 'Grid Container', icon: LayoutGrid, createBlock: () => ({ type: 'container' as const, children: [], containerLayout: 'grid' as const }) },
      { id: 'stack-h', label: 'H Stack', icon: Columns3, createBlock: () => ({ type: 'stack' as const, children: [], direction: 'horizontal' as const, spacing: 16, alignment: 'center' as const }) },
      { id: 'stack-v', label: 'V Stack', icon: Layers, createBlock: () => ({ type: 'stack' as const, children: [], direction: 'vertical' as const, spacing: 12, alignment: 'stretch' as const }) },
      { id: 'spacer', label: 'Spacer', icon: Minus, createBlock: () => ({ type: 'spacer' as const, size: 40 }) },
      { id: 'repeater', label: 'Repeater', icon: Layers, createBlock: () => ({ type: 'repeater' as const, templateBlockType: 'card', data: [{ title: 'Item 1', value: 'Value' }, { title: 'Item 2', value: 'Value' }], columns: 3 }) },
    ],
  },
  {
    name: 'Navigation & UI',
    items: [
      { id: 'accordion', label: 'Accordion', icon: Layers, createBlock: () => ({ type: 'accordion' as const, items: [{ title: 'Section 1', content: 'Content here...', defaultOpen: true }, { title: 'Section 2', content: 'More content...' }, { title: 'Section 3', content: 'Even more...' }] }) },
      { id: 'tabs', label: 'Tabs', icon: Layers, createBlock: () => ({ type: 'tabs' as const, tabs: [{ label: 'Tab 1', content: 'Tab 1 content' }, { label: 'Tab 2', content: 'Tab 2 content' }] }) },
      { id: 'nav-bar', label: 'Nav Bar', icon: Layers, createBlock: () => ({ type: 'nav-bar' as const, links: [{ label: 'Home', url: '#' }, { label: 'About', url: '#' }, { label: 'Contact', url: '#' }], variant: 'full' as const }) },
      { id: 'badge', label: 'Badge', icon: Tag, createBlock: () => ({ type: 'badge' as const, text: 'New', variant: 'default' as const }) },
    ],
  },
  {
    name: 'Hero & Banners',
    items: [
      { id: 'banner', label: 'Banner', icon: Layers, createBlock: () => ({ type: 'banner' as const, heading: 'Your Headline Here', subheading: 'Supporting text', ctaText: 'Get Started', height: 400 }) },
      { id: 'cta-section', label: 'CTA Section', icon: Layers, createBlock: () => ({ type: 'cta-section' as const, heading: 'Ready to Get Started?', subheading: 'Join thousands of happy customers', primaryButtonText: 'Start Free', secondaryButtonText: 'Learn More' }) },
      { id: 'video-bg', label: 'Video BG', icon: Video, createBlock: () => ({ type: 'video-bg' as const, src: '', autoplay: true, loop: true, muted: true }) },
    ],
  },
  {
    name: 'Social & People',
    items: [
      { id: 'avatar', label: 'Avatar', icon: Layers, createBlock: () => ({ type: 'avatar' as const, src: '', name: 'John Doe', role: 'CEO', size: 64 }) },
      { id: 'testimonial', label: 'Testimonial', icon: MessageSquare, createBlock: () => ({ type: 'testimonial' as const, quote: 'This product changed everything.', name: 'Jane Smith', role: 'VP Engineering', rating: 5 }) },
      { id: 'social-links', label: 'Social Links', icon: Globe, createBlock: () => ({ type: 'social-links' as const, links: [{ platform: 'twitter', url: '#' }, { platform: 'linkedin', url: '#' }, { platform: 'github', url: '#' }], variant: 'icons-only' as const }) },
    ],
  },
  {
    name: 'Business',
    items: [
      { id: 'pricing-table', label: 'Pricing Table', icon: Layers, createBlock: () => ({ type: 'pricing-table' as const, plans: [{ name: 'Starter', price: '$9', period: 'mo', features: ['Feature 1', 'Feature 2'] }, { name: 'Pro', price: '$29', period: 'mo', features: ['Everything in Starter', 'Feature 3'], highlighted: true }, { name: 'Enterprise', price: '$99', period: 'mo', features: ['Everything in Pro', 'Priority support'] }] }) },
      { id: 'feature-grid', label: 'Feature Grid', icon: LayoutGrid, createBlock: () => ({ type: 'feature-grid' as const, features: [{ icon: 'Zap', title: 'Fast', description: 'Lightning speed' }, { icon: 'Shield', title: 'Secure', description: 'Enterprise grade' }, { icon: 'Heart', title: 'Loved', description: 'By thousands' }], columns: 3 }) },
      { id: 'logo-cloud', label: 'Logo Cloud', icon: Globe, createBlock: () => ({ type: 'logo-cloud' as const, logos: [{ src: '', alt: 'Company 1' }, { src: '', alt: 'Company 2' }, { src: '', alt: 'Company 3' }], variant: 'grid' as const }) },
    ],
  },
  {
    name: 'Decorative',
    items: [
      { id: 'gradient-shape', label: 'Gradient Shape', icon: Circle, createBlock: () => ({ type: 'gradient-shape' as const, shape: 'blob' as const, colors: ['#6366f1', '#ec4899'], size: 200, blur: 0 }) },
      { id: 'custom-svg', label: 'Custom SVG', icon: PenTool, createBlock: () => ({ type: 'custom-svg' as const, svgCode: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#6366f1" opacity="0.3"/></svg>' }) },
      { id: 'marquee', label: 'Marquee', icon: Play, createBlock: () => ({ type: 'marquee' as const, items: ['Item 1', 'Item 2', 'Item 3', 'Item 4'], speed: 20, direction: 'left' as const }) },
    ],
  },
  // ── GIF, Lottie & Stickers ──
  {
    name: 'GIF & Animation',
    items: [
      { id: 'gif', label: 'GIF', icon: Image, createBlock: () => ({ type: 'gif' as const, src: '', alt: 'GIF', fit: 'contain' as const }) },
      { id: 'lottie', label: 'Lottie', icon: Play, createBlock: () => ({ type: 'lottie' as const, src: '', loop: true, autoplay: true }) },
      { id: 'sticker', label: 'Sticker', icon: Sparkles, createBlock: () => ({ type: 'sticker' as const, src: '', stickerSize: 200 }) },
    ],
  },
  // ── Phase 6 — Design-Centric Blocks ──
  {
    name: 'Design › Layouts',
    items: [
      { id: 'bento-grid', label: 'Bento Grid', icon: LayoutDashboard, createBlock: () => ({ type: 'bento-grid' as const, items: [{ title: 'Feature One', description: 'Key capability', icon: 'Zap', span: 'wide' as const }, { title: 'Analytics', description: 'Real-time data', icon: 'BarChart3', span: 'normal' as const }, { title: 'Security', description: 'Enterprise grade', icon: 'Shield', span: 'tall' as const }, { title: 'Global Scale', description: 'Worldwide reach', icon: 'Globe', span: 'normal' as const }, { title: 'AI Powered', description: 'Smart automation', icon: 'Sparkles', span: 'large' as const }] }) },
      { id: 'split-screen', label: 'Split Screen', icon: SplitSquareHorizontal, createBlock: () => ({ type: 'split-screen' as const, leftContent: { heading: 'Build Something Great', description: 'Create stunning presentations with our powerful design engine.', ctaText: 'Get Started' }, rightContent: { type: 'color' as const, value: 'linear-gradient(135deg, #6366f1, #ec4899)' }, splitRatio: 50 }) },
      { id: 'floating-cards', label: 'Floating Cards', icon: CreditCard, createBlock: () => ({ type: 'floating-cards' as const, cards: [{ title: 'Design', description: 'Beautiful interfaces', icon: 'Palette', rotation: -4 }, { title: 'Develop', description: 'Clean code', icon: 'Code', rotation: 2 }, { title: 'Deploy', description: 'Ship fast', icon: 'Rocket', rotation: -2 }] }) },
    ],
  },
  {
    name: 'Design › Visual',
    items: [
      { id: 'glass-card', label: 'Glass Card', icon: GlassWater, createBlock: () => ({ type: 'glass-card' as const, heading: 'Premium Feature', description: 'Experience the next level of design with glassmorphism effects.', icon: 'Sparkles' }) },
      { id: 'gradient-text', label: 'Gradient Text', icon: Paintbrush, createBlock: () => ({ type: 'gradient-text' as const, text: 'Make it Bold.', gradientFrom: '#6366f1', gradientTo: '#ec4899', fontSize: 80 }) },
    ],
  },
  {
    name: 'Design › Mockups',
    items: [
      { id: 'mockup-browser', label: 'Browser Frame', icon: Monitor, createBlock: () => ({ type: 'mockup-frame' as const, frameType: 'browser' as const, contentSrc: '', url: 'https://yourapp.com' }) },
      { id: 'mockup-phone', label: 'Phone Frame', icon: Smartphone, createBlock: () => ({ type: 'mockup-frame' as const, frameType: 'phone' as const, contentSrc: '' }) },
      { id: 'mockup-laptop', label: 'Laptop Frame', icon: Laptop, createBlock: () => ({ type: 'mockup-frame' as const, frameType: 'laptop' as const, contentSrc: '' }) },
    ],
  },
];
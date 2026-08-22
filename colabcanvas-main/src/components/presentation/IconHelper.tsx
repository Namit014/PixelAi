import { icons } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { iconifyUrl } from './CosmoAssetLibrary';

// Map of common icon name aliases to Lucide icon names
const ICON_NAME_MAP: Record<string, string> = {
  'bar-chart': 'BarChart3',
  'bar-chart-3': 'BarChart3',
  'trending-up': 'TrendingUp',
  'shield': 'Shield',
  'lock': 'Lock',
  'cloud': 'Cloud',
  'cpu': 'Cpu',
  'zap': 'Zap',
  'heart': 'Heart',
  'users': 'Users',
  'globe': 'Globe',
  'sparkles': 'Sparkles',
  'leaf': 'Leaf',
  'sprout': 'Sprout',
  'droplets': 'Droplets',
  'sun': 'Sun',
  'target': 'Target',
  'rocket': 'Rocket',
  'lightbulb': 'Lightbulb',
  'star': 'Star',
  'check': 'Check',
  'check-circle': 'CheckCircle',
  'alert-circle': 'AlertCircle',
  'info': 'Info',
  'alert-triangle': 'AlertTriangle',
  'x-circle': 'XCircle',
  'help-circle': 'HelpCircle',
  'search': 'Search',
  'palette': 'Palette',
  'wrench': 'Wrench',
  'settings': 'Settings',
  'home': 'Home',
  'mail': 'Mail',
  'phone': 'Phone',
  'calendar': 'Calendar',
  'clock': 'Clock',
  'map-pin': 'MapPin',
  'bookmark': 'Bookmark',
  'flag': 'Flag',
  'award': 'Award',
  'gift': 'Gift',
  'camera': 'Camera',
  'image': 'Image',
  'music': 'Music',
  'video': 'Video',
  'file-text': 'FileText',
  'folder': 'Folder',
  'database': 'Database',
  'server': 'Server',
  'wifi': 'Wifi',
  'bluetooth': 'Bluetooth',
  'battery': 'Battery',
  'monitor': 'Monitor',
  'smartphone': 'Smartphone',
  'tablet': 'Tablet',
  'printer': 'Printer',
  'headphones': 'Headphones',
  'mic': 'Mic',
  'volume-2': 'Volume2',
  'play': 'Play',
  'pause': 'Pause',
  'square': 'Square',
  'circle': 'Circle',
  'triangle': 'Triangle',
  'hexagon': 'Hexagon',
  'diamond': 'Diamond',
  'pen-tool': 'PenTool',
  'scissors': 'Scissors',
  'copy': 'Copy',
  'clipboard': 'Clipboard',
  'download': 'Download',
  'upload': 'Upload',
  'share': 'Share2',
  'link': 'Link',
  'eye': 'Eye',
  'eye-off': 'EyeOff',
  'thumbs-up': 'ThumbsUp',
  'thumbs-down': 'ThumbsDown',
  'message-circle': 'MessageCircle',
  'send': 'Send',
  'inbox': 'Inbox',
  'bell': 'Bell',
  'tag': 'Tag',
  'hash': 'Hash',
  'at-sign': 'AtSign',
  'dollar-sign': 'DollarSign',
  'percent': 'Percent',
  'activity': 'Activity',
  'pie-chart': 'PieChart',
  'layers': 'Layers',
  'grid': 'LayoutGrid',
  'layout': 'Layout',
  'columns': 'Columns3',
  'box': 'Box',
  'package': 'Package',
  'truck': 'Truck',
  'shopping-cart': 'ShoppingCart',
  'shopping-bag': 'ShoppingBag',
  'credit-card': 'CreditCard',
  'wallet': 'Wallet',
  'briefcase': 'Briefcase',
  'building': 'Building',
  'graduation-cap': 'GraduationCap',
  'brain': 'Brain',
  'hand': 'Hand',
  'fingerprint': 'Fingerprint',
  'key': 'Key',
  'shield-check': 'ShieldCheck',
  'crown': 'Crown',
  'gem': 'Gem',
};

function isEmoji(str: string): boolean {
  if (!str) return false;
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{200D}\u{20E3}\u{FE0F}\u{E0020}-\u{E007F}\u{2122}\u{2139}\u{231A}-\u{23F3}\u{25AA}-\u{25FE}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3030}\u{303D}\u{3297}\u{3299}▸▹→←↑↓✓✗]/u;
  return emojiRegex.test(str);
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function getLucideIcon(name: string): React.ComponentType<LucideProps> | null {
  // Direct match (PascalCase)
  if (name in icons) {
    return icons[name as keyof typeof icons] as React.ComponentType<LucideProps>;
  }
  // Check alias map
  const mapped = ICON_NAME_MAP[name.toLowerCase()];
  if (mapped && mapped in icons) {
    return icons[mapped as keyof typeof icons] as React.ComponentType<LucideProps>;
  }
  // Try converting kebab-case to PascalCase
  const pascal = toPascalCase(name);
  if (pascal in icons) {
    return icons[pascal as keyof typeof icons] as React.ComponentType<LucideProps>;
  }
  return null;
}

interface RenderIconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export function RenderIcon({ name, size = 24, color, className }: RenderIconProps) {
  if (!name) return null;
  
  // Handle iconify format: "iconify:prefix:name" or "iconify:prefix:name:dataUrl"
  if (name.startsWith('iconify:')) {
    const parts = name.split(':');
    const prefix = parts[1];
    const iconName = parts[2];
    // If there's a 4th part, it's a tinted data URL
    const tintedUrl = parts.length > 3 ? parts.slice(3).join(':') : null;
    const src = tintedUrl || iconifyUrl(prefix, iconName);
    return <img src={src} alt={iconName} style={{ width: size, height: size }} className={className} />;
  }

  if (isEmoji(name)) {
    return <span style={{ fontSize: size, lineHeight: 1 }} className={className}>{name}</span>;
  }

  const LucideIcon = getLucideIcon(name);
  if (LucideIcon) {
    return <LucideIcon size={size} color={color} className={className} />;
  }

  // Fallback: render as text (could be emoji or unknown)
  return <span style={{ fontSize: size, lineHeight: 1 }} className={className}>{name}</span>;
}

export { getLucideIcon, isEmoji };

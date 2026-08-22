import { useState, useMemo, useEffect, useCallback } from 'react';
import { icons } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ICON_SETS, fetchIconList, iconifyUrl, fetchAndTintSvg, ColorTintBar } from './CosmoAssetLibrary';

// Curated common icons for quick access
const COMMON_ICONS = [
  'Star', 'Heart', 'Zap', 'Target', 'Rocket', 'Lightbulb', 'Shield', 'Lock',
  'Globe', 'Users', 'Settings', 'Search', 'Home', 'Mail', 'Phone', 'Calendar',
  'Clock', 'MapPin', 'Award', 'Gift', 'Camera', 'Image', 'Music', 'Video',
  'FileText', 'Folder', 'Database', 'Server', 'Cloud', 'Cpu', 'Wifi', 'Monitor',
  'Smartphone', 'Eye', 'Bell', 'Tag', 'Send', 'Inbox', 'Link', 'Download',
  'Upload', 'Share2', 'Copy', 'Scissors', 'PenTool', 'Palette', 'Wrench',
  'Key', 'Fingerprint', 'Brain', 'GraduationCap', 'Building', 'Briefcase',
  'ShoppingCart', 'CreditCard', 'Wallet', 'DollarSign', 'TrendingUp', 'BarChart3',
  'PieChart', 'Activity', 'Layers', 'Box', 'Package', 'Truck', 'Flag',
  'Bookmark', 'Crown', 'Gem', 'Sparkles', 'Leaf', 'Sun', 'Droplets',
  'CheckCircle', 'AlertCircle', 'Info', 'AlertTriangle', 'HelpCircle', 'XCircle',
  'ThumbsUp', 'MessageCircle', 'Hand', 'Play', 'Pause', 'Circle', 'Square',
  'Triangle', 'Hexagon', 'Diamond', 'ArrowRight', 'ArrowUp', 'Check', 'X',
  'Plus', 'Minus', 'MoreHorizontal', 'Menu', 'Filter', 'Maximize', 'Minimize',
  'RefreshCw', 'RotateCw', 'Trash2', 'Edit', 'Save', 'ExternalLink', 'Code',
];

interface IconPickerPopoverProps {
  currentIcon: string;
  onSelect: (iconName: string) => void;
  children: React.ReactNode;
  accentColor?: string;
}

function LucideTab({ search, currentIcon, accentColor, onSelect }: {
  search: string; currentIcon: string; accentColor?: string; onSelect: (name: string) => void;
}) {
  const filteredIcons = useMemo(() => {
    if (!search) return COMMON_ICONS;
    const q = search.toLowerCase();
    const allKeys = Object.keys(icons);
    return allKeys.filter(name => name.toLowerCase().includes(q)).slice(0, 100);
  }, [search]);

  return (
    <div className="grid grid-cols-8 gap-1 p-2">
      {filteredIcons.map((name) => {
        const Icon = icons[name as keyof typeof icons];
        if (!Icon) return null;
        const isSelected = name === currentIcon;
        return (
          <button
            key={name}
            onClick={(e) => { e.stopPropagation(); onSelect(name); }}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors"
            style={{
              backgroundColor: isSelected ? (accentColor ? `${accentColor}20` : undefined) : undefined,
              outline: isSelected ? `2px solid ${accentColor || 'currentColor'}` : undefined,
            }}
            title={name}
          >
            <Icon size={16} />
          </button>
        );
      })}
      {filteredIcons.length === 0 && (
        <div className="col-span-8 p-4 text-center text-sm text-muted-foreground">No icons found</div>
      )}
    </div>
  );
}

function IconifyTab({ category, search, onSelect }: {
  category: 'stickers' | 'icons' | 'illustrations';
  search: string;
  onSelect: (iconName: string) => void;
}) {
  const sets = ICON_SETS[category];
  const [activeSet, setActiveSet] = useState(sets[0].prefix);
  const [allIcons, setAllIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [tintColor, setTintColor] = useState<string | null>(null);
  const [tinting, setTinting] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchIconList(activeSet).then(list => {
      setAllIcons(list);
      setLoading(false);
    });
  }, [activeSet]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allIcons;
    const q = search.toLowerCase();
    return allIcons.filter(n => n.toLowerCase().includes(q));
  }, [allIcons, search]);

  const paged = filtered.slice(0, 80);

  const handleClick = useCallback(async (name: string) => {
    if (tintColor) {
      setTinting(name);
      const tinted = await fetchAndTintSvg(activeSet, name, tintColor);
      setTinting(null);
      // Return as iconify: format with tinted data URL
      onSelect(`iconify:${activeSet}:${name}:${tinted}`);
    } else {
      onSelect(`iconify:${activeSet}:${name}`);
    }
  }, [activeSet, tintColor, onSelect]);

  return (
    <div className="space-y-2 p-2">
      <div className="flex gap-1 flex-wrap">
        {sets.map(s => (
          <button
            key={s.prefix}
            onClick={(e) => { e.stopPropagation(); setActiveSet(s.prefix); }}
            className={cn(
              "text-[9px] px-1.5 py-0.5 rounded border transition-colors",
              activeSet === s.prefix ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border/40 hover:bg-muted"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="py-0.5">
        <p className="text-[8px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">Color Tint</p>
        <ColorTintBar selected={tintColor} onSelect={setTintColor} />
      </div>

      <p className="text-[9px] text-muted-foreground">{filtered.length} items</p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-1">
          {paged.map(name => (
            <button
              key={name}
              className="aspect-square rounded border border-border/20 p-1 hover:bg-muted/60 transition-colors flex items-center justify-center overflow-hidden relative"
              onClick={(e) => { e.stopPropagation(); handleClick(name); }}
              title={name}
              disabled={tinting === name}
            >
              {tinting === name && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                </div>
              )}
              <img
                src={iconifyUrl(activeSet, name)}
                alt={name}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
      {filtered.length === 0 && !loading && (
        <div className="p-4 text-center text-sm text-muted-foreground">No items found</div>
      )}
    </div>
  );
}

export function IconPickerPopover({ currentIcon, onSelect, children, accentColor }: IconPickerPopoverProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback((name: string) => {
    onSelect(name);
    setOpen(false);
  }, [onSelect]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[340px] p-0"
        side="right"
        align="start"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-[11px] pl-7"
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <Tabs defaultValue="lucide" className="w-full">
          <TabsList className="w-full px-2 pt-1 justify-start gap-0">
            <TabsTrigger value="lucide" className="text-[10px] px-2 py-1">Lucide</TabsTrigger>
            <TabsTrigger value="stickers" className="text-[10px] px-2 py-1">Stickers</TabsTrigger>
            <TabsTrigger value="icons" className="text-[10px] px-2 py-1">Icons</TabsTrigger>
            <TabsTrigger value="illustrations" className="text-[10px] px-2 py-1">Illustrations</TabsTrigger>
          </TabsList>
          <ScrollArea className="h-64">
            <TabsContent value="lucide" className="mt-0">
              <LucideTab search={search} currentIcon={currentIcon} accentColor={accentColor} onSelect={handleSelect} />
            </TabsContent>
            <TabsContent value="stickers" className="mt-0">
              <IconifyTab category="stickers" search={search} onSelect={handleSelect} />
            </TabsContent>
            <TabsContent value="icons" className="mt-0">
              <IconifyTab category="icons" search={search} onSelect={handleSelect} />
            </TabsContent>
            <TabsContent value="illustrations" className="mt-0">
              <IconifyTab category="illustrations" search={search} onSelect={handleSelect} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

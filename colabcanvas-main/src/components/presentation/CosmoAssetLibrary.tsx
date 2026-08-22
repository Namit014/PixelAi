import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Search, Sparkles, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { usePresentationStore } from '@/stores/presentationStore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';

// ── Color tint presets ───────────────────────────────────────────────
const COLOR_PRESETS = [
  null, // "Original"
  '#000000', '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55',
];

export async function fetchAndTintSvg(prefix: string, name: string, color: string): Promise<string> {
  try {
    const res = await fetch(`https://api.iconify.design/${prefix}.json?icons=${name}`);
    if (!res.ok) return iconifyUrl(prefix, name);
    const data = await res.json();
    const icon = data.icons?.[name];
    if (!icon) return iconifyUrl(prefix, name);
    const w = icon.width || data.width || 24;
    const h = icon.height || data.height || 24;
    let body: string = icon.body;
    body = body.replace(/currentColor/g, color);
    body = body.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`);
    body = body.replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`);
    // If body has no explicit fill attributes, add fill to each path/shape
    if (!body.includes('fill=')) {
      body = body.replace(/<(path|circle|rect|polygon|ellipse|line)/g, `<$1 fill="${color}"`);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="${color}">${body}</svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

  } catch {
    return iconifyUrl(prefix, name);
  }
}

// ── Iconify-powered asset sets ──────────────────────────────────────
export const ICON_SETS = {
  stickers: [
    { prefix: 'twemoji', label: 'Twemoji' },
    { prefix: 'noto', label: 'Noto Emoji' },
    { prefix: 'fluent-emoji', label: 'Fluent Emoji' },
    { prefix: 'fluent-emoji-flat', label: 'Fluent Flat' },
    { prefix: 'openmoji', label: 'OpenMoji' },
    { prefix: 'emojione-v1', label: 'EmojiOne' },
    { prefix: 'noto-v1', label: 'Noto v1' },
    { prefix: 'fxemoji', label: 'FxEmoji' },
  ],
  icons: [
    { prefix: 'lucide', label: 'Lucide' },
    { prefix: 'tabler', label: 'Tabler' },
    { prefix: 'material-symbols', label: 'Material' },
    { prefix: 'phosphor', label: 'Phosphor' },
    { prefix: 'mdi', label: 'MDI' },
    { prefix: 'carbon', label: 'Carbon' },
    { prefix: 'solar', label: 'Solar' },
    { prefix: 'iconamoon', label: 'IconaMoon' },
    { prefix: 'mingcute', label: 'MingCute' },
  ],
  illustrations: [
    { prefix: 'flat-color-icons', label: 'Flat Color' },
    { prefix: 'vscode-icons', label: 'VS Code' },
    { prefix: 'logos', label: 'Logos' },
    { prefix: 'skill-icons', label: 'Skill Icons' },
    { prefix: 'catppuccin', label: 'Catppuccin' },
    { prefix: 'fluent-emoji-high-contrast', label: 'Fluent HC' },
    { prefix: 'emojione', label: 'EmojiOne HD' },
    { prefix: 'icon-park', label: 'IconPark' },
    { prefix: 'icon-park-solid', label: 'IconPark Solid' },
    { prefix: 'icon-park-twotone', label: 'IconPark 2T' },
  ],
};

// Cache for icon lists
const iconListCache = new Map<string, string[]>();

export async function fetchIconList(prefix: string): Promise<string[]> {
  if (iconListCache.has(prefix)) return iconListCache.get(prefix)!;
  try {
    const res = await fetch(`https://api.iconify.design/collection?prefix=${prefix}`);
    if (!res.ok) return [];
    const data = await res.json();
    // data.uncategorized is array of icon names, or data.categories has categorized lists
    let names: string[] = [];
    if (data.uncategorized) {
      names = data.uncategorized;
    } else if (data.categories) {
      for (const cat of Object.values(data.categories)) {
        names.push(...(cat as string[]));
      }
    }
    iconListCache.set(prefix, names);
    return names;
  } catch {
    return [];
  }
}

export function iconifyUrl(prefix: string, name: string) {
  return `https://api.iconify.design/${prefix}/${name}.svg`;
}

// ── Lucide icon names for backwards compat ──────────────────────────
const LUCIDE_ICON_NAMES = [
  'Activity', 'Airplay', 'AlertCircle', 'AlertTriangle', 'Archive', 'ArrowDown', 'ArrowLeft',
  'ArrowRight', 'ArrowUp', 'Award', 'BarChart', 'Battery', 'Bell', 'Bluetooth', 'Bold',
  'Book', 'Bookmark', 'Box', 'Briefcase', 'Calendar', 'Camera', 'Check', 'ChevronDown',
  'ChevronLeft', 'ChevronRight', 'ChevronUp', 'Circle', 'Clipboard', 'Clock', 'Cloud',
  'Code', 'Coffee', 'Cog', 'Command', 'Compass', 'Copy', 'CreditCard', 'Crop', 'Crosshair',
  'Database', 'Delete', 'Diamond', 'Download', 'Droplet', 'Edit', 'ExternalLink', 'Eye',
  'Facebook', 'File', 'Film', 'Filter', 'Flag', 'Folder', 'Gift', 'Github', 'Globe',
  'Grid', 'Hash', 'Headphones', 'Heart', 'HelpCircle', 'Home', 'Image', 'Inbox', 'Info',
  'Instagram', 'Key', 'Lamp', 'Layers', 'Layout', 'LifeBuoy', 'Link', 'List', 'Loader',
  'Lock', 'LogIn', 'LogOut', 'Mail', 'Map', 'MapPin', 'Maximize', 'Menu', 'MessageCircle',
  'MessageSquare', 'Mic', 'Minimize', 'Monitor', 'Moon', 'MoreHorizontal', 'MoreVertical',
  'Move', 'Music', 'Navigation', 'Octagon', 'Package', 'Palette', 'Paperclip', 'Pause',
  'PenTool', 'Phone', 'PieChart', 'Play', 'Plus', 'Pocket', 'Power', 'Printer', 'Radio',
  'RefreshCw', 'Repeat', 'Rocket', 'RotateCw', 'Rss', 'Save', 'Scissors', 'Search',
  'Send', 'Server', 'Settings', 'Share', 'Shield', 'ShoppingBag', 'ShoppingCart', 'Shuffle',
  'Sidebar', 'Slash', 'Sliders', 'Smartphone', 'Smile', 'Speaker', 'Square', 'Star',
  'Sun', 'Sunrise', 'Sunset', 'Table', 'Tablet', 'Tag', 'Target', 'Terminal', 'ThumbsUp',
  'Trash', 'TrendingUp', 'Triangle', 'Truck', 'Tv', 'Type', 'Umbrella', 'Underline',
  'Unlock', 'Upload', 'User', 'Users', 'Video', 'Volume', 'Watch', 'Wifi', 'Wind',
  'XCircle', 'Zap', 'ZoomIn', 'ZoomOut',
];

interface InHouseAsset {
  id: string;
  name: string;
  category: string;
  tags: string[];
  file_url: string;
  thumbnail_url: string | null;
  file_type: string;
}

interface StockPhoto {
  id: string;
  src: string;
  thumb: string;
  alt: string;
  photographer: string;
}

interface CanvasImage {
  id: string;
  image_url: string;
  object_type: string;
}

const imgErrorHandler = (e: React.SyntheticEvent<HTMLImageElement>) => {
  (e.currentTarget as HTMLImageElement).style.display = 'none';
  const p = e.currentTarget.parentElement;
  if (p) p.innerHTML = '<div class="w-full h-full flex items-center justify-center text-muted-foreground"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
};

// ── Iconify Browser Panel ───────────────────────────────────────────
export function ColorTintBar({ selected, onSelect }: { selected: string | null; onSelect: (c: string | null) => void }) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customHex, setCustomHex] = useState('#007AFF');
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {COLOR_PRESETS.map((c, i) => (
        <button
          key={i}
          onClick={() => onSelect(c)}
          className={cn(
            "w-5 h-5 rounded-full border-2 transition-all flex-shrink-0",
            selected === c ? "border-primary scale-110 ring-1 ring-primary/40" : "border-border/40 hover:scale-105"
          )}
          title={c ?? 'Original'}
          style={c ? { backgroundColor: c } : undefined}
        >
          {!c && <span className="text-[7px] leading-none block text-center text-muted-foreground">⊘</span>}
        </button>
      ))}
      <button
        onClick={() => setCustomOpen(!customOpen)}
        className={cn("w-5 h-5 rounded-full border-2 border-dashed border-border/60 flex items-center justify-center text-[8px] text-muted-foreground hover:border-primary transition-colors flex-shrink-0",
          customOpen && "border-primary"
        )}
        title="Custom color"
      >+</button>
      {customOpen && (
        <div className="flex items-center gap-1 ml-1">
          <Input
            className="h-5 w-16 text-[10px] px-1 py-0 border-border/40"
            value={customHex}
            onChange={e => setCustomHex(e.target.value)}
            placeholder="#hex"
          />
          <button
            onClick={() => { if (/^#[0-9a-f]{3,8}$/i.test(customHex)) onSelect(customHex); }}
            className="text-[9px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
          >OK</button>
        </div>
      )}
    </div>
  );
}

function IconifyBrowser({ category, onInsert }: { category: 'stickers' | 'icons' | 'illustrations'; onInsert: (url: string, name: string) => void }) {
  const sets = ICON_SETS[category];
  const [activeSet, setActiveSet] = useState(sets[0].prefix);
  const [allIcons, setAllIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [tintColor, setTintColor] = useState<string | null>(null);
  const [tinting, setTinting] = useState<string | null>(null);
  const PAGE_SIZE = 60;

  useEffect(() => {
    setLoading(true);
    setPage(0);
    fetchIconList(activeSet).then(icons => {
      setAllIcons(icons);
      setLoading(false);
    });
  }, [activeSet]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allIcons;
    const q = search.toLowerCase();
    return allIcons.filter(n => n.toLowerCase().includes(q));
  }, [allIcons, search]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleInsert = useCallback(async (name: string) => {
    const label = `${activeSet}:${name}`;
    if (!tintColor) {
      onInsert(iconifyUrl(activeSet, name), label);
      return;
    }
    setTinting(name);
    const tinted = await fetchAndTintSvg(activeSet, name, tintColor);
    setTinting(null);
    onInsert(tinted, label);
  }, [activeSet, tintColor, onInsert]);

  return (
    <div className="flex flex-col gap-2">
      {/* Set selector */}
      <div className="flex gap-1 flex-wrap">
        {sets.map(s => (
          <button
            key={s.prefix}
            onClick={() => { setActiveSet(s.prefix); setSearch(''); }}
            className={cn(
              "text-[10px] px-2 py-1 rounded-md border transition-colors",
              activeSet === s.prefix ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border/40 hover:bg-muted"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Color tint bar */}
      <div className="py-1">
        <p className="text-[9px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">Color Tint</p>
        <ColorTintBar selected={tintColor} onSelect={setTintColor} />
      </div>

      {/* Search within set */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          placeholder={`Search ${filtered.length} items...`}
          className="pl-7 h-7 text-[11px] bg-muted/30 border-border/40"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
        />
      </div>

      {/* Count */}
      <p className="text-[10px] text-muted-foreground">{filtered.length} items • Page {page + 1}/{Math.max(1, totalPages)}</p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className={cn("grid gap-1.5", category === 'illustrations' ? 'grid-cols-3' : 'grid-cols-5')}>
            {paged.map(name => (
              <button
                key={name}
                className="aspect-square rounded-md border border-border/20 p-1.5 hover:bg-muted/60 transition-colors flex items-center justify-center overflow-hidden relative"
                onClick={() => handleInsert(name)}
                title={name}
                disabled={tinting === name}
              >
                {tinting === name && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </div>
                )}
                <img
                  src={iconifyUrl(activeSet, name)}
                  alt={name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  onError={imgErrorHandler}
                />
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface Props {
  onClose: () => void;
}

export function CosmoAssetLibrary({ onClose }: Props) {
  const [search, setSearch] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('stickers');
  const [inHouseAssets, setInHouseAssets] = useState<InHouseAsset[]>([]);
  const [stockPhotos, setStockPhotos] = useState<StockPhoto[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockQuery, setStockQuery] = useState('nature');
  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>([]);
  const addBlockToSlide = usePresentationStore(s => s.addBlockToSlide);
  const activeSlideId = usePresentationStore(s => s.activeSlideId);
  const capturedSlideIdRef = useRef(usePresentationStore.getState().activeSlideId);
  useEffect(() => {
    const current = usePresentationStore.getState().activeSlideId;
    if (current) capturedSlideIdRef.current = current;
  }, []);

  // Load in-house assets
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('cosmo_asset_library')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setInHouseAssets(data as InHouseAsset[]);
    };
    load();
  }, []);

  // Load canvas images
  useEffect(() => {
    if (activeTab !== 'canvas') return;
    const loadCanvas = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('canvas_objects')
        .select('id, image_url, object_type')
        .eq('user_id', user.id)
        .eq('object_type', 'image')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setCanvasImages(data as CanvasImage[]);
    };
    loadCanvas();
  }, [activeTab]);

  // Load stock photos
  useEffect(() => {
    if (activeTab !== 'stock') return;
    const fetchStock = async () => {
      setStockLoading(true);
      try {
        const res = await supabase.functions.invoke('stock-photos', {
          body: { query: stockQuery, per_page: 30 },
        });
        if (res.data?.photos) {
          setStockPhotos(res.data.photos);
        }
      } catch (e) {
        console.error('Stock photos error:', e);
      } finally {
        setStockLoading(false);
      }
    };
    fetchStock();
  }, [activeTab, stockQuery]);

  const handleStockSearch = () => {
    if (search.trim()) setStockQuery(search.trim());
  };

  const insertImage = useCallback((src: string, alt: string) => {
    const slideId = activeSlideId || capturedSlideIdRef.current || usePresentationStore.getState().activeSlideId;
    if (!slideId) {
      toast.warning('Please select a slide first');
      return;
    }
    addBlockToSlide(slideId, {
      id: crypto.randomUUID(),
      type: 'image',
      regionId: 'main',
      src,
      alt,
      fit: 'cover',
      style: { posX: 200, posY: 200, width: '400px', height: '300px' },
    } as any);
    toast.success('Image added to slide');
  }, [activeSlideId, addBlockToSlide]);

  // Filter lucide icons
  const filteredLucideIcons = useMemo(() => {
    if (!search.trim()) return LUCIDE_ICON_NAMES.slice(0, 80);
    const q = search.toLowerCase();
    return LUCIDE_ICON_NAMES.filter(n => n.toLowerCase().includes(q)).slice(0, 80);
  }, [search]);

  // Filter in-house
  const filteredInHouse = useMemo(() => {
    let items = inHouseAssets;
    if (activeTab === 'inhouse') {} // show all
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(a => a.name.toLowerCase().includes(q) || a.tags?.some(t => t.toLowerCase().includes(q)));
    }
    return items;
  }, [inHouseAssets, search, activeTab]);

  return (
    <div className="absolute left-16 top-1/2 -translate-y-1/2 z-50 w-[340px] max-h-[75vh] bg-background/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <h3 className="text-sm font-semibold text-foreground">Assets</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            className="pl-8 h-8 text-xs bg-muted/50 border-border/40"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && activeTab === 'stock') handleStockSearch(); }}
          />
        </div>
      </div>

      {/* AI Generator bar */}
      <div className="px-3 pb-2 flex gap-1.5">
        <Input
          placeholder="Generate with AI..."
          className="h-7 text-[11px] bg-muted/30 border-border/40 flex-1"
          value={aiPrompt}
          onChange={e => setAiPrompt(e.target.value)}
        />
        <Button size="sm" className="h-7 text-[10px] px-2 gap-1" disabled>
          <Sparkles className="h-3 w-3" />
          Generate
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="mx-3 overflow-x-auto scrollbar-none flex-shrink-0">
          <TabsList className="h-8 bg-muted/40 w-auto inline-flex whitespace-nowrap">
            <TabsTrigger value="stickers" className="text-[11px] h-6 px-2">Stickers</TabsTrigger>
            <TabsTrigger value="icons" className="text-[11px] h-6 px-2">Icons</TabsTrigger>
            <TabsTrigger value="illustrations" className="text-[11px] h-6 px-2">Illustrations</TabsTrigger>
            <TabsTrigger value="stock" className="text-[11px] h-6 px-2">Photos</TabsTrigger>
            <TabsTrigger value="canvas" className="text-[11px] h-6 px-2">Canvas</TabsTrigger>
            <TabsTrigger value="inhouse" className="text-[11px] h-6 px-2">Uploaded</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {/* Stickers — Iconify powered (500+ per set) */}
          <TabsContent value="stickers" className="p-3 mt-0">
            <IconifyBrowser category="stickers" onInsert={insertImage} />
          </TabsContent>

          {/* Icons — Iconify powered (500+ per set) */}
          <TabsContent value="icons" className="p-3 mt-0">
            <IconifyBrowser category="icons" onInsert={insertImage} />
          </TabsContent>

          {/* Illustrations — Iconify powered (500+ per set) */}
          <TabsContent value="illustrations" className="p-3 mt-0">
            <IconifyBrowser category="illustrations" onInsert={insertImage} />
          </TabsContent>

          {/* Stock Photos */}
          <TabsContent value="stock" className="p-3 mt-0">
            {stockLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {stockPhotos.map(photo => (
                  <button
                    key={photo.id}
                    className="aspect-square rounded-md overflow-hidden hover:ring-2 ring-primary transition-all group relative"
                    onClick={() => insertImage(photo.src, photo.alt)}
                  >
                    <img src={photo.thumb} alt={photo.alt} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                      <span className="text-[9px] text-white truncate">{photo.photographer}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!stockLoading && stockPhotos.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No photos found. Try a different search.</p>
            )}
          </TabsContent>

          {/* Canvas Images */}
          <TabsContent value="canvas" className="p-3 mt-0">
            {canvasImages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-muted-foreground">No images on your canvas yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {canvasImages.map(img => (
                  <button
                    key={img.id}
                    className="aspect-square rounded-md overflow-hidden hover:ring-2 ring-primary transition-all"
                    onClick={() => insertImage(img.image_url, 'Canvas image')}
                  >
                    <img src={img.image_url} alt="Canvas image" className="w-full h-full object-cover" loading="lazy" onError={imgErrorHandler} />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Uploaded / In-House */}
          <TabsContent value="inhouse" className="p-3 mt-0">
            {filteredInHouse.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-muted-foreground">No custom assets uploaded yet.</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">Upload via the admin panel.</p>
              </div>
            ) : (
              <>
                {['icon', 'illustration', 'sticker', 'badge'].map(cat => {
                  const items = filteredInHouse.filter(a => a.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} className="mb-4">
                      <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 capitalize">{cat}s</h4>
                      <div className="grid grid-cols-4 gap-1.5">
                        {items.map(asset => (
                          <button
                            key={asset.id}
                            className="aspect-square rounded-md border border-border/30 p-1.5 hover:bg-muted/50 transition-colors flex items-center justify-center"
                            onClick={() => insertImage(asset.file_url, asset.name)}
                            title={asset.name}
                          >
                            <img src={asset.thumbnail_url || asset.file_url} alt={asset.name} className="w-full h-full object-contain" onError={imgErrorHandler} />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

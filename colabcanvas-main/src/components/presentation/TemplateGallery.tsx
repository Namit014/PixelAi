import { useState, useMemo } from 'react';
import { Search, X, Download, Star, LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePresentationStore } from '@/stores/presentationStore';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Slide, DesignTokens } from '@/types/presentation';
import { SlideRenderer } from './SlideRenderer';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'pitch-deck', label: 'Pitch Deck' },
  { id: 'social-post', label: 'Social' },
  { id: 'ad-creative', label: 'Ads' },
  { id: 'report', label: 'Report' },
  { id: 'thumbnail', label: 'Thumbnail' },
  { id: 'landing-page', label: 'Landing' },
];

interface CosmoTemplate {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  slides: Slide[];
  design_tokens: DesignTokens | null;
  thumbnail_url: string | null;
  format: string;
  is_featured: boolean;
  downloads_count: number;
  tags: string[];
  created_at: string;
}

const defaultTokens: DesignTokens = {
  headingFont: "'Inter', sans-serif",
  bodyFont: "'Inter', sans-serif",
  primaryColor: '#18181b',
  accentColor: '#6366f1',
  backgroundColor: '#ffffff',
  surfaceColor: '#f4f4f5',
  textColor: '#18181b',
  mutedTextColor: '#71717a',
  spacingScale: 1,
  borderRadius: 12,
  cardStyle: 'elevated',
};

function TemplateThumbnail({ template }: { template: CosmoTemplate }) {
  const firstSlide = template.slides?.[0];
  const tokens = (template.design_tokens || defaultTokens) as DesignTokens;

  if (!firstSlide) {
    return <LayoutTemplate className="w-6 h-6 text-muted-foreground/30" />;
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div
        style={{
          width: 1920,
          height: 1080,
          transform: 'scale(0.0885)',
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <SlideRenderer
          slide={firstSlide}
          tokens={tokens}
          scale={1}
          isActive={false}
          onClick={() => {}}
          readOnly
          showWatermark={false}
        />
      </div>
    </div>
  );
}

interface Props {
  onClose: () => void;
}

export function TemplateGallery({ onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const { setSlides, setDesignTokens } = usePresentationStore();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['cosmo-templates', activeCategory],
    queryFn: async () => {
      let query = supabase
        .from('cosmo_templates')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('downloads_count', { ascending: false });

      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as CosmoTemplate[];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [templates, search]);

  const handleUseTemplate = async (template: CosmoTemplate) => {
    try {
      const slides = template.slides as Slide[];
      if (slides?.length) {
        setSlides(slides);
      }
      if (template.design_tokens) {
        setDesignTokens(template.design_tokens);
      }
      await supabase
        .from('cosmo_templates')
        .update({ downloads_count: (template.downloads_count || 0) + 1 } as any)
        .eq('id', template.id);

      toast.success(`Template "${template.title}" applied`);
      onClose();
    } catch {
      toast.error('Failed to apply template');
    }
  };

  return (
    <div className="absolute left-16 top-4 bottom-[100px] w-[340px] z-40 bg-white dark:bg-card rounded-xl border border-border/50 shadow-lg flex flex-col pointer-events-auto animate-in slide-in-from-left-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Templates</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 h-7 px-2 rounded-md bg-muted/30 border border-border">
          <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors',
              activeCategory === cat.id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <LayoutTemplate className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-[11px] text-muted-foreground">No templates yet</p>
            <p className="text-[10px] text-muted-foreground/60">Templates will appear here as they're added</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((template) => (
              <button
                key={template.id}
                onClick={() => handleUseTemplate(template)}
                className="group relative flex flex-col rounded-lg border border-border overflow-hidden hover:border-foreground/40 transition-all bg-muted/20"
              >
                {/* Thumbnail - live rendered */}
                <div className="aspect-video bg-muted/40 relative overflow-hidden">
                  <TemplateThumbnail template={template} />
                  {template.is_featured && (
                    <div className="absolute top-1 right-1 z-10">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                    <span className="text-background text-[10px] font-medium">Use Template</span>
                  </div>
                </div>
                {/* Info */}
                <div className="p-2 text-left">
                  <p className="text-[10px] font-medium text-foreground truncate">{template.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-muted-foreground capitalize">{template.category.replace('-', ' ')}</span>
                    {template.downloads_count > 0 && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <Download className="w-2.5 h-2.5 text-muted-foreground/50" />
                        <span className="text-[9px] text-muted-foreground/50">{template.downloads_count}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

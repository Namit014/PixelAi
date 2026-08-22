import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShowcaseItem {
  id: string;
  image_url: string;
  title: string;
  creator_name: string;
  creator_avatar_url: string | null;
  tags: string[];
  views_count: number;
  likes_count: number;
}

const FILTER_TAGS = [
  'All',
  'Branding',
  'Posters & Ads',
  'Illustration',
  'UI Layout',
  'Character Design',
  'Product Design',
  'Typography',
  'Social Media',
];

export const ShowcaseGallery = () => {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [activeTag, setActiveTag] = useState('All');
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchShowcase();
  }, [activeTag]);

  const fetchShowcase = async () => {
    setLoading(true);
    let query = supabase
      .from('design_showcase')
      .select('*')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (activeTag !== 'All') {
      query = query.contains('tags', [activeTag]);
    }

    const { data } = await query.limit(50);
    setItems((data as ShowcaseItem[]) || []);
    setFailedImages(new Set());
    setLoading(false);
  };

  if (!loading && items.length === 0 && activeTag === 'All') {
    return null;
  }

  const visibleItems = items.filter((item) => !failedImages.has(item.id));

  return (
    <section className="container mx-auto px-6 py-12">
      <div className="mb-6">
        <h3 className="text-xl font-normal mb-1">Created by Colabbers</h3>
        <p className="text-muted-foreground text-xs">
          Explore stunning designs made by our community
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-8 border-none">
        {FILTER_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={cn(
              'px-3 py-1 text-xs font-medium transition-all border border-none rounded-sm',
              activeTag === tag
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 [&>*]:mb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="break-inside-avoid rounded-xl bg-muted animate-pulse"
              style={{ height: `${180 + Math.random() * 160}px` }}
            />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <p className="text-muted-foreground text-xs py-8">
          No designs found for "{activeTag}"
        </p>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 [&>*]:mb-4">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="break-inside-avoid group relative rounded-xl overflow-hidden bg-muted border border-border/50 hover:border-border transition-all"
            >
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-auto block object-cover"
                loading="lazy"
                onError={() =>
                  setFailedImages((prev) => new Set([...prev, item.id]))
                }
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

              <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.creator_avatar_url ? (
                      <img
                        src={item.creator_avatar_url}
                        alt={item.creator_name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted-foreground/50 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-background">
                          {item.creator_name[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-white text-xs font-medium truncate max-w-[100px]">
                      {item.creator_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-white/80">
                    <span className="flex items-center gap-1 text-xs">
                      <Eye className="w-3.5 h-3.5" />
                      {item.views_count}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <Heart className="w-3.5 h-3.5" />
                      {item.likes_count}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FONT_CATEGORIES, ALL_FONTS, loadGoogleFont, isFontLoaded } from '@/lib/googleFonts';

interface Props {
  value: string;
  onChange: (font: string) => void;
  placeholder?: string;
  className?: string;
}

export const FontPickerDropdown = memo(function FontPickerDropdown({ value, onChange, placeholder = 'Select font...', className }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Load selected font for preview
  useEffect(() => {
    if (value && !isFontLoaded(value)) loadGoogleFont(value).catch(() => {});
  }, [value]);

  const filteredFonts = useMemo(() => {
    if (!search.trim()) {
      if (activeCategory) return FONT_CATEGORIES[activeCategory] || [];
      return ALL_FONTS;
    }
    const q = search.toLowerCase();
    const source = activeCategory ? (FONT_CATEGORIES[activeCategory] || []) : ALL_FONTS;
    return source.filter(f => f.toLowerCase().includes(q));
  }, [search, activeCategory]);

  const handleSelect = useCallback((font: string) => {
    loadGoogleFont(font).catch(() => {});
    onChange(font);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const handleHover = useCallback((font: string) => {
    if (!isFontLoaded(font)) loadGoogleFont(font).catch(() => {});
  }, []);

  const categories = Object.keys(FONT_CATEGORIES);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-8 rounded-lg border border-border bg-muted/30 px-2.5 flex items-center justify-between text-[11px] text-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="truncate" style={{ fontFamily: value || undefined }}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[100] top-full left-0 mt-1 w-full min-w-[220px] max-h-[320px] bg-popover border border-border rounded-lg shadow-xl flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-1.5 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                autoFocus
                placeholder="Search fonts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-7 pl-7 pr-2 rounded-md bg-muted/40 border-0 text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-0.5 px-1.5 py-1 border-b border-border overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                'shrink-0 px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors',
                !activeCategory ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={cn(
                  'shrink-0 px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors',
                  activeCategory === cat ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/50'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Font list */}
          <div ref={listRef} className="flex-1 overflow-y-auto min-h-0 max-h-[220px]">
            {filteredFonts.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-6">No fonts found</p>
            ) : (
              filteredFonts.map(font => (
                <button
                  key={font}
                  onClick={() => handleSelect(font)}
                  onMouseEnter={() => handleHover(font)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-[12px] hover:bg-muted/60 transition-colors truncate',
                    value === font && 'bg-muted/80 font-medium'
                  )}
                  style={{ fontFamily: isFontLoaded(font) ? font : undefined }}
                >
                  {font}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

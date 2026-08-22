import { Plus } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Brand {
  id: string;
  name: string;
  logo_primary_url: string | null;
}

interface BrandFilterBarProps {
  brands: Brand[];
  activeBrandId: string | null; // null = "All Projects"
  onBrandSelect: (brandId: string | null) => void;
  onNewBrand: () => void;
  projectCounts: Record<string, number>; // brandId -> count
  totalProjects: number;
}

export const BrandFilterBar = ({
  brands,
  activeBrandId,
  onBrandSelect,
  onNewBrand,
  projectCounts,
  totalProjects,
}: BrandFilterBarProps) => {
  return (
    <div className="mb-4">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2 pb-2">
          {/* All Projects pill */}
          <button
            onClick={() => onBrandSelect(null)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border shrink-0",
              activeBrandId === null
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
            )}
          >
            All Projects
            <span className="text-[10px] opacity-70">{totalProjects}</span>
          </button>

          {/* Brand pills */}
          {brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => onBrandSelect(brand.id)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border shrink-0",
                activeBrandId === brand.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {brand.logo_primary_url ? (
                <img
                  src={brand.logo_primary_url}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold">
                  {brand.name[0]?.toUpperCase()}
                </div>
              )}
              {brand.name}
              <span className="text-[10px] opacity-70">
                {projectCounts[brand.id] || 0}
              </span>
            </button>
          ))}

          {/* + New Brand pill */}
          <button
            onClick={onNewBrand}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-all duration-200 shrink-0"
          >
            <Plus className="w-3 h-3" />
            New Brand
          </button>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

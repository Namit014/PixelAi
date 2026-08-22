import { ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { FolderInput, Trash2, XCircle } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logo_primary_url: string | null;
}

interface ProjectContextMenuProps {
  children: ReactNode;
  brands: Brand[];
  currentBrandId: string | null;
  onMoveToBrand: (brandId: string) => void;
  onRemoveFromBrand: () => void;
  onDelete: () => void;
}

export const ProjectContextMenu = ({
  children,
  brands,
  currentBrandId,
  onMoveToBrand,
  onRemoveFromBrand,
  onDelete,
}: ProjectContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderInput className="w-4 h-4 mr-2" />
            Move to Brand
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {brands.map((brand) => (
              <ContextMenuItem
                key={brand.id}
                disabled={brand.id === currentBrandId}
                onClick={() => onMoveToBrand(brand.id)}
                className="cursor-pointer"
              >
                {brand.logo_primary_url ? (
                  <img
                    src={brand.logo_primary_url}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover mr-2"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold mr-2">
                    {brand.name[0]?.toUpperCase()}
                  </div>
                )}
                {brand.name}
                {brand.id === currentBrandId && (
                  <span className="ml-auto text-[10px] text-muted-foreground">current</span>
                )}
              </ContextMenuItem>
            ))}
            {currentBrandId && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onRemoveFromBrand} className="cursor-pointer">
                  <XCircle className="w-4 h-4 mr-2" />
                  Remove from brand
                </ContextMenuItem>
              </>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDelete}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Project
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

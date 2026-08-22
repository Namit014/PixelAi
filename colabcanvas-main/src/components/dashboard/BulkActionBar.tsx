import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FolderInput, Trash2, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Brand {
  id: string;
  name: string;
  logo_primary_url: string | null;
}

interface BulkActionBarProps {
  selectedCount: number;
  brands: Brand[];
  onMoveToBrand: (brandId: string) => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export const BulkActionBar = ({
  selectedCount,
  brands,
  onMoveToBrand,
  onDelete,
  onClearSelection,
}: BulkActionBarProps) => {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-2xl border border-foreground/10">
            <span className="text-xs font-medium">
              {selectedCount} selected
            </span>

            <div className="h-4 w-px bg-background/20" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-background hover:text-background hover:bg-background/10 gap-1.5 text-xs h-7"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  Move to Brand
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                {brands.map((brand) => (
                  <DropdownMenuItem
                    key={brand.id}
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
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5 text-xs h-7"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>

            <div className="h-4 w-px bg-background/20" />

            <Button
              variant="ghost"
              size="icon"
              onClick={onClearSelection}
              className="text-background hover:text-background hover:bg-background/10 h-7 w-7"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

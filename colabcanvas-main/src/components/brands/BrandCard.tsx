import { format, isValid } from "date-fns";
import { Folder, Trash2, FileText, Users } from "lucide-react";

const safeFormatDate = (dateStr: string | null | undefined, fallbackDate?: string): string => {
  if (dateStr) {
    const date = new Date(dateStr);
    if (isValid(date)) return format(date, "MMM d, yyyy");
  }
  if (fallbackDate) {
    const fallback = new Date(fallbackDate);
    if (isValid(fallback)) return format(fallback, "MMM d, yyyy");
  }
  return 'No date';
};

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface BrandCardProps {
  brand: any;
  onDelete: (id: string) => void;
  onClick: () => void;
}

export const BrandCard = ({ brand, onDelete, onClick }: BrandCardProps) => {
  return (
    <div className="group">
      {/* Card body */}
      <Card className="relative overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer border border-zinc-200 bg-white" onClick={onClick}>
        {/* Logo area */}
        <div className="p-1">
          <div className="aspect-square w-full flex items-center justify-center bg-zinc-50 rounded-lg overflow-hidden relative">
            {brand.logo_primary_url ? (
              <img src={brand.logo_primary_url} alt={brand.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded bg-zinc-100 flex items-center justify-center">
                <Folder className="w-8 h-8 text-zinc-400" />
              </div>
            )}

            {/* Hover-only metadata overlay */}
            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg text-xs text-zinc-600">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Manage Access
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {brand.total_files_count || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Delete button overlay */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <AlertDialog>
            <AlertDialogTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground bg-white/80 backdrop-blur-sm">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Brand?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will move "{brand.name}" to trash. You can restore it later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(brand.id)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      {/* Info below card */}
      <div className="mt-2.5 px-1">
        <h3 className="font-semibold text-sm text-zinc-900">{brand.name}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Last refined {safeFormatDate(brand.last_refined_at, brand.created_at)}
        </p>
      </div>
    </div>
  );
};

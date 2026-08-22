import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FolderInput, Plus } from 'lucide-react';

interface BrandEmptyStateProps {
  brandName: string;
  brandLogoUrl: string | null;
  onCreateProject: () => void;
}

export const BrandEmptyState = ({
  brandName,
  brandLogoUrl,
  onCreateProject,
}: BrandEmptyStateProps) => {
  return (
    <Card className="p-12 text-center border-dashed">
      <div className="flex justify-center mb-4">
        {brandLogoUrl ? (
          <img
            src={brandLogoUrl}
            alt={brandName}
            className="w-16 h-16 rounded-xl object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
            {brandName[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <h3 className="text-lg font-medium mb-1">{brandName}</h3>
      <p className="text-muted-foreground text-sm mb-6">
        No projects in this brand yet
      </p>
      <p className="text-muted-foreground text-xs mb-4">
        Move existing projects here or create a new one
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button onClick={onCreateProject} size="sm" className="gap-2">
          <Plus className="w-3.5 h-3.5" />
          Create Project
        </Button>
      </div>
    </Card>
  );
};

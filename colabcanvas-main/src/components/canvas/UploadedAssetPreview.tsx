import { Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { UploadedAsset, UploadProgress } from "@/types/uploadedAsset";

interface UploadedAssetPreviewProps {
  assets: UploadedAsset[];
  uploadProgress: Record<string, UploadProgress>;
  onDelete: (assetId: string, filePath: string) => void;
  onUseAsset?: (asset: UploadedAsset) => void;
}

export const UploadedAssetPreview = ({
  assets,
  uploadProgress,
  onDelete,
  onUseAsset
}: UploadedAssetPreviewProps) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const progressItems = Object.values(uploadProgress);

  if (assets.length === 0 && progressItems.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">
          Uploaded Assets ({assets.length})
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
        {/* Show upload progress */}
        {progressItems.map((progress, idx) => (
          <div key={idx} className="border border-border rounded-lg p-1.5">
            <Skeleton className="w-full aspect-square mb-1" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium truncate">{progress.fileName}</p>
              <div className="w-full bg-secondary rounded-full h-1">
                <div 
                  className="bg-primary h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {progress.status === 'uploading' && 'Uploading...'}
                {progress.status === 'processing' && 'Processing...'}
                {progress.status === 'error' && 'Failed'}
              </p>
            </div>
          </div>
        ))}

        {/* Show uploaded assets */}
        {assets.map((asset) => (
          <div 
            key={asset.id}
            className="group border border-border rounded-lg p-1.5 hover:border-primary transition-colors relative"
          >
            <div className="relative w-full aspect-square mb-1 bg-muted rounded overflow-hidden">
              <img 
                src={asset.storage_url}
                alt={asset.file_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {onUseAsset && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-1 left-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onUseAsset(asset)}
                  title="Use in prompt"
                >
                  <Check className="h-2.5 w-2.5" />
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                onClick={() => onDelete(asset.id, asset.file_path)}
                title="Delete"
              >
                <Trash2 className="h-2.5 w-2.5 text-destructive" />
              </Button>
            </div>
            
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium truncate" title={asset.file_name}>
                {asset.file_name}
              </p>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  {asset.width && asset.height && `${asset.width}×${asset.height}`}
                </span>
                <span>{formatFileSize(asset.file_size)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

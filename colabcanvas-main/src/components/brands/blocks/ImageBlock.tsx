import { useRef } from 'react';
import { ImageBlock as ImageBlockType } from '@/types/brandBlocks';
import { Trash2, Upload, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBrandAssetUpload } from '@/hooks/useBrandAssetUpload';
import { useNavigate } from 'react-router-dom';

interface ImageBlockProps {
  block: ImageBlockType;
  brandId: string;
  sectionId: string;
  onUpdate: (content: ImageBlockType['content']) => void;
  onDelete: () => void;
  isPreviewMode?: boolean;
}

export const ImageBlock = ({ block, brandId, sectionId, onUpdate, onDelete, isPreviewMode = false }: ImageBlockProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAsset, uploading } = useBrandAssetUpload(brandId);
  const navigate = useNavigate();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const asset = await uploadAsset(file, sectionId, block.id);
      onUpdate({
        file_path: asset.file_path,
        signed_url: asset.signed_url || '',
        caption: block.content?.caption || '',
        alt_text: block.content?.alt_text || '',
      });
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div className="group relative py-2">
      {block.content.signed_url ? (
        <div className="space-y-2">
          <div className="relative group">
            <img
              src={block.content.signed_url}
              alt={block.content.alt_text || 'Brand image'}
              className="w-full rounded"
              onClick={() => !isPreviewMode && fileInputRef.current?.click()}
            />
            {!isPreviewMode && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/canvas?importImage=${encodeURIComponent(block.content.signed_url)}`);
                  }}
                  className="h-8 w-8"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          {block.content?.caption && (
            <p className="text-sm text-muted-foreground">{block.content.caption}</p>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="aspect-video bg-muted rounded flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
        >
          <p className="text-sm text-muted-foreground">
            {uploading ? 'Uploading...' : 'Click to upload image'}
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!isPreviewMode && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

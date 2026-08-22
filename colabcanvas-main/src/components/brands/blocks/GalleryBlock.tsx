import { useState, useRef } from 'react';
import { GalleryBlock as GalleryBlockType } from '@/types/brandBlocks';
import { Trash2, Upload, X, GripVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useBrandAssetUpload } from '@/hooks/useBrandAssetUpload';
import { useToast } from '@/hooks/use-toast';

interface GalleryBlockProps {
  block: GalleryBlockType;
  brandId: string;
  sectionId: string;
  onUpdate: (content: GalleryBlockType['content']) => void;
  onDelete: () => void;
}

export const GalleryBlock = ({ block, brandId, sectionId, onUpdate, onDelete }: GalleryBlockProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAsset, uploading } = useBrandAssetUpload(brandId);
  const [images, setImages] = useState(block.content.images || []);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [columns, setColumns] = useState(3);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const uploadPromises = Array.from(files).map(file => 
        uploadAsset(file, sectionId, block.id)
      );
      
      const results = await Promise.all(uploadPromises);
      
      const newImages = results.map(result => ({
        file_path: result.file_path,
        signed_url: result.signed_url,
        caption: ''
      }));

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onUpdate({ images: updatedImages });
      
      toast({ title: 'Images uploaded successfully' });
    } catch (error) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onUpdate({ images: updatedImages });
  };

  const updateCaption = (index: number, caption: string) => {
    const updatedImages = [...images];
    updatedImages[index] = { ...updatedImages[index], caption };
    setImages(updatedImages);
    onUpdate({ images: updatedImages });
  };

  return (
    <div className="group relative py-6">
      <div className="space-y-6">
        {/* Column Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Columns:</label>
          {[2, 3, 4].map(col => (
            <Button
              key={col}
              variant={columns === col ? 'default' : 'outline'}
              size="sm"
              onClick={() => setColumns(col)}
            >
              {col}
            </Button>
          ))}
        </div>

        {/* Gallery Grid */}
        {images.length > 0 ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {images.map((image, index) => (
              <div key={index} className="group/item relative">
                <div
                  className="aspect-square rounded-lg border border-border overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedImage(image.signed_url)}
                >
                  <img
                    src={image.signed_url}
                    alt={image.caption || `Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Input
                  value={image.caption}
                  onChange={(e) => updateCaption(index, e.target.value)}
                  placeholder="Add caption..."
                  className="mt-2"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-zinc-400 hover:bg-muted/70 transition-all group/add"
            >
              <Plus className="w-10 h-10 text-muted-foreground group-hover/add:text-zinc-700 transition-colors" />
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 rounded p-16 text-center cursor-pointer hover:border-zinc-400 transition-colors bg-zinc-50"
          >
            <Upload className="w-8 h-8 mx-auto mb-3 text-zinc-400" />
            <p className="text-sm text-zinc-600">
              Click to upload images or drag and drop
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Full size"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

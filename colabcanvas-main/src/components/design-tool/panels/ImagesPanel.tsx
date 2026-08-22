import { useState, useEffect } from "react";
import { Canvas as FabricCanvas, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ImagesPanelProps {
  canvas: FabricCanvas | null;
}

interface StockPhoto {
  id: string;
  title: string | null;
  image_url: string;
  thumbnail_url: string;
  photographer: string | null;
  width: number;
  height: number;
}

export function ImagesPanel({ canvas }: ImagesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStockPhotos();
  }, []);

  const loadStockPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('design_stock_photos')
        .select('*')
        .eq('is_trending', true)
        .limit(20);

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading stock photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addImageToCanvas = async (photo: StockPhoto) => {
    if (!canvas) return;

    try {
      const img = await FabricImage.fromURL(photo.image_url);
      
      const maxWidth = canvas.width! * 0.5;
      const maxHeight = canvas.height! * 0.5;
      const scale = Math.min(maxWidth / img.width!, maxHeight / img.height!, 1);
      
      img.scale(scale);
      img.set({
        left: canvas.width! / 2 - (img.width! * scale) / 2,
        top: canvas.height! / 2 - (img.height! * scale) / 2,
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    } catch (error) {
      console.error('Error adding image to canvas:', error);
    }
  };

  const filteredPhotos = photos.filter(p =>
    (p.title?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 border-r border-border bg-background flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Images</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <h4 className="text-sm font-medium mb-3">TRENDING PHOTOS</h4>
          <div className="grid grid-cols-2 gap-2">
            {filteredPhotos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => addImageToCanvas(photo)}
                className="aspect-square bg-muted rounded-lg hover:opacity-80 transition-opacity overflow-hidden"
              >
                <img
                  src={photo.thumbnail_url}
                  alt={photo.title || 'Stock photo'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/200x200?text=Image';
                  }}
                />
              </button>
            ))}
          </div>

          {filteredPhotos.length === 0 && !loading && (
            <div className="text-center text-muted-foreground py-8">
              No images found
            </div>
          )}

          {loading && (
            <div className="text-center text-muted-foreground py-8">
              Loading images...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
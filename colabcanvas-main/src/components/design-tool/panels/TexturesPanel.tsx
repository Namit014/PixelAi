import { useState, useEffect } from "react";
import { Canvas as FabricCanvas, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface TexturesPanelProps {
  canvas: FabricCanvas | null;
}

interface Texture {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  image_url: string;
  thumbnail_url: string;
}

export function TexturesPanel({ canvas }: TexturesPanelProps) {
  const [activeTab, setActiveTab] = useState("textures");
  const [textures, setTextures] = useState<Texture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTextures();
  }, [activeTab]);

  const loadTextures = async () => {
    try {
      const { data, error } = await supabase
        .from('design_textures')
        .select('*')
        .eq('category', activeTab)
        .eq('is_public', true)
        .limit(20);

      if (error) throw error;
      setTextures(data || []);
    } catch (error) {
      console.error('Error loading textures:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTexture = async (texture: Texture, asBackground: boolean = false) => {
    if (!canvas) return;

    try {
      const img = await FabricImage.fromURL(texture.image_url);

      if (asBackground) {
        img.scaleToWidth(canvas.width!);
        img.scaleToHeight(canvas.height!);
        canvas.backgroundImage = img;
        canvas.renderAll();
      } else {
        const scale = Math.min(
          canvas.width! * 0.3 / img.width!,
          canvas.height! * 0.3 / img.height!
        );

        img.scale(scale);
        img.set({
          left: canvas.width! / 2 - (img.width! * scale) / 2,
          top: canvas.height! / 2 - (img.height! * scale) / 2,
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      }
    } catch (error) {
      console.error('Error applying texture:', error);
    }
  };

  const subcategories = ['grunge', 'paper', 'alpha-mask', 'pattern', 'crack'];

  return (
    <div className="w-80 border-r border-border bg-background flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Textures</h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 grid grid-cols-2">
          <TabsTrigger value="textures">Textures</TabsTrigger>
          <TabsTrigger value="backgrounds">Backgrounds</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {subcategories.map((subcategory) => {
              const subcategoryTextures = textures.filter(t => t.subcategory === subcategory);
              if (subcategoryTextures.length === 0) return null;

              return (
                <div key={subcategory}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium capitalize">{subcategory} Textures</h4>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Show All
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {subcategoryTextures.slice(0, 4).map((texture) => (
                      <button
                        key={texture.id}
                        onClick={() => applyTexture(texture)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          applyTexture(texture, true);
                        }}
                        className="aspect-square bg-muted rounded-lg hover:opacity-80 transition-opacity overflow-hidden"
                        title="Click to add as layer, right-click for background"
                      >
                        <img
                          src={texture.thumbnail_url}
                          alt={texture.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/150x150?text=Texture';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {textures.length === 0 && !loading && (
              <div className="text-center text-muted-foreground py-8">
                No textures found
              </div>
            )}

            {loading && (
              <div className="text-center text-muted-foreground py-8">
                Loading textures...
              </div>
            )}
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
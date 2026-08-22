import { useState, useEffect } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Triangle, Polygon } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface IllustrationsPanelProps {
  canvas: FabricCanvas | null;
}

interface Illustration {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  svg_data: string;
  thumbnail_url: string;
}

export function IllustrationsPanel({ canvas }: IllustrationsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("shapes");
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIllustrations();
  }, [activeTab]);

  const loadIllustrations = async () => {
    try {
      const { data, error } = await supabase
        .from('design_illustrations')
        .select('*')
        .eq('category', activeTab)
        .eq('is_public', true)
        .limit(20);

      if (error) throw error;
      setIllustrations(data || []);
    } catch (error) {
      console.error('Error loading illustrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBasicShape = (type: 'circle' | 'rectangle' | 'triangle' | 'star') => {
    if (!canvas) return;

    const centerX = canvas.width! / 2;
    const centerY = canvas.height! / 2;
    let shape: any;

    switch (type) {
      case 'circle':
        shape = new Circle({
          radius: 50,
          fill: '#3B82F6',
          left: centerX - 50,
          top: centerY - 50,
        });
        break;
      case 'rectangle':
        shape = new Rect({
          width: 100,
          height: 100,
          fill: '#10B981',
          left: centerX - 50,
          top: centerY - 50,
        });
        break;
      case 'triangle':
        shape = new Triangle({
          width: 100,
          height: 100,
          fill: '#F59E0B',
          left: centerX - 50,
          top: centerY - 50,
        });
        break;
      case 'star':
        shape = new Polygon([
          { x: 50, y: 0 },
          { x: 61, y: 35 },
          { x: 98, y: 35 },
          { x: 68, y: 57 },
          { x: 79, y: 91 },
          { x: 50, y: 70 },
          { x: 21, y: 91 },
          { x: 32, y: 57 },
          { x: 2, y: 35 },
          { x: 39, y: 35 },
        ], {
          fill: '#EF4444',
          left: centerX - 50,
          top: centerY - 50,
        });
        break;
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  };

  const filteredIllustrations = illustrations.filter(i =>
    i.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 border-r border-border bg-background flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Illustrations</h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search illustrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 grid grid-cols-4">
          <TabsTrigger value="shapes">Shapes</TabsTrigger>
          <TabsTrigger value="ornaments">Ornaments</TabsTrigger>
          <TabsTrigger value="illustrative">Illustrative</TabsTrigger>
          <TabsTrigger value="abstract">Abstract</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="shapes" className="p-4 space-y-6 mt-0">
            <div>
              <h4 className="text-sm font-medium mb-3">Basic Shapes</h4>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => addBasicShape('circle')}
                  className="aspect-square bg-muted rounded-lg hover:bg-accent transition-colors flex items-center justify-center"
                >
                  <div className="w-12 h-12 bg-primary rounded-full" />
                </button>
                <button
                  onClick={() => addBasicShape('rectangle')}
                  className="aspect-square bg-muted rounded-lg hover:bg-accent transition-colors flex items-center justify-center"
                >
                  <div className="w-12 h-12 bg-green-500 rounded-sm" />
                </button>
                <button
                  onClick={() => addBasicShape('triangle')}
                  className="aspect-square bg-muted rounded-lg hover:bg-accent transition-colors flex items-center justify-center"
                >
                  <div className="w-0 h-0 border-l-[24px] border-r-[24px] border-b-[40px] border-l-transparent border-r-transparent border-b-yellow-500" />
                </button>
                <button
                  onClick={() => addBasicShape('star')}
                  className="aspect-square bg-muted rounded-lg hover:bg-accent transition-colors flex items-center justify-center"
                >
                  <div className="text-red-500 text-3xl">★</div>
                </button>
              </div>
            </div>

            {filteredIllustrations.map((illustration) => (
              <div key={illustration.id} className="aspect-square bg-muted rounded-lg p-2">
                <div className="w-full h-full flex items-center justify-center text-sm">
                  {illustration.title}
                </div>
              </div>
            ))}
          </TabsContent>

          {['ornaments', 'illustrative', 'abstract'].map((tab) => (
            <TabsContent key={tab} value={tab} className="p-4 mt-0">
              <div className="text-center text-muted-foreground py-8">
                {tab.charAt(0).toUpperCase() + tab.slice(1)} coming soon
              </div>
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TemplatesPanelProps {
  canvas: FabricCanvas | null;
}

interface DesignTemplate {
  id: string;
  title: string;
  category: string;
  section: string;
  thumbnail_url: string;
  canvas_data: any;
  width: number;
  height: number;
  downloads_count: number;
}

export function TemplatesPanel({ canvas }: TemplatesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("marketing");
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, [activeTab]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('design_template_library')
        .select('*')
        .eq('category', activeTab)
        .eq('is_public', true)
        .limit(20);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = (template: DesignTemplate) => {
    if (!canvas) return;

    try {
      canvas.clear();
      canvas.setDimensions({ width: template.width, height: template.height });
      canvas.loadFromJSON(template.canvas_data, () => {
        canvas.renderAll();
        toast.success(`Template "${template.title}" loaded`);
      });
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template');
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sections = ['for-you', 'trending', 'staff-picks', 'kitti-flows', 'bundles'];

  return (
    <div className="w-80 border-r border-border bg-background flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Templates</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 grid grid-cols-3">
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="merchandise">Merchandise</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {sections.map((section) => {
              const sectionTemplates = filteredTemplates.filter(t => t.section === section);
              if (sectionTemplates.length === 0) return null;

              return (
                <div key={section}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium capitalize">
                      {section.replace('-', ' ')}
                    </h4>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Show All
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {sectionTemplates.slice(0, 4).map((template) => (
                      <button
                        key={template.id}
                        onClick={() => loadTemplate(template)}
                        className="relative aspect-[4/5] bg-muted rounded-lg hover:opacity-80 transition-opacity overflow-hidden"
                      >
                        {template.thumbnail_url ? (
                          <img
                            src={template.thumbnail_url}
                            alt={template.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/280x350?text=Template';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2">
                            {template.title}
                          </div>
                        )}
                        {template.downloads_count > 0 && (
                          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                            +{template.downloads_count}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredTemplates.length === 0 && !loading && (
              <div className="text-center text-muted-foreground py-8">
                No templates found
              </div>
            )}

            {loading && (
              <div className="text-center text-muted-foreground py-8">
                Loading templates...
              </div>
            )}
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
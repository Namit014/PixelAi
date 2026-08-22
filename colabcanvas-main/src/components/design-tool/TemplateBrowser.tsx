import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Template {
  id: string;
  title: string;
  category: string;
  thumbnail_url: string | null;
  canvas_data: any;
}

interface TemplateBrowserProps {
  onClose: () => void;
  onSelect: (template: Template) => void;
}

export function TemplateBrowser({ onClose, onSelect }: TemplateBrowserProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('design_templates')
      .select('*')
      .eq('is_public', true);

    if (!error && data) {
      setTemplates(data);
    }
  };

  const categories = ["all", "social", "print", "web", "business"];
  const filteredTemplates = activeCategory === "all"
    ? templates
    : templates.filter(t => t.category === activeCategory);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Browse Templates</DialogTitle>
        </DialogHeader>

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList>
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="capitalize">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCategory}>
            <ScrollArea className="h-[60vh]">
              <div className="grid grid-cols-3 gap-4 p-4">
                {filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => onSelect(template)}
                  >
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      {template.thumbnail_url ? (
                        <img
                          src={template.thumbnail_url}
                          alt={template.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-muted-foreground">No preview</span>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium">{template.title}</h4>
                      <p className="text-sm text-muted-foreground capitalize">
                        {template.category}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

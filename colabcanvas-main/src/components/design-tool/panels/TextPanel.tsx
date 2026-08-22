import { useState, useEffect } from "react";
import { Canvas as FabricCanvas, IText } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TextPanelProps {
  canvas: FabricCanvas | null;
}

interface TextTemplate {
  id: string;
  title: string;
  category: string;
  thumbnail_url: string;
  text_data: any;
}

export function TextPanel({ canvas }: TextPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<TextTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTextTemplates();
  }, []);

  const loadTextTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('design_text_templates')
        .select('*')
        .eq('is_public', true)
        .limit(20);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading text templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const addHeadline = () => {
    if (!canvas) return;
    
    const text = new IText('Add Headline', {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#000000',
      fontFamily: 'Arial',
      originX: 'center',
      originY: 'center',
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addParagraph = () => {
    if (!canvas) return;
    
    const text = new IText('Add your paragraph text here...', {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      fontSize: 16,
      fill: '#000000',
      fontFamily: 'Arial',
      originX: 'center',
      originY: 'center',
      width: 300,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addTemplate = (template: TextTemplate) => {
    if (!canvas) return;

    const textObj = new IText(template.text_data.text || 'Template Text', {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      fontSize: template.text_data.fontSize || 24,
      fill: template.text_data.fill || '#000000',
      fontFamily: template.text_data.fontFamily || 'Arial',
      fontWeight: template.text_data.fontWeight || 'normal',
      originX: 'center',
      originY: 'center',
    });

    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.renderAll();
  };

  const categories = ['vintage', 'paragraphs', 'titles', 'decorated', 'badges', 'paper-letters'];
  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 border-r border-border bg-background flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Text</h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search text templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button onClick={addHeadline} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Headline
          </Button>
          <Button onClick={addParagraph} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Paragraph
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {categories.map((category) => {
            const categoryTemplates = filteredTemplates.filter(t => t.category === category);
            if (categoryTemplates.length === 0) return null;

            return (
              <div key={category}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium capitalize">{category}</h4>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Show All
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {categoryTemplates.slice(0, 4).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => addTemplate(template)}
                      className="aspect-square bg-muted rounded-lg hover:bg-accent transition-colors p-2 flex items-center justify-center text-center text-sm font-medium"
                    >
                      {template.title}
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
        </div>
      </ScrollArea>
    </div>
  );
}
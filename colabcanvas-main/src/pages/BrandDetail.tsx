import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandSidebar } from "@/components/brands/BrandSidebar";
import { SectionContent } from "@/components/brands/SectionContent";
import { Share2, Home, Eye, Edit, ArrowLeft, Zap } from "lucide-react";
import { ShareBrandDialog } from "@/components/brands/ShareBrandDialog";
import MCPServerDialog from "@/components/brands/MCPServerDialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ContentBlock, BlockType } from "@/types/brandBlocks";
export default function BrandDetail() {
  const {
    brandSlug
  } = useParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [brand, setBrand] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<string>("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [allSectionsBlocks, setAllSectionsBlocks] = useState<Record<string, ContentBlock[]>>({});
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [showMcp, setShowMcp] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  useEffect(() => {
    loadBrand();
  }, [brandSlug]);
  useEffect(() => {
    if (activeSection) {
      loadBlocks();
    }
  }, [activeSection]);
  useEffect(() => {
    if (isPreviewMode && sections.length > 0) {
      loadAllSectionsBlocks();
    }
  }, [isPreviewMode, sections]);
  const loadBrand = async () => {
    try {
      const {
        data: brandData,
        error: brandError
      } = await supabase.from("brands").select("*").eq("slug", brandSlug).single();
      if (brandError) throw brandError;
      setBrand(brandData);
      const {
        data: sectionsData,
        error: sectionsError
      } = await supabase.from("brand_sections").select("*").eq("brand_id", brandData.id).order("display_order");
      if (sectionsError) throw sectionsError;
      setSections(sectionsData);
      if (sectionsData.length > 0) {
        setActiveSection(sectionsData[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error loading brand",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadBlocks = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("brand_content_blocks").select("*").eq("section_id", activeSection).order("display_order");
      if (error) throw error;
      setBlocks((data || []) as any as ContentBlock[]);
    } catch (error: any) {
      toast({
        title: "Error loading content",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const loadAllSectionsBlocks = async () => {
    if (!brand) return;
    try {
      const blocksMap: Record<string, ContentBlock[]> = {};
      for (const section of sections) {
        const {
          data,
          error
        } = await supabase.from("brand_content_blocks").select("*").eq("section_id", section.id).order("display_order");
        if (error) throw error;
        blocksMap[section.id] = (data || []) as any as ContentBlock[];
      }
      setAllSectionsBlocks(blocksMap);
    } catch (error: any) {
      toast({
        title: "Error loading preview",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleAddBlock = async (type: BlockType) => {
    const newBlock = {
      section_id: activeSection,
      block_type: type,
      display_order: blocks.length,
      content: getDefaultContent(type)
    };
    try {
      const {
        data,
        error
      } = await supabase.from("brand_content_blocks").insert(newBlock).select().single();
      if (error) throw error;
      setBlocks([...blocks, data as any as ContentBlock]);
    } catch (error: any) {
      toast({
        title: "Error adding block",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleUpdateBlock = async (blockId: string, content: any) => {
    try {
      const {
        error
      } = await supabase.from("brand_content_blocks").update({
        content
      }).eq("id", blockId);
      if (error) throw error;
      setBlocks(blocks.map(b => b.id === blockId ? {
        ...b,
        content
      } : b));
    } catch (error: any) {
      toast({
        title: "Error updating block",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleDeleteBlock = async (blockId: string) => {
    try {
      const {
        error
      } = await supabase.from("brand_content_blocks").delete().eq("id", blockId);
      if (error) throw error;
      setBlocks(blocks.filter(b => b.id !== blockId));
    } catch (error: any) {
      toast({
        title: "Error deleting block",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleAddSection = async () => {
    if (!brand) return;
    const sectionName = prompt('Enter section name:');
    if (!sectionName?.trim()) return;
    try {
      const {
        data,
        error
      } = await supabase.from('brand_sections').insert({
        brand_id: brand.id,
        section_name: sectionName,
        display_order: sections.length,
        is_default: false
      }).select().single();
      if (error) throw error;
      setSections([...sections, data]);
      setActiveSection(data.id);
      toast({
        title: 'Section added',
        description: `${sectionName} has been added`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const getDefaultContent = (type: BlockType) => {
    switch (type) {
      case 'heading':
        return {
          text: '',
          level: 2
        };
      case 'text':
        return {
          text: ''
        };
      case 'colours':
        return {
          colors: []
        };
      case 'typography':
        return {
          font_family: 'Inter',
          weights: ['400'],
          sample_text: 'The quick brown fox jumps over the lazy dog',
          usage_notes: ''
        };
      case 'logo_variant':
        return {
          title: '',
          file_path: '',
          signed_url: '',
          background: 'light',
          usage_notes: ''
        };
      case 'image':
        return {
          file_path: '',
          signed_url: '',
          caption: '',
          alt_text: ''
        };
      case 'gallery':
        return {
          images: []
        };
      case 'video':
        return {
          file_path: '',
          signed_url: '',
          caption: ''
        };
      case 'audio':
        return {
          file_path: '',
          signed_url: '',
          title: ''
        };
      case 'file':
        return {
          file_path: '',
          signed_url: '',
          file_name: '',
          file_size: 0
        };
      case 'divider':
        return {};
      case 'quote':
        return {
          text: '',
          author: ''
        };
      case 'callout':
        return {
          text: '',
          type: 'info'
        };
      case 'todo_list':
        return {
          items: [{
            id: crypto.randomUUID(),
            text: '',
            checked: false
          }]
        };
      case 'bullet_list':
        return {
          items: [{
            id: crypto.randomUUID(),
            text: '',
            indent: 0
          }]
        };
      case 'numbered_list':
        return {
          items: [{
            id: crypto.randomUUID(),
            text: '',
            indent: 0
          }],
          start_number: 1
        };
      case 'code':
        return {
          code: '',
          language: 'javascript',
          show_line_numbers: true
        };
      case 'table':
        return {
          headers: ['Column 1', 'Column 2'],
          rows: [{
            id: crypto.randomUUID(),
            cells: ['', '']
          }],
          column_widths: [200, 200]
        };
      case 'button':
        return {
          text: 'Click me',
          url: '',
          variant: 'primary',
          size: 'md'
        };
      case 'embed':
        return {
          url: '',
          provider: 'generic',
          aspect_ratio: '16:9'
        };
      default:
        return {};
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>;
  }
  if (!brand) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Brand not found</h2>
          <p className="text-muted-foreground mt-2">
            The brand you're looking for doesn't exist
          </p>
        </div>
      </div>;
  }
  return <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between flex-shrink-0 bg-zinc-50">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/brands')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">{brand.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant={isPreviewMode ? "outline" : "default"} size="sm" onClick={() => setIsPreviewMode(!isPreviewMode)} className="gap-2">
            {isPreviewMode ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowMcp(true)} className="gap-2">
            <Zap className="w-4 h-4" />
            Connect to AI
          </Button>
          <Button variant="default" size="sm" onClick={() => setShowShare(true)} className="gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Hide in preview mode */}
        {!isPreviewMode && <BrandSidebar sections={sections} activeSection={activeSection} onSectionChange={setActiveSection} onAddSection={handleAddSection} />}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-zinc-100">
          {isPreviewMode ? <div className="max-w-4xl mx-auto px-8 py-16 space-y-16">
              {sections.map(section => <div key={section.id} className="space-y-4">
                  <h2 className="text-xl font-semibold pb-2">
                    {section.section_name}
                  </h2>
                  <SectionContent sectionId={section.id} brandId={brand.id} blocks={allSectionsBlocks[section.id] || []} isPreviewMode={true} onAddBlock={handleAddBlock} onUpdateBlock={handleUpdateBlock} onDeleteBlock={handleDeleteBlock} />
                </div>)}
            </div> : <div className="max-w-4xl mx-auto px-8 py-8">
              <SectionContent sectionId={activeSection} brandId={brand.id} blocks={blocks} isPreviewMode={false} onAddBlock={handleAddBlock} onUpdateBlock={handleUpdateBlock} onDeleteBlock={handleDeleteBlock} />
            </div>}
        </div>
      </div>

      <ShareBrandDialog open={showShare} onOpenChange={setShowShare} brandId={brand.id} brandName={brand.name} />
      
      <MCPServerDialog open={showMcp} onOpenChange={setShowMcp} brandId={brand.id} brandName={brand.name} />
    </div>;
}
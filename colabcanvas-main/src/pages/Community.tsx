import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TemplateCard } from "@/components/community/TemplateCard";
import { TemplatePreviewModal } from "@/components/community/TemplatePreviewModal";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/input";
import { Search, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All",
  "Social Media",
  "Marketing",
  "Branding",
  "Business",
  "Events",
  "Education",
  "Presentation",
  "Print Design",
  "Web Design",
  "Other"
];

const Community = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
  const [featuredTemplates, setFeaturedTemplates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Step 1: Fetch templates
      const { data: templatesData, error } = await supabase
        .from('projects')
        .select('id, title, thumbnail_url, remix_count, is_featured, template_category, template_description, template_tags, user_id')
        .eq('is_template', true)
        .order('remix_count', { ascending: false });

      if (error) throw error;

      // Step 2: Fetch profiles for those templates
      const userIds = [...new Set(templatesData?.map(t => t.user_id).filter(Boolean))] as string[];
      let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      }

      // Step 3: Merge data
      const templatesWithAuthor = (templatesData || []).map(t => ({
        ...t,
        author_name: profileMap.get(t.user_id)?.full_name || 'Anonymous',
        author_avatar: profileMap.get(t.user_id)?.avatar_url || null,
      }));

      setTemplates(templatesWithAuthor);
      setFeaturedTemplates(templatesWithAuthor.filter(t => t.is_featured));
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (selectedCategory !== "All") {
      filtered = filtered.filter(t => t.template_category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.template_description?.toLowerCase().includes(query) ||
        t.template_tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleTemplateClick = (template: any) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 relative overflow-hidden">
      <AppHeader />

      <div className="container mx-auto px-6 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Community Templates</h1>
          <p className="text-zinc-600">Discover and remix beautiful designs created by our community</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-zinc-200 focus:border-zinc-400"
            />
          </div>
          
          {/* Horizontal Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors font-medium",
                  selectedCategory === cat 
                    ? "bg-zinc-900 text-white" 
                    : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-8 w-48 bg-zinc-200" />
              </div>
              <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <Skeleton 
                    key={i} 
                    className="break-inside-avoid mb-4 bg-zinc-200" 
                    style={{ height: `${150 + (i % 3) * 80}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Featured Templates */}
            {featuredTemplates.length > 0 && selectedCategory === "All" && !searchQuery && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-2xl font-bold text-zinc-900">Featured Templates</h2>
                </div>
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                  {featuredTemplates.slice(0, 5).map(template => (
                    <div key={template.id} onClick={() => handleTemplateClick(template)}>
                      <TemplateCard template={template} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Templates */}
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">
                {searchQuery || selectedCategory !== "All" ? "Search Results" : "All Templates"}
              </h2>
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-500 text-lg">
                    {searchQuery || selectedCategory !== "All" 
                      ? "No templates found matching your criteria" 
                      : "No templates available yet"}
                  </p>
                </div>
              ) : (
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                  {filteredTemplates.map(template => (
                    <div key={template.id} onClick={() => handleTemplateClick(template)}>
                      <TemplateCard template={template} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <TemplatePreviewModal
        template={selectedTemplate}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
};

export default Community;

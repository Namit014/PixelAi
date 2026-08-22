import { useState, useEffect } from 'react';
import { Search, TrendingUp, Star, GitFork, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  'All',
  'Logo Design',
  'Branding',
  'Product Photography',
  'Social Media',
  'Video Production',
  'Character Design',
];

const WorkflowMarketplace = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadWorkflows();
  }, [selectedCategory]);

  const loadWorkflows = async () => {
    setLoading(true);

    let query = supabase
      .from('workflows')
      .select('*')
      .eq('is_template', true)
      .eq('is_public', true);

    if (selectedCategory !== 'All') {
      query = query.eq('template_category', selectedCategory);
    }

    const { data, error } = await query.order('view_count', { ascending: false });

    if (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load workflows');
      setLoading(false);
      return;
    }

    setWorkflows(data || []);
    setLoading(false);
  };

  const handleUseTemplate = async (workflowId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('fork-workflow', {
        body: { workflowId },
      });

      if (error) throw error;

      // Get workflow to increment fork count
      const { data: workflowData } = await supabase
        .from('workflows')
        .select('fork_count')
        .eq('id', workflowId)
        .single();

      if (workflowData) {
        await supabase
          .from('workflows')
          .update({ fork_count: (workflowData.fork_count || 0) + 1 })
          .eq('id', workflowId);
      }

      toast.success('Template forked successfully');
      navigate(`/workflow?id=${data.workflowId}`);
    } catch (error) {
      console.error('Error forking workflow:', error);
      toast.error('Failed to fork template');
    }
  };

  const filteredWorkflows = workflows.filter((w) =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.template_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const featuredWorkflows = workflows.filter((w) => w.is_featured);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-200">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-2">Workflow Marketplace</h1>
          <p className="text-muted-foreground">
            Discover and use AI design workflow templates created by the community
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="border-b border-zinc-200 dark:border-zinc-200 bg-zinc-50 dark:bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {CATEGORIES.map((category) => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Featured Section */}
      {featuredWorkflows.length > 0 && selectedCategory === 'All' && (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-semibold">Featured Templates</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onUse={handleUseTemplate}
                featured
              />
            ))}
          </div>
        </div>
      )}

      {/* All Templates */}
      <div className="container mx-auto px-4 py-6">
        {selectedCategory !== 'All' && (
          <h2 className="text-2xl font-semibold mb-4">{selectedCategory}</h2>
        )}
        
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading templates...
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No templates found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onUse={handleUseTemplate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const WorkflowCard = ({
  workflow,
  onUse,
  featured,
}: {
  workflow: any;
  onUse: (id: string) => void;
  featured?: boolean;
}) => {
  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${featured ? 'ring-2 ring-primary' : ''}`}>
      {/* Thumbnail */}
      <div className="aspect-video bg-zinc-100 dark:bg-zinc-100 relative">
        {workflow.thumbnail_url ? (
          <img
            src={workflow.thumbnail_url}
            alt={workflow.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No preview
          </div>
        )}
        {featured && (
          <Badge className="absolute top-2 right-2 bg-primary">
            <Star className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg line-clamp-1">{workflow.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {workflow.template_description || 'No description'}
          </p>
        </div>

        {/* Tags */}
        {workflow.tags && workflow.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {workflow.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{workflow.view_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <GitFork className="w-3 h-3" />
            <span>{workflow.fork_count || 0}</span>
          </div>
        </div>

        {/* Actions */}
        <Button
          onClick={() => onUse(workflow.id)}
          className="w-full"
          size="sm"
        >
          Use Template
        </Button>
      </div>
    </Card>
  );
};

export default WorkflowMarketplace;

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  Upload, 
  FileText, 
  Image, 
  Link, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Sparkles,
  Palette,
  Lightbulb,
  Wand2
} from 'lucide-react';

interface TrainingMaterial {
  id: string;
  title: string;
  description: string | null;
  material_type: string;
  content_url: string | null;
  content_text: string | null;
  extracted_knowledge: Record<string, unknown>;
  target_agents: string[];
  processing_status: string;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

const AGENT_OPTIONS = [
  { id: 'design_generator', label: 'Design Generator', icon: Palette, description: 'AI that generates visual designs' },
  { id: 'creative_intelligence', label: 'Creative Intelligence', icon: Lightbulb, description: 'Strategic direction AI (RUMI)' },
  { id: 'brand_analysis', label: 'Brand Analysis', icon: Brain, description: 'Brand extraction and analysis' },
  { id: 'prompt_enhancer', label: 'Prompt Enhancer', icon: Wand2, description: 'Improves user prompts' },
];

const MATERIAL_TYPES = [
  { value: 'article', label: 'Article', icon: FileText },
  { value: 'blog', label: 'Blog Post', icon: FileText },
  { value: 'image', label: 'Image Reference', icon: Image },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'guideline', label: 'Design Guidelines', icon: Brain },
];

export const AITrainingTab: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [materialType, setMaterialType] = useState<string>('article');
  const [contentUrl, setContentUrl] = useState('');
  const [contentText, setContentText] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch training materials
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['ai-training-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_training_materials')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TrainingMaterial[];
    },
  });

  // Add new training material
  const addMaterial = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Title is required');
      if (selectedAgents.length === 0) throw new Error('Select at least one target agent');
      if (!contentUrl.trim() && !contentText.trim()) throw new Error('Provide a URL or text content');

      const { error } = await supabase
        .from('ai_training_materials')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          material_type: materialType,
          content_url: contentUrl.trim() || null,
          content_text: contentText.trim() || null,
          target_agents: selectedAgents,
          created_by: user?.id,
          processing_status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-training-materials'] });
      toast({ title: 'Material added', description: 'Training material queued for processing.' });
      // Reset form
      setTitle('');
      setDescription('');
      setContentUrl('');
      setContentText('');
      setSelectedAgents([]);
      setMaterialType('article');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete material
  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_training_materials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-training-materials'] });
      toast({ title: 'Deleted', description: 'Training material removed.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete material.', variant: 'destructive' });
    },
  });

  // Reprocess material
  const reprocessMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_training_materials')
        .update({ processing_status: 'pending', error_message: null })
        .eq('id', id);
      
      if (error) throw error;

      // Trigger processing edge function
      await supabase.functions.invoke('ai-training-process', {
        body: { materialId: id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-training-materials'] });
      toast({ title: 'Reprocessing', description: 'Material queued for reprocessing.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to reprocess.', variant: 'destructive' });
    },
  });

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-500/10 text-green-500 border-green-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
      processing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      pending: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    };
    return styles[status] || styles.pending;
  };

  // Stats
  const stats = {
    total: materials.length,
    completed: materials.filter(m => m.processing_status === 'completed').length,
    pending: materials.filter(m => m.processing_status === 'pending').length,
    failed: materials.filter(m => m.processing_status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-800 rounded-lg">
              <Brain className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Total Materials</p>
              <p className="text-2xl font-bold text-zinc-100">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Processed</p>
              <p className="text-2xl font-bold text-zinc-100">{stats.completed}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Pending</p>
              <p className="text-2xl font-bold text-zinc-100">{stats.pending}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Failed</p>
              <p className="text-2xl font-bold text-zinc-100">{stats.failed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Add New Material Form */}
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-purple-500/10 rounded-lg">
            <Upload className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Add Training Material</h2>
            <p className="text-sm text-zinc-500">Upload articles, images, or guidelines to train AI agents</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="E.g., Modern Design Principles 2024"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of the content..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-zinc-800 border-zinc-700 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Material Type</Label>
              <Select value={materialType} onValueChange={setMaterialType}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content URL (article, blog, or image URL)</Label>
              <Input
                placeholder="https://..."
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Or paste text content directly</Label>
              <Textarea
                placeholder="Paste article text, guidelines, or design principles..."
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                className="bg-zinc-800 border-zinc-700 min-h-[120px]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Target AI Agents</Label>
              <p className="text-xs text-zinc-500">Select which agents should learn from this material</p>
              
              <div className="space-y-2">
                {AGENT_OPTIONS.map(agent => (
                  <div
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                      ${selectedAgents.includes(agent.id)
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }
                    `}
                  >
                    <Checkbox
                      checked={selectedAgents.includes(agent.id)}
                      onCheckedChange={() => toggleAgent(agent.id)}
                      className="pointer-events-none"
                    />
                    <agent.icon className={`w-5 h-5 ${selectedAgents.includes(agent.id) ? 'text-purple-400' : 'text-zinc-500'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200">{agent.label}</p>
                      <p className="text-xs text-zinc-500">{agent.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => addMaterial.mutate()}
              disabled={addMaterial.isPending || !title.trim() || selectedAgents.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 mt-4"
            >
              {addMaterial.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Add Training Material
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Materials Library */}
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-100">Training Materials Library</h2>
          <Badge variant="outline" className="text-zinc-400 border-zinc-700">
            {materials.length} materials
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No training materials yet</p>
            <p className="text-sm text-zinc-600">Add materials above to start training your AI agents</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {materials.map(material => (
                <div
                  key={material.id}
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(material.processing_status)}
                        <h3 className="font-medium text-zinc-100 truncate">{material.title}</h3>
                        <Badge className={getStatusBadge(material.processing_status)}>
                          {material.processing_status}
                        </Badge>
                      </div>
                      
                      {material.description && (
                        <p className="text-sm text-zinc-500 line-clamp-1 mb-2">{material.description}</p>
                      )}
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs">
                          {material.material_type}
                        </Badge>
                        {material.target_agents.map(agent => (
                          <Badge key={agent} className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                            {AGENT_OPTIONS.find(a => a.id === agent)?.label || agent}
                          </Badge>
                        ))}
                      </div>

                      {material.error_message && (
                        <p className="text-xs text-red-400 mt-2">{material.error_message}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => reprocessMaterial.mutate(material.id)}
                        disabled={reprocessMaterial.isPending}
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
                        title="Reprocess"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMaterial.mutate(material.id)}
                        disabled={deleteMaterial.isPending}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
};

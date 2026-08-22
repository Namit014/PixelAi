import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { NodeData } from '@/types/workflow';
import { NODE_TYPES } from '@/lib/workflowNodeTypes';
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Maximize2, Download, Wand2, Share2, Upload, Sparkles, Play, Settings, Copy, Trash2, CloudUpload, MessageSquare, Video } from 'lucide-react';

// Custom SVG icons for workflow nodes
import TextIcon from '@/assets/icons/text-node.svg?react';
import ImageGeneratorIcon from '@/assets/icons/image-generator-node.svg?react';
import VideoGeneratorIcon from '@/assets/icons/video-generator-node.svg?react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import NodeHoverMenu from '../NodeHoverMenu';
import ImageViewDialog from '../ImageViewDialog';
import ImageEditDialog from '../ImageEditDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

const CustomNode = memo(({ data, selected, id }: NodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assistantTab, setAssistantTab] = useState<'text' | 'enhanced'>('text');
  const { getNodes, setNodes, getEdges } = useReactFlow();
  const { user } = useAuth();
  const navigate = useNavigate();
  const nodeData = data as NodeData;
  const nodeTypeInfo = NODE_TYPES[nodeData.nodeType];
  const Icon = nodeTypeInfo?.icon;

  // Get handle icon based on type
  const getHandleIcon = (type: string) => {
    switch (type) {
      case 'text':
      case 'prompt':
        return TextIcon;
      case 'image':
        return ImageGeneratorIcon;
      case 'video':
        return VideoGeneratorIcon;
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    switch (nodeData.status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusClass = () => {
    switch (nodeData.status) {
      case 'success':
        return 'ring-2 ring-green-500';
      case 'error':
        return 'ring-2 ring-red-500';
      case 'running':
        return 'ring-2 ring-blue-500 animate-pulse';
      default:
        return selected ? 'ring-2 ring-zinc-400 dark:ring-zinc-600' : '';
    }
  };

  const updateNodeData = (updates: Partial<NodeData>) => {
    const nodes = getNodes();
    setNodes(nodes.map(node => 
      node.id === id 
        ? { ...node, data: { ...node.data, ...updates } }
        : node
    ));
  };

  const handleDuplicate = () => {
    const nodes = getNodes();
    const currentNode = nodes.find(n => n.id === id);
    if (!currentNode) return;
    
    const newNode = {
      ...currentNode,
      id: `${nodeData.nodeType}_${Date.now()}`,
      position: { x: currentNode.position.x + 20, y: currentNode.position.y + 20 },
      selected: false,
    };
    setNodes([...nodes, newNode]);
  };

  const handleConfigure = () => {
    // Configuration is now inline - this is kept for hover menu compatibility
  };

  const handleDelete = () => {
    const nodes = getNodes();
    setNodes(nodes.filter(n => n.id !== id));
  };

  const handleRunFromHere = async () => {
    const nodes = getNodes();
    const edges = getEdges();
    
    // Mark this node as running
    updateNodeData({ status: 'running', error: undefined });
    
    try {
      const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: {
          workflowId: null,
          nodes,
          edges,
          targetNodeId: id,
        },
      });

      if (error) throw error;

      // Update node with results
      if (data.results && data.results[id]) {
        updateNodeData({
          status: 'success',
          result: data.results[id],
        });
        toast.success('Node executed successfully');
      }
    } catch (error) {
      console.error('Error executing node:', error);
      updateNodeData({
        status: 'error',
        error: error instanceof Error ? error.message : 'Execution failed',
      });
      toast.error('Failed to execute node');
    }
  };

  const handleDownloadImage = () => {
    if (!nodeData.result?.imageUrl) return;
    
    const link = document.createElement('a');
    link.href = nodeData.result.imageUrl;
    link.download = `workflow-${nodeData.nodeType}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded');
  };

  const handleEditComplete = (newImageUrl: string) => {
    updateNodeData({
      result: { ...nodeData.result, imageUrl: newImageUrl },
    });
  };

  const handleExportToCanvas = async () => {
    if (!nodeData.result?.imageUrl || !user) return;
    
    try {
      // Track export in database
      await supabase.from('canvas_workflow_exports').insert({
        user_id: user.id,
        source_type: 'workflow',
        source_id: id,
        destination_type: 'canvas',
        image_url: nodeData.result.imageUrl,
      });

      // Navigate to canvas with image
      navigate(`/canvas?importImage=${encodeURIComponent(nodeData.result.imageUrl)}`);
      toast.success('Exported to canvas');
    } catch (error) {
      console.error('Error exporting to canvas:', error);
      toast.error('Failed to export to canvas');
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user) {
      toast.error('You must be logged in to upload images');
      return;
    }

    try {
      console.log('Starting upload for file:', file.name, file.type, file.size);
      updateNodeData({ status: 'running' });
      setUploadProgress(10);

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      setUploadProgress(30);

      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      console.log('Uploading to Supabase storage with fileName:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('workflow-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('Upload successful:', uploadData);
      setUploadProgress(60);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('workflow-uploads')
        .getPublicUrl(fileName);

      console.log('Public URL generated:', publicUrl);
      setUploadProgress(90);

      // Update node with image URL
      updateNodeData({
        result: { imageUrl: publicUrl },
        status: 'success',
        config: {
          ...nodeData.config,
          fileName: file.name,
          fileSize: file.size,
        }
      });

      setUploadProgress(100);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error details:', error);
      updateNodeData({ status: 'error', error: error instanceof Error ? error.message : 'Upload failed' });
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    } else {
      toast.error('Please upload an image file');
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const deleteUploadedImage = async () => {
    const imageUrl = nodeData.result?.imageUrl;
    if (!imageUrl) return;

    try {
      const fileName = imageUrl.split('/').slice(-3).join('/');
      await supabase.storage.from('workflow-uploads').remove([fileName]);
      
      updateNodeData({
        config: { ...nodeData.config, fileName: undefined, fileSize: undefined },
        result: undefined,
        status: 'idle',
      });
      
      toast.success('Image deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete image');
    }
  };

  const handleEnhancePrompt = async () => {
    const inputPrompt = nodeData.config.inputPrompt || nodeData.config.prompt;
    if (!inputPrompt) {
      toast.error('No prompt to enhance');
      return;
    }

    updateNodeData({ status: 'running' });

    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: { prompt: inputPrompt },
      });

      if (error) throw error;

      updateNodeData({
        config: { 
          ...nodeData.config, 
          enhancedPrompt: data.enhancedPrompt || data.message 
        },
        status: 'success',
      });
      
      toast.success('Prompt enhanced successfully');
    } catch (error) {
      console.error('Enhancement error:', error);
      updateNodeData({ status: 'error', error: 'Enhancement failed' });
      toast.error('Failed to enhance prompt');
    }
  };

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* External label above node with node type label */}
      <div className="absolute -top-6 left-0 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-700 px-2">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span>{nodeTypeInfo?.label}</span>
        <div className="ml-1">{getStatusIcon()}</div>
      </div>

      {/* Node hover menu with increased top padding */}
      {isHovered && !selected && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-50">
          <NodeHoverMenu
            onDuplicate={handleDuplicate}
            onConfigure={handleConfigure}
            onDelete={handleDelete}
            onRunFromHere={handleRunFromHere}
          />
        </div>
      )}

      {/* Node body with glass morphism */}
      <div
        className={`
          bg-white/80 backdrop-blur-sm
          ${getStatusClass()}
          rounded-2xl
          min-w-[280px] max-w-[400px]
          transition-all duration-200
        `}
      >

      {/* Duplicate header removed - external label is used instead */}

      {/* Node content */}
      <div className="p-3 space-y-3">
        {nodeData.nodeType === 'promptInput' && (
          <>
            <Textarea
              placeholder="Describe what you want to generate..."
              value={nodeData.config.prompt || ''}
              onChange={(e) => updateNodeData({ 
                config: { ...nodeData.config, prompt: e.target.value },
                result: e.target.value 
              })}
              rows={6}
              className="resize-none text-sm text-zinc-900 bg-transparent border-none focus:ring-0 focus:ring-offset-0 p-0 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 placeholder:animate-shimmer nodrag nowheel"
              onMouseDown={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleEnhancePrompt}
              disabled={!nodeData.config?.prompt}
              className="w-full"
            >
              <Wand2 className="w-3 h-3 mr-2" />
              Enhance Prompt
            </Button>
          </>
        )}

        {nodeData.nodeType === 'textInput' && (
          <Textarea
            placeholder="Enter your text..."
            value={nodeData.config.text || ''}
            onChange={(e) => updateNodeData({ 
              config: { ...nodeData.config, text: e.target.value },
              result: e.target.value 
            })}
            rows={6}
              className="resize-none text-sm text-zinc-900 bg-transparent border-none focus:ring-0 focus:ring-offset-0 p-0 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 placeholder:animate-shimmer nodrag nowheel"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
          />
        )}

        {nodeData.nodeType === 'imageGenerator' && (
          <>
            <Textarea
              placeholder="Describe the image you want to generate..."
              value={nodeData.config.prompt || ''}
              onChange={(e) => updateNodeData({ config: { ...nodeData.config, prompt: e.target.value } })}
              rows={6}
              className="resize-none text-sm text-zinc-900 bg-transparent border-none focus:ring-0 focus:ring-offset-0 p-0 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 placeholder:animate-shimmer nodrag nowheel"
            />
            <div className="flex items-center gap-2">
              <Select 
                value={nodeData.config.model || 'google/gemini-2.5-flash-image-preview'} 
                onValueChange={(val) => updateNodeData({ config: { ...nodeData.config, model: val } })}
              >
                <SelectTrigger className="h-9 flex-1 text-xs bg-zinc-100/50 border-zinc-300 text-zinc-900 hover:bg-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash-image-preview">Gemini 2.5 Flash Image</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={nodeData.config.aspectRatio || '1:1'} 
                onValueChange={(val) => updateNodeData({ config: { ...nodeData.config, aspectRatio: val } })}
              >
                <SelectTrigger className="h-9 w-24 text-xs bg-zinc-100/50 border-zinc-300 text-zinc-900 hover:bg-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1</SelectItem>
                  <SelectItem value="16:9">16:9</SelectItem>
                  <SelectItem value="9:16">9:16</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-100 rounded px-2 h-9">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6 text-xs text-zinc-900"
                  onClick={() => updateNodeData({ config: { ...nodeData.config, iterations: Math.max(1, (nodeData.config.iterations || 1) - 1) } })}
                >
                  -
                </Button>
                <span className="text-xs w-8 text-center text-zinc-900">{nodeData.config.iterations || 1}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6 text-xs text-zinc-900"
                  onClick={() => updateNodeData({ config: { ...nodeData.config, iterations: Math.min(10, (nodeData.config.iterations || 1) + 1) } })}
                >
                  +
                </Button>
              </div>
                  <Button onClick={handleRunFromHere} size="icon" variant="ghost" className="h-9 w-9 bg-zinc-200/50 hover:bg-zinc-600 text-zinc-900">
                    <Play className="h-4 w-4" />
                  </Button>
            </div>
            {nodeData.result?.imageUrl && (
              <div className="w-full aspect-square bg-zinc-100 dark:bg-zinc-100 rounded overflow-hidden">
                <img src={nodeData.result.imageUrl} alt="Generated" className="w-full h-full object-cover" />
              </div>
            )}
          </>
        )}

        {nodeData.nodeType === 'videoGenerator' && (
          <>
            <Textarea
              placeholder="Describe the video you want to generate..."
              value={nodeData.config.videoPrompt || ''}
              onChange={(e) => updateNodeData({ config: { ...nodeData.config, videoPrompt: e.target.value } })}
              rows={6}
              className="resize-none text-sm text-zinc-900 bg-transparent border-none focus:ring-0 focus:ring-offset-0 p-0 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 placeholder:animate-shimmer"
            />
            <div className="flex items-center gap-2">
              <Select 
                value={nodeData.config.model || 'auto'} 
                onValueChange={(val) => updateNodeData({ config: { ...nodeData.config, model: val } })}
              >
                <SelectTrigger className="h-9 w-24 text-xs bg-zinc-100/50 border-zinc-300 text-zinc-900 hover:bg-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai/sora-turbo">Sora Turbo</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={nodeData.config.aspectRatio || '16:9'} 
                onValueChange={(val) => updateNodeData({ config: { ...nodeData.config, aspectRatio: val } })}
              >
                <SelectTrigger className="h-9 w-24 text-xs bg-zinc-100/50 border-zinc-300 text-zinc-900 hover:bg-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9</SelectItem>
                  <SelectItem value="1:1">1:1</SelectItem>
                  <SelectItem value="9:16">9:16</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={String(nodeData.config.duration || '5')} 
                onValueChange={(val) => updateNodeData({ config: { ...nodeData.config, duration: parseInt(val) } })}
              >
                <SelectTrigger className="h-9 w-20 text-xs bg-zinc-100/50 border-zinc-300 text-zinc-900 hover:bg-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5s</SelectItem>
                  <SelectItem value="10">10s</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleRunFromHere} size="icon" variant="ghost" className="h-9 w-9 ml-auto bg-zinc-200/50 hover:bg-zinc-600 text-zinc-900">
                <Play className="h-4 w-4" />
              </Button>
            </div>
            {nodeData.result?.videoUrl && (
              <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-100 rounded overflow-hidden">
                <video src={nodeData.result.videoUrl} controls className="w-full h-full object-cover" />
              </div>
            )}
          </>
        )}

        {nodeData.nodeType === 'assistant' && (
          <div className="space-y-3">
            {/* Top-left toggle */}
            <Tabs value={assistantTab} onValueChange={(v) => setAssistantTab(v as 'text' | 'enhanced')}>
              <TabsList className="grid w-full grid-cols-2 h-9 bg-zinc-100/50 border border-zinc-300">
                <TabsTrigger value="text" className="text-xs data-[state=active]:bg-zinc-200 data-[state=active]:text-zinc-900">Text</TabsTrigger>
                <TabsTrigger value="enhanced" className="text-xs data-[state=active]:bg-zinc-200 data-[state=active]:text-zinc-900">Edit Generated Prompt</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-3 space-y-3">
                <Textarea
                  value={nodeData.config?.instruction || ''}
                  onChange={(e) => updateNodeData({ 
                    config: { ...nodeData.config, instruction: e.target.value }
                  })}
                  placeholder="What should the AI do? (e.g., 'Enhance this text for social media')"
                  className="min-h-[100px] text-sm text-zinc-900 bg-white/50 border-zinc-200 focus:ring-0 focus:ring-offset-0 placeholder:text-zinc-500 placeholder:animate-shimmer nodrag nowheel"
                  rows={4}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseMove={(e) => e.stopPropagation()}
                />
              </TabsContent>

              <TabsContent value="enhanced" className="mt-3 space-y-3">
                {nodeData.result?.output ? (
                  <div className="space-y-2">
                    <Textarea
                      value={nodeData.result.output}
                      onChange={(e) => updateNodeData({
                        result: { ...nodeData.result, output: e.target.value }
                      })}
                      className="min-h-[120px] text-xs text-zinc-900 bg-white/50 border-zinc-200 focus:ring-0 focus:ring-offset-0 nodrag nowheel"
                      rows={6}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseMove={(e) => e.stopPropagation()}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(nodeData.result.output);
                        toast.success('Copied to clipboard');
                      }}
                      className="w-full"
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      Copy
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No generated prompt yet. Run the node to generate.
                  </p>
                )}
              </TabsContent>
            </Tabs>

            {/* Bottom-left settings icon */}
            <div className="flex items-center justify-between">
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>AI Assistant Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Model</Label>
                      <Select
                        value={nodeData.config?.model || 'google/gemini-2.5-flash'}
                        onValueChange={(value) => updateNodeData({
                          config: { ...nodeData.config, model: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                          <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                          <SelectItem value="openai/gpt-5">ChatGPT 5</SelectItem>
                          <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Temperature: {nodeData.config?.temperature || 0.7}</Label>
                      <Slider
                        value={[nodeData.config?.temperature || 0.7]}
                        onValueChange={([value]) => updateNodeData({
                          config: { ...nodeData.config, temperature: value }
                        })}
                        min={0}
                        max={1}
                        step={0.1}
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher = more creative, Lower = more focused
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Max Tokens</Label>
                      <Input
                        type="number"
                        value={nodeData.config?.maxTokens || 1000}
                        onChange={(e) => updateNodeData({
                          config: { ...nodeData.config, maxTokens: parseInt(e.target.value) }
                        })}
                        min={100}
                        max={4000}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Play button bottom-right */}
              <Button onClick={handleRunFromHere} size="sm" className="h-8 w-8 p-0">
                <Play className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {nodeData.nodeType === 'upload' && (
          <div className="space-y-3">
            {!nodeData.result?.imageUrl && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-all nodrag nowheel
                  ${isDragging 
                ? 'border-cyan-500 bg-cyan-500/10' 
                : 'border-zinc-300 hover:border-cyan-500/50 hover:bg-zinc-100/50'
                  }
                `}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id={`upload-${id}`}
                />
                <label htmlFor={`upload-${id}`} className="cursor-pointer">
                  <CloudUpload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, WEBP up to 10MB
                  </p>
                </label>
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            {nodeData.result?.imageUrl && (
              <div className="space-y-2">
                <div className="relative group w-full aspect-square bg-zinc-100 dark:bg-zinc-100 rounded overflow-hidden">
                  <img 
                    src={nodeData.result.imageUrl} 
                    alt="Uploaded"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={deleteUploadedImage}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {nodeData.config?.fileName && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="truncate">📎 {nodeData.config.fileName}</p>
                    {nodeData.config.fileSize && (
                      <p>{(nodeData.config.fileSize / 1024).toFixed(1)} KB</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {nodeData.nodeType === 'imageOutput' && (
          <div 
            className="relative w-full aspect-square bg-zinc-100 dark:bg-zinc-100 rounded overflow-hidden group"
            onMouseEnter={() => setImageHovered(true)}
            onMouseLeave={() => setImageHovered(false)}
          >
            {nodeData.result?.imageUrl ? (
              <>
                <img 
                  src={nodeData.result.imageUrl} 
                  alt="Output" 
                  className="w-full h-full object-cover" 
                />
                {/* Image action overlay */}
                {imageHovered && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setViewDialogOpen(true)}
                      className="h-8 gap-1"
                    >
                      <Maximize2 className="h-3 w-3" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleDownloadImage}
                      className="h-8 gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditDialogOpen(true)}
                      className="h-8 gap-1"
                    >
                      <Wand2 className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleExportToCanvas}
                      className="h-8 gap-1"
                    >
                      <Share2 className="h-3 w-3" />
                      Export to Canvas
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded">
                {Icon && <Icon className="w-8 h-8 text-zinc-700 dark:text-zinc-600" />}
                <p className="text-xs text-zinc-500 mt-2">Waiting for input</p>
              </div>
            )}
          </div>
        )}

        {nodeData.nodeType === 'videoOutput' && (
          <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-100 rounded overflow-hidden relative">
            {nodeData.status === 'running' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                <p className="text-xs text-zinc-500 mt-2">Generating video...</p>
              </div>
            ) : nodeData.result?.videoUrl ? (
              <div className="relative group">
                <video 
                  src={nodeData.result.videoUrl} 
                  controls 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" onClick={() => window.open(nodeData.result.videoUrl, '_blank')} className="h-7">
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" onClick={handleDownloadImage} className="h-7">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Video className="w-8 h-8 text-zinc-700" />
                <p className="text-xs text-zinc-500 mt-2">Waiting for video...</p>
              </div>
            )}
          </div>
        )}

        {nodeData.error && (
          <div className="text-xs text-red-500 mt-2">
            {nodeData.error}
          </div>
        )}
      </div>

      {/* Input handles - visible circles on the left */}
      {nodeTypeInfo?.inputs.map((input, index) => {
        const HandleIcon = getHandleIcon(input.type);
        return (
          <Handle
            key={input.id}
            type="target"
            position={Position.Left}
            id={input.id}
            style={{
              top: `${((index + 1) / (nodeTypeInfo.inputs.length + 1)) * 100}%`,
              left: '-8px',
              width: '14px',
              height: '14px',
              background: '#ffffff',
              border: '2.5px solid #3b82f6',
              borderRadius: '9999px',
              zIndex: 10,
              transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            className="hover:!scale-125 hover:!border-blue-600 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.15)]"
          >
            {HandleIcon && (
              <HandleIcon className="absolute -left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
          </Handle>
        );
      })}

      {/* Output handles - visible circles on the right */}
      {nodeTypeInfo?.outputs.map((output, index) => {
        const HandleIcon = getHandleIcon(output.type);
        return (
          <Handle
            key={output.id}
            type="source"
            position={Position.Right}
            id={output.id}
            style={{
              top: `${((index + 1) / (nodeTypeInfo.outputs.length + 1)) * 100}%`,
              right: '-8px',
              width: '14px',
              height: '14px',
              background: '#ffffff',
              border: '2.5px solid #3b82f6',
              borderRadius: '9999px',
              zIndex: 10,
              transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            className="hover:!scale-125 hover:!border-blue-600 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.15)]"
          >
            {HandleIcon && (
              <HandleIcon className="absolute -right-7 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
          </Handle>
        );
      })}
      
      {/* Image dialogs */}
      {nodeData.result?.imageUrl && (
        <>
          <ImageViewDialog
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            imageUrl={nodeData.result.imageUrl}
            title={nodeData.label}
          />
          <ImageEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            imageUrl={nodeData.result.imageUrl}
            title={nodeData.label}
            onEditComplete={handleEditComplete}
          />
        </>
      )}
    </div>
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode;

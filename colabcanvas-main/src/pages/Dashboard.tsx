import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData, useBrandsData, usePresentationsData, useCovexData } from '@/hooks/useDashboardData';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Settings, RectangleHorizontal, Grid3x3, List, Trash2, Check, X, Image as ImageIcon, Users, ChevronDown, BookmarkCheck, Archive, Presentation, Workflow as WorkflowIcon } from 'lucide-react';
import CosmoNavIcon from '@/assets/icons/cosmo-nav.svg?react';
import CanvasNavIcon from '@/assets/icons/canvas-nav.svg?react';
import CovexNavIcon from '@/assets/icons/covex-nav.svg?react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DeleteConfirmModal } from '@/components/dashboard/DeleteConfirmModal';
import { DesignCategoryCards } from '@/components/dashboard/DesignCategoryCards';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { NewProjectCard } from '@/components/dashboard/NewProjectCard';
import { DashboardPromptBox } from '@/components/dashboard/DashboardPromptBox';
import noProjectsIllustration from '@/assets/no_projects.svg';
import { resolveAvatarUrl } from '@/lib/avatarUtils';
import footerLogo from '@/assets/footer-logo.svg';


import { ShowcaseGallery } from '@/components/dashboard/ShowcaseGallery';

import { ProjectContextMenu } from '@/components/dashboard/ProjectContextMenu';
import { BulkActionBar } from '@/components/dashboard/BulkActionBar';
import { BrandEmptyState } from '@/components/dashboard/BrandEmptyState';
import { CreateBrandDialog } from '@/components/brands/CreateBrandDialog';
import { Checkbox } from '@/components/ui/checkbox';
// Preload category images
import posterImg from "@/assets/categories/poster.webp";
import characterImg from "@/assets/categories/character.webp";
import mockupImg from "@/assets/categories/mockup.webp";
import illustrationImg from "@/assets/categories/illustration.webp";
import brandingImg from "@/assets/categories/branding.webp";

// Mini preview for Cosmo presentations on dashboard
function CosmoSlidePreview({ slide }: {slide: any;}) {
  const bg = slide?.background?.value || '#f8f8f8';
  const titleBlock = slide?.contentBlocks?.find((b: any) => b.type === 'title' || b.type === 'subtitle');
  const titleText = titleBlock?.text || '';

  return (
    <div className="w-full h-full rounded-lg flex items-center justify-center p-4 overflow-hidden" style={{ background: bg }}>
      {titleText ?
      <p className="text-[10px] text-center font-medium line-clamp-3 text-foreground/70">{titleText.slice(0, 80)}</p> :

      <Presentation className="w-6 h-6 text-muted-foreground/30" />
      }
    </div>);

}

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();

  // Use auth context instead of duplicate auth check
  const {
    user,
    session,
    isLoading: authLoading
  } = useAuth();

  // Local UI states
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('5:8');
  const [showAspectRatioSelector, setShowAspectRatioSelector] = useState(false);
  const [generationType, setGenerationType] = useState<'image' | 'video'>('image');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [textareaHeight, setTextareaHeight] = useState(50);
  const [sortBy, setSortBy] = useState<'recent' | 'date'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSharedOnly, setShowSharedOnly] = useState(false);
  const [creditPopoverOpen, setCreditPopoverOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeMode, setActiveMode] = useState<'canvas' | 'cosmo' | 'think' | 'talent'>('canvas');
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout>();
  const [activeBrandFilter, setActiveBrandFilter] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);

  // Use React Query hook for data fetching with caching
  const {
    credits,
    projects,
    profile,
    isLoading: dataLoading,
    refetchProjects
  } = useDashboardData(user?.id, sortBy);

  const { data: brands = [] } = useBrandsData(user?.id);
  const { data: presentations = [] } = usePresentationsData(user?.id);
  const { data: covexProjects = [] } = useCovexData(user?.id);

  // Merge canvas projects, cosmo presentations, and covex workflows into unified list
  const combinedItems = useMemo(() => {
    const canvasItems = projects.map((p: any) => ({
      ...p,
      source: 'canvas' as const
    }));
    const cosmoItems = presentations.map((p: any) => ({
      id: p.id,
      title: p.title,
      updated_at: p.updated_at,
      created_at: p.created_at,
      thumbnail_url: null,
      brand_id: null,
      collaborators: [],
      source: 'cosmo' as const,
      slides: p.slides
    }));
    const covexItems = (covexProjects as any[]).map((p: any) => ({
      id: p.id,
      title: p.title,
      updated_at: p.updated_at,
      created_at: p.created_at,
      thumbnail_url: null,
      brand_id: null,
      collaborators: [],
      source: 'covex' as const,
      is_public: p.is_public,
      is_template: p.is_template,
    }));
    return [...canvasItems, ...cosmoItems, ...covexItems].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [projects, presentations]);

  // Compute project counts per brand
  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p: any) => {
      if (p.brand_id) {
        counts[p.brand_id] = (counts[p.brand_id] || 0) + 1;
      }
    });
    return counts;
  }, [projects]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // Preload category images on component mount
  useEffect(() => {
    const imagesToPreload = [posterImg, characterImg, mockupImg, illustrationImg, brandingImg];
    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Fetch suggestion when prompt changes
  useEffect(() => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
    if (prompt.trim().length > 10 && !isGenerating) {
      suggestionTimeoutRef.current = setTimeout(() => {
        fetchSuggestion();
      }, 500);
    } else {
      setSuggestion('');
    }
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [prompt, isGenerating]);
  const fetchSuggestion = async () => {
    if (isLoadingSuggestion || !session) return;
    setIsLoadingSuggestion(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('prompt-suggest', {
        body: {
          currentPrompt: prompt,
          selectedImages: attachedFiles.length > 0 ? filePreviewUrls.map((url) => ({
            src: url
          })) : null
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error) throw error;
      if (data?.suggestion) {
        setSuggestion(' ' + data.suggestion);
      }
    } catch (error) {
      console.error('Error fetching suggestion:', error);
      setSuggestion('');
    } finally {
      setIsLoadingSuggestion(false);
    }
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };
  const handleNewProject = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('projects').insert({
        user_id: user.id,
        title: 'Untitled Project',
        ...(activeBrandFilter ? { brand_id: activeBrandFilter } : {})
      }).select().single();
      if (error) throw error;
      toast({
        title: 'Project Created',
        description: 'Your new project is ready'
      });
      navigate('/canvas');
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive'
      });
    }
  };
  const handlePromptSubmit = () => {
    if (!prompt.trim()) return;
    localStorage.setItem('initialPrompt', prompt.trim());
    localStorage.setItem('aspectRatio', aspectRatio);
    localStorage.setItem('forceNewProject', 'true');
    navigate('/canvas');
  };
  const handleCosmosSubmit = async () => {
    if (!prompt.trim()) return;
    setIsGeneratingWorkflow(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-cosmo-workflow', {
        body: {
          prompt: prompt.trim()
        }
      });
      if (error) {
        console.error('Workflow generation error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to create workflow',
          variant: 'destructive'
        });
        return;
      }
      if (data?.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive'
        });
        return;
      }
      toast({
        title: 'Workflow Created',
        description: `Created "${data.title}" with ${data.nodeCount} nodes`
      });
      navigate('/cosmo/editor');
    } catch (err) {
      console.error('Failed to generate workflow:', err);
      toast({
        title: 'Error',
        description: 'Failed to create workflow. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingWorkflow(false);
    }
  };
  const handleThinkSubmit = () => {
    if (!prompt.trim()) return;
    localStorage.setItem('thinkPrompt', prompt.trim());
    navigate('/cogent/chat');
  };
  const handleTalentSubmit = () => {
    if (!prompt.trim()) return;
    localStorage.setItem('talentPrompt', prompt.trim());
    navigate('/talent/new', { state: { opening: prompt.trim() } });
  };

  // ─── Clone & Open Project (always make new project) ──────────────────
  const [isCloning, setIsCloning] = useState(false);
  const handleCloneAndOpen = async (item: any) => {
    if (!user) return;
    setIsCloning(true);
    const toastId = toast({
      title: 'Creating Copy...',
      description: 'Cloning selected item into a new project...',
    });

    try {
      if (item.source === 'cosmo') {
        // Clone Presentation
        const { data: orig, error: fetchErr } = await supabase
          .from('presentations')
          .select('*')
          .eq('id', item.id)
          .single();
        if (fetchErr || !orig) throw fetchErr || new Error('Could not find original presentation');

        const { data: newPres, error: insertErr } = await supabase
          .from('presentations')
          .insert({
            user_id: user.id,
            title: orig.title ? `${orig.title} (Copy)` : 'Untitled Presentation (Copy)',
            theme_id: orig.theme_id,
            design_tokens: orig.design_tokens,
            slides: orig.slides,
          })
          .select()
          .single();
        if (insertErr || !newPres) throw insertErr || new Error('Could not create cloned presentation');

        toast({
          title: 'Success',
          description: 'Created new presentation copy!',
        });
        navigate(`/cosmo/editor?presentationId=${newPres.id}`);

      } else if (item.source === 'covex') {
        // Clone Workflow
        const { data: orig, error: fetchErr } = await supabase
          .from('workflows')
          .select('*')
          .eq('id', item.id)
          .single();
        if (fetchErr || !orig) throw fetchErr || new Error('Could not find original workflow');

        const { data: newWf, error: insertErr } = await supabase
          .from('workflows')
          .insert({
            user_id: user.id,
            title: orig.title ? `${orig.title} (Copy)` : 'Untitled Workflow (Copy)',
            description: orig.description,
            is_public: orig.is_public,
            is_template: orig.is_template,
          })
          .select()
          .single();
        if (insertErr || !newWf) throw insertErr || new Error('Could not create cloned workflow');

        // Copy nodes
        const { data: nodes } = await supabase.from('workflow_nodes').select('*').eq('workflow_id', item.id);
        if (nodes && nodes.length > 0) {
          const clonedNodes = nodes.map(n => {
            const { id, created_at, updated_at, ...rest } = n;
            return { ...rest, workflow_id: newWf.id };
          });
          await supabase.from('workflow_nodes').insert(clonedNodes);
        }

        // Copy edges
        const { data: edges } = await supabase.from('workflow_edges').select('*').eq('workflow_id', item.id);
        if (edges && edges.length > 0) {
          const clonedEdges = edges.map(e => {
            const { id, created_at, ...rest } = e;
            return { ...rest, workflow_id: newWf.id };
          });
          await supabase.from('workflow_edges').insert(clonedEdges);
        }

        toast({
          title: 'Success',
          description: 'Created new workflow copy!',
        });
        navigate(`/covex/editor?id=${newWf.id}`);

      } else {
        // Clone Canvas Project
        const { data: orig, error: fetchErr } = await supabase
          .from('projects')
          .select('*')
          .eq('id', item.id)
          .single();
        if (fetchErr || !orig) throw fetchErr || new Error('Could not find original project');

        const { data: newProj, error: insertErr } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            title: orig.title ? `${orig.title} (Copy)` : 'Untitled Project (Copy)',
            brand_id: orig.brand_id,
            canvas_data: orig.canvas_data,
            last_accessed_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (insertErr || !newProj) throw insertErr || new Error('Could not create cloned project');

        // Copy artboards
        const { data: artboards } = await supabase.from('artboards').select('*').eq('project_id', item.id);
        if (artboards && artboards.length > 0) {
          const clonedArtboards = artboards.map(ab => {
            const { id, created_at, updated_at, ...rest } = ab;
            return { ...rest, project_id: newProj.id, user_id: user.id };
          });
          await supabase.from('artboards').insert(clonedArtboards);
        }

        // Copy canvas objects
        const { data: objects } = await supabase.from('canvas_objects').select('*').eq('project_id', item.id);
        if (objects && objects.length > 0) {
          const clonedObjects = objects.map(o => {
            const { id, created_at, updated_at, ...rest } = o;
            return { ...rest, project_id: newProj.id, user_id: user.id };
          });
          await supabase.from('canvas_objects').insert(clonedObjects);
        }

        toast({
          title: 'Success',
          description: 'Created new project copy!',
        });
        navigate(`/canvas?projectId=${newProj.id}`);
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Error',
        description: e.message || 'Failed to copy item',
        variant: 'destructive',
      });
    } finally {
      setIsCloning(false);
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const oversizedFiles = selectedFiles.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive'
      });
      return;
    }
    const newFiles = [...attachedFiles, ...selectedFiles].slice(0, 5);
    setAttachedFiles(newFiles);
    const newUrls = selectedFiles.map((file) => URL.createObjectURL(file));
    setFilePreviewUrls((prev) => [...prev, ...newUrls].slice(0, 5));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const removeFile = (index: number) => {
    if (filePreviewUrls[index]) {
      URL.revokeObjectURL(filePreviewUrls[index]);
    }
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = textareaHeight;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.min(Math.max(startHeight + deltaY, 100), 500);
      setTextareaHeight(newHeight);
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      setPrompt(prompt + suggestion);
      setSuggestion('');
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Route based on active mode
      if (activeMode === 'think') {
        handleThinkSubmit();
      } else if (activeMode === 'cosmo') {
        handleCosmosSubmit();
      } else if (activeMode === 'talent') {
        handleTalentSubmit();
      } else {
        handlePromptSubmit();
      }
    }
  };
  const getFirstName = (fullName: string | null | undefined): string => {
    if (!fullName) return 'there';
    const firstName = fullName.trim().split(' ')[0];
    return firstName || 'there';
  };
  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    const project = combinedItems.find((p: any) => p.id === projectId);
    if (project) {
      setProjectToDelete({
        id: project.id,
        title: project.title
      });
      setDeleteModalOpen(true);
    }
  };
  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      // Determine source table
      const item = combinedItems.find((p: any) => p.id === projectToDelete.id);
      const table = item?.source === 'cosmo' ? 'presentations' : item?.source === 'covex' ? 'workflows' : 'projects';
      const {
        error
      } = await supabase.from(table).delete().eq('id', projectToDelete.id);
      if (error) throw error;
      toast({
        title: 'Deleted',
        description: 'Successfully deleted'
      });
      queryClient.invalidateQueries({
        queryKey: ['user-projects', user?.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['user-presentations', user?.id]
      });
      setDeleteModalOpen(false);
      setProjectToDelete(null);
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete',
        variant: 'destructive'
      });
    }
  };
  const handleStartEditTitle = (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditingTitle(project.title);
  };
  const handleSaveTitle = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!editingTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Project name cannot be empty',
        variant: 'destructive'
      });
      return;
    }
    try {
      // Check if this is a cosmo presentation or canvas project
      const item = combinedItems.find((p: any) => p.id === projectId);
      const table = item?.source === 'cosmo' ? 'presentations' : 'projects';
      const {
        error
      } = await supabase.from(table).update({
        title: editingTitle.trim()
      }).eq('id', projectId);
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Project name updated'
      });
      // Invalidate and refetch both
      queryClient.invalidateQueries({
        queryKey: ['user-projects', user?.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['user-presentations', user?.id]
      });
      setEditingProjectId(null);
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project name',
        variant: 'destructive'
      });
    }
  };
  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(null);
    setEditingTitle('');
  };

  // Move project(s) to a brand
  const handleMoveProjectToBrand = async (projectIds: string[], brandId: string | null) => {
    try {
      const { error } = await supabase.
      from('projects').
      update({ brand_id: brandId }).
      in('id', projectIds);
      if (error) throw error;
      toast({
        title: brandId ? 'Moved to brand' : 'Removed from brand',
        description: `${projectIds.length} project${projectIds.length > 1 ? 's' : ''} updated`
      });
      queryClient.invalidateQueries({ queryKey: ['user-projects', user?.id] });
      setSelectedProjectIds(new Set());
    } catch (error: any) {
      console.error('Error moving project:', error);
      toast({ title: 'Error', description: 'Failed to move project', variant: 'destructive' });
    }
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);else
      next.add(projectId);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedProjectIds.size === 0) return;
    try {
      const { error } = await supabase.
      from('projects').
      delete().
      in('id', Array.from(selectedProjectIds));
      if (error) throw error;
      toast({ title: 'Deleted', description: `${selectedProjectIds.size} project(s) deleted` });
      queryClient.invalidateQueries({ queryKey: ['user-projects', user?.id] });
      setSelectedProjectIds(new Set());
      setSelectionMode(false);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete projects', variant: 'destructive' });
    }
  };

  // Show skeleton only when auth state is truly unknown
  if (authLoading && !user) {
    return <DashboardSkeleton />;
  }

  // Don't render if no user (redirect will happen)
  if (!user) {
    return null;
  }
  return <div className="relative overflow-hidden">

      {/* Hero Section - tightened spacing */}
      <section className="pt-10 sm:pt-20 pb-6 sm:pb-10 px-4 sm:px-6 relative overflow-hidden shadow-none">
        <div className="max-w-[614px] mx-auto w-full">
          <h1 className="text-center mb-3 text-foreground text-6xl" style={{ fontWeight: 300 }}>
            Hey, {getFirstName(profile?.full_name)}!
          </h1>
          <h2 className="text-center font-light mb-6 text-foreground text-xl">
            What do you want to colab today?
          </h2>

          <DashboardPromptBox prompt={prompt} setPrompt={setPrompt} suggestion={suggestion} isGenerating={isGenerating} attachedFiles={attachedFiles} filePreviewUrls={filePreviewUrls} handleFileAttach={handleFileAttach} removeFile={removeFile} handlePromptSubmit={handlePromptSubmit} handleKeyDown={handleKeyDown} textareaHeight={textareaHeight} handleResizeStart={handleResizeStart} fileInputRef={fileInputRef} handleFileChange={handleFileChange} activeMode={activeMode} setActiveMode={setActiveMode} isGeneratingWorkflow={isGeneratingWorkflow} onThinkSubmit={handleThinkSubmit} onCosmosSubmit={handleCosmosSubmit} onTalentSubmit={handleTalentSubmit} />
        </div>
      </section>

      {/* Main Content Section */}
      <main className="container mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-16 bg-white">
        <DesignCategoryCards />

        <div className="mb-6 flex items-center justify-between">
          <div>
            {showSharedOnly ?
          <>
                <h3 className="text-xl font-normal mb-1">Shared with me</h3>
                <p className="text-muted-foreground text-xs">Projects shared by others</p>
              </> :

          <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 text-xl font-normal mb-1 bg-transparent border-none outline-none cursor-pointer hover:opacity-80 transition-opacity">
                      {activeBrandFilter ?
                  brands.find((b) => b.id === activeBrandFilter)?.name || 'All Projects' :
                  'All Projects'}
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[220px]">
                    <DropdownMenuItem
                  onClick={() => setActiveBrandFilter(null)}
                  className="cursor-pointer">

                      <span className="flex-1">All Projects</span>
                      {activeBrandFilter === null && <Check className="w-4 h-4 ml-2" />}
                    </DropdownMenuItem>
                    {brands.length > 0 && <DropdownMenuSeparator />}
                    {brands.map((brand) =>
                <DropdownMenuItem
                  key={brand.id}
                  onClick={() => setActiveBrandFilter(brand.id)}
                  className="cursor-pointer">

                        {brand.logo_primary_url ?
                  <img src={brand.logo_primary_url} alt="" className="w-4 h-4 rounded-full object-cover mr-2" /> :

                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold mr-2">
                            {brand.name[0]?.toUpperCase()}
                          </div>
                  }
                        <span className="flex-1">{brand.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {projectCounts[brand.id] || 0}
                        </span>
                        {activeBrandFilter === brand.id && <Check className="w-4 h-4 ml-2" />}
                      </DropdownMenuItem>
                )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                  onClick={() => setShowCreateBrandDialog(true)}
                  className="cursor-pointer">

                      <Plus className="w-4 h-4 mr-2" />
                      Create new workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <p className="text-muted-foreground text-xs">
                  {activeBrandFilter ?
              `Projects in ${brands.find((b) => b.id === activeBrandFilter)?.name || 'workspace'}` :
              'Continue working on your designs'}
                </p>
              </>
          }
          </div>
          
          <div className="flex items-center gap-3">
            {/* Selection mode toggle */}
            <Button
            variant={selectionMode ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setSelectionMode(!selectionMode);
              setSelectedProjectIds(new Set());
            }}
            className="gap-2 text-xs font-normal">

              <BookmarkCheck className="w-3 h-3" />
              {selectionMode ? 'Cancel' : 'Select'}
            </Button>

            <div className="h-4 w-px bg-border" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-xs font-normal">
                  <Archive className="w-3 h-3" />
                  {sortBy === 'recent' ? 'Recent' : 'Date Created'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="animate-in fade-scale-in duration-150">
                <DropdownMenuItem onClick={() => setSortBy('recent')} className="cursor-pointer">
                  Recent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('date')} className="cursor-pointer">
                  Date Created
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="h-4 w-px bg-border" />
            
            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
              <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-7 w-7 p-0 bg-zinc-300 hover:bg-zinc-200">
                <Grid3x3 className="w-3 h-3" />
              </Button>
              <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-7 w-7 p-0">
                <List className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="h-4 w-px bg-border" />
            
            <Button
            onClick={() => setShowSharedOnly(!showSharedOnly)}
            size="sm"
            variant={showSharedOnly ? "default" : "outline"}
            className="gap-2 text-xs font-normal">

              <Users className="w-3 h-3" />
              Shared with me
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2 text-xs font-normal">
                  <Plus className="w-3 h-3" />
                  New
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleNewProject} className="cursor-pointer">
                  <CanvasNavIcon className="w-4 h-4 mr-2" />
                  New Design
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/cosmo')} className="cursor-pointer">
                  <CosmoNavIcon className="w-4 h-4 mr-2" />
                  New Presentation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {(() => {
        // Filter projects based on showSharedOnly and brand filter
        let displayProjects = showSharedOnly ?
        combinedItems.filter((project: any) => project.collaborators?.length > 0) :
        combinedItems;

        // Apply brand filter
        if (!showSharedOnly && activeBrandFilter !== null) {
          displayProjects = displayProjects.filter((p: any) => p.brand_id === activeBrandFilter);
        }

        // Brand empty state
        if (!showSharedOnly && activeBrandFilter && displayProjects.length === 0) {
          const activeBrand = brands.find((b: any) => b.id === activeBrandFilter);
          if (activeBrand) {
            return (
              <BrandEmptyState
                brandName={activeBrand.name}
                brandLogoUrl={activeBrand.logo_primary_url}
                onCreateProject={handleNewProject} />);


          }
        }

        if (displayProjects.length === 0) {
          return (
            <Card className="p-12 text-center">
                <img src={noProjectsIllustration} alt="No projects" className="w-48 h-auto mx-auto mb-6" />
                <h3 className="text-xl font-semibold mb-2">
                  {showSharedOnly ? 'No Shared Projects' : 'No Projects Yet'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {showSharedOnly ?
                'Projects shared with you will appear here' :
                'Start your first project and let AI help you create amazing designs'}
                </p>
                {!showSharedOnly &&
              <Button onClick={handleNewProject} className="relative overflow-hidden bg-zinc-600 text-white hover:bg-zinc-700 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-shimmer">
                    Create Your First Project
                  </Button>
              }
              </Card>);

        }

        return (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'flex flex-col gap-3'}>
              {viewMode === 'grid' && !showSharedOnly && <NewProjectCard onClick={handleNewProject} />}
              
              {displayProjects.map((project: any, index: number) => {
              const isSelected = selectedProjectIds.has(project.id);

              const cardContent =
              <Card
                key={project.id}
                className={`group cursor-pointer overflow-hidden hover-lift transition-all duration-300 ${viewMode === 'grid' ? 'border border-zinc-200 bg-white' : 'hover:bg-accent/5'} relative animate-in fade-in-0 ${isSelected ? 'ring-2 ring-primary' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => {
                  if (selectionMode) {
                    toggleProjectSelection(project.id);
                  } else {
                    if (project.source === 'cosmo') {
                      navigate(`/cosmo/editor?presentationId=${project.id}`);
                    } else if (project.source === 'covex') {
                      navigate(`/covex/editor?id=${project.id}`);
                    } else {
                      navigate(`/canvas?projectId=${project.id}`);
                    }
                  }
                }}>

                    {viewMode === 'grid' ?
                <>
                        {/* Selection checkbox */}
                        {selectionMode &&
                  <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleProjectSelection(project.id)} />

                          </div>
                  }

                        {/* Delete button - top right */}
                        {!selectionMode &&
                  <button onClick={(e) => handleDeleteProject(e, project.id)} className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md p-1.5">
                            <Trash2 className="w-4 h-4" />
                          </button>
                  }

                        {/* Source icon badge - Canvas or Cosmo */}
                        {!selectionMode &&
                  <div className="absolute top-2 right-2 z-[5] transition-opacity duration-200 group-hover:opacity-0 bg-background/80 backdrop-blur-sm rounded-md p-1.5">
                            {project.source === 'cosmo' ?
                    <CosmoNavIcon className="w-4 h-4 text-muted-foreground" /> :
                    project.source === 'covex' ?
                    <CovexNavIcon className="w-4 h-4 text-muted-foreground" /> :
                    <CanvasNavIcon className="w-4 h-4 text-muted-foreground" />
                    }
                          </div>
                  }
                        {!selectionMode && (project as any).collaborators?.length > 0 &&
                  <div className="absolute top-2 left-2 z-10 flex items-center -space-x-1">
                            {(project as any).collaborators.slice(0, 3).map((collab: any) =>
                    <div
                      key={collab.id}
                      className="w-7 h-7 rounded-md border-2 border-background bg-muted flex items-center justify-center text-[9px] font-medium overflow-hidden"
                      title={collab.full_name}>

                                <img
                        src={resolveAvatarUrl(collab.avatar_url, collab.id)}
                        alt={collab.full_name || ''}
                        className="w-full h-full object-cover" />

                              </div>
                    )}
                            {(project as any).collaborators.length > 3 &&
                    <div className="w-7 h-7 rounded-md border-2 border-background bg-muted flex items-center justify-center text-[9px] font-medium">
                                +{(project as any).collaborators.length - 3}
                              </div>
                    }
                          </div>
                  }
                        
                        <div className="aspect-square flex items-center justify-center p-1">
                          {project.thumbnail_url ?
                    <img src={project.thumbnail_url} alt={project.title} className="w-full h-full rounded-lg object-cover" /> :
                    project.source === 'cosmo' && project.slides?.[0] ?
                    <CosmoSlidePreview slide={project.slides[0]} /> :
                    project.source === 'covex' ?
                    <div className="w-full h-full rounded-lg bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center">
                      <WorkflowIcon className="w-10 h-10 text-zinc-400" />
                    </div> :
                    <div className="text-muted-foreground text-sm">No Preview</div>
                    }
                        </div>
                        <div className="p-3">
                          {editingProjectId === project.id ?
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} className="flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring" autoFocus onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle(e as any, project.id);
                        if (e.key === 'Escape') handleCancelEdit(e as any);
                      }} />
                              <button onClick={(e) => handleSaveTitle(e, project.id)} className="p-1 hover:bg-accent rounded">
                                <Check className="w-4 h-4 text-green-600" />
                              </button>
                              <button onClick={handleCancelEdit} className="p-1 hover:bg-accent rounded">
                                <X className="w-4 h-4 text-destructive" />
                              </button>
                            </div> :

                    <h3 className="truncate font-normal text-sm text-foreground cursor-text hover:text-muted-foreground transition-colors" onClick={(e) => handleStartEditTitle(e, project)}>
                              {project.title}
                            </h3>
                    }
                          <p className="text-muted-foreground mt-1 text-xs font-light">
                            Last refined on {new Date(project.updated_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                          </p>
                        </div>
                      </> :

                <div className="flex items-center gap-4 p-4">
                        {selectionMode &&
                  <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleProjectSelection(project.id)} />

                          </div>
                  }
                        <div className="w-20 h-20 flex-shrink-0 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 flex items-center justify-center rounded-lg overflow-hidden">
                          {project.thumbnail_url ? <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground/40" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="truncate font-normal text-sm mb-1">{project.title}</h3>
                          <p className="text-muted-foreground text-xs font-light">
                            {new Date(project.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                }
                  </Card>;


              // Wrap with context menu when not in selection mode
              if (!selectionMode && brands.length > 0) {
                return (
                  <ProjectContextMenu
                    key={project.id}
                    brands={brands}
                    currentBrandId={project.brand_id}
                    onMoveToBrand={(brandId) => handleMoveProjectToBrand([project.id], brandId)}
                    onRemoveFromBrand={() => handleMoveProjectToBrand([project.id], null)}
                    onDelete={() => {
                      setProjectToDelete({ id: project.id, title: project.title });
                      setDeleteModalOpen(true);
                    }}>

                      {cardContent}
                    </ProjectContextMenu>);

              }

              return cardContent;
            })}
            </div>);

      })()}
      </main>

      <ShowcaseGallery />

      <footer className="pb-4 pt-12">
        <div className="container mx-auto px-6 flex flex-col items-center gap-3">
          <img alt="think.design.colab" className="h-8 opacity-100" src="/lovable-uploads/6a4f4acf-f67e-4336-b1b6-88da35c5adb2.png" />
          <p className="text-sm font-medium" style={{
          background: 'var(--gradient-india)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'gradient-shift 3s linear infinite'
        }}>
            Proudly made in India
          </p>
        </div>
      </footer>

      {/* Bulk Action Bar */}
      <BulkActionBar
      selectedCount={selectedProjectIds.size}
      brands={brands}
      onMoveToBrand={(brandId) => handleMoveProjectToBrand(Array.from(selectedProjectIds), brandId)}
      onDelete={handleBulkDelete}
      onClearSelection={() => {
        setSelectedProjectIds(new Set());
        setSelectionMode(false);
      }} />


      {/* Create Brand Dialog */}
      <CreateBrandDialog
      open={showCreateBrandDialog}
      onOpenChange={setShowCreateBrandDialog}
      onSuccess={() => {
        setShowCreateBrandDialog(false);
        queryClient.invalidateQueries({ queryKey: ['brands', user?.id] });
      }} />


      <DeleteConfirmModal isOpen={deleteModalOpen} onClose={() => {
      setDeleteModalOpen(false);
      setProjectToDelete(null);
    }} onConfirm={confirmDelete} projectTitle={projectToDelete?.title || ''} />
    </div>;
};
export default Dashboard;
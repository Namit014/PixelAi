import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, Edit, Eye, EyeOff, Loader2, ChevronDown, ChevronUp, Upload, Image as ImageIcon, X, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StepPreview } from "@/components/tour/StepPreview";

interface TourStep {
  id: string;
  tour_id: string;
  step_order: number;
  title: string;
  description: string;
  ui_target_selector: string | null;
  media_url: string | null;
  cta_text: string;
  cta_action: 'next' | 'complete' | 'navigate';
  navigate_to: string | null;
}

interface Tour {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  target_plan_types: string[];
  target_user_cohorts: string[];
  trigger_type: 'first_login' | 'feature_open' | 'manual' | 'behavior';
  trigger_feature: string | null;
  priority: number;
  created_at: string;
  steps?: TourStep[];
}

interface TourStats {
  tour_id: string;
  total_started: number;
  total_completed: number;
  completion_rate: number;
}

export default function ToursManager() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [tourStats, setTourStats] = useState<Record<string, TourStats>>({});
  const [loading, setLoading] = useState(true);
  const [expandedTourId, setExpandedTourId] = useState<string | null>(null);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [savingTour, setSavingTour] = useState(false);
  const [uploadingStepId, setUploadingStepId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'first_login' as Tour['trigger_type'],
    trigger_feature: '',
    target_plan_types: [] as string[],
    target_page: '' as string,
    priority: 0,
    is_active: true
  });

  useEffect(() => { loadTours(); }, []);

  const loadTours = async () => {
    try {
      const { data, error } = await supabase
        .from('app_tours')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;

      const toursWithSteps: Tour[] = await Promise.all(
        (data || []).map(async (tour) => {
          const { data: steps } = await supabase
            .from('app_tour_steps')
            .select('*')
            .eq('tour_id', tour.id)
            .order('step_order');
          return {
            ...tour,
            trigger_type: tour.trigger_type as Tour['trigger_type'],
            steps: (steps || []).map(s => ({
              ...s,
              cta_action: s.cta_action as TourStep['cta_action']
            }))
          };
        })
      );

      setTours(toursWithSteps);

      const stats: Record<string, TourStats> = {};
      for (const tour of data || []) {
        const { data: progress } = await supabase
          .from('user_tour_progress')
          .select('completed_at')
          .eq('tour_id', tour.id);

        if (progress) {
          const total = progress.length;
          const completed = progress.filter(p => p.completed_at).length;
          stats[tour.id] = {
            tour_id: tour.id,
            total_started: total,
            total_completed: completed,
            completion_rate: total > 0 ? (completed / total) * 100 : 0
          };
        }
      }
      setTourStats(stats);
    } catch (error: any) {
      console.error('Error loading tours:', error);
      toast.error('Failed to load tours');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTour = async () => {
    if (!formData.name.trim()) { toast.error('Tour name is required'); return; }
    setSavingTour(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('app_tours')
        .insert({
          name: formData.name,
          description: formData.description || null,
          trigger_type: formData.trigger_type,
          trigger_feature: formData.trigger_feature || null,
          target_plan_types: formData.target_plan_types,
          target_page: formData.target_page || null,
          priority: formData.priority,
          is_active: formData.is_active,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      setTours(prev => [...prev, { ...data, trigger_type: data.trigger_type as Tour['trigger_type'], steps: [] }]);
      setShowCreateDialog(false);
      resetForm();
      toast.success('Tour created successfully');
    } catch (error: any) {
      console.error('Error creating tour:', error);
      toast.error('Failed to create tour');
    } finally {
      setSavingTour(false);
    }
  };

  const handleUpdateTour = async () => {
    if (!editingTour) return;
    setSavingTour(true);
    try {
      const { error } = await supabase
        .from('app_tours')
        .update({
          name: formData.name,
          description: formData.description || null,
          trigger_type: formData.trigger_type,
          trigger_feature: formData.trigger_feature || null,
          target_plan_types: formData.target_plan_types,
          target_page: formData.target_page || null,
          priority: formData.priority,
          is_active: formData.is_active
        })
        .eq('id', editingTour.id);

      if (error) throw error;
      setTours(prev => prev.map(t => t.id === editingTour.id ? { ...t, ...formData } : t));
      setEditingTour(null);
      resetForm();
      toast.success('Tour updated successfully');
    } catch (error: any) {
      console.error('Error updating tour:', error);
      toast.error('Failed to update tour');
    } finally {
      setSavingTour(false);
    }
  };

  const handleDeleteTour = async (tourId: string) => {
    if (!confirm('Are you sure you want to delete this tour?')) return;
    try {
      const { error } = await supabase.from('app_tours').delete().eq('id', tourId);
      if (error) throw error;
      setTours(prev => prev.filter(t => t.id !== tourId));
      toast.success('Tour deleted');
    } catch (error: any) {
      toast.error('Failed to delete tour');
    }
  };

  const handleToggleActive = async (tour: Tour) => {
    try {
      const { error } = await supabase.from('app_tours').update({ is_active: !tour.is_active }).eq('id', tour.id);
      if (error) throw error;
      setTours(prev => prev.map(t => t.id === tour.id ? { ...t, is_active: !t.is_active } : t));
      toast.success(tour.is_active ? 'Tour deactivated' : 'Tour activated');
    } catch (error: any) {
      toast.error('Failed to update tour');
    }
  };

  const handleAddStep = async (tourId: string) => {
    const tour = tours.find(t => t.id === tourId);
    const nextOrder = (tour?.steps?.length || 0) + 1;
    try {
      const { data, error } = await supabase
        .from('app_tour_steps')
        .insert({
          tour_id: tourId,
          step_order: nextOrder,
          title: `Step ${nextOrder}`,
          description: 'Enter step description...',
          cta_text: 'Next',
          cta_action: 'next'
        })
        .select()
        .single();

      if (error) throw error;
      const newStep: TourStep = { ...data, cta_action: data.cta_action as TourStep['cta_action'] };
      setTours(prev => prev.map(t => t.id === tourId ? { ...t, steps: [...(t.steps || []), newStep] } : t));
      toast.success('Step added');
    } catch (error: any) {
      toast.error('Failed to add step');
    }
  };

  const handleUpdateStep = async (step: TourStep, updates: Partial<TourStep>) => {
    try {
      const { error } = await supabase.from('app_tour_steps').update(updates).eq('id', step.id);
      if (error) throw error;
      setTours(prev => prev.map(t => ({
        ...t,
        steps: t.steps?.map(s => s.id === step.id ? { ...s, ...updates } : s)
      })));
    } catch (error: any) {
      toast.error('Failed to update step');
    }
  };

  const handleDeleteStep = async (step: TourStep) => {
    try {
      const { error } = await supabase.from('app_tour_steps').delete().eq('id', step.id);
      if (error) throw error;
      setTours(prev => prev.map(t => ({
        ...t,
        steps: t.steps?.filter(s => s.id !== step.id)
      })));
      toast.success('Step deleted');
    } catch (error: any) {
      toast.error('Failed to delete step');
    }
  };

  const handleUploadStepMedia = async (step: TourStep, file: File) => {
    setUploadingStepId(step.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${step.tour_id}/${step.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('tour-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tour-assets')
        .getPublicUrl(filePath);

      await handleUpdateStep(step, { media_url: publicUrl });
      toast.success('Image uploaded');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingStepId(null);
    }
  };

  const handleRemoveStepMedia = async (step: TourStep) => {
    await handleUpdateStep(step, { media_url: null });
    toast.success('Image removed');
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', trigger_type: 'first_login',
      trigger_feature: '', target_plan_types: [], target_page: '', priority: 0, is_active: true
    });
  };

  const openEditDialog = (tour: Tour) => {
    setEditingTour(tour);
    setFormData({
      name: tour.name,
      description: tour.description || '',
      trigger_type: tour.trigger_type,
      trigger_feature: tour.trigger_feature || '',
      target_plan_types: tour.target_plan_types || [],
      target_page: (tour as any).target_page || '',
      priority: tour.priority,
      is_active: tour.is_active
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">App Tours</h2>
          <p className="text-muted-foreground">Manage onboarding and feature tours</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Tour
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Tour</DialogTitle>
            </DialogHeader>
            <TourForm formData={formData} setFormData={setFormData} onSubmit={handleCreateTour} saving={savingTour} submitLabel="Create Tour" />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {tours.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No tours created yet</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create your first tour
            </Button>
          </Card>
        ) : (
          tours.map((tour) => (
            <Card key={tour.id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedTourId(expandedTourId === tour.id ? null : tour.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full", tour.is_active ? "bg-green-500" : "bg-zinc-300")} />
                    <div>
                      <CardTitle className="text-lg">{tour.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{tour.trigger_type.replace('_', ' ')}</Badge>
                        {tour.trigger_feature && <Badge variant="secondary" className="text-xs">{tour.trigger_feature}</Badge>}
                        <span className="text-xs">{tour.steps?.length || 0} steps</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tourStats[tour.id] && (
                      <div className="text-right text-sm mr-4">
                        <p className="font-medium">{tourStats[tour.id].completion_rate.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">completion</p>
                      </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleToggleActive(tour); }}>
                      {tour.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditDialog(tour); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteTour(tour.id); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    {expandedTourId === tour.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>

              {expandedTourId === tour.id && (
                <CardContent className="border-t pt-4">
                  <div className="grid grid-cols-[1fr_320px] gap-4">
                    <div className="space-y-3">
                      {tour.steps?.map((step, index) => (
                        <StepEditor
                          key={step.id}
                          step={step}
                          index={index}
                          uploading={uploadingStepId === step.id}
                          onUpdate={handleUpdateStep}
                          onDelete={handleDeleteStep}
                          onUpload={handleUploadStepMedia}
                          onRemoveMedia={handleRemoveStepMedia}
                        />
                      ))}
                      <Button variant="outline" size="sm" onClick={() => handleAddStep(tour.id)} className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> Add Step
                      </Button>
                    </div>
                    {/* Live Preview */}
                    <div className="sticky top-4">
                      <Label className="text-xs text-muted-foreground mb-2 block">Live Preview</Label>
                      {tour.steps && tour.steps.length > 0 ? (
                        <StepPreviewWidget steps={tour.steps} />
                      ) : (
                        <div className="w-[320px] h-40 bg-zinc-100 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                          Add steps to see preview
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!editingTour} onOpenChange={(open) => !open && setEditingTour(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tour</DialogTitle>
          </DialogHeader>
          <TourForm formData={formData} setFormData={setFormData} onSubmit={handleUpdateTour} saving={savingTour} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Step Editor Component
function StepEditor({
  step, index, uploading, onUpdate, onDelete, onUpload, onRemoveMedia
}: {
  step: TourStep;
  index: number;
  uploading: boolean;
  onUpdate: (step: TourStep, updates: Partial<TourStep>) => void;
  onDelete: (step: TourStep) => void;
  onUpload: (step: TourStep, file: File) => void;
  onRemoveMedia: (step: TourStep) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground pt-2">
        <GripVertical className="w-4 h-4 cursor-grab" />
        <span className="text-sm font-medium w-6">{index + 1}</span>
      </div>
      <div className="flex-1 space-y-2">
        <Input
          value={step.title}
          onChange={(e) => onUpdate(step, { title: e.target.value })}
          className="font-medium"
          placeholder="Step title"
        />
        <Textarea
          value={step.description}
          onChange={(e) => onUpdate(step, { description: e.target.value })}
          className="text-sm min-h-[60px]"
          placeholder="Step description"
        />

        {/* Media Upload */}
        <div className="space-y-2">
          {step.media_url ? (
            <div className="relative group rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
              <img src={step.media_url} alt="Step media" className="w-full h-32 object-cover" />
              <button
                onClick={() => onRemoveMedia(step)}
                className="absolute top-2 right-2 p-1 rounded-full bg-zinc-900/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-24 border-2 border-dashed border-zinc-300 rounded-lg flex flex-col items-center justify-center gap-1 text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span className="text-xs">Upload image or GIF</span>
                </>
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(step, file);
              e.target.value = '';
            }}
          />
        </div>

        {/* Step config fields */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">CSS Selector</Label>
            <Input
              value={step.ui_target_selector || ''}
              onChange={(e) => onUpdate(step, { ui_target_selector: e.target.value })}
              placeholder="e.g. #video-tab, .toolbar-btn"
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">CTA Action</Label>
            <Select
              value={step.cta_action}
              onValueChange={(val) => onUpdate(step, { cta_action: val as TourStep['cta_action'] })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next">Next</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="navigate">Navigate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">CTA Text</Label>
            <Input
              value={step.cta_text || 'Next'}
              onChange={(e) => onUpdate(step, { cta_text: e.target.value })}
              placeholder="Next"
              className="text-xs"
            />
          </div>
          {step.cta_action === 'navigate' && (
            <div>
              <Label className="text-xs text-muted-foreground">Navigate To</Label>
              <Input
                value={step.navigate_to || ''}
                onChange={(e) => onUpdate(step, { navigate_to: e.target.value })}
                placeholder="/dashboard"
                className="text-xs"
              />
            </div>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(step)} className="mt-2">
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}

// Step Preview Widget with navigation
function StepPreviewWidget({ steps }: { steps: TourStep[] }) {
  const [previewIndex, setPreviewIndex] = useState(0);
  const step = steps[previewIndex];
  if (!step) return null;

  return (
    <div className="space-y-2">
      <StepPreview
        title={step.title}
        description={step.description}
        mediaUrl={step.media_url}
        ctaText={step.cta_text}
        currentStep={previewIndex + 1}
        totalSteps={steps.length}
      />
      {steps.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={previewIndex === 0} onClick={() => setPreviewIndex(i => i - 1)}>
            <ChevronLeft className="w-3 h-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground">{previewIndex + 1}/{steps.length}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={previewIndex >= steps.length - 1} onClick={() => setPreviewIndex(i => i + 1)}>
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Tour Form Component
function TourForm({ formData, setFormData, onSubmit, saving, submitLabel }: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Tour Name</Label>
        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Welcome Tour" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What is this tour about?" />
      </div>
      <div>
        <Label>Trigger Type</Label>
        <Select value={formData.trigger_type} onValueChange={(val) => setFormData({ ...formData, trigger_type: val })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="first_login">First Login</SelectItem>
            <SelectItem value="feature_open">Feature Open</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="behavior">Behavior-based</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formData.trigger_type === 'feature_open' && (
        <div>
          <Label>Feature Name</Label>
          <Input value={formData.trigger_feature} onChange={(e) => setFormData({ ...formData, trigger_feature: e.target.value })} placeholder="e.g., video_generator, brand_import" />
        </div>
      )}
      <div>
        <Label>Target Page</Label>
        <Select value={formData.target_page || 'all'} onValueChange={(val) => setFormData({ ...formData, target_page: val === 'all' ? '' : val })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pages</SelectItem>
            <SelectItem value="/canvas">Canvas</SelectItem>
            <SelectItem value="/dashboard">Dashboard</SelectItem>
            <SelectItem value="/workflow">Workflow</SelectItem>
            <SelectItem value="/brands">Brands</SelectItem>
            <SelectItem value="/cosmo">Cosmo</SelectItem>
            <SelectItem value="/think">Think</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Priority (higher = shown first)</Label>
        <Input type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
        <Label>Active</Label>
      </div>
      <Button onClick={onSubmit} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}

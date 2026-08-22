import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Trash2, Image as ImageIcon, AlertCircle, Edit, CheckSquare, Square, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const DEFAULT_CATEGORIES = [
  { value: 'logo', label: 'Logo' },
  { value: 'branding', label: 'Branding' },
  { value: 'poster', label: 'Poster' },
  { value: 'character', label: 'Character' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'mockup', label: 'Mockup' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'social', label: 'Social Media' },
];

interface ImageStats {
  [category: string]: number;
}

export const ReferenceImagesUpload = () => {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('logo');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [images, setImages] = useState<any[]>([]);
  const [stats, setStats] = useState<ImageStats>({});
  const [loading, setLoading] = useState(true);
  
  // Tag editing state
  const [editingImage, setEditingImage] = useState<any | null>(null);
  const [editTags, setEditTags] = useState<string>('');
  
  // Bulk editing state
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkTags, setBulkTags] = useState<string>('');
  
  // Custom categories state
  const [customCategories, setCustomCategories] = useState<{ value: string; label: string }[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Combined categories (default + custom)
  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  useEffect(() => {
    loadImages();
    loadStats();
    loadCustomCategories();
  }, [selectedCategory]);

  // Load custom categories from localStorage
  const loadCustomCategories = () => {
    try {
      const stored = localStorage.getItem('custom_reference_categories');
      if (stored) {
        setCustomCategories(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading custom categories:', error);
    }
  };

  // Add new category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const value = newCategoryName.toLowerCase().replace(/\s+/g, '-');
    const label = newCategoryName.trim();
    
    // Check if already exists
    if (allCategories.some(c => c.value === value)) {
      toast({ title: 'Category already exists', variant: 'destructive' });
      return;
    }
    
    const newCategory = { value, label };
    const updated = [...customCategories, newCategory];
    setCustomCategories(updated);
    localStorage.setItem('custom_reference_categories', JSON.stringify(updated));
    
    setNewCategoryName('');
    setShowAddCategory(false);
    setSelectedCategory(value);
    
    toast({ title: 'Category added', description: `"${label}" is now available` });
  };

  const loadStats = async () => {
    try {
      const statsData: ImageStats = {};
      
      for (const cat of allCategories) {
        const { count, error } = await supabase
          .from('reference_images')
          .select('id', { count: 'exact', head: true })
          .contains('tags', [cat.value]);
        
        if (!error && typeof count === 'number') {
          statsData[cat.value] = count;
        } else {
          console.error(`Failed to load stats for ${cat.value}:`, error);
          statsData[cat.value] = 0;
        }
      }
      
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reference_images')
        .select('*')
        .contains('tags', [selectedCategory])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 100) {
      toast({
        title: 'Too many files',
        description: 'Please upload a maximum of 100 images at once',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('category', selectedCategory);
      
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const { data, error } = await supabase.functions.invoke('upload-reference-images', {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: 'Upload complete',
        description: `Successfully uploaded ${data.uploaded} of ${data.total} images`,
      });

      if (data.errors && data.errors.length > 0) {
        console.error('Upload errors:', data.errors);
      }

      loadImages();
      loadStats();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/reference-images/');
      if (urlParts.length < 2) throw new Error('Invalid image URL');
      
      const filePath = urlParts[1];

      // Delete from database
      const { error: dbError } = await supabase
        .from('reference_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('reference-images')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion warning:', storageError);
      }

      toast({
        title: 'Image deleted',
        description: 'Reference image removed successfully',
      });

      loadImages();
      loadStats();
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTags = async (imageId: string, newTags: string[]) => {
    try {
      const { error } = await supabase
        .from('reference_images')
        .update({ 
          tags: newTags,
          semantic_tags: newTags,
          updated_at: new Date().toISOString()
        })
        .eq('id', imageId);

      if (error) throw error;

      toast({
        title: 'Tags updated',
        description: 'Reference image tags updated successfully',
      });

      setEditingImage(null);
      loadImages();
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const totalImages = Object.values(stats).reduce((sum, count) => sum + count, 0);
  const hasLowCategoryCount = Object.values(stats).some(count => count < 20);

  // Bulk selection functions
  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const selectAllImages = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(img => img.id)));
    }
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
    setBulkTags('');
  };

  const handleBulkTagUpdate = async () => {
    if (selectedImages.size === 0) return;
    
    const newTags = bulkTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    
    if (newTags.length === 0) {
      toast({
        title: 'No tags entered',
        description: 'Please enter at least one tag',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('reference_images')
        .update({ 
          tags: newTags,
          semantic_tags: newTags,
          updated_at: new Date().toISOString()
        })
        .in('id', Array.from(selectedImages));
      
      if (error) throw error;
      
      toast({ 
        title: 'Tags updated', 
        description: `Updated ${selectedImages.size} images` 
      });
      clearSelection();
      setBulkEditMode(false);
      loadImages();
      loadStats();
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  // Clear selection when category changes
  useEffect(() => {
    clearSelection();
  }, [selectedCategory]);

  return (
    <Card className="p-6 bg-zinc-900 border-zinc-800">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-100 mb-2 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-zinc-400" />
          Reference Images Management
        </h2>
        <p className="text-sm text-zinc-400">
          Upload curated reference images for AI Designer. These replace Pinterest dependencies.
        </p>
      </div>

      {/* Statistics */}
      <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
        <h3 className="text-sm font-medium text-zinc-300 mb-3">📊 Image Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {allCategories.map(cat => (
            <div key={cat.value} className="text-center">
              <Badge 
                variant="outline" 
                className={`mb-1 ${stats[cat.value] >= 100 ? 'bg-green-900/20 text-green-400 border-green-900/50' : stats[cat.value] >= 20 ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}
              >
                {cat.label}
              </Badge>
              <p className="text-lg font-semibold text-zinc-100">{stats[cat.value] || 0}</p>
              <p className="text-xs text-zinc-500">images</p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-700">
          <p className="text-sm text-zinc-400">
            <strong className="text-zinc-100">{totalImages}</strong> total reference images
          </p>
        </div>
      </div>

      {hasLowCategoryCount && (
        <Alert className="mb-6 bg-yellow-900/20 border-yellow-900/50">
          <AlertCircle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400">
            ⚠️ Some categories have fewer than 20 images. Upload at least 100 images per category for best results.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700 text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {allCategories.map(cat => (
                <SelectItem key={cat.value} value={cat.value} className="text-zinc-100">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Add Category Button/Input */}
          {showAddCategory ? (
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name..."
                className="w-40 bg-zinc-800 border-zinc-700 text-zinc-100"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <Button size="sm" onClick={handleAddCategory} className="bg-primary hover:bg-primary/90">
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCategory(true)}
              className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
            >
              + New Category
            </Button>
          )}

          <label className="flex-1">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <Button
              type="button"
              disabled={uploading}
              className="w-full bg-primary hover:bg-primary/90"
              onClick={(e) => {
                const inputElement = e.currentTarget.previousElementSibling;
                if (inputElement instanceof HTMLInputElement) {
                  inputElement.click();
                }
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Images'}
            </Button>
          </label>
        </div>

        {uploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-zinc-400 text-center">Uploading images...</p>
          </div>
        )}
      </div>

      {/* Images Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-300">
            Current Category: {allCategories.find(c => c.value === selectedCategory)?.label} ({images.length} images)
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant={bulkEditMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setBulkEditMode(!bulkEditMode);
                if (bulkEditMode) clearSelection();
              }}
              className="text-xs"
            >
              <CheckSquare className="w-3 h-3 mr-1" />
              {bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
            </Button>
          </div>
        </div>
        
        {/* Bulk Actions Bar */}
        {bulkEditMode && (
          <div className="mb-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllImages}
                  className="text-xs"
                >
                  {selectedImages.size === images.length ? (
                    <>
                      <Square className="w-3 h-3 mr-1" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3 h-3 mr-1" />
                      Select All ({images.length})
                    </>
                  )}
                </Button>
                <span className="text-sm text-zinc-400">
                  {selectedImages.size} selected
                </span>
              </div>
              {selectedImages.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-xs text-zinc-400"
                >
                  Clear Selection
                </Button>
              )}
            </div>
            
            {selectedImages.size > 0 && (
              <div className="flex items-center gap-2">
                <Input
                  value={bulkTags}
                  onChange={(e) => setBulkTags(e.target.value)}
                  placeholder="Enter tags (comma separated): logo, minimal, modern"
                  className="flex-1 bg-zinc-900 border-zinc-600 text-zinc-100"
                />
                <Button
                  onClick={handleBulkTagUpdate}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Apply to {selectedImages.size} images
                </Button>
              </div>
            )}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-12 text-zinc-500">Loading images...</div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            No images uploaded for this category yet
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {images.map(image => (
              <div 
                key={image.id} 
                className={`relative group aspect-square bg-zinc-800 rounded-lg overflow-hidden cursor-pointer ${
                  bulkEditMode && selectedImages.has(image.id) ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => bulkEditMode && toggleImageSelection(image.id)}
              >
                <img
                  src={image.image_url}
                  alt={image.title || 'Reference image'}
                  className="w-full h-full object-cover"
                />
                
                {/* Bulk selection checkbox overlay */}
                {bulkEditMode && (
                  <div className="absolute top-2 left-2 z-20">
                    <div 
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedImages.has(image.id) 
                          ? 'bg-primary border-primary' 
                          : 'bg-zinc-900/80 border-zinc-500 hover:border-zinc-400'
                      }`}
                    >
                      {selectedImages.has(image.id) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                )}
                
                {/* Edit button - only show when not in bulk edit mode */}
                {!bulkEditMode && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0 bg-zinc-800/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingImage(image);
                        setEditTags((image.tags || []).join(', '));
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                
                {/* Tags and title on hover */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  {image.title && (
                    <p className="text-white text-xs font-medium mb-1 truncate">{image.title}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {image.tags?.slice(0, 3).map((tag: string, idx: number) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-zinc-700/80 text-zinc-100 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Delete button - only show when not in bulk edit mode */}
                {!bulkEditMode && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(image.id, image.image_url);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Tags Dialog */}
      <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Edit Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingImage && (
              <img 
                src={editingImage.image_url} 
                className="w-full h-48 object-cover rounded-lg" 
                alt="Reference" 
              />
            )}
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">
                Tags (comma separated)
              </label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="logo, branding, minimal, modern"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Common tags: logo, branding, poster, character, illustration, mockup, minimal, bold, colorful, modern, retro
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="ghost" 
                onClick={() => setEditingImage(null)}
                className="text-zinc-400"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const tags = editTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                  if (editingImage) {
                    handleUpdateTags(editingImage.id, tags);
                  }
                }}
                className="bg-primary hover:bg-primary/90"
              >
                Save Tags
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

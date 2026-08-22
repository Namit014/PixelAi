import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, ImageIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TemplateCategory {
  id: string;
  category_name: string;
  display_name: string;
  template_images: string[];
}

export const TemplateCategoryImages = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadCategoryImages(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('design_template_categories')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setCategories((data || []).map(cat => ({
        ...cat,
        template_images: (cat.template_images as string[]) || []
      })));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadCategoryImages = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('design_template_categories')
        .select('template_images')
        .eq('id', categoryId)
        .single();

      if (error) throw error;
      setCurrentImages((data?.template_images as string[]) || []);
    } catch (error) {
      console.error('Error loading category images:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !selectedCategory) return;

    setUploading(true);
    const files = Array.from(event.target.files);

    try {
      const formData = new FormData();
      formData.append('category_id', selectedCategory);
      
      files.forEach(file => {
        formData.append('images', file);
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-template-images`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: `Uploaded ${result.uploaded_urls.length} image(s)`,
      });

      loadCategoryImages(selectedCategory);
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload images',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!selectedCategory) return;

    try {
      const updatedImages = currentImages.filter(url => url !== imageUrl);

      const { error } = await supabase
        .from('design_template_categories')
        .update({ template_images: updatedImages })
        .eq('id', selectedCategory);

      if (error) throw error;

      // Extract file path from URL and delete from storage
      const urlParts = imageUrl.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('template-instructions') + 1).join('/');
      
      await supabase.storage
        .from('template-instructions')
        .remove([filePath]);

      toast({
        title: 'Success',
        description: 'Image deleted successfully',
      });

      loadCategoryImages(selectedCategory);
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete image',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="p-6 bg-zinc-900 border-zinc-800">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-zinc-100">
        <ImageIcon className="w-5 h-5 text-zinc-400" />
        Template Category Images
      </h2>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[250px] bg-zinc-800/50 border-zinc-700 text-zinc-100">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id} className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100">
                  {category.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            disabled={!selectedCategory || uploading}
            onClick={() => document.getElementById('template-image-upload')?.click()}
            className="bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Images'}
          </Button>
          <input
            id="template-image-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {selectedCategory && (
          <div>
            <p className="text-sm text-zinc-400 mb-3">
              Current Images ({currentImages.length})
            </p>
            {currentImages.length === 0 ? (
              <p className="text-sm text-zinc-500">No images uploaded yet for this category.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={`Template ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30"
                      onClick={() => handleDeleteImage(imageUrl)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

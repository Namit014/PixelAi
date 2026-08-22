import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Plus, Image as ImageIcon } from "lucide-react";

interface CreateTemplateFormProps {
  project: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORIES = [
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

export const CreateTemplateForm = ({ project, open, onOpenChange, onSuccess }: CreateTemplateFormProps) => {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom thumbnail state
  const [customThumbnails, setCustomThumbnails] = useState<File[]>([]);
  const [thumbnailPreviews, setThumbnailPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!project) return null;

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Limit to 5 images
    const newFiles = files.slice(0, 5 - customThumbnails.length);
    
    setCustomThumbnails(prev => [...prev, ...newFiles]);
    
    // Create preview URLs
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeThumbnail = (index: number) => {
    setCustomThumbnails(prev => prev.filter((_, i) => i !== index));
    setThumbnailPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadThumbnails = async (): Promise<string[]> => {
    if (customThumbnails.length === 0) {
      return project.thumbnail_url ? [project.thumbnail_url] : [];
    }

    // Get current user for RLS-compliant path
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const uploadedUrls: string[] = [];
    
    for (const file of customThumbnails) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/templates/${project.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('design-assets')
        .upload(fileName, file, { contentType: file.type });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('design-assets')
        .getPublicUrl(fileName);
      
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !description) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Upload custom thumbnails if any
      const thumbnailUrls = await uploadThumbnails();
      
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Update project with template metadata
      const { error } = await supabase
        .from('projects')
        .update({
          is_template: true,
          template_category: category,
          template_description: description,
          template_tags: tagsArray,
          is_featured: isFeatured,
          thumbnail_url: thumbnailUrls.length > 0 ? thumbnailUrls[0] : project.thumbnail_url,
        })
        .eq('id', project.id);

      if (error) throw error;

      toast.success('Project published as template!');
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setCategory("");
      setDescription("");
      setTags("");
      setIsFeatured(false);
      setCustomThumbnails([]);
      setThumbnailPreviews([]);
    } catch (error: any) {
      console.error('Error making template:', error);
      toast.error(error.message || 'Failed to publish template');
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Publish as Template</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Make "{project.title}" available in the Community templates
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-zinc-300">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger id="category" className="bg-zinc-800/50 border-zinc-700 text-zinc-100">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat} className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-300">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template is for and what makes it useful..."
              rows={4}
              maxLength={500}
              required
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
            <p className="text-xs text-zinc-500">
              {description.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className="text-zinc-300">Tags (optional)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., modern, minimalist, corporate (comma-separated)"
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
            <p className="text-xs text-zinc-500">
              Separate tags with commas. Maximum 10 tags.
            </p>
          </div>

          {/* Custom Thumbnail Upload */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Template Thumbnails (up to 5 images)</Label>
            <div className="flex flex-wrap gap-3">
              {/* Preview existing thumbnails */}
              {thumbnailPreviews.map((preview, index) => (
                <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden bg-zinc-800 group">
                  <img 
                    src={preview} 
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeThumbnail(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              
              {/* Add button */}
              {customThumbnails.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-5 h-5 text-zinc-500" />
                  <span className="text-xs text-zinc-500">Add</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleThumbnailUpload}
              className="hidden"
            />
            <p className="text-xs text-zinc-500">
              Upload custom preview images. First image will be the main thumbnail. Multiple images show as slideshow on hover.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={isFeatured}
              onCheckedChange={(checked) => setIsFeatured(checked as boolean)}
              className="border-zinc-700 data-[state=checked]:bg-zinc-700 data-[state=checked]:border-zinc-600"
            />
            <Label htmlFor="featured" className="cursor-pointer text-zinc-300">
              Mark as Featured Template
            </Label>
          </div>

          {/* Default project thumbnail if no custom uploaded */}
          {project.thumbnail_url && customThumbnails.length === 0 && (
            <div className="space-y-2">
              <Label className="text-zinc-300">Current Preview</Label>
              <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden max-w-xs">
                <img 
                  src={project.thumbnail_url} 
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-zinc-500">
                This will be used if you don't upload custom thumbnails.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !category || !description}
              className="bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
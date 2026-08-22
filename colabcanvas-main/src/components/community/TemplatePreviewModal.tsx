import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Eye, Heart, Share2, Play, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { remixTemplate } from "@/lib/templateActions";
import { useState } from "react";

interface TemplatePreviewModalProps {
  template: {
    id: string;
    title: string;
    template_description: string | null;
    template_category: string | null;
    remix_count: number | null;
    is_featured: boolean | null;
    thumbnail_url: string | null;
    template_tags: string[] | null;
    author_name?: string | null;
    author_avatar?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TemplatePreviewModal = ({ template, open, onOpenChange }: TemplatePreviewModalProps) => {
  const navigate = useNavigate();
  const [isRemixing, setIsRemixing] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!template || !open) return null;

  const handleRemix = async () => {
    setIsRemixing(true);
    const projectId = await remixTemplate(template.id);
    if (projectId) {
      onOpenChange(false);
      navigate(`/canvas?project=${projectId}`);
    }
    setIsRemixing(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setImageError(false);
  };

  // Format numbers for display
  const formatNumber = (num: number | null) => {
    if (!num) return '0';
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const authorInitial = template.author_name?.[0]?.toUpperCase() || 'A';
  const titleInitial = template.title?.[0]?.toUpperCase() || 'T';
  const hasValidThumbnail = template.thumbnail_url && template.thumbnail_url.trim() !== '' && !imageError;

  // Fallback placeholder component
  const ImagePlaceholder = ({ size = 'large' }: { size?: 'large' | 'small' | 'thumb' }) => (
    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 ${size === 'large' ? 'rounded-lg' : size === 'thumb' ? 'rounded-lg' : 'rounded-lg'}`}>
      <span className={`font-bold text-zinc-400 opacity-50 ${size === 'large' ? 'text-6xl' : size === 'thumb' ? 'text-2xl' : 'text-2xl'}`}>
        {titleInitial}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={handleClose}>
      <div 
        className="absolute inset-4 md:inset-8 bg-white rounded-2xl overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-zinc-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-zinc-600" />
        </button>

        {/* Left: Thumbnail Gallery Strip */}
        <div className="hidden md:flex w-20 bg-zinc-50 p-3 flex-col gap-3 overflow-y-auto border-r border-zinc-200">
          <div className="aspect-square rounded-lg overflow-hidden border-2 border-zinc-900 cursor-pointer">
            {hasValidThumbnail ? (
              <img 
                src={template.thumbnail_url!} 
                alt="Thumbnail"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <ImagePlaceholder size="thumb" />
            )}
          </div>
        </div>

        {/* Center: Main Image Preview */}
        <div className="flex-1 p-4 md:p-8 flex items-center justify-center bg-zinc-100 min-h-[200px]">
          {hasValidThumbnail ? (
            <img 
              src={template.thumbnail_url!} 
              alt={template.title}
              className="max-w-full max-h-full object-contain rounded-lg"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full max-w-lg aspect-video">
              <ImagePlaceholder size="large" />
            </div>
          )}
        </div>

        {/* Right: Info Sidebar */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-200 p-6 flex flex-col bg-white">
          {/* Action buttons */}
          <div className="flex gap-2 mb-6">
            <Button 
              variant="outline" 
              className="flex-1 gap-2 border-zinc-300 text-zinc-700 hover:bg-zinc-100"
              disabled
            >
              <Play className="w-4 h-4" />
              View Replay
            </Button>
            <Button 
              onClick={handleRemix} 
              disabled={isRemixing}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white"
            >
              {isRemixing ? 'Creating...' : 'Try it now'}
            </Button>
          </div>

          {/* Author row */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={template.author_avatar || undefined} />
              <AvatarFallback className="bg-zinc-200 text-zinc-700">{authorInitial}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-zinc-900">{template.author_name || 'Anonymous'}</span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm text-zinc-500 mb-6">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>{formatNumber(template.remix_count)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4" />
              <span>{formatNumber(Math.floor((template.remix_count || 0) * 0.3))}</span>
            </div>
            <button className="ml-auto p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-zinc-900 mb-2">{template.title}</h3>

          {/* Description */}
          <p className="text-zinc-600 text-sm leading-relaxed mb-6">
            {template.template_description || 'No description available.'}
          </p>

          {/* Category tag */}
          {template.template_category && (
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
              <Circle className="w-3 h-3 fill-zinc-400 text-zinc-400" />
              <span>{template.template_category}</span>
            </div>
          )}

          {/* Tags */}
          {template.template_tags && template.template_tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {template.template_tags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-2.5 py-1 bg-zinc-100 text-zinc-600 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Image preview section */}
          <div className="mt-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-zinc-900">Preview</span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200">
              {hasValidThumbnail ? (
                <img 
                  src={template.thumbnail_url!} 
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <ImagePlaceholder size="small" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

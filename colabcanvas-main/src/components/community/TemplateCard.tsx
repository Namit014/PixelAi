import { Eye, Heart, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TemplateCardProps {
  template: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    remix_count: number | null;
    is_featured: boolean | null;
    author_name?: string | null;
    author_avatar?: string | null;
    likes_count?: number | null;
  };
}

export const TemplateCard = ({ template }: TemplateCardProps) => {
  return (
    <div className="break-inside-avoid mb-4 group cursor-pointer">
      {/* Image - natural aspect ratio */}
      <div className="relative rounded-xl overflow-hidden bg-zinc-100">
        {template.thumbnail_url && template.thumbnail_url.trim() !== '' ? (
          <img 
            src={template.thumbnail_url} 
            alt={template.title}
            className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              // Hide broken image and show fallback
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`w-full aspect-video flex items-center justify-center text-zinc-400 bg-gradient-to-br from-zinc-100 to-zinc-200 ${template.thumbnail_url && template.thumbnail_url.trim() !== '' ? 'hidden' : ''}`}>
          <span className="text-4xl font-bold opacity-30">{template.title?.[0] || 'T'}</span>
        </div>
      </div>
      
      {/* Author row */}
      <div className="flex items-center gap-2 mt-2.5 px-1">
        <Avatar className="w-6 h-6">
          <AvatarImage src={template.author_avatar || undefined} alt={template.author_name || 'Author'} />
          <AvatarFallback className="bg-zinc-200 text-zinc-600 text-xs">
            {(template.author_name || 'A')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-zinc-700 font-medium truncate flex-1">
          {template.author_name || 'Anonymous'}
        </span>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {template.remix_count || 0}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            {template.likes_count || 0}
          </span>
          {template.is_featured && (
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
          )}
        </div>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { EmbedBlock as EmbedBlockType } from '@/types/brandBlocks';
import { Trash2, ExternalLink } from 'lucide-react';

interface EmbedBlockProps {
  block: EmbedBlockType;
  onUpdate: (content: EmbedBlockType['content']) => void;
  onDelete: () => void;
  isPreviewMode?: boolean;
}

export const EmbedBlock = ({ block, onUpdate, onDelete, isPreviewMode = false }: EmbedBlockProps) => {
  const [url, setUrl] = useState(block.content.url || '');
  const [aspectRatio, setAspectRatio] = useState(block.content.aspect_ratio || '16:9');

  const parseUrl = (inputUrl: string): { provider: EmbedBlockType['content']['provider'], embedUrl: string } => {
    try {
      const urlObj = new URL(inputUrl);
      
      // YouTube
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        const videoId = urlObj.hostname.includes('youtu.be') 
          ? urlObj.pathname.slice(1)
          : urlObj.searchParams.get('v');
        return { 
          provider: 'youtube', 
          embedUrl: `https://www.youtube.com/embed/${videoId}` 
        };
      }
      
      // Vimeo
      if (urlObj.hostname.includes('vimeo.com')) {
        const videoId = urlObj.pathname.split('/')[1];
        return { 
          provider: 'vimeo', 
          embedUrl: `https://player.vimeo.com/video/${videoId}` 
        };
      }
      
      // Figma
      if (urlObj.hostname.includes('figma.com')) {
        return { 
          provider: 'figma', 
          embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(inputUrl)}` 
        };
      }
      
      // CodePen
      if (urlObj.hostname.includes('codepen.io')) {
        const embedUrl = inputUrl.replace('/pen/', '/embed/');
        return { 
          provider: 'codepen', 
          embedUrl 
        };
      }
      
      return { provider: 'generic', embedUrl: inputUrl };
    } catch {
      return { provider: 'generic', embedUrl: inputUrl };
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    const { provider, embedUrl } = parseUrl(newUrl);
    onUpdate({ 
      url: newUrl, 
      provider, 
      embed_html: embedUrl,
      aspect_ratio: aspectRatio 
    });
  };

  const handleAspectRatioChange = (newRatio: string) => {
    setAspectRatio(newRatio);
    onUpdate({ 
      url, 
      provider: block.content.provider,
      embed_html: block.content.embed_html,
      aspect_ratio: newRatio 
    });
  };

  const aspectRatioClass = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square'
  }[aspectRatio] || 'aspect-video';

  return (
    <div className="group relative py-2">
      {!isPreviewMode && (
        <button
          onClick={onDelete}
          className="absolute -right-2 top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 z-10"
        >
          <Trash2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
      )}

      {!isPreviewMode ? (
        <div className="space-y-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">
              Embed URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://youtube.com/watch?v=..."
            />
            <p className="text-xs text-zinc-500 mt-1">
              Supports YouTube, Vimeo, Figma, CodePen, and more
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">
              Aspect Ratio
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => handleAspectRatioChange(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="16:9">16:9 (Video)</option>
              <option value="4:3">4:3 (Classic)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </div>

          {block.content.embed_html && (
            <div className="pt-2">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-2">
                Preview
              </label>
              <div className={`w-full ${aspectRatioClass} rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800`}>
                <iframe
                  src={block.content.embed_html}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        block.content.embed_html ? (
          <div className={`w-full ${aspectRatioClass} rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm`}>
            <iframe
              src={block.content.embed_html}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-center">
            <ExternalLink className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
            <p className="text-sm text-zinc-500">No embed URL provided</p>
          </div>
        )
      )}
    </div>
  );
};

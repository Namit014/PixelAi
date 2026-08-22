import { useState, useRef } from 'react';
import { VideoBlock as VideoBlockType } from '@/types/brandBlocks';
import { Trash2, Upload, Video as VideoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useBrandAssetUpload } from '@/hooks/useBrandAssetUpload';
import { useToast } from '@/hooks/use-toast';

interface VideoBlockProps {
  block: VideoBlockType;
  brandId: string;
  sectionId: string;
  onUpdate: (content: VideoBlockType['content']) => void;
  onDelete: () => void;
}

export const VideoBlock = ({ block, brandId, sectionId, onUpdate, onDelete }: VideoBlockProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAsset, uploading, progress } = useBrandAssetUpload(brandId);
  const [caption, setCaption] = useState(block.content?.caption || '');
  const [videoUrl, setVideoUrl] = useState(block.content?.signed_url || '');
  const [isEmbedUrl, setIsEmbedUrl] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({ title: 'Please select a video file', variant: 'destructive' });
      return;
    }

    try {
      const result = await uploadAsset(file, sectionId, block.id);
      setVideoUrl(result.signed_url);
      onUpdate({
        file_path: result.file_path,
        signed_url: result.signed_url,
        caption: caption
      });
      toast({ title: 'Video uploaded successfully' });
    } catch (error) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
  };

  const getEmbedUrl = (url: string) => {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  return (
    <div className="group relative py-6">
      <div className="space-y-5">
        {videoUrl ? (
          <div className="space-y-4">
            <div className="aspect-video rounded-lg border border-border overflow-hidden bg-muted">
              {isEmbedUrl ? (
                <iframe
                  src={getEmbedUrl(videoUrl)}
                  className="w-full h-full"
                  allowFullScreen
                  title="Video player"
                />
              ) : (
                <video controls className="w-full h-full">
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
            <div className="space-y-2">
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onBlur={() => onUpdate({
                  file_path: block.content.file_path,
                  signed_url: videoUrl,
                  caption: caption
                })}
                placeholder="Add caption or description..."
                rows={2}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setVideoUrl('');
                setIsEmbedUrl(false);
              }}
              className="w-full"
            >
              Change Video
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-zinc-400 transition-colors"
            >
              <VideoIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                {uploading ? `Uploading... ${progress}%` : 'Click to upload video'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports MP4, WebM, MOV
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or embed URL</span>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Paste YouTube or Vimeo URL..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const url = e.currentTarget.value;
                    if (url) {
                      setVideoUrl(url);
                      setIsEmbedUrl(true);
                      onUpdate({
                        file_path: '',
                        signed_url: url,
                        caption: caption
                      });
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

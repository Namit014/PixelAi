import { useState, useRef } from 'react';
import { AudioBlock as AudioBlockType } from '@/types/brandBlocks';
import { Trash2, Upload, Music, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useBrandAssetUpload } from '@/hooks/useBrandAssetUpload';
import { useToast } from '@/hooks/use-toast';

interface AudioBlockProps {
  block: AudioBlockType;
  brandId: string;
  sectionId: string;
  onUpdate: (content: AudioBlockType['content']) => void;
  onDelete: () => void;
}

export const AudioBlock = ({ block, brandId, sectionId, onUpdate, onDelete }: AudioBlockProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAsset, uploading, progress } = useBrandAssetUpload(brandId);
  const [title, setTitle] = useState(block.content?.title || '');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({ title: 'Please select an audio file', variant: 'destructive' });
      return;
    }

    try {
      const result = await uploadAsset(file, sectionId, block.id);
      onUpdate({
        file_path: result.file_path,
        signed_url: result.signed_url,
        title: title || file.name
      });
      toast({ title: 'Audio uploaded successfully' });
    } catch (error) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
  };

  const downloadAudio = () => {
    if (block.content.signed_url) {
      window.open(block.content.signed_url, '_blank');
    }
  };

  return (
    <div className="group relative py-6">
      <div className="space-y-5">
        {block.content.signed_url ? (
          <div className="border border-border rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => onUpdate({
                  file_path: block.content.file_path,
                  signed_url: block.content.signed_url,
                  title: title
                })}
                placeholder="Audio title"
              />
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <Music className="w-8 h-8 text-zinc-500" />
              <div className="flex-1">
                <audio controls className="w-full">
                  <source src={block.content.signed_url} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Replace
              </Button>
              <Button variant="outline" onClick={downloadAudio}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-zinc-400 transition-colors"
          >
            <Music className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              {uploading ? `Uploading... ${progress}%` : 'Click to upload audio'}
            </p>
            <p className="text-xs text-muted-foreground">
              Supports MP3, WAV, OGG
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
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

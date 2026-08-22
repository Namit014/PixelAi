import { useState, useRef } from 'react';
import { FileBlock as FileBlockType } from '@/types/brandBlocks';
import { Trash2, Upload, File, Download, FileText, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useBrandAssetUpload } from '@/hooks/useBrandAssetUpload';
import { useToast } from '@/hooks/use-toast';

interface FileBlockProps {
  block: FileBlockType;
  brandId: string;
  sectionId: string;
  onUpdate: (content: FileBlockType['content']) => void;
  onDelete: () => void;
}

export const FileBlock = ({ block, brandId, sectionId, onUpdate, onDelete }: FileBlockProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAsset, uploading, progress } = useBrandAssetUpload(brandId);
  const [description, setDescription] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadAsset(file, sectionId, block.id);
      onUpdate({
        file_path: result.file_path,
        signed_url: result.signed_url,
        file_name: file.name,
        file_size: file.size
      });
      toast({ title: 'File uploaded successfully' });
    } catch (error) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['pdf', 'doc', 'docx'].includes(ext || '')) return FileText;
    if (['zip', 'rar', '7z'].includes(ext || '')) return FileArchive;
    return File;
  };

  const downloadFile = () => {
    if (block.content.signed_url) {
      window.open(block.content.signed_url, '_blank');
    }
  };

  const FileIcon = block.content.file_name ? getFileIcon(block.content.file_name) : File;

  return (
    <div className="group relative py-6">
      <div className="space-y-5">
        {block.content.signed_url ? (
          <div className="border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <FileIcon className="w-8 h-8 text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{block.content.file_name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatFileSize(block.content.file_size)}
                </div>
              </div>
            </div>

            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description (optional)..."
              rows={2}
            />

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Replace
              </Button>
              <Button variant="default" onClick={downloadFile}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-zinc-400 transition-colors"
          >
            <File className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              {uploading ? `Uploading... ${progress}%` : 'Click to upload file'}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, ZIP, or any document
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
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

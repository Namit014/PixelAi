import { useState, useRef } from 'react';
import { LogoVariantBlock as LogoVariantBlockType } from '@/types/brandBlocks';
import { Trash2, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBrandAssetUpload } from '@/hooks/useBrandAssetUpload';
import { useToast } from '@/hooks/use-toast';
interface LogoVariantBlockProps {
  block: LogoVariantBlockType;
  brandId: string;
  sectionId: string;
  onUpdate: (content: LogoVariantBlockType['content']) => void;
  onDelete: () => void;
  isPreviewMode?: boolean;
}
export const LogoVariantBlock = ({
  block,
  brandId,
  sectionId,
  onUpdate,
  onDelete,
  isPreviewMode = false
}: LogoVariantBlockProps) => {
  const {
    toast
  } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    uploadAsset,
    uploading
  } = useBrandAssetUpload(brandId);
  const [title, setTitle] = useState(block.content.title || '');
  const [background, setBackground] = useState(block.content.background || 'light');
  const [usageNotes, setUsageNotes] = useState(block.content.usage_notes || '');
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }
    try {
      const result = await uploadAsset(file, sectionId, block.id);
      onUpdate({
        title,
        file_path: result.file_path,
        signed_url: result.signed_url,
        background,
        usage_notes: usageNotes
      });
      toast({
        title: 'Logo uploaded successfully'
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        variant: 'destructive'
      });
    }
  };
  const handleUpdate = () => {
    onUpdate({
      title,
      file_path: block.content.file_path,
      signed_url: block.content.signed_url,
      background,
      usage_notes: usageNotes
    });
  };
  const downloadLogo = () => {
    if (block.content.signed_url) {
      window.open(block.content.signed_url, '_blank');
    }
  };
  const getBgClass = () => {
    switch (background) {
      case 'light':
        return 'bg-white';
      case 'dark':
        return 'bg-zinc-900';
      case 'transparent':
        return 'bg-transparent border-2 border-dashed border-border';
      default:
        return 'bg-muted';
    }
  };
  return <div className="group relative">
      <div className="space-y-3">
        {/* Logo Preview Card */}
        <div className="relative group/card">
          {block.content.signed_url ? <div className={`aspect-square rounded-2xl shadow-sm overflow-hidden flex items-center justify-center p-6 ${getBgClass()} hover:shadow-md transition-all`}>
              <img src={block.content.signed_url} alt={title} className="max-w-full max-h-full object-contain" />
            </div> : <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-zinc-400 transition-all shadow-sm hover:shadow-md">
              <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {uploading ? 'Uploading...' : 'Click to upload'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                SVG, PNG, or JPG
              </p>
            </div>}
          
          {!isPreviewMode && block.content.signed_url && <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex-1 h-6 px-1.5 text-[10px] rounded-md shadow-muted backdrop-blur-sm bg-transparent">
                <Upload className="w-2.5 h-2.5 mr-0.5" />
                Replace
              </Button>
              <Button variant="secondary" onClick={downloadLogo} className="flex-1 h-6 px-1.5 text-[10px] rounded-md shadow-muted backdrop-blur-sm bg-transparent">
                <Download className="w-2.5 h-2.5 mr-0.5" />
                Download
              </Button>
            </div>}
        </div>

        {/* Variant Name */}
        <div className="space-y-1">
          {!isPreviewMode ? <Input value={title} onChange={e => setTitle(e.target.value)} onBlur={handleUpdate} placeholder="e.g., Primary Logo" className="h-8 text-sm rounded-xl border-2 font-medium" /> : <p className="font-medium text-sm">{title}</p>}
          
          {usageNotes && <p className="text-xs text-muted-foreground">{usageNotes}</p>}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      </div>

      {!isPreviewMode && <Button variant="ghost" size="icon" onClick={onDelete} className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Trash2 className="w-4 h-4" />
        </Button>}
    </div>;
};
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title: string;
}

const ImageViewDialog = ({ open, onOpenChange, imageUrl, title }: ImageViewDialogProps) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `workflow-${title}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="relative w-full overflow-auto max-h-[70vh]">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-auto"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewDialog;

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title: string;
  onEditComplete: (newImageUrl: string) => void;
}

const ImageEditDialog = ({ open, onOpenChange, imageUrl, title, onEditComplete }: ImageEditDialogProps) => {
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleApplyEdit = async () => {
    if (!editPrompt.trim()) {
      toast.error('Please enter editing instructions');
      return;
    }

    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: {
          imageUrl,
          prompt: editPrompt,
        },
      });

      if (error) throw error;

      if (data?.editedImageUrl) {
        onEditComplete(data.editedImageUrl);
        toast.success('Image edited successfully');
        onOpenChange(false);
        setEditPrompt('');
      } else {
        throw new Error('No edited image returned');
      }
    } catch (error) {
      console.error('Error editing image:', error);
      toast.error('Failed to edit image');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Image with AI - {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-zinc-100 dark:bg-white">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-700">
              Editing Instructions
            </label>
            <Textarea
              placeholder="e.g., Change the background to blue, add a sunset, make it more vibrant..."
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyEdit}
              disabled={isEditing || !editPrompt.trim()}
              className="gap-2"
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Editing...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Apply Edit
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageEditDialog;
